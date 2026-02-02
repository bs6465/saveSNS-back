import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
재난문자 수집 스크립트
행정안전부 재난문자 API를 호출하여 재난문자 데이터를 DB에 저장
환경 변수: DISASTER_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: disaster_alert
"""

DISASTER_API_KEY = os.getenv('DISASTER_API_KEY')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 행정안전부 재난문자 API
API_URL = "http://apis.data.go.kr/1741000/DisasterMsg4/getDisasterMsg2List"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


async def fetch_disaster_alerts(client):
    """재난문자 데이터 조회"""
    params = {
        'serviceKey': DISASTER_API_KEY,
        'type': 'json',
        'pageNo': '1',
        'numOfRows': '100'
    }

    try:
        response = await client.get(API_URL, params=params, timeout=15.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            return []

        data = response.json()
        
        # API 응답 구조 확인
        items = None
        if 'DisasterMsg2' in data:
            # 신규 API 형식
            rows = data.get('DisasterMsg2', [])
            if rows and len(rows) > 1:
                items = rows[1].get('row', [])
        elif 'response' in data:
            # 구 API 형식
            items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])

        if not items:
            print("No disaster alerts found")
            return []

        records = []
        for item in items:
            # API 필드명이 다를 수 있음
            record = {
                'msg_cn': item.get('msg') or item.get('msgCn') or item.get('MSG'),
                'rcptn_rgn_nm': item.get('location_name') or item.get('rcptnRgnNm') or item.get('RCPTN_RGN_NM') or '',
                'reg_ymd': item.get('create_date') or item.get('regYmd') or item.get('REG_YMD') or '',
                'emrg_step_nm': item.get('emergency_step') or item.get('emrgStepNm') or item.get('EMRG_STEP_NM') or '안전안내',
                'dst_se_nm': item.get('disaster_type') or item.get('dstSeNm') or item.get('DST_SE_NM') or '기타'
            }
            
            if record['msg_cn']:  # 메시지 내용이 있는 경우만
                records.append(record)

        print(f"Fetched {len(records)} disaster alerts")
        return records

    except Exception as e:
        print(f"Error fetching disaster alerts: {e}")
        return []


async def main():
    if not DISASTER_API_KEY:
        print("Error: DISASTER_API_KEY environment variable not set")
        return

    conn = await asyncpg.connect(DB_URL)

    try:
        async with httpx.AsyncClient() as client:
            print("Fetching disaster alerts...")
            records = await fetch_disaster_alerts(client)

        if records:
            print(f"Upserting {len(records)} records to database...")

            # 기존 데이터와 중복 체크를 위해 메시지 내용 + 지역 + 날짜로 고유성 판단
            query = """
                INSERT INTO public.disaster_alert (
                    "msgCn", "rcptnRgnNm", "regYmd", "emrgStepNm", "dstSeNm"
                ) 
                SELECT $1, $2, $3, $4, $5
                WHERE NOT EXISTS (
                    SELECT 1 FROM disaster_alert 
                    WHERE "msgCn" = $1 AND "rcptnRgnNm" = $2 AND "regYmd" = $3
                );
            """

            inserted = 0
            for r in records:
                result = await conn.execute(
                    query,
                    r['msg_cn'],
                    r['rcptn_rgn_nm'],
                    r['reg_ymd'],
                    r['emrg_step_nm'],
                    r['dst_se_nm']
                )
                if 'INSERT' in result:
                    inserted += 1

            print(f"Inserted {inserted} new records")

        # 오래된 데이터 정리 (30일 이상)
        print("Cleaning up old records...")
        await conn.execute("""
            DELETE FROM disaster_alert
            WHERE "createdAt" < NOW() - INTERVAL '30 days';
        """)
        print("Done.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
