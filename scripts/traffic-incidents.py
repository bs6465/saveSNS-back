import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
교통 돌발상황 수집 스크립트
국가교통정보센터(ITS) API를 호출하여 돌발상황 데이터를 DB에 저장
환경 변수: ITS_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: traffic_incidents
"""

ITS_API_KEY = os.getenv('ITS_API_KEY').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 국가교통정보센터 돌발상황 API
API_URL = "http://openapi.its.go.kr:8082/api/NIncidentIdentInfo"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 돌발 유형 코드 매핑
INCIDENT_TYPE_MAP = {
    '1': '사고',
    '2': '공사',
    '3': '행사',
    '4': '기타'
}


def parse_datetime(date_str):
    """날짜 문자열을 datetime 객체로 변환"""
    try:
        if not date_str:
            return None
        # 형식: 20240128143000
        return datetime.strptime(date_str[:14], "%Y%m%d%H%M%S")
    except (ValueError, TypeError):
        return None


def parse_coords(coord_str):
    """좌표 문자열 파싱 (WGS84)"""
    try:
        return float(coord_str) if coord_str else None
    except (ValueError, TypeError):
        return None


async def fetch_traffic_incidents(client):
    """돌발상황 데이터 조회"""
    params = {
        'key': ITS_API_KEY,
        'type': 'all',  # 전체 조회
        'getType': 'json'
    }

    print("Requesting traffic incidents from ITS API...")
    print("API URL:", API_URL)
    print("Parameters:", params)
    print()

    try:
        response = await client.get(API_URL, params=params, timeout=30.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            print("Response data:", response.text)
            return []

        data = response.json()
        print(f"Received data: {data}")
        # API 응답 구조 확인
        body = data.get('body', {})
        items = body.get('items', [])

        if not items:
            print("No traffic incidents found")
            return []

        records = []
        for item in items:
            start_time = parse_datetime(item.get('startDate'))
            if not start_time:
                continue

            longitude = parse_coords(item.get('coordX'))
            latitude = parse_coords(item.get('coordY'))
            
            if longitude is None or latitude is None:
                continue

            record = {
                'incident_id': item.get('incidentId') or str(item.get('idx', '')),
                'type': INCIDENT_TYPE_MAP.get(str(item.get('incidentType', '')), '기타'),
                'title': item.get('roadName', '') + ' ' + item.get('eventType', ''),
                'description': item.get('incidentContent', ''),
                'road_name': item.get('roadName', ''),
                'longitude': longitude,
                'latitude': latitude,
                'start_time': start_time,
                'end_time': parse_datetime(item.get('endDate')),
                'severity': int(item.get('lanesBlockType', 1)) if item.get('lanesBlockType') else 1
            }
            records.append(record)

        print(f"Fetched {len(records)} traffic incidents")
        return records

    except Exception as e:
        print(f"Error fetching traffic incidents: {e}")
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
            print("Fetching traffic incidents...")
            records = await fetch_traffic_incidents(client)

        if not records:
            print("No records fetched, skipping DB operations")
        else:
            print(f"Upserting {len(records)} records to database...")

            query = """
                INSERT INTO public.traffic_incidents (
                    incident_id, type, title, description, road_name,
                    longitude, latitude, location,
                    start_time, end_time, severity
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    ST_SetSRID(ST_MakePoint($6, $7), 4326),
                    $8, $9, $10
                )
                ON CONFLICT (incident_id)
                DO UPDATE SET
                    type = EXCLUDED.type,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    road_name = EXCLUDED.road_name,
                    longitude = EXCLUDED.longitude,
                    latitude = EXCLUDED.latitude,
                    location = EXCLUDED.location,
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    severity = EXCLUDED.severity;
            """

            params_list = [
                (
                    r['incident_id'], r['type'], r['title'], r['description'],
                    r['road_name'], r['longitude'], r['latitude'],
                    r['start_time'], r['end_time'], r['severity']
                )
                for r in records
            ]

            await conn.executemany(query, params_list)
            print(f"Upserted {len(params_list)} records")

        # 종료된 돌발상황 정리 (1일 이상 지난 종료 이벤트)
        print("Cleaning up expired incidents...")
        await conn.execute("""
            DELETE FROM traffic_incidents
            WHERE end_time IS NOT NULL AND end_time < NOW() - INTERVAL '1 day';
        """)
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        # 에러 발생해도 정상 종료 (Kubernetes 재시도 방지)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
