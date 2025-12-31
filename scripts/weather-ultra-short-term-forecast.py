import asyncio
import asyncpg
import httpx
from datetime import datetime
import os
import json

WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

API_URL = "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
CONCURRENT_LIMIT = 50  # 동시에 호출할 API 최대 개수 (서버 부하 방지)

MULTIPLY_TARGETS = {'T1H', 'RN1', 'UUU', 'VVV', 'LGT', 'WSD'}  # 10을 곱해야 하는 카테고리 목록

now = datetime.now()
base_date = now.strftime("%Y%m%d")
base_time = now.strftime("%H") + "30" # 시간 + 30분 고정
 
def transform_value(category, value_str):
    """
    카테고리에 따라 값을 변환합니다.
    - RN1 '강수없음' -> 0
    - MULTIPLY_TARGETS -> float * 10 -> int
    - 나머지 -> int
    """
    if category == 'RN1':
        if '강수없음' in value_str:
            return 0
    
    try:
        val = float(value_str)
    except (ValueError, TypeError):
        return 0 # 변환 불가 시 기본값 0

    # 10 곱하기 처리
    if category in MULTIPLY_TARGETS:
        return int(val * 10)
    
    return int(val)

def parse_datetime(date_str, time_str):
    """YYYYMMDD, HHMM 문자열을 datetime 객체로 변환"""
    return datetime.strptime(f"{date_str}{time_str}", "%Y%m%d%H%M")

async def fetch_and_process_data(client, row, sem):
    """
    API 호출 후, DB 테이블 구조에 맞게 데이터를 가공(Pivot)하여 반환
    """
    nx, ny = row['nx'], row['ny']
    
    params = {
        'authKey': WEATHER_API_KEY, 'numOfRows': '1000', 'pageNo': '1',
        'dataType': 'JSON', 'base_date': base_date, 'base_time': base_time,
        'nx': nx, 'ny': ny
    }

    async with sem:
        try:
            response = await client.get(API_URL, params=params, timeout=10.0)
            if response.status_code != 200: return []
            
            # 응답 JSON 파싱
            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', {}).get('item')
            if not items: return []

            # --- 데이터 가공 (Pivoting) ---
            # API는 카테고리별로 Row가 오지만, DB에는 한 시간대의 모든 날씨가 1 Row여야 함.
            # Key: (nx, ny, fcst_datetime 문자열)
            # Value: { category: val, ... }
            grouped = {}
            
            # base_datetime 생성 (API 호출 기준 시각) TIMESTAMP값
            base_dt_obj = parse_datetime(base_date, base_time)

            for item in items:
                fcst_date = item['fcstDate']
                fcst_time = item['fcstTime']
                category = item['category']
                raw_val = item['fcstValue']
                
                # 예측 시간 (Key 생성용)
                fcst_dt_obj = parse_datetime(fcst_date, fcst_time)
                
                # 그룹핑 키
                key = (nx, ny, fcst_dt_obj)
                
                if key not in grouped:
                    grouped[key] = {
                        'base_datetime': base_dt_obj,
                        'fcst_datetime': fcst_dt_obj,
                        'nx': nx,
                        'ny': ny,
                        # 초기값 None 세팅 (모든 컬럼)
                        'T1H': None, 'RN1': None, 'SKY': None, 'UUU': None,
                        'VVV': None, 'REH': None, 'PTY': None, 'LGT': None,
                        'VEC': None, 'WSD': None
                    }
                
                # 값 변환 및 할당
                if category in grouped[key]: # 테이블에 있는 컬럼만 처리
                    grouped[key][category] = transform_value(category, raw_val)

            # 딕셔너리의 값들만 리스트로 변환하여 반환
            return list(grouped.values())

        except Exception as e:
            print(f"Error ({nx}, {ny}): {e}")
            return []

async def main():
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # View에서 대상 조회
        rows = await conn.fetch("SELECT nx, ny FROM view_unique_user_grids") # 뷰 이름 확인 필요
        print(f"Targets: {len(rows)}")

        # 세마포어 생성 (동시성 제한)
        sem = asyncio.Semaphore(CONCURRENT_LIMIT)
        processed_records = []

        async with httpx.AsyncClient() as client:
            print("Fetching weather data...")
            tasks = [fetch_and_process_data(client, row, sem) for row in rows]
            results = await asyncio.gather(*tasks)
            
            for res in results:
                if res:
                    processed_records.extend(res)

        print("Done.")
        print(f"Total processed records: {len(processed_records)}")
        print(processed_records[:10])  # 샘플 출력
        # DB에 Upsert
        if processed_records:
            print(f"Upserting {len(processed_records)} records...")
            
            # 쿼리: UPSERT (ON CONFLICT) 사용
            # Unique Key: (nx, ny, fcst_datetime)
            query = """
                INSERT INTO public.weather_ultra_short_term_forecast (
                    nx, ny, base_datetime, fcst_datetime,
                    t1h, rn1, sky, uuu, vvv, reh, pty, lgt, vec, wsd
                ) VALUES (
                    $1, $2, $3, $4, 
                    $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                )
                ON CONFLICT (nx, ny, fcst_datetime) 
                DO UPDATE SET
                    base_datetime = EXCLUDED.base_datetime,
                    t1h = EXCLUDED.t1h,
                    rn1 = EXCLUDED.rn1,
                    sky = EXCLUDED.sky,
                    uuu = EXCLUDED.uuu,
                    vvv = EXCLUDED.vvv,
                    reh = EXCLUDED.reh,
                    pty = EXCLUDED.pty,
                    lgt = EXCLUDED.lgt,
                    vec = EXCLUDED.vec,
                    wsd = EXCLUDED.wsd,
                    updated_at = now();
            """
            
            # 쿼리 파라미터 순서에 맞게 튜플 리스트 생성
            params_list = [
                (
                    r['nx'], r['ny'], r['base_datetime'], r['fcst_datetime'],
                    r['T1H'], r['RN1'], r['SKY'], r['UUU'], r['VVV'], 
                    r['REH'], r['PTY'], r['LGT'], r['VEC'], r['WSD']
                )
                for r in processed_records
            ]

            await conn.executemany(query, params_list)
            print("Done.")
        else:
            print("No records to insert.")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())