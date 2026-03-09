import asyncio
import asyncpg
import httpx
from datetime import datetime
import os
import csv
import io

"""
도로 소통정보 수집 스크립트
국가교통정보센터(ITS) 신규 API를 호출하여 실시간 도로 소통정보를 DB에 저장
API 문서: https://www.its.go.kr/opendata/opendataList?service=traffic

신규 API(trafficInfo)는 좌표를 반환하지 않으므로, link_coordinates 테이블에서
표준노드링크 좌표를 참조합니다. 최초 실행 시 link_coordinates 테이블을
표준노드링크 데이터로 채워야 합니다 (nodelink.its.go.kr).

환경 변수: ITS_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: road_traffic, link_coordinates (좌표 캐시)
"""

ITS_API_KEY = (os.getenv('ITS_API_KEY') or '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 국가교통정보센터 실시간 도로 소통정보 API (신규 엔드포인트)
API_URL = "https://openapi.its.go.kr:9443/trafficInfo"

# ITS 공개 표준노드링크 참조 CSV
NODE_LINK_CSV_URL = "https://www.its.go.kr/file/opendata/traffic/node_link_info.csv"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def get_status_from_speed(speed, road_type='일반'):
    """
    속도로부터 소통 상태 판단
    1: 원활 (고속도로 70+, 일반도로 30+)
    2: 서행 (고속도로 40-70, 일반도로 15-30)
    3: 정체 (고속도로 40 미만, 일반도로 15 미만)
    """
    if speed is None:
        return 1  # 기본값

    if road_type == '고속도로':
        if speed >= 70:
            return 1
        elif speed >= 40:
            return 2
        else:
            return 3
    else:
        if speed >= 30:
            return 1
        elif speed >= 15:
            return 2
        else:
            return 3


async def ensure_link_coords_table(conn):
    """link_coordinates 캐시 테이블 생성 (없으면)"""
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS link_coordinates (
            link_id VARCHAR(50) PRIMARY KEY,
            longitude DOUBLE PRECISION NOT NULL,
            latitude DOUBLE PRECISION NOT NULL,
            road_name VARCHAR(100),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    ''')


async def load_link_coords(conn):
    """DB 캐시에서 링크 좌표 매핑 로드"""
    rows = await conn.fetch('SELECT link_id, longitude, latitude FROM link_coordinates')
    return {row['link_id']: (row['longitude'], row['latitude']) for row in rows}


async def fetch_road_traffic(client):
    """도로 소통정보 데이터 조회 (신규 API)"""
    params = {
        'apiKey': ITS_API_KEY,
        'type': 'all',
        'getType': 'json'
    }

    try:
        response = await client.get(API_URL, params=params, timeout=60.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            print("Response data:", response.text)
            print("url:", API_URL)
            print("params:", params)
            

            return []

        data = response.json()

        # 신규 API 응답: { header: { resultCode, resultMsg }, body: { totalCount, items: [...] } }
        header = data.get('header', {})
        if str(header.get('resultCode', '')) not in ('0', ''):
            print(f"API error: {header.get('resultMsg', 'Unknown error')}")
            return []

        body = data.get('body', {})
        items = body.get('items', [])

        # XML→JSON 변환 시 items가 dict일 수 있음
        if isinstance(items, dict):
            items = items.get('item', [])
        if isinstance(items, dict):
            items = [items]

        if not items:
            print("No road traffic data found")
            return []

        records = []
        data_time = datetime.now()

        for item in items:
            speed = None
            try:
                speed = int(float(item.get('speed', 0)))
            except (ValueError, TypeError):
                speed = None

            road_name = item.get('roadName', '') or ''
            link_id = str(item.get('linkId', '') or '')

            if not link_id:
                continue

            record = {
                'road_name': road_name[:100] if road_name else 'Unknown',
                'link_id': link_id[:50],
                'speed': speed,
                'status': get_status_from_speed(speed),
                'data_time': data_time
            }
            records.append(record)

        print(f"Fetched {len(records)} road traffic records")
        return records

    except Exception as e:
        print(f"Error fetching road traffic: {e}")
        return []


async def main():
    if not ITS_API_KEY:
        print("Error: ITS_API_KEY environment variable not set")
        return  # 환경변수 없으면 정상 종료 (재시도 방지)

    try:
        conn = await asyncpg.connect(DB_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return  # DB 연결 실패 시 정상 종료 (재시도 방지)

    try:
        # link_coordinates 캐시 테이블 준비
        await ensure_link_coords_table(conn)

        async with httpx.AsyncClient(verify=False) as client:
            print("Fetching road traffic data...")
            records = await fetch_road_traffic(client)

        if not records:
            print("No records fetched, skipping DB insert")
            return  # 데이터 없으면 정상 종료

        # 좌표 매핑 로드
        print("Loading link coordinates from cache...")
        link_coords = await load_link_coords(conn)
        print(f"Cached link coordinates: {len(link_coords)}")

        if not link_coords:
            print("WARNING: link_coordinates table is empty!")
            print("신규 API(trafficInfo)는 좌표를 반환하지 않습니다.")
            print("표준노드링크 데이터(nodelink.its.go.kr)에서 좌표를 로드해야 합니다.")
            print("link_coordinates 테이블에 (link_id, longitude, latitude) 데이터를 삽입하세요.")
            return

        # 좌표가 있는 레코드만 필터링
        insertable = []
        skipped = 0
        for r in records:
            coords = link_coords.get(r['link_id'])
            if coords:
                r['longitude'] = coords[0]
                r['latitude'] = coords[1]
                insertable.append(r)
            else:
                skipped += 1

        if not insertable:
            print(f"No records with matching coordinates (total: {len(records)}, skipped: {skipped})")
            return

        if skipped > 0:
            print(f"Skipped {skipped}/{len(records)} records without coordinates")

        print(f"Inserting {len(insertable)} records to database...")

        # 기존 데이터 삭제 후 새 데이터 삽입 (전체 갱신)
        await conn.execute("DELETE FROM road_traffic WHERE data_time < NOW() - INTERVAL '1 hour';")

        query = """
            INSERT INTO public.road_traffic (
                road_name, link_id, speed, status,
                longitude, latitude, location, data_time
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                ST_SetSRID(ST_MakePoint($5, $6), 4326),
                $7
            );
        """

        params_list = [
            (
                r['road_name'], r['link_id'], r['speed'], r['status'],
                r['longitude'], r['latitude'], r['data_time']
            )
            for r in insertable
        ]

        # 배치 삽입 (1000개 단위)
        batch_size = 1000
        for i in range(0, len(params_list), batch_size):
            batch = params_list[i:i + batch_size]
            await conn.executemany(query, batch)
            print(f"Inserted batch {i // batch_size + 1}/{(len(params_list) + batch_size - 1) // batch_size}")

        print(f"Total inserted: {len(params_list)} records")
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        # 에러 발생해도 정상 종료 (Kubernetes 재시도 방지)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
