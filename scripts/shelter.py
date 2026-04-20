import asyncio
import asyncpg
import httpx
import os

"""
대피소 데이터 수집 스크립트
1) 지진 대피장소 API (DSSP-IF-00706) - 지진(실내) 대피소
2) 통합대피소 API (DSSP-IF-10941) - 한파쉼터, 무더위쉼터, 지진옥외대피, 지진해일대피
3) 민방위 대피소 API (DSSP-IF-10166) - 민방위 대피시설
환경 변수: EARTHQUAKE_API_KEY, INTEGRATED_API_KEY, CIVIL_DEFENSE_API_KEY,
          DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: shelter
스케줄: 매일 오전 6시 (K8s CronJob)
"""

# 각 API별 별도 서비스키 (재난안전데이터공유플랫폼에서 데이터별로 키가 다름)
EARTHQUAKE_API_KEY = os.getenv('EARTHQUAKE_API_KEY', '').strip()
INTEGRATED_API_KEY = os.getenv('INTEGRATED_API_KEY', '').strip()
CIVIL_DEFENSE_API_KEY = os.getenv('CIVIL_DEFENSE_API_KEY', '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

EARTHQUAKE_API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00706"
INTEGRATED_API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-10941"
CIVIL_DEFENSE_API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-10166"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 통합대피소 구분코드 → shelter_type 매핑
INTEGRATED_TYPE_MAP = {
    '1': 'cold_wave',            # 한파쉼터
    '2': 'heat_wave',            # 무더위쉼터
    '3': 'earthquake_outdoor',   # 지진옥외대피장소
    '4': 'tsunami',              # 지진해일긴급대피장소
}


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


async def api_get_with_retry(client, url, params, retries=3):
    """API GET 호출 (재시도 포함)"""
    for attempt in range(retries):
        try:
            response = await client.get(url, params=params, timeout=30.0)
            return response
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            if attempt == retries - 1:
                raise
            print(f"Connection error (attempt {attempt + 1}/{retries}): {e}, retrying...")
            await asyncio.sleep(3 * (attempt + 1))


# ── 1) 지진 대피장소 API (DSSP-IF-00706) ──

async def fetch_earthquake_shelters(client, page_no=1, num_of_rows=1000):
    """지진(실내) 대피소 데이터 조회"""
    params = {
        'serviceKey': EARTHQUAKE_API_KEY,
        'returnType': 'json',
        'pageNo': str(page_no),
        'numOfRows': str(num_of_rows),
    }

    try:
        response = await api_get_with_retry(client, EARTHQUAKE_API_URL, params)

        if response.status_code != 200:
            print(f"[earthquake] Error: HTTP {response.status_code}")
            return [], 0

        data = response.json()
        items = data.get('body', [])
        total_count = data.get('totalCount', 0)

        if not items:
            print(f"[earthquake] No data (page {page_no})")
            return [], total_count

        records = []
        for item in items:
            name = item.get('SHLT_NM') or item.get('shltNm')
            address = item.get('ADDR') or item.get('addr') or ''
            longitude = safe_float(item.get('LOT') or item.get('lot'))
            latitude = safe_float(item.get('LAT') or item.get('lat'))
            capacity = safe_int(item.get('ACTC_PSBLTY_TNOP') or item.get('actcPsbltyTnop'))
            phone = item.get('COPL') or item.get('copl') or None
            sido_name = item.get('CTPV_NM') or item.get('ctpvNm') or None
            sigungu_name = item.get('SGG_NM') or item.get('sggNm') or None
            del_yn = item.get('DEL_YN') or item.get('delYn') or 'N'

            if del_yn == 'Y':
                continue
            if not name or longitude is None or latitude is None:
                continue
            if longitude == 0 or latitude == 0:
                continue

            if phone:
                phone = phone.strip()
                if phone in ('', '-', '없음'):
                    phone = None

            records.append({
                'name': name.strip(),
                'address': address.strip(),
                'shelter_type': 'earthquake',
                'longitude': longitude,
                'latitude': latitude,
                'capacity': capacity,
                'phone': phone,
                'sido_name': sido_name.strip() if sido_name else None,
                'sigungu_name': sigungu_name.strip() if sigungu_name else None,
            })

        print(f"[earthquake] Fetched {len(records)} (page {page_no}, total: {total_count})")
        return records, total_count

    except Exception as e:
        print(f"[earthquake] Error: {e}")
        import traceback
        traceback.print_exc()
        return [], 0


async def fetch_all_earthquake_shelters(client):
    """지진 대피소 전체 페이지 조회"""
    all_records = []
    page_no = 1

    while True:
        records, total_count = await fetch_earthquake_shelters(client, page_no)
        if not records:
            break
        all_records.extend(records)
        if len(all_records) >= total_count or len(records) < 1000:
            break
        page_no += 1
        await asyncio.sleep(0.5)

    return all_records


# ── 2) 통합대피소 API (DSSP-IF-10941) ──

def parse_sido_from_address(address):
    """주소에서 시도명 추출"""
    if not address:
        return None, None
    parts = address.strip().split()
    if len(parts) < 1:
        return None, None
    sido = parts[0]
    sigungu = parts[1] if len(parts) >= 2 else None
    return sido, sigungu


async def fetch_integrated_shelters(client, shlt_se_cd=None, page_no=1, num_of_rows=1000):
    """통합대피소 데이터 조회 (한파쉼터/무더위쉼터/지진옥외/지진해일)"""
    params = {
        'serviceKey': INTEGRATED_API_KEY,
        'returnType': 'json',
        'pageNo': str(page_no),
        'numOfRows': str(num_of_rows),
    }
    if shlt_se_cd:
        params['shlt_se_cd'] = str(shlt_se_cd)

    type_label = INTEGRATED_TYPE_MAP.get(str(shlt_se_cd), f'code={shlt_se_cd}')

    try:
        response = await api_get_with_retry(client, INTEGRATED_API_URL, params)

        if response.status_code != 200:
            print(f"[{type_label}] Error: HTTP {response.status_code}")
            return [], 0

        data = response.json()
        items = data.get('body', [])
        total_count = data.get('totalCount', 0)

        if not items:
            print(f"[{type_label}] No data (page {page_no})")
            return [], total_count

        records = []
        for item in items:
            name = item.get('REARE_NM') or ''
            address = item.get('RONA_DADDR') or ''
            longitude = safe_float(item.get('LOT'))
            latitude = safe_float(item.get('LAT'))
            code = str(item.get('SHLT_SE_CD', ''))
            shelter_type = INTEGRATED_TYPE_MAP.get(code)

            if not name or longitude is None or latitude is None:
                continue
            if longitude == 0 or latitude == 0:
                continue
            if not shelter_type:
                continue

            sido_name, sigungu_name = parse_sido_from_address(address)

            records.append({
                'name': name.strip(),
                'address': address.strip(),
                'shelter_type': shelter_type,
                'longitude': longitude,
                'latitude': latitude,
                'capacity': None,
                'phone': None,
                'sido_name': sido_name,
                'sigungu_name': sigungu_name,
            })

        print(f"[{type_label}] Fetched {len(records)} (page {page_no}, total: {total_count})")
        return records, total_count

    except Exception as e:
        print(f"[{type_label}] Error: {e}")
        import traceback
        traceback.print_exc()
        return [], 0


async def fetch_all_integrated_shelters(client, shlt_se_cd):
    """통합대피소 특정 유형 전체 페이지 조회"""
    all_records = []
    page_no = 1

    while True:
        records, total_count = await fetch_integrated_shelters(client, shlt_se_cd, page_no)
        if not records:
            break
        all_records.extend(records)
        if len(all_records) >= total_count or len(records) < 1000:
            break
        page_no += 1
        await asyncio.sleep(0.5)

    return all_records


# ── 3) 민방위 대피소 API (DSSP-IF-10166) ──

async def fetch_civil_defense_shelters(client, page_no=1, num_of_rows=1000):
    """민방위 대피소 데이터 조회"""
    params = {
        'serviceKey': CIVIL_DEFENSE_API_KEY,
        'returnType': 'json',
        'pageNo': str(page_no),
        'numOfRows': str(num_of_rows),
    }

    try:
        response = await api_get_with_retry(client, CIVIL_DEFENSE_API_URL, params)

        if response.status_code != 200:
            print(f"[civil_defense] Error: HTTP {response.status_code}")
            return [], 0

        data = response.json()
        items = data.get('body', [])
        total_count = data.get('totalCount', 0)

        if not items:
            print(f"[civil_defense] No data (page {page_no})")
            return [], total_count

        records = []
        for item in items:
            name = item.get('SHLT_NM') or ''
            address = item.get('ROAD_NM_ADDR') or item.get('DADDR') or ''
            longitude = safe_float(item.get('LOT'))
            latitude = safe_float(item.get('LAT'))
            capacity = safe_int(item.get('SHNT_PSBLTY_NOPE'))
            phone = item.get('MNG_INST_TLHN') or None
            opn_yn = item.get('OPN_YN') or 'Y'

            # 비개방 시설 제외
            if opn_yn == 'N':
                continue
            if not name or longitude is None or latitude is None:
                continue
            if longitude == 0 or latitude == 0:
                continue

            if phone:
                phone = phone.strip()
                if phone in ('', '-', '없음'):
                    phone = None

            sido_name, sigungu_name = parse_sido_from_address(address)

            records.append({
                'name': name.strip(),
                'address': address.strip(),
                'shelter_type': 'civil_defense',
                'longitude': longitude,
                'latitude': latitude,
                'capacity': capacity,
                'phone': phone,
                'sido_name': sido_name,
                'sigungu_name': sigungu_name,
            })

        print(f"[civil_defense] Fetched {len(records)} (page {page_no}, total: {total_count})")
        return records, total_count

    except Exception as e:
        print(f"[civil_defense] Error: {e}")
        import traceback
        traceback.print_exc()
        return [], 0


async def fetch_all_civil_defense_shelters(client):
    """민방위 대피소 전체 페이지 조회"""
    all_records = []
    page_no = 1

    while True:
        records, total_count = await fetch_civil_defense_shelters(client, page_no)
        if not records:
            break
        all_records.extend(records)
        if len(all_records) >= total_count or len(records) < 1000:
            break
        page_no += 1
        await asyncio.sleep(0.5)

    return all_records


async def main():
    missing_keys = []
    if not EARTHQUAKE_API_KEY:
        missing_keys.append('EARTHQUAKE_API_KEY')
    if not INTEGRATED_API_KEY:
        missing_keys.append('INTEGRATED_API_KEY')
    if not CIVIL_DEFENSE_API_KEY:
        missing_keys.append('CIVIL_DEFENSE_API_KEY')
    if missing_keys:
        print(f"Warning: Missing API keys: {', '.join(missing_keys)}")
        print("Will skip APIs with missing keys.")

    try:
        conn = await asyncpg.connect(DB_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    try:
        async with httpx.AsyncClient() as client:
            all_records = []

            # 1) 지진(실내) 대피장소
            if EARTHQUAKE_API_KEY:
                print("=== Fetching earthquake shelters (DSSP-IF-00706) ===")
                earthquake_records = await fetch_all_earthquake_shelters(client)
                all_records.extend(earthquake_records)
                print(f"  → {len(earthquake_records)} earthquake shelters")
            else:
                print("=== Skipping earthquake (no API key) ===")

            # 2) 통합대피소 (4종)
            if INTEGRATED_API_KEY:
                for code, type_name in INTEGRATED_TYPE_MAP.items():
                    print(f"=== Fetching {type_name} shelters (DSSP-IF-10941, code={code}) ===")
                    integrated_records = await fetch_all_integrated_shelters(client, code)
                    all_records.extend(integrated_records)
                    print(f"  → {len(integrated_records)} {type_name} shelters")
                    await asyncio.sleep(1)
            else:
                print("=== Skipping integrated shelters (no API key) ===")

            # 3) 민방위 대피소
            if CIVIL_DEFENSE_API_KEY:
                print("=== Fetching civil defense shelters (DSSP-IF-10166) ===")
                civil_records = await fetch_all_civil_defense_shelters(client)
                all_records.extend(civil_records)
                print(f"  → {len(civil_records)} civil_defense shelters")
            else:
                print("=== Skipping civil defense (no API key) ===")

        print(f"\nTotal fetched: {len(all_records)} shelters")

        if all_records:
            print("Clearing existing shelter data and inserting fresh...")
            await conn.execute("DELETE FROM shelter")

            query = """
                INSERT INTO shelter (
                    name, address, shelter_type,
                    longitude, latitude, capacity, phone,
                    sido_name, sigungu_name, updated_at
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
                for r in all_records
            ]

            await conn.executemany(query, params_list)

            # 유형별 카운트 출력
            type_counts = {}
            for r in all_records:
                t = r['shelter_type']
                type_counts[t] = type_counts.get(t, 0) + 1
            print("\nInserted by type:")
            for t, c in sorted(type_counts.items()):
                print(f"  {t}: {c}")

        # 최종 카운트 확인
        count = await conn.fetchval("SELECT COUNT(*) FROM shelter")
        print(f"\nTotal shelters in DB: {count}")
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
