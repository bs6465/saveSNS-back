import asyncio
import asyncpg
import httpx
from datetime import datetime, timedelta
import os

"""
대기질 예보통보 수집 스크립트
에어코리아 대기질 예보통보 조회 API를 호출하여 예보 데이터를 DB에 저장
API: https://www.data.go.kr/data/15073861/openapi.do
환경 변수: AIR_QUALITY_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: air_quality_forecast
"""

AIR_QUALITY_API_KEY = os.getenv('AIR_QUALITY_API_KEY', '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 에어코리아 대기질 예보통보 조회 API
API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 통보코드 목록
INFORM_CODE_LIST = ["PM10", "PM25", "O3"]

# 지역명 매핑 (API 응답 -> 표준화된 시도명)
REGION_MAPPING = {
    "서울": "서울", "인천": "인천", "경기북부": "경기", "경기남부": "경기",
    "영서": "강원", "영동": "강원", "대전": "대전", "세종": "세종",
    "충남": "충남", "충북": "충북", "광주": "광주", "전남": "전남",
    "전북": "전북", "부산": "부산", "대구": "대구", "울산": "울산",
    "경남": "경남", "경북": "경북", "제주": "제주"
}


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
            response = await client.get(API_URL, params=params, timeout=15.0)
            if response.status_code != 200:
                print(f"Error fetching {inform_code} for {search_date}: HTTP {response.status_code}")
                return []

            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', [])

            if not items:
                print(f"No data for {inform_code} on {search_date}")
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

            print(f"Fetched {len(records)} records for {inform_code} on {search_date}")
            return records

        except Exception as e:
            print(f"Error fetching {inform_code} for {search_date}: {e}")
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
        all_records = []

        # 오늘과 내일 날짜 조회
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        search_dates = [today, tomorrow]

        async with httpx.AsyncClient() as client:
            print("Fetching air quality forecast data...")
            tasks = [
                fetch_forecast(client, date, code, sem)
                for date in search_dates
                for code in INFORM_CODE_LIST
            ]
            results = await asyncio.gather(*tasks)

            for res in results:
                if res:
                    all_records.extend(res)

        print(f"Total records: {len(all_records)}")

        if all_records:
            print("Upserting records to database...")

            query = """
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

            params_list = [
                (
                    r['sido_name'], r['inform_code'], r['forecast_date'],
                    r['publish_time'], r['grade'], r['inform_cause'],
                    r['inform_overall']
                )
                for r in all_records
            ]

            await conn.executemany(query, params_list)
            print(f"Upserted {len(params_list)} records")

        # 오래된 데이터 정리 (7일 이상)
        print("Cleaning up old records...")
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
