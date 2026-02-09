-- Phase 3: 검색 기능을 위한 pg_trgm 확장 및 인덱스 생성
-- 실행 방법: psql -U <user> -d <db> -f manual_migration_20260209_search.sql

-- pg_trgm 확장 활성화 (트라이그램 기반 텍스트 검색, 한국어 지원)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 게시글 내용 검색용 GIN 트라이그램 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_contents_trgm
  ON posts USING GIN (contents gin_trgm_ops);

-- 사용자 닉네임 검색용 GIN 트라이그램 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_nickname_trgm
  ON users_account USING GIN (nickname gin_trgm_ops);

-- 사용자 아이디 검색용 GIN 트라이그램 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm
  ON users_account USING GIN (username gin_trgm_ops);
