import asyncio
import asyncpg
import httpx
import os

"""
대피소 데이터 수집 스크립트
재난안전데이터공유플랫폼 지진 대피장소 API (DSSP-IF-00706)를 호출하여 대피소 데이터를 DB에 저장
API: https://www.safetydata.go.kr/disaster-data/view?dataSn=686
환경 변수: SHELTER_API_KEY, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: shelter
"""

SHELTER_API_KEY = os.getenv('SHELTER_API_KEY', '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00706"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def safe_float(value):
    if value is None or value == '' or value == '-':
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_int(value):
    if value is None or value == '' or value == '-':
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


async def fetch_shelters(client, page_no=1, num_of_rows=1000):
    """대피소 데이터 조회"""
    params = {
        'serviceKey': SHELTER_API_KEY,
        'returnType': 'json',
        'pageNo': str(page_no),
        'numOfRows': str(num_of_rows),
    }

    try:
        response = await client.get(API_URL, params=params, timeout=30.0)
        if response.status_code != 200:
            print(f"Error: HTTP {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return [], 0

        data = response.json()
        items = data.get('body', [])
        total_count = data.get('totalCount', 0)

        if not items:
            print(f"No shelter data found (page {page_no})")
            return [], total_count

        records = []
        for item in items:
            name = item.get('SHLT_NM') or item.get('shltNm')
            address = item.get('ADDR') or item.get('addr') or ''
            shelter_type_raw = item.get('SHLT_TYPE') or item.get('shltType') or ''
            longitude = safe_float(item.get('LOT') or item.get('lot'))
            latitude = safe_float(item.get('LAT') or item.get('lat'))
            capacity = safe_int(item.get('ACTC_PSBLTY_TNOP') or item.get('actcPsbltyTnop'))
            phone = item.get('COPL') or item.get('copl') or None
            sido_name = item.get('CTPV_NM') or item.get('ctpvNm') or None
            sigungu_name = item.get('SGG_NM') or item.get('sggNm') or None
            del_yn = item.get('DEL_YN') or item.get('delYn') or 'N'

            # 삭제된 항목 제외
            if del_yn == 'Y':
                continue

            # 이름이나 좌표가 없으면 제외
            if not name or longitude is None or latitude is None:
                continue

            # 유효하지 않은 좌표 제외
            if longitude == 0 or latitude == 0:
                continue

            # 대피소 유형 매핑
            shelter_type = 'earthquake'

            # phone 정리
            if phone:
                phone = phone.strip()
                if phone in ('', '-', '없음'):
                    phone = None

            record = {
                'name': name.strip(),
                'address': address.strip(),
                'shelter_type': shelter_type,
                'longitude': longitude,
                'latitude': latitude,
                'capacity': capacity,
                'phone': phone,
                'sido_name': sido_name.strip() if sido_name else None,
                'sigungu_name': sigungu_name.strip() if sigungu_name else None,
            }
            records.append(record)

        print(f"Fetched {len(records)} shelters (page {page_no}, total: {total_count})")
        return records, total_count

    except Exception as e:
        print(f"Error fetching shelters: {e}")
        import traceback
        traceback.print_exc()
        return [], 0


async def fetch_all_shelters(client):
    """모든 페이지의 대피소 데이터 조회"""
    all_records = []
    page_no = 1

    while True:
        records, total_count = await fetch_shelters(client, page_no)

        if not records:
            break

        all_records.extend(records)

        if len(all_records) >= total_count or len(records) < 1000:
            break

        page_no += 1
        await asyncio.sleep(0.5)

    return all_records


async def main():
    if not SHELTER_API_KEY:
        print("Error: SHELTER_API_KEY environment variable not set")
        return

    try:
        conn = await asyncpg.connect(DB_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    try:
        async with httpx.AsyncClient() as client:
            print("Fetching earthquake shelters from 재난안전데이터공유플랫폼...")
            records = await fetch_all_shelters(client)

        print(f"Total fetched: {len(records)} shelters")

        if records:
            print("Upserting records to database...")

            # name + address를 고유 키로 사용하여 중복 방지
            # 기존 데이터를 먼저 삭제하고 새로 삽입 (full refresh)
            await conn.execute("DELETE FROM shelter WHERE \"shelterType\" = 'earthquake'")

            query = """
                INSERT INTO shelter (
                    name, address, "shelterType",
                    longitude, latitude, capacity, phone,
                    "sidoName", "sigunguName", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            """

            params_list = [
                (
                    r['name'],
                    r['address'],
                    r['shelter_type'],
                    r['longitude'],
                    r['latitude'],
                    r['capacity'],
                    r['phone'],
                    r['sido_name'],
                    r['sigungu_name'],
                )
                for r in records
            ]

            await conn.executemany(query, params_list)
            print(f"Inserted {len(params_list)} earthquake shelters")

        # 최종 카운트 확인
        count = await conn.fetchval("SELECT COUNT(*) FROM shelter")
        print(f"Total shelters in DB: {count}")
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
