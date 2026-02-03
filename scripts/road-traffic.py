import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
도로 소통정보 수집 스크립트
국가교통정보센터(ITS) API를 호출하여 실시간 도로 소통정보를 DB에 저장
환경 변수: ITS_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: road_traffic
"""

ITS_API_KEY = os.getenv('ITS_API_KEY')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 국가교통정보센터 실시간 도로 소통정보 API
API_URL = "http://openapi.its.go.kr:8082/api/NLinkSpeedInfo"

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


def parse_coords(coord_str):
    """좌표 문자열 파싱"""
    try:
        return float(coord_str) if coord_str else None
    except (ValueError, TypeError):
        return None


async def fetch_road_traffic(client):
    """도로 소통정보 데이터 조회"""
    params = {
        'key': ITS_API_KEY,
        'type': 'all',
        'getType': 'json'
    }

    try:
        response = await client.get(API_URL, params=params, timeout=60.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            return []

        data = response.json()

        # API 응답 구조 확인
        body = data.get('body', {})
        items = body.get('items', [])

        if not items:
            print("No road traffic data found")
            return []

        records = []
        data_time = datetime.now()

        for item in items:
            longitude = parse_coords(item.get('startNodeX') or item.get('coordX'))
            latitude = parse_coords(item.get('startNodeY') or item.get('coordY'))

            if longitude is None or latitude is None:
                continue

            speed = None
            try:
                speed = int(float(item.get('speed', 0)))
            except (ValueError, TypeError):
                speed = None

            road_name = item.get('roadName', '') or item.get('linkId', '')
            road_type = '고속도로' if item.get('roadType') == '1' else '일반'

            record = {
                'road_name': road_name[:100] if road_name else 'Unknown',
                'link_id': str(item.get('linkId', ''))[:50],
                'speed': speed,
                'status': get_status_from_speed(speed, road_type),
                'longitude': longitude,
                'latitude': latitude,
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
        async with httpx.AsyncClient() as client:
            print("Fetching road traffic data...")
            records = await fetch_road_traffic(client)

        if not records:
            print("No records fetched, skipping DB insert")
            return  # 데이터 없으면 정상 종료

        print(f"Inserting {len(records)} records to database...")

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
            for r in records
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
