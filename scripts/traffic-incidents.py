import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
교통 돌발상황 수집 스크립트
국가교통정보센터(ITS) 신규 API를 호출하여 돌발상황 데이터를 DB에 저장
API 문서: https://www.its.go.kr/opendata/opendataList?service=event
환경 변수: ITS_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: traffic_incidents
"""

ITS_API_KEY = (os.getenv('ITS_API_KEY') or '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 국가교통정보센터 돌발상황 API (신규 엔드포인트)
API_URL = "https://openapi.its.go.kr:9443/eventInfo"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 돌발 유형 매핑 (신규 API eventType 한글 → DB 저장값)
EVENT_TYPE_MAP = {
    '교통사고': '사고',
    '공사': '공사',
    '작업': '공사',
    '기상': '기상',
    '기타돌발': '기타',
    '재난': '재난',
    '기타': '기타',
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


def parse_severity(lanes_block_type):
    """차로 차단 유형으로부터 심각도 파싱 (0~3)"""
    try:
        if not lanes_block_type:
            return 1
        val = int(lanes_block_type)
        return val if 0 <= val <= 3 else 1
    except (ValueError, TypeError):
        return 1


async def fetch_traffic_incidents(client):
    """돌발상황 데이터 조회 (신규 API)"""
    params = {
        'apiKey': ITS_API_KEY,
        'type': 'all',
        'eventType': 'all',
        'getType': 'json'
    }

    masked_key = ITS_API_KEY[:6] + '***' + ITS_API_KEY[-4:] if len(ITS_API_KEY) > 10 else '***'
    print("Requesting traffic incidents from ITS API...")
    print(f"API URL: {API_URL}")
    print(f"API Key (masked): {masked_key} (length: {len(ITS_API_KEY)})")
    print(f"Params: type={params['type']}, eventType={params['eventType']}, getType={params['getType']}")
    print()

    try:
        response = await client.get(API_URL, params=params, timeout=30.0)

        print(f"--- Response ---")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"URL: {str(response.url).replace(ITS_API_KEY, masked_key)}")
        print(f"Body (raw, first 1000 chars): {response.text[:1000]}")
        print(f"--- End Response ---")
        print()

        # 응답 파싱 (에러 응답도 JSON일 수 있음)
        try:
            data = response.json()
        except Exception as parse_err:
            print(f"JSON 파싱 실패: {parse_err}")
            data = None

        if response.status_code != 200:
            msg = ''
            if data and isinstance(data, dict):
                msg = data.get('header', {}).get('resultMsg', '')
            print(f"Error: HTTP {response.status_code} - {msg}")
            if response.status_code == 401:
                print("→ API 키가 유효하지 않거나 인증에 실패했습니다.")
                print("→ ITS 포털(its.go.kr/opendata/opendataList)에서 키 상태를 확인하세요.")
            return []

        if data is None:
            print("Error: 응답을 JSON으로 파싱할 수 없습니다.")
            return []

        # 신규 API 응답: { header: { resultCode, resultMsg }, body: { totalCount, items: [...] } }
        header = data.get('header', {})
        result_code = str(header.get('resultCode', ''))
        result_msg = header.get('resultMsg', 'Unknown error')

        if result_code not in ('0', ''):
            print(f"API error (code {result_code}): {result_msg}")
            if result_code == '4001':
                print("→ 개인 제한량 초과: API 키 할당량이 소진되었거나 키가 비활성 상태입니다.")
            return []

        body = data.get('body', {})
        if not isinstance(body, dict):
            print(f"API가 빈 body를 반환했습니다 (type: {type(body).__name__}, value: {repr(body)})")
            print("→ API 키 할당량 초과이거나 서버 문제일 수 있습니다.")
            return []

        print(f"totalCount: {body.get('totalCount', 'N/A')}")

        items = body.get('items', [])

        # XML→JSON 변환 시 items가 dict일 수 있음
        if isinstance(items, dict):
            items = items.get('item', [])
        if isinstance(items, dict):
            items = [items]

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

            # 고유 ID: linkId + startDate 조합
            link_id = str(item.get('linkId', '') or '')
            start_date_str = str(item.get('startDate', '') or '')
            incident_id = f"{link_id}_{start_date_str}" if link_id else start_date_str

            event_type = item.get('eventType', '기타') or '기타'

            record = {
                'incident_id': incident_id[:100],
                'type': EVENT_TYPE_MAP.get(event_type, event_type),
                'title': ((item.get('roadName', '') or '') + ' ' + (item.get('eventDetailType', '') or '')).strip(),
                'description': item.get('message', '') or '',
                'road_name': item.get('roadName', '') or '',
                'longitude': longitude,
                'latitude': latitude,
                'start_time': start_time,
                'end_time': parse_datetime(item.get('endDate')),
                'severity': parse_severity(item.get('lanesBlockType'))
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
        async with httpx.AsyncClient(verify=False) as client:
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
