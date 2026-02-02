import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
대기질 정보 수집 스크립트
에어코리아 API를 호출하여 전국 시도별 대기질 데이터를 DB에 저장
환경 변수: AIR_QUALITY_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: air_quality
"""

AIR_QUALITY_API_KEY = os.getenv('AIR_QUALITY_API_KEY')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 에어코리아 시도별 대기질 API
API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 전국 시도 목록
SIDO_LIST = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
]


def parse_grade(grade_str):
    """등급 문자열을 숫자로 변환 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)"""
    try:
        return int(grade_str) if grade_str and grade_str != '-' else None
    except (ValueError, TypeError):
        return None


def parse_value(value_str, is_float=False):
    """값 문자열을 숫자로 변환"""
    try:
        if value_str is None or value_str == '-' or value_str == '':
            return None
        return float(value_str) if is_float else int(value_str)
    except (ValueError, TypeError):
        return None


def parse_datatime(date_str):
    """날짜 문자열을 datetime 객체로 변환 (형식: 2024-01-28 14:00)"""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d %H:%M")
    except (ValueError, TypeError):
        return None


async def fetch_sido_air_quality(client, sido_name, sem):
    """시도별 대기질 데이터 조회"""
    params = {
        'serviceKey': AIR_QUALITY_API_KEY,
        'returnType': 'json',
        'numOfRows': '100',
        'pageNo': '1',
        'sidoName': sido_name,
        'ver': '1.3'  # 최신 버전 (PM2.5 등급 포함)
    }

    async with sem:
        try:
            response = await client.get(API_URL, params=params, timeout=15.0)
            if response.status_code != 200:
                print(f"Error fetching {sido_name}: HTTP {response.status_code}")
                return []

            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', [])
            
            if not items:
                print(f"No data for {sido_name}")
                return []

            records = []
            for item in items:
                data_time = parse_datatime(item.get('dataTime'))
                if not data_time:
                    continue

                record = {
                    'station_name': item.get('stationName'),
                    'sido_name': sido_name,
                    'pm25_value': parse_value(item.get('pm25Value')),
                    'pm10_value': parse_value(item.get('pm10Value')),
                    'pm25_grade': parse_grade(item.get('pm25Grade')),
                    'pm10_grade': parse_grade(item.get('pm10Grade')),
                    'khai_grade': parse_grade(item.get('khaiGrade')),
                    'khai_value': parse_value(item.get('khaiValue')),
                    'o3_value': parse_value(item.get('o3Value'), is_float=True),
                    'co_value': parse_value(item.get('coValue'), is_float=True),
                    'no2_value': parse_value(item.get('no2Value'), is_float=True),
                    'so2_value': parse_value(item.get('so2Value'), is_float=True),
                    'data_time': data_time
                }
                records.append(record)

            print(f"Fetched {len(records)} records for {sido_name}")
            return records

        except Exception as e:
            print(f"Error fetching {sido_name}: {e}")
            return []


async def main():
    if not AIR_QUALITY_API_KEY:
        print("Error: AIR_QUALITY_API_KEY environment variable not set")
        return

    conn = await asyncpg.connect(DB_URL)

    try:
        sem = asyncio.Semaphore(5)  # 동시 요청 제한
        all_records = []

        async with httpx.AsyncClient() as client:
            print("Fetching air quality data for all regions...")
            tasks = [fetch_sido_air_quality(client, sido, sem) for sido in SIDO_LIST]
            results = await asyncio.gather(*tasks)

            for res in results:
                if res:
                    all_records.extend(res)

        print(f"Total records: {len(all_records)}")

        if all_records:
            print("Upserting records to database...")

            query = """
                INSERT INTO public.air_quality (
                    station_name, sido_name, pm25_value, pm10_value,
                    pm25_grade, pm10_grade, khai_grade, khai_value,
                    o3_value, co_value, no2_value, so2_value, data_time
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                )
                ON CONFLICT (station_name, data_time)
                DO UPDATE SET
                    pm25_value = EXCLUDED.pm25_value,
                    pm10_value = EXCLUDED.pm10_value,
                    pm25_grade = EXCLUDED.pm25_grade,
                    pm10_grade = EXCLUDED.pm10_grade,
                    khai_grade = EXCLUDED.khai_grade,
                    khai_value = EXCLUDED.khai_value,
                    o3_value = EXCLUDED.o3_value,
                    co_value = EXCLUDED.co_value,
                    no2_value = EXCLUDED.no2_value,
                    so2_value = EXCLUDED.so2_value;
            """

            params_list = [
                (
                    r['station_name'], r['sido_name'], r['pm25_value'], r['pm10_value'],
                    r['pm25_grade'], r['pm10_grade'], r['khai_grade'], r['khai_value'],
                    r['o3_value'], r['co_value'], r['no2_value'], r['so2_value'],
                    r['data_time']
                )
                for r in all_records if r['station_name']
            ]

            await conn.executemany(query, params_list)
            print(f"Upserted {len(params_list)} records")

        # 오래된 데이터 정리 (7일 이상)
        print("Cleaning up old records...")
        await conn.execute("""
            DELETE FROM air_quality
            WHERE data_time < NOW() - INTERVAL '7 days';
        """)
        print("Done.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
