-- Phase 3: 이미지 최적화 - 썸네일 링크 컬럼 추가
-- 실행 방법: psql -U <user> -d <db> -f manual_migration_20260209_thumbnail.sql

ALTER TABLE media_storage ADD COLUMN IF NOT EXISTS thumbnail_link VARCHAR;
