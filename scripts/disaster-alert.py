import asyncio
import asyncpg
import httpx
from datetime import datetime, timedelta
import os

"""
재난문자 수집 스크립트
재난안전데이터공유플랫폼 긴급재난문자 API (DSSP-IF-00247)를 호출하여 재난문자 데이터를 DB에 저장
API: https://www.safetydata.go.kr/disaster-data/view?dataSn=228
환경 변수: DISASTER_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: disaster_alert
"""

DISASTER_API_KEY = os.getenv('DISASTER_API_KEY').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 재난안전데이터공유플랫폼 긴급재난문자 API
API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def parse_datetime(date_str):
    """날짜 문자열을 datetime 객체로 변환"""
    if not date_str:
        return None

    # 다양한 날짜 형식 지원
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y%m%d%H%M%S",
        "%Y%m%d"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


async def fetch_disaster_alerts(client, page_no=1):
    """재난문자 데이터 조회"""
    # 조회시작일자: 7일 전부터 조회
    search_start_date = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

    params = {
        'serviceKey': DISASTER_API_KEY,
        'returnType': 'json',
        'pageNo': str(page_no),
        'numOfRows': '100',
        'crtDt': search_start_date  # 조회시작일자
    }

    try:
        response = await client.get(API_URL, params=params, timeout=30.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return [], 0

        data = response.json()

        # 재난안전데이터공유플랫폼 API 응답 구조: body 배열
        items = data.get('body', [])
        total_count = data.get('totalCount', 0)

        if not items:
            print(f"No disaster alerts found (page {page_no})")
            return [], total_count

        records = []
        for item in items:
            # 재난안전데이터공유플랫폼 필드명
            msg_cn = item.get('MSG_CN') or item.get('msgCn') or item.get('msg')
            rcptn_rgn_nm = item.get('RCPTN_RGN_NM') or item.get('rcptnRgnNm') or item.get('location_name') or ''
            crt_dt = item.get('CRT_DT') or item.get('crtDt') or item.get('create_date') or ''
            emrg_step_nm = item.get('EMRG_STEP_NM') or item.get('emrgStepNm') or item.get('emergency_step') or '안전안내'
            dst_se_nm = item.get('DST_SE_NM') or item.get('dstSeNm') or item.get('disaster_type') or '기타'
            sn = item.get('SN') or item.get('sn')  # 일련번호 (고유 ID)

            if not msg_cn:
                continue

            created_at = parse_datetime(crt_dt)

            record = {
                'sn': sn,
                'msg_cn': msg_cn,
                'rcptn_rgn_nm': rcptn_rgn_nm,
                'crt_dt': crt_dt,
                'created_at': created_at,
                'emrg_step_nm': emrg_step_nm,
                'dst_se_nm': dst_se_nm
            }
            records.append(record)

        print(f"Fetched {len(records)} disaster alerts (page {page_no}, total: {total_count})")
        return records, total_count

    except Exception as e:
        print(f"Error fetching disaster alerts: {e}")
        import traceback
        traceback.print_exc()
        return [], 0


async def fetch_all_alerts(client):
    """모든 페이지의 재난문자 조회"""
    all_records = []
    page_no = 1

    while True:
        records, total_count = await fetch_disaster_alerts(client, page_no)

        if not records:
            break

        all_records.extend(records)

        # 다음 페이지 확인
        if len(all_records) >= total_count or len(records) < 100:
            break

        page_no += 1
        # API 호출 제한 방지
        await asyncio.sleep(0.5)

    return all_records

 
async def main():
    if not DISASTER_API_KEY:
        print("Error: DISASTER_API_KEY environment variable not set")
        return

    print(f"DISASTER_API_KEY: {DISASTER_API_KEY}")
    print(f"DB_URL: {DB_URL}")
    conn = await asyncpg.connect(DB_URL)

    try:
        async with httpx.AsyncClient() as client:
            print("Fetching disaster alerts from 재난안전데이터공유플랫폼...")
            records = await fetch_all_alerts(client)

        print(f"Total fetched: {len(records)} records")

        if records:
            print("Upserting records to database...")

            # sn(일련번호)을 기준으로 중복 체크
            query = """
                INSERT INTO public.disaster_alert (
                    sn, msg_cn, rcptn_rgn_nm, crt_dt, emrg_step_nm, dst_se_nm
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (sn) DO UPDATE SET
                    msg_cn = EXCLUDED.msg_cn,
                    rcptn_rgn_nm = EXCLUDED.rcptn_rgn_nm,
                    crt_dt = EXCLUDED.crt_dt,
                    emrg_step_nm = EXCLUDED.emrg_step_nm,
                    dst_se_nm = EXCLUDED.dst_se_nm;
            """

            params_list = [
                (
                    r['sn'],
                    r['msg_cn'],
                    r['rcptn_rgn_nm'],
                    r['created_at'],
                    r['emrg_step_nm'],
                    r['dst_se_nm']
                )
                for r in records if r['sn']
            ]

            await conn.executemany(query, params_list)
            print(f"Upserted {len(params_list)} records")

        # 오래된 데이터 정리 (30일 이상)
        print("Cleaning up old records...")
        await conn.execute("""
            DELETE FROM disaster_alert
            WHERE crt_dt < NOW() - INTERVAL '30 days';
        """)
        print("Done.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
