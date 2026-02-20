// prisma/seed.js - 로컬 개발용 테스트 데이터 시드
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import argon2 from 'argon2';

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  ssl: false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 서울 주요 지점 좌표
const LOCATIONS = [
  { name: '강남역', lng: 127.0276, lat: 37.4979 },
  { name: '홍대', lng: 126.9236, lat: 37.5563 },
  { name: '이태원', lng: 126.9949, lat: 37.5345 },
  { name: '잠실', lng: 127.1000, lat: 37.5133 },
  { name: '명동', lng: 126.9856, lat: 37.5636 },
];

const TEST_USERS = [
  { username: 'testuser1', password: 'Password1!', nickname: 'Alice' },
  { username: 'testuser2', password: 'Password2!', nickname: 'Bob' },
  { username: 'testuser3', password: 'Password3!', nickname: 'Charlie' },
];

const hashPassword = (plain) =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 2 ** 14, timeCost: 3, parallelism: 1 });

// prisma db push 이후 GENERATED 컬럼 추가
// Prisma는 @default(dbgenerated(...))를 DEFAULT로 처리하지만,
// PostgreSQL에서 다른 컬럼을 참조하려면 GENERATED ALWAYS AS ... STORED 가 필요
async function setupGeneratedColumns() {
  const client = await pool.connect();
  try {
    // 뷰가 nx, ny 컬럼에 의존하므로 컬럼 재생성 전에 먼저 삭제
    // (createViews()에서 바로 재생성됨)
    await client.query(`
      DROP VIEW IF EXISTS weather_ultra_by_user_id CASCADE;
      DROP VIEW IF EXISTS weather_short_by_user_id CASCADE;
      DROP VIEW IF EXISTS view_unique_user_grids CASCADE;
    `);

    // posts.location - longitude/latitude로부터 자동 생성
    await client.query(`
      ALTER TABLE posts DROP COLUMN IF EXISTS location;
      ALTER TABLE posts ADD COLUMN location geometry
        GENERATED ALWAYS AS (st_setsrid(st_makepoint(longitude, latitude), 4326)) STORED;
    `);

    // users_location.location
    await client.query(`
      ALTER TABLE users_location DROP COLUMN IF EXISTS location;
      ALTER TABLE users_location ADD COLUMN location geometry
        GENERATED ALWAYS AS (st_setsrid(st_makepoint(longitude, latitude), 4326)) STORED;
    `);

    // users_location.nx, ny - KMA 격자 좌표
    await client.query(`
      ALTER TABLE users_location DROP COLUMN IF EXISTS nx;
      ALTER TABLE users_location ADD COLUMN nx smallint
        GENERATED ALWAYS AS ((kma_lonlat_to_grid(longitude, latitude)).nx) STORED;
    `);
    await client.query(`
      ALTER TABLE users_location DROP COLUMN IF EXISTS ny;
      ALTER TABLE users_location ADD COLUMN ny smallint
        GENERATED ALWAYS AS ((kma_lonlat_to_grid(longitude, latitude)).ny) STORED;
    `);

    // GIST 인덱스 재생성 (location 컬럼이 재생성되었으므로)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_grid_cover ON users_location (nx, ny, user_id);
    `);

    console.log('Generated columns created (location, nx, ny)');
  } finally {
    client.release();
  }
}

// Prisma db push 이후 테이블이 존재하므로 여기서 뷰 생성
async function createViews() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE VIEW weather_ultra_by_user_id AS
      SELECT users.user_id, users.nx, users.ny,
             weather_ultra.fcst_datetime, weather_ultra.t1h, weather_ultra.rn1,
             weather_ultra.sky, weather_ultra.uuu, weather_ultra.vvv,
             weather_ultra.reh, weather_ultra.pty, weather_ultra.lgt,
             weather_ultra.vec, weather_ultra.wsd
      FROM users_location users
      JOIN weather_ultra_short_term_forecast weather_ultra
        ON users.nx = weather_ultra.nx AND users.ny = weather_ultra.ny;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW weather_short_by_user_id AS
      SELECT users.user_id, users.nx, users.ny,
             weather_short.fcst_datetime, weather_short.tmp,
             weather_short.uuu, weather_short.vvv, weather_short.vec, weather_short.wsd,
             weather_short.sky, weather_short.pty, weather_short.pop,
             weather_short.wav, weather_short.pcp, weather_short.reh,
             weather_short.sno, weather_short.tmn, weather_short.tmx
      FROM users_location users
      JOIN weather_short_term_forecast weather_short
        ON users.nx = weather_short.nx AND users.ny = weather_short.ny;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW view_unique_user_grids AS
      SELECT DISTINCT nx, ny FROM users_location
      WHERE nx IS NOT NULL AND ny IS NOT NULL;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW sigungu AS
      SELECT sido_nm, sig_kor_nm, geom FROM sig;
    `);

    console.log('Views created');
  } finally {
    client.release();
  }
}

async function seed() {
  console.log('=== Seed 시작 ===\n');

  // 1. GENERATED 컬럼 설정 + 뷰 생성
  await setupGeneratedColumns();
  await createViews();

  // 2. 테스트 유저 생성
  const users = [];
  for (let i = 0; i < TEST_USERS.length; i++) {
    const { username, password, nickname } = TEST_USERS[i];
    const loc = LOCATIONS[i];
    const hashedPw = await hashPassword(password);

    const user = await prisma.users_account.create({
      data: {
        username,
        password: hashedPw,
        nickname,
        users_location: {
          create: { longitude: loc.lng, latitude: loc.lat },
        },
      },
    });
    users.push(user);
    console.log(`User: ${username} (${nickname}) @ ${loc.name}`);
  }

  // 3. 테스트 게시글 생성
  const postContents = [
    { text: '강남역 근처 맛집 발견! 분위기 좋고 음식도 맛있어요.', locIdx: 0 },
    { text: '홍대 거리 공연 중! 지나가시는 분들 구경오세요~', locIdx: 1 },
    { text: '이태원 새로 생긴 카페 추천합니다. 커피가 정말 맛있어요.', locIdx: 2 },
    { text: '잠실 한강 공원에서 자전거 타기 좋은 날씨네요!', locIdx: 3 },
    { text: '명동 쇼핑 중인데 세일 엄청 하고 있어요!', locIdx: 4 },
    { text: '오늘 강남에서 날씨가 정말 좋네요. 산책 추천!', locIdx: 0 },
    { text: '홍대 근처 맛있는 떡볶이 집 알려드림', locIdx: 1 },
  ];

  const posts = [];
  for (let i = 0; i < postContents.length; i++) {
    const { text, locIdx } = postContents[i];
    const loc = LOCATIONS[locIdx];
    const post = await prisma.posts.create({
      data: {
        user_id: users[i % users.length].user_id,
        contents: text,
        longitude: loc.lng + (Math.random() - 0.5) * 0.005,
        latitude: loc.lat + (Math.random() - 0.5) * 0.005,
      },
    });
    posts.push(post);
    console.log(`Post: "${text.substring(0, 30)}..."`);
  }

  // 4. 댓글 생성
  const commentTexts = [
    '완전 공감해요!',
    '좋은 정보 감사합니다 :)',
    '저도 가봤는데 진짜 좋더라구요~',
    '다음에 꼭 가볼게요!',
    '오 여기 어디에요?',
  ];

  for (let i = 0; i < 5; i++) {
    const commentUser = users[(i + 1) % users.length];
    await prisma.comment.create({
      data: {
        postId: posts[i].post_id,
        userId: commentUser.user_id,
        contents: commentTexts[i],
      },
    });
  }
  console.log('Comments: 5개 생성');

  // 7. 대댓글 생성
  const comments = await prisma.comment.findMany({ take: 3 });
  for (const comment of comments) {
    await prisma.comment.create({
      data: {
        postId: comment.postId,
        userId: users[0].user_id,
        contents: '답글 테스트입니다!',
        parentId: comment.commentId,
      },
    });
  }
  console.log('Replies: 3개 생성');

  // 8. 좋아요 생성
  let likeCount = 0;
  for (let i = 0; i < 5; i++) {
    for (const user of users) {
      if (Math.random() > 0.4) {
        await prisma.post_like.create({
          data: { postId: posts[i].post_id, userId: user.user_id },
        });
        likeCount++;
      }
    }
  }
  console.log(`Likes: ${likeCount}개 생성`);

  // 9. 샘플 날씨 데이터
  const userLoc = await prisma.users_location.findFirst();
  if (userLoc?.nx && userLoc?.ny) {
    const now = new Date();
    await prisma.weather_ultra_short_term_forecast.create({
      data: {
        nx: userLoc.nx,
        ny: userLoc.ny,
        base_datetime: now,
        fcst_datetime: new Date(now.getTime() + 3600000),
        t1h: 15, sky: 1, pty: 0, reh: 50, wsd: 3,
      },
    });
    console.log('Weather: 샘플 데이터 생성');
  }

  // 10. 샘플 대기질 데이터
  await prisma.air_quality.create({
    data: {
      station_name: '강남구',
      sido_name: '서울',
      pm25_value: 15, pm10_value: 35,
      pm25_grade: 1, pm10_grade: 2,
      khai_grade: 1, khai_value: 55,
      data_time: new Date(),
    },
  });
  console.log('Air quality: 샘플 데이터 생성');

  console.log('\n=== Seed 완료! ===');
  console.log('\nTest Accounts:');
  TEST_USERS.forEach((u) => console.log(`  ${u.username} / ${u.password} (${u.nickname})`));
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
