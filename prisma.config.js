module.exports = {
  datasource: {
    // Prisma는 무조건 'url' 문자열 하나를 원합니다.
    url: `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD)}@${
      process.env.DB_HOST
    }:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public&sslmode=disable`,
  },
};
