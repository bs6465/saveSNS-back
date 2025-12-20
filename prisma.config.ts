import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  // schema 파일 위치 지정
  schema: 'prisma/schema.prisma',
  datasource: {
    // 환경 변수가 없을 경우를 대비해 빈 문자열('') 또는 기본값을 할당합니다.
    url: `postgresql://${process.env.DB_USER ?? ''}:${encodeURIComponent(
      process.env.DB_PASSWORD ?? '',
    )}@${process.env.DB_HOST ?? 'pgbouncer-service'}:${process.env.DB_PORT ?? '6432'}/${
      process.env.DB_NAME ?? 'postgres'
    }?schema=public&sslmode=disable`,
  },
});
