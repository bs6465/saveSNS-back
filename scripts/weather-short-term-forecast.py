import asyncio
import asyncpg
import httpx
from datetime import datetime
import os
import re

"""
단기예보 스크립트
(02, 05, 08, 11, 14, 17, 20, 23시 발표, 예보시간은 발표시각부터 최대 48시간 후)
DB 테이블: weather_short_term_forecast
"""


WEATHER_API_KEY = os.getenv('WEATHER_API_KEY')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 단기예보 조회 API
API_URL = "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
CONCURRENT_LIMIT = 20

# 단기예보에서 실수(float)로 오지만 정수(int)로 저장하기 위해 10을 곱할 대상들
# TMP:기온, UUU/VVV:바람, WSD:풍속, WAV:파고, PCP:강수량, SNO:적설량, TMN/TMX:최저/최고기온
MULTIPLY_TARGETS = {'TMP', 'UUU', 'VVV', 'WSD', 'WAV', 'PCP', 'SNO', 'TMN', 'TMX'}

now = datetime.now()
base_date = now.strftime("%Y%m%d")
# Cron이 API 발표 시각(02, 05, 08...) 이후에 돈다고 가정하고 현재 시각의 '정시'를 Base Time으로 사용
base_time = now.strftime("%H") + "00" 

def parse_kma_value(value_str):
    """
    단기예보 특유의 문자열 데이터 처리
    - "강수없음", "적설없음" -> 0.0
    - "1.0mm 미만" -> 1.0 (또는 0.x 처리 필요시 수정)
    - "30.0~50.0mm" -> 평균값 or 최대값 (여기선 앞의 숫자 파싱)
    """
    if not value_str:
        return 0.0
    if '없음' in value_str:
        return 0.0
    
    # 숫자만 추출 (소수점 포함)
    # 예: "30.0~50.0mm" -> 30.0 추출
    match = re.search(r'\d+(\.\d+)?', value_str)
    if match:
        return float(match.group())
    return 0.0

def transform_value(category, value_str):
    """
    카테고리에 따라 값을 변환 (x10 처리 등)
    """
    val = 0.0
    
    # 1. 강수량(PCP), 적설량(SNO)은 문자열 파싱 필요
    if category in ['PCP', 'SNO']:
        val = parse_kma_value(value_str)
    else:
        # 2. 일반 실수 변환
        try:
            val = float(value_str)
        except (ValueError, TypeError):
            return None

    # 3. 10 곱하기 처리 (정수화)
    if category in MULTIPLY_TARGETS:
        return int(val * 10)
    
    return int(val)

def parse_datetime(date_str, time_str):
    return datetime.strptime(f"{date_str}{time_str}", "%Y%m%d%H%M")

async def fetch_and_process_data(client, row, sem):
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
            
            data = response.json()
            items = data.get('response', {}).get('body', {}).get('items', {}).get('item')
            if not items: return []

            grouped = {}
            # print(f"Processing ({nx}, {ny})...") # 로그 줄임
            
            base_dt_obj = parse_datetime(base_date, base_time)

            for item in items:
                fcst_date = item['fcstDate']
                fcst_time = item['fcstTime']
                category = item['category']
                raw_val = item['fcstValue']
                
                fcst_dt_obj = parse_datetime(fcst_date, fcst_time)
                
                key = (nx, ny, fcst_dt_obj)
                
                if key not in grouped:
                    grouped[key] = {
                        'base_datetime': base_dt_obj,
                        'fcst_datetime': fcst_dt_obj,
                        'nx': nx,
                        'ny': ny,
                        # 단기예보 컬럼 초기화
                        'TMP': None, 'UUU': None, 'VVV': None, 'VEC': None, 'WSD': None,
                        'SKY': None, 'PTY': None, 'POP': None, 'WAV': None, 
                        'PCP': None, 'REH': None, 'SNO': None, 'TMN': None, 'TMX': None
                    }
                
                if category in grouped[key]:
                    grouped[key][category] = transform_value(category, raw_val)

            return list(grouped.values())

        except Exception as e:
            print(f"Error ({nx}, {ny}): {e}")
            return []

async def main():
    conn = await asyncpg.connect(DB_URL)
    
    try:
        # View 이름 확인 필요 (초단기랑 동일하다고 가정)
        rows = await conn.fetch("SELECT nx, ny FROM view_unique_user_grids")
        print(f"Targets: {len(rows)}, BaseTime: {base_date} {base_time}")

        sem = asyncio.Semaphore(CONCURRENT_LIMIT)
        processed_records = []

        async with httpx.AsyncClient() as client:
            tasks = [fetch_and_process_data(client, row, sem) for row in rows]
            results = await asyncio.gather(*tasks)
            
            for res in results:
                if res:
                    processed_records.extend(res)

        if processed_records:
            print(f"Upserting {len(processed_records)} records...")
            
            # 단기예보 테이블 (컬럼명 주의)
            query = """
                INSERT INTO public.weather_short_term_forecast (
                    nx, ny, base_datetime, fcst_datetime,
                    tmp, uuu, vvv, vec, wsd, 
                    sky, pty, pop, wav, pcp, reh, sno, tmn, tmx
                ) VALUES (
                    $1, $2, $3, $4, 
                    $5, $6, $7, $8, $9, 
                    $10, $11, $12, $13, $14, $15, $16, $17, $18
                )
                ON CONFLICT (nx, ny, fcst_datetime) 
                DO UPDATE SET
                    base_datetime = EXCLUDED.base_datetime,
                    tmp = EXCLUDED.tmp,
                    uuu = EXCLUDED.uuu,
                    vvv = EXCLUDED.vvv,
                    vec = EXCLUDED.vec,
                    wsd = EXCLUDED.wsd,
                    sky = EXCLUDED.sky,
                    pty = EXCLUDED.pty,
                    pop = EXCLUDED.pop,
                    wav = EXCLUDED.wav,
                    pcp = EXCLUDED.pcp,
                    reh = EXCLUDED.reh,
                    sno = EXCLUDED.sno,
                    tmn = EXCLUDED.tmn,
                    tmx = EXCLUDED.tmx,
                    updated_at = now();
            """ 
            
            params_list = [
                (
                    r['nx'], r['ny'], r['base_datetime'], r['fcst_datetime'],
                    r['TMP'], r['UUU'], r['VVV'], r['VEC'], r['WSD'],
                    r['SKY'], r['PTY'], r['POP'], r['WAV'], r['PCP'], r['REH'], r['SNO'], r['TMN'], r['TMX']
                )
                for r in processed_records
            ]

            await conn.executemany(query, params_list)
            print("Done.")
        else:
            print("No records to insert.")

        print("Cleaning up old records...")
        # 3일 지난 데이터 삭제
        query = """
                DELETE FROM weather_short_term_forecast
                WHERE fcst_datetime < NOW() - INTERVAL '3 days';
            """
        await conn.execute(query)
        print("Done. Old records cleaned up.")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())