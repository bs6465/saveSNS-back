import asyncio
import asyncpg
import httpx
from datetime import datetime
import os

"""
지역 뉴스 수집 스크립트
네이버 뉴스 검색 API를 호출하여 시도별 뉴스를 DB에 저장
환경 변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, DB_USER, DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT
DB 테이블: local_news
"""

NAVER_CLIENT_ID = os.getenv('NAVER_CLIENT_ID')
NAVER_CLIENT_SECRET = os.getenv('NAVER_CLIENT_SECRET')

DB_USER = os.getenv('DB_USER')
DB_NAME = os.getenv('DB_NAME')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')

# 네이버 뉴스 검색 API
API_URL = "https://openapi.naver.com/v1/search/news.json"

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 시도별 검색 키워드 매핑
REGION_KEYWORDS = {
    '서울': ['서울', '강남', '종로', '마포'],
    '부산': ['부산', '해운대', '서면'],
    '대구': ['대구'],
    '인천': ['인천', '송도'],
    '광주': ['광주광역시'],
    '대전': ['대전', '유성구'],
    '울산': ['울산'],
    '세종': ['세종시', '세종특별자치시'],
    '경기': ['경기도', '수원', '성남', '고양'],
    '강원': ['강원도', '춘천', '원주'],
    '충북': ['충청북도', '청주'],
    '충남': ['충청남도', '천안', '아산'],
    '전북': ['전라북도', '전주', '익산'],
    '전남': ['전라남도', '목포', '여수'],
    '경북': ['경상북도', '포항', '구미'],
    '경남': ['경상남도', '창원', '김해'],
    '제주': ['제주도', '제주시']
}


def parse_pubdate(date_str):
    """네이버 API 날짜 형식 파싱 (예: Mon, 28 Jan 2024 14:30:00 +0900)"""
    try:
        return datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z").replace(tzinfo=None)
    except (ValueError, TypeError):
        return datetime.now()


def clean_html(text):
    """HTML 태그 제거"""
    import re
    if not text:
        return ''
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).replace('&quot;', '"').replace('&amp;', '&')


async def fetch_news_for_region(client, region_code, keywords, sem):
    """특정 지역의 뉴스 검색"""
    headers = {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }

    all_records = []

    async with sem:
        for keyword in keywords[:2]:  # 키워드당 최대 2개만
            params = {
                'query': f'{keyword} 지역',
                'display': '20',
                'sort': 'date'
            }

            try:
                response = await client.get(API_URL, params=params, headers=headers, timeout=10.0)
                if response.status_code != 200:
                    continue

                data = response.json()
                items = data.get('items', [])

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
                        all_records.append(record)

                await asyncio.sleep(0.1)  # API 호출 간격

            except Exception as e:
                print(f"Error fetching news for {keyword}: {e}")

    print(f"Fetched {len(all_records)} news for {region_code}")
    return all_records


async def main():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("Error: NAVER_CLIENT_ID or NAVER_CLIENT_SECRET environment variable not set")
        return

    conn = await asyncpg.connect(DB_URL)

    try:
        sem = asyncio.Semaphore(3)  # 동시 요청 제한
        all_records = []

        async with httpx.AsyncClient() as client:
            print("Fetching local news...")
            tasks = [
                fetch_news_for_region(client, region, keywords, sem)
                for region, keywords in REGION_KEYWORDS.items()
            ]
            results = await asyncio.gather(*tasks)

            for res in results:
                if res:
                    all_records.extend(res)

        print(f"Total records: {len(all_records)}")

        if all_records:
            print("Inserting records to database...")

            # 중복 체크를 위해 링크 기준으로 삽입
            query = """
                INSERT INTO public.local_news (
                    title, summary, link, source, category, "regionCode", "publishedAt"
                )
                SELECT $1, $2, $3, $4, $5, $6, $7
                WHERE NOT EXISTS (
                    SELECT 1 FROM local_news WHERE link = $3
                );
            """

            inserted = 0
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
                    if 'INSERT' in result:
                        inserted += 1
                except Exception as e:
                    pass  # 중복 등 무시

            print(f"Inserted {inserted} new records")

        # 오래된 뉴스 정리 (7일 이상)
        print("Cleaning up old news...")
        await conn.execute("""
            DELETE FROM local_news
            WHERE "publishedAt" < NOW() - INTERVAL '7 days';
        """)
        print("Done.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
