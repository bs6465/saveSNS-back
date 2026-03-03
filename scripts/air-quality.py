import asyncio
import asyncpg
import httpx
from datetime import datetime, timedelta
import os

"""
대기질 데이터 수집 스크립트
1. 에어코리아 시도별 실시간 측정정보 조회 API → air_quality 테이블
2. 에어코리아 대기질 예보통보 조회 API → air_quality_forecast 테이블

API: https://www.data.go.kr/data/15073861/openapi.do
환경 변수: AIR_QUALITY_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: air_quality, air_quality_forecast
"""

AIR_QUALITY_API_KEY = os.getenv('AIR_QUALITY_API_KEY', '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 에어코리아 API URLs
REALTIME_API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty"
FORECAST_API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 시도명 목록 (실시간 측정정보 조회용)
SIDO_NAMES = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
]

# 통보코드 목록 (예보통보 조회용)
INFORM_CODE_LIST = ["PM10", "PM25", "O3"]

# 지역명 매핑 (예보통보 API 응답 -> 표준화된 시도명)
REGION_MAPPING = {
    "서울": "서울", "인천": "인천", "경기북부": "경기", "경기남부": "경기",
    "영서": "강원", "영동": "강원", "대전": "대전", "세종": "세종",
    "충남": "충남", "충북": "충북", "광주": "광주", "전남": "전남",
    "전북": "전북", "부산": "부산", "대구": "대구", "울산": "울산",
    "경남": "경남", "경북": "경북", "제주": "제주"
}


###############################################################################
# 1. 실시간 측정정보 수집 (air_quality 테이블)
###############################################################################

def safe_int(value):
    """값을 int로 변환, 실패 시 None 반환"""
    if value is None or value == '-' or value == '':
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def safe_float(value):
    """값을 float로 변환, 실패 시 None 반환"""
    if value is None or value == '-' or value == '':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_data_time(data_time_str):
    """실시간 측정 데이터 시간 파싱 (예: '2024-01-28 14:00')"""
    try:
        return datetime.strptime(data_time_str, "%Y-%m-%d %H:%M")
    except (ValueError, TypeError):
        return None


async def fetch_realtime_sido(client, sido_name, sem):
    """시도별 실시간 대기질 측정정보 조회"""
    params = {
        'serviceKey': AIR_QUALITY_API_KEY,
        'returnType': 'json',
        'numOfRows': '200',
        'pageNo': '1',
        'sidoName': sido_name,
        'ver': '1.3'
    }

    async with sem:
        try:
            response = await client.get(REALTIME_API_URL, params=params, timeout=15.0)
            if response.status_code != 200:
                print(f"Error fetching realtime for {sido_name}: HTTP {response.status_code}")
                return []

            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', [])

            if not items:
                print(f"No realtime data for {sido_name}")
                return []

            records = []
            for item in items:
                data_time = parse_data_time(item.get('dataTime'))
                if not data_time:
                    continue

                record = {
                    'station_name': item.get('stationName'),
                    'sido_name': sido_name,
                    'pm25_value': safe_int(item.get('pm25Value')),
                    'pm10_value': safe_int(item.get('pm10Value')),
                    'pm25_grade': safe_int(item.get('pm25Grade')),
                    'pm10_grade': safe_int(item.get('pm10Grade')),
                    'khai_grade': safe_int(item.get('khaiGrade')),
                    'khai_value': safe_int(item.get('khaiValue')),
                    'o3_value': safe_float(item.get('o3Value')),
                    'co_value': safe_float(item.get('coValue')),
                    'no2_value': safe_float(item.get('no2Value')),
                    'so2_value': safe_float(item.get('so2Value')),
                    'data_time': data_time,
                }
                records.append(record)

            print(f"Fetched {len(records)} realtime records for {sido_name}")
            return records

        except Exception as e:
            print(f"Error fetching realtime for {sido_name}: {e}")
            return []


###############################################################################
# 2. 예보통보 수집 (air_quality_forecast 테이블)
###############################################################################

def parse_grade_text(grade_text):
    """예보 등급 텍스트를 숫자로 변환"""
    grade_map = {"좋음": 1, "보통": 2, "나쁨": 3, "매우나쁨": 4}
    return grade_map.get(grade_text)


def parse_inform_grade(inform_grade_str):
    """
    지역별 예보등급 문자열 파싱
    예: "서울 : 보통,인천 : 보통,경기북부 : 보통,..."
    """
    if not inform_grade_str:
        return {}

    result = {}
    pairs = inform_grade_str.split(",")
    for pair in pairs:
        pair = pair.strip()
        if " : " in pair:
            region, grade = pair.split(" : ", 1)
            region = region.strip()
            grade = grade.strip()
            # 표준화된 시도명으로 매핑
            sido_name = REGION_MAPPING.get(region, region)
            grade_num = parse_grade_text(grade)
            if grade_num:
                # 같은 시도에 여러 지역이 있으면 더 나쁜 등급 사용 (예: 경기북부, 경기남부)
                if sido_name in result:
                    result[sido_name] = max(result[sido_name], grade_num)
                else:
                    result[sido_name] = grade_num
    return result


def parse_datetime(date_str, time_str=None):
    """날짜/시간 문자열을 datetime 객체로 변환"""
    try:
        if time_str:
            # 발표시간 형식: "2024-01-28 11시 발표"
            time_str = time_str.replace("시 발표", "").strip()
            return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H")
        else:
            return datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


async def fetch_forecast(client, search_date, inform_code, sem):
    """대기질 예보 데이터 조회"""
    params = {
        'serviceKey': AIR_QUALITY_API_KEY,
        'returnType': 'json',
        'numOfRows': '100',
        'pageNo': '1',
        'searchDate': search_date,
        'InformCode': inform_code
    }

    async with sem:
        try:
            response = await client.get(FORECAST_API_URL, params=params, timeout=15.0)
            if response.status_code != 200:
                print(f"Error fetching forecast {inform_code} for {search_date}: HTTP {response.status_code}")
                return []

            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', [])

            if not items:
                print(f"No forecast data for {inform_code} on {search_date}")
                return []

            records = []
            for item in items:
                inform_data = item.get('informData')  # 예보 날짜
                inform_grade = item.get('informGrade')  # 지역별 등급 문자열
                inform_cause = item.get('informCause')  # 발생 원인
                inform_overall = item.get('informOverall')  # 예보 개황
                data_time = item.get('dataTime')  # 발표 시간

                if not inform_data or not inform_grade:
                    continue

                forecast_date = parse_datetime(inform_data)
                publish_time = parse_datetime(search_date, data_time.split(" ")[-2] if data_time else None)

                if not forecast_date:
                    continue

                # 지역별 등급 파싱
                region_grades = parse_inform_grade(inform_grade)

                for sido_name, grade in region_grades.items():
                    record = {
                        'sido_name': sido_name,
                        'inform_code': inform_code,
                        'forecast_date': forecast_date,
                        'publish_time': publish_time or datetime.now(),
                        'grade': grade,
                        'inform_cause': inform_cause,
                        'inform_overall': inform_overall
                    }
                    records.append(record)

            print(f"Fetched {len(records)} forecast records for {inform_code} on {search_date}")
            return records

        except Exception as e:
            print(f"Error fetching forecast {inform_code} for {search_date}: {e}")
            return []

 
async def main():
    if not AIR_QUALITY_API_KEY:
        print("Error: AIR_QUALITY_API_KEY environment variable not set")
        return  # 환경변수 없으면 정상 종료 (재시도 방지)

    try:
        conn = await asyncpg.connect(DB_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return  # DB 연결 실패 시 정상 종료 (재시도 방지)

    try:
        sem = asyncio.Semaphore(5)  # 동시 요청 제한

        async with httpx.AsyncClient() as client:
            # ─── 1단계: 실시간 측정정보 수집 ───
            print("=" * 50)
            print("Fetching realtime air quality data...")
            realtime_records = []
            realtime_tasks = [
                fetch_realtime_sido(client, sido, sem)
                for sido in SIDO_NAMES
            ]
            realtime_results = await asyncio.gather(*realtime_tasks)
            for res in realtime_results:
                if res:
                    realtime_records.extend(res)

            print(f"Total realtime records: {len(realtime_records)}")

            if realtime_records:
                print("Upserting realtime records to air_quality table...")
                realtime_query = """
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
                realtime_params = [
                    (
                        r['station_name'], r['sido_name'],
                        r['pm25_value'], r['pm10_value'],
                        r['pm25_grade'], r['pm10_grade'],
                        r['khai_grade'], r['khai_value'],
                        r['o3_value'], r['co_value'],
                        r['no2_value'], r['so2_value'],
                        r['data_time']
                    )
                    for r in realtime_records
                    if r['station_name']  # station_name은 필수
                ]
                await conn.executemany(realtime_query, realtime_params)
                print(f"Upserted {len(realtime_params)} realtime records")

            # ─── 2단계: 예보통보 수집 ───
            print("=" * 50)
            print("Fetching air quality forecast data...")
            forecast_records = []

            # 오늘 날짜만 조회 (오늘 발표된 예보에 내일 데이터도 포함됨)
            today = datetime.now().strftime("%Y-%m-%d")

            forecast_tasks = [
                fetch_forecast(client, today, code, sem)
                for code in INFORM_CODE_LIST
            ]
            forecast_results = await asyncio.gather(*forecast_tasks)

            for res in forecast_results:
                if res:
                    forecast_records.extend(res)

            print(f"Total forecast records: {len(forecast_records)}")

            if forecast_records:
                print("Upserting forecast records to air_quality_forecast table...")
                forecast_query = """
                    INSERT INTO public.air_quality_forecast (
                        sido_name, inform_code, forecast_date, publish_time,
                        grade, inform_cause, inform_overall
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7
                    )
                    ON CONFLICT (sido_name, inform_code, forecast_date)
                    DO UPDATE SET
                        publish_time = EXCLUDED.publish_time,
                        grade = EXCLUDED.grade,
                        inform_cause = EXCLUDED.inform_cause,
                        inform_overall = EXCLUDED.inform_overall;
                """
                forecast_params = [
                    (
                        r['sido_name'], r['inform_code'], r['forecast_date'],
                        r['publish_time'], r['grade'], r['inform_cause'],
                        r['inform_overall']
                    )
                    for r in forecast_records
                ]
                await conn.executemany(forecast_query, forecast_params)
                print(f"Upserted {len(forecast_params)} forecast records")

        # 오래된 데이터 정리 (7일 이상)
        print("=" * 50)
        print("Cleaning up old records...")
        await conn.execute("""
            DELETE FROM air_quality
            WHERE data_time < NOW() - INTERVAL '7 days';
        """)
        await conn.execute("""
            DELETE FROM air_quality_forecast
            WHERE forecast_date < NOW() - INTERVAL '7 days';
        """)
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        # 에러 발생해도 정상 종료 (Kubernetes 재시도 방지)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
