import asyncio
import asyncpg
import httpx
from datetime import datetime
import os
import re

"""
지역 뉴스 수집 스크립트
네이버 뉴스 검색 API를 호출하여 시도별 뉴스를 DB에 저장
환경 변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: local_news
"""

NAVER_CLIENT_ID = os.getenv('NAVER_CLIENT_ID', '').strip()
NAVER_CLIENT_SECRET = os.getenv('NAVER_CLIENT_SECRET', '').strip()

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 네이버 뉴스 검색 API
API_URL = "https://openapi.naver.com/v1/search/news"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 시도별 검색 키워드 매핑 (키워드 수 축소 - 지역당 최대 2개)
REGION_KEYWORDS = {
    '서울': ['서울'],
    '부산': ['부산'],
    '대구': ['대구'],
    '인천': ['인천'],
    '광주': ['광주광역시'],
    '대전': ['대전'],
    '울산': ['울산'],
    '세종': ['세종시'],
    '경기': ['경기도'],
    '강원': ['강원도'],
    '충북': ['충청북도'],
    '충남': ['충청남도'],
    '전북': ['전라북도'],
    '전남': ['전라남도'],
    '경북': ['경상북도'],
    '경남': ['경상남도'],
    '제주': ['제주도']
}


def parse_pubdate(date_str):
    """네이버 API 날짜 형식 파싱 (예: Mon, 28 Jan 2024 14:30:00 +0900)"""
    try:
        return datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z").replace(tzinfo=None)
    except (ValueError, TypeError):
        return datetime.now()


def clean_html(text):
    """HTML 태그 제거"""
    if not text:
        return ''
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).replace('&quot;', '"').replace('&amp;', '&')


async def verify_credentials(client):
    """API 자격증명 유효성 사전 검증"""
    headers = {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
    params = {'query': '뉴스', 'display': '1', 'sort': 'date'}

    try:
        response = await client.get(API_URL, params=params, headers=headers, timeout=10.0)
        if response.status_code == 200:
            print("API credentials verified successfully")
            return True
        elif response.status_code == 401:
            print(f"ERROR: Naver API authentication failed (HTTP 401)")
            print(f"Response: {response.text}")
            print("Please check NAVER_CLIENT_ID and NAVER_CLIENT_SECRET environment variables.")
            print("Also verify the 'Search' scope is enabled in Naver Developer Console.")
            return False
        else:
            print(f"WARNING: Unexpected status during auth check: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"ERROR: Failed to verify credentials: {e}")
        return False


async def fetch_news_for_keyword(client, keyword, region_code, headers, max_retries=3):
    """단일 키워드에 대한 뉴스 검색 (재시도 로직 포함)"""
    params = {
        'query': f'{keyword} 지역',
        'display': '20',
        'sort': 'date'
    }

    for attempt in range(max_retries):
        try:
            response = await client.get(API_URL, params=params, headers=headers, timeout=10.0)

            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])

                records = []
                for item in items:
                    record = {
                        'title': clean_html(item.get('title', '')),
                        'summary': clean_html(item.get('description', ''))[:500],
                        'link': item.get('link', ''),
                        'source': item.get('originallink', '') or 'Naver News',
                        'category': '뉴스',
                        'region_code': region_code,
                        'published_at': parse_pubdate(item.get('pubDate'))
                    }
                    if record['title'] and record['link']:
                        records.append(record)

                print(f"Fetched {len(records)} news for '{keyword}' ({region_code})")
                return records

            elif response.status_code == 429:
                # Rate limit - 지수 백오프 재시도
                wait_time = 2 ** (attempt + 1)  # 2, 4, 8초
                print(f"Rate limited for '{keyword}', retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait_time)
                continue

            elif response.status_code == 401:
                print(f"Auth failed for '{keyword}': {response.text}")
                return []  # 인증 실패는 재시도 불필요

            else:
                print(f"Error fetching news for '{keyword}': HTTP {response.status_code}")
                return []

        except Exception as e:
            print(f"Error fetching news for '{keyword}': {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
            continue

    print(f"Max retries exceeded for '{keyword}'")
    return []


async def fetch_news_for_region(client, region_code, keywords, headers):
    """특정 지역의 뉴스를 순차적으로 검색 (rate limit 방지)"""
    all_records = []

    for keyword in keywords:
        records = await fetch_news_for_keyword(client, keyword, region_code, headers)
        all_records.extend(records)
        await asyncio.sleep(0.3)  # 키워드 간 간격

    return all_records

 
async def main():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("Error: NAVER_CLIENT_ID or NAVER_CLIENT_SECRET environment variable not set")
        return  # 환경변수 없으면 정상 종료 (재시도 방지)

    try:
        conn = await asyncpg.connect(DB_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return  # DB 연결 실패 시 정상 종료 (재시도 방지)

    try:
        headers = {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        }
        all_records = []

        async with httpx.AsyncClient() as client:
            # 사전 인증 검증
            print("Verifying Naver API credentials...")
            if not await verify_credentials(client):
                print("Aborting: API credentials are invalid.")
                return

            print("Fetching local news...")

            # 지역별 순차 처리 (rate limit 방지)
            for region, keywords in REGION_KEYWORDS.items():
                records = await fetch_news_for_region(client, region, keywords, headers)
                all_records.extend(records)
                await asyncio.sleep(0.3)  # 지역 간 간격

        print(f"Total records: {len(all_records)}")

        if all_records:
            print("Inserting records to database...")

            # 중복 체크를 위해 링크 기준으로 삽입
            query = """
                INSERT INTO public.local_news (
                    title, summary, link, source, category, "regionCode", "publishedAt"
                )
                SELECT $1::varchar(500), $2::text, $3::varchar(1000), $4::varchar(100), $5::varchar(50), $6::varchar(20), $7::timestamp
                WHERE NOT EXISTS (
                    SELECT 1 FROM local_news WHERE link = $3::varchar(1000)
                );
            """

            inserted = 0
            errors = 0
            for r in all_records:
                try:
                    result = await conn.execute(
                        query,
                        r['title'][:500],
                        r['summary'],
                        r['link'][:1000],
                        r['source'][:100],
                        r['category'],
                        r['region_code'],
                        r['published_at']
                    )
                    if result == 'INSERT 0 1':
                        inserted += 1
                except Exception as e:
                    errors += 1
                    if errors <= 3:  # 처음 3개만 출력
                        print(f"Insert error: {e}")

            print(f"Inserted {inserted} new records")

        # 오래된 뉴스 정리 (3일 이상)
        print("Cleaning up old news...")
        await conn.execute("""
            DELETE FROM local_news
            WHERE "publishedAt" < NOW() - INTERVAL '3 days';
        """)
        print("Done.")

    except Exception as e:
        print(f"Error during execution: {e}")
        # 에러 발생해도 정상 종료 (Kubernetes 재시도 방지)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
