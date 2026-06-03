import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PROVIDER = 'demo-seed';
const ATTACH_MEDIA = process.env.DEMO_SEED_ATTACH_MEDIA !== 'false';
const MEDIA_PREFIX = (process.env.DEMO_MEDIA_PREFIX || 'posts/demo').replace(/^\/+|\/+$/g, '');

const LOCATIONS = [
  { name: '울산대학교 정문', lng: 129.2583, lat: 35.5425 },
  { name: '울산대학교 학생회관', lng: 129.2599, lat: 35.5476 },
  { name: '무거동 먹자골목', lng: 129.2568, lat: 35.5439 },
  { name: '신복로터리', lng: 129.2620, lat: 35.5511 },
  { name: '울산과학대 서부캠퍼스', lng: 129.2551, lat: 35.5504 },
  { name: '문수경기장 입구', lng: 129.2578, lat: 35.5357 },
  { name: '문수야구장', lng: 129.2602, lat: 35.5337 },
  { name: '굴화주공아파트 앞', lng: 129.2661, lat: 35.5528 },
  { name: '삼호교 남단', lng: 129.2712, lat: 35.5498 },
  { name: '삼호동 행정복지센터', lng: 129.2760, lat: 35.5489 },
  { name: '무거시장', lng: 129.2536, lat: 35.5452 },
  { name: '옥현사거리', lng: 129.2519, lat: 35.5403 },
  { name: '문수로 진입로', lng: 129.2478, lat: 35.5385 },
  { name: '울산대공원 남문', lng: 129.2874, lat: 35.5325 },
  { name: '태화강국가정원 남쪽', lng: 129.2922, lat: 35.5453 },
  { name: '장검IC 입구', lng: 129.2698, lat: 35.5582 },
  { name: '범서 굴화리', lng: 129.2727, lat: 35.5571 },
  { name: '남운프라자 앞', lng: 129.2572, lat: 35.5410 },
  { name: '울산대 후문 원룸가', lng: 129.2613, lat: 35.5457 },
  { name: '문수초등학교 앞', lng: 129.2508, lat: 35.5467 },
];

const USERS = [
  '동네한바퀴',
  '출근길관찰자',
  '버스기다림',
  '골목소식통',
  '오늘도지각',
  '강변산책러',
  '비상등켜짐',
  '카페인충전',
  '길막알림이',
  '퇴근요정',
  '근처주민A',
  '편의점앞',
  '우산챙겨요',
  '자전거타는중',
  '횡단보도앞',
];

const POST_BLUEPRINTS = [
  ['울산대학교 정문 앞 사거리에서 접촉사고 처리 중입니다. 무거삼거리 방향 차들이 거의 기어가요.', 0, 'traffic'],
  ['학생회관 앞 계단 쪽 바닥이 비 때문에 많이 미끄럽습니다. 뛰어 내려오지 마세요.', 1, 'weather'],
  ['무거동 먹자골목 안쪽에 배달 오토바이랑 택배차가 몰려서 차량 진입이 느립니다.', 2, 'traffic'],
  ['신복로터리에서 학교 올라오는 차선 하나가 공사 콘으로 막혀 있습니다. 버스도 조금씩 밀려요.', 3, 'traffic'],
  ['울산과학대 서부캠퍼스 앞 횡단보도 신호등 점검 중이라 경찰분이 수신호 하고 있어요.', 4, 'safety'],
  ['문수경기장 입구 쪽 주차장 진입 대기줄이 도로까지 나왔습니다. 경기나 행사 있는 것 같아요.', 5, 'traffic'],
  ['문수야구장 주변 도로에 관광버스 정차가 많습니다. 자전거 타시는 분들 조심하세요.', 6, 'traffic'],
  ['굴화주공 앞 정류장 전광판이 꺼져 있습니다. 버스 앱으로 확인하는 게 낫겠어요.', 7, 'daily'],
  ['삼호교 남단에서 태화강 쪽으로 들어가는 길이 많이 막힙니다. 우측 차로에 고장 차량 있어요.', 8, 'traffic'],
  ['삼호동 행정복지센터 앞 골목에 하수도 작업 차량이 서 있어서 한 대씩 지나갑니다.', 9, 'traffic'],
  ['무거시장 입구 쪽에 장보는 차량이 많아서 잠깐씩 정체 생깁니다. 점심 전까지 붐빌 듯해요.', 10, 'daily'],
  ['옥현사거리에서 울산대 방향 좌회전 대기줄이 길어요. 신호 두 번은 기다려야 합니다.', 11, 'traffic'],
  ['문수로 진입로에 포트홀 보수 중입니다. 오토바이나 킥보드 타시는 분들 천천히 지나가세요.', 12, 'safety'],
  ['울산대공원 남문 주차장이 거의 찼습니다. 가족 단위 방문객이 많아서 진입이 느려요.', 13, 'traffic'],
  ['태화강국가정원 남쪽 산책로에 물 고인 곳이 많습니다. 흰 운동화는 피하는 게 좋겠어요.', 14, 'weather'],
  ['장검IC 입구 쪽에서 화물차 한 대가 비상등 켜고 서 있습니다. 합류 구간 서행하세요.', 15, 'traffic'],
  ['범서 굴화리 방향 도로에 낙하물 신고가 들어간 것 같습니다. 차들이 2차로를 피해서 가요.', 16, 'safety'],
  ['남운프라자 앞 골목에 배달 차량이 많아서 보행자가 차도로 내려오는 경우가 있습니다.', 17, 'safety'],
  ['울산대 후문 원룸가 골목에 쓰레기 수거차 작업 중입니다. 잠깐 길이 막혀요.', 18, 'daily'],
  ['문수초등학교 앞 어린이보호구역에 불법 주정차가 많습니다. 하교 시간이라 조심해야 해요.', 19, 'safety'],
  ['울산대 정문 버스정류장에 사람이 많이 몰려 있습니다. 401번 버스는 두 대 연속 만차였어요.', 0, 'traffic'],
  ['학생회관 옆 편의점 앞에 분실물 찾는 분 있습니다. 검은색 카드지갑이라고 해요.', 1, 'daily'],
  ['무거동 식당가 골목에 비상등 켠 차량이 길게 서 있어서 점심시간에 차가 잘 안 빠집니다.', 2, 'traffic'],
  ['신복로터리에서 고속도로 입구 방향으로 꼬리물기가 심합니다. 횡단보도 건널 때 조심하세요.', 3, 'safety'],
  ['울산과학대 앞 보도블록 공사 중이라 캐리어 끌고 지나가기 조금 불편합니다.', 4, 'daily'],
  ['문수경기장 쪽으로 가는 길에 임시 주차 안내원이 나와 있습니다. 평소보다 10분 더 잡으세요.', 5, 'traffic'],
  ['문수야구장 주변 인도에 공유 킥보드가 여러 대 쓰러져 있습니다. 밤에는 잘 안 보일 듯해요.', 6, 'daily'],
  ['굴화주공 앞 횡단보도 버튼이 잘 안 눌리는 것 같습니다. 몇 명이 그냥 기다리고 있어요.', 7, 'daily'],
  ['삼호교 남단 버스정류장 앞에 접촉사고 차량 두 대가 서 있습니다. 태화강 방향 서행 중입니다.', 8, 'traffic'],
  ['삼호동 쪽 주택가 골목에 택배 하역 중이라 차 한 대 겨우 지나갑니다.', 9, 'daily'],
  ['무거시장 안쪽 노점 줄이 길어서 인도 폭이 좁아졌습니다. 유모차는 바깥길이 나아요.', 10, 'daily'],
  ['옥현사거리 근처 도로 가장자리에 물이 많이 튑니다. 버스 지나갈 때 보행자 조심하세요.', 11, 'weather'],
  ['문수로 쪽에서 울산대 방향 우회전 차량들이 길게 밀려 있습니다. 신호가 짧은 느낌이에요.', 12, 'traffic'],
  ['울산대공원 남문 앞 자전거도로에 나뭇가지가 떨어져 있습니다. 피해서 지나가세요.', 13, 'safety'],
  ['태화강국가정원 방향 산책로에 벌레가 많습니다. 저녁에 가실 분들은 긴팔 추천합니다.', 14, 'daily'],
  ['장검IC 입구에서 굴화 방향으로 도로 청소차 작업 중입니다. 한 차선씩 천천히 갑니다.', 15, 'traffic'],
  ['범서 굴화리 편의점 앞 택시 승하차가 많아서 버스 진입이 느립니다.', 16, 'traffic'],
  ['남운프라자 앞 횡단보도에 공사 안내판이 쓰러져 있습니다. 바람 때문에 그런 것 같아요.', 17, 'safety'],
  ['울산대 후문 원룸가 쪽 가로등 하나가 꺼져 있습니다. 밤에 골목이 꽤 어두워요.', 18, 'safety'],
  ['문수초등학교 앞 속도 단속 구간에서 급정거 차량이 많습니다. 뒤차 간격 조심하세요.', 19, 'traffic'],
  ['울산대 정문 근처 카페 앞에 소방차가 잠깐 정차했습니다. 큰 불은 아닌 것 같고 점검 중으로 보여요.', 0, 'safety'],
  ['학생회관 앞 배달존에 오토바이가 너무 몰려서 통행이 조금 복잡합니다.', 1, 'daily'],
  ['무거동 먹자골목 초입에 음식물 수거차가 작업 중이라 냄새와 정체가 조금 있습니다.', 2, 'daily'],
  ['신복로터리에서 울산IC 방향 버스가 평소보다 늦습니다. 기사님 말로는 앞쪽 사고 때문이래요.', 3, 'traffic'],
  ['울산과학대 앞 정류장 임시 이전 안내가 붙었습니다. 기존 위치보다 30m 뒤쪽이에요.', 4, 'daily'],
  ['문수경기장 주차장 입구 결제기 하나가 고장이라 출차가 느립니다. 왼쪽 차선이 더 빨라요.', 5, 'traffic'],
  ['문수야구장 뒤편 도로에 큰 물웅덩이가 있습니다. 차량 지나갈 때 물 튀어요.', 6, 'weather'],
  ['굴화주공 앞 골목에서 이삿짐 차량 작업 중입니다. 양방향 차량이 번갈아 지나갑니다.', 7, 'traffic'],
  ['삼호교 남단에서 자전거 사고 목격했습니다. 구급차 도착했고 주변 통행은 천천히 진행 중입니다.', 8, 'safety'],
  ['삼호동 방향 버스정류장에 노선 변경 안내가 붙었는데 글씨가 작아서 어르신들이 헷갈려 하세요.', 9, 'daily'],
  ['무거시장 근처 공영주차장 만차입니다. 차로 오시는 분들은 다른 곳 찾는 게 낫습니다.', 10, 'traffic'],
  ['옥현사거리에서 학교 방향 도로에 낙엽이 많이 쌓여 있습니다. 비 오면 미끄러울 듯해요.', 11, 'weather'],
  ['문수로 진입부에 고장 난 신호등이 있는 것 같습니다. 차량들이 눈치 보며 지나가고 있어요.', 12, 'safety'],
  ['울산대공원 남문 산책로 입구에 임시 펜스가 생겼습니다. 일부 구간 우회해야 합니다.', 13, 'daily'],
  ['태화강국가정원 남쪽 주차장 입구가 많이 밀립니다. 산책만이면 대중교통이 편할 듯해요.', 14, 'traffic'],
  ['장검IC 쪽 화물차가 차선을 물고 서 있어서 승용차들이 좌측으로 피해서 갑니다.', 15, 'traffic'],
  ['범서 굴화리 아파트 앞 횡단보도에 물건이 떨어져 있습니다. 차량들이 급하게 피하네요.', 16, 'safety'],
  ['남운프라자 앞 버스정류장에 우산 놓고 가신 분 있는 것 같습니다. 벤치 끝에 걸려 있어요.', 17, 'daily'],
  ['울산대 후문 골목 배수구에서 물이 역류하는 것 같습니다. 구청 신고 필요해 보여요.', 18, 'safety'],
  ['문수초등학교 앞 학원 차량이 몰리는 시간이라 길이 복잡합니다. 천천히 지나가세요.', 19, 'traffic'],
];

const COMMENTS = [
  '정보 감사합니다. 바로 우회할게요.',
  '방금 지나왔는데 아직 막혀요.',
  '사진 없어도 설명만으로 충분하네요.',
  '근처 계신 분들 조심하세요.',
  '저도 같은 상황 봤습니다.',
  '버스 앱보다 이런 글이 더 빠르네요.',
  '혹시 지금은 풀렸을까요?',
  '아이들 지나가는 길이면 빨리 정리됐으면 좋겠어요.',
  '퇴근 전에 봐서 다행입니다.',
  '구청 신고도 넣어볼게요.',
];

const TRAFFIC_INCIDENTS = [
  ['demo-incident-usn-front-001', '사고', '울산대 정문 접촉사고', '울산대 정문 사거리 무거삼거리 방향 접촉사고 처리 중', '대학로', 129.2583, 35.5425, 3],
  ['demo-incident-sinbok-001', '공사', '신복로터리 차로 공사', '신복로터리에서 울산대 방향 1개 차로 공사 통제', '북부순환도로', 129.2620, 35.5511, 2],
  ['demo-incident-samho-001', '고장차량', '삼호교 남단 고장 차량', '삼호교 남단 태화강 방향 우측 차로 견인 대기', '삼호로', 129.2712, 35.5498, 2],
  ['demo-incident-munsu-001', '행사', '문수경기장 주변 행사 혼잡', '문수경기장 주차장 진입 대기와 임시 통제 발생', '문수로', 129.2578, 35.5357, 2],
  ['demo-incident-janggeom-001', '낙하물', '장검IC 입구 낙하물', '장검IC 입구 굴화 방향 2차로 낙하물 신고 접수', '울밀로', 129.2698, 35.5582, 3],
];

const ROAD_TRAFFIC = [
  ['대학로', 'demo-link-001', 13, 3, 129.2583, 35.5425],
  ['북부순환도로', 'demo-link-002', 18, 3, 129.2620, 35.5511],
  ['문수로', 'demo-link-003', 22, 2, 129.2578, 35.5357],
  ['삼호로', 'demo-link-004', 17, 3, 129.2712, 35.5498],
  ['울밀로', 'demo-link-005', 20, 2, 129.2698, 35.5582],
  ['남부순환도로', 'demo-link-006', 26, 2, 129.2478, 35.5385],
  ['옥현로', 'demo-link-007', 15, 3, 129.2519, 35.5403],
  ['무거로', 'demo-link-008', 19, 3, 129.2536, 35.5452],
];

function mediaBaseUrl() {
  if (process.env.DEMO_MEDIA_BASE_URL) {
    return process.env.DEMO_MEDIA_BASE_URL.replace(/\/+$/g, '');
  }

  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN.trim().replace(/^https?:\/\//, '').replace(/\/+$/g, '')}`;
  }

  if (process.env.AWS_S3_BUCKET_NAME) {
    const bucket = process.env.AWS_S3_BUCKET_NAME.trim();
    const region = (process.env.AWS_REGION || 'ap-northeast-2').trim();
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  return null;
}

function addJitter(location, index) {
  const lngOffset = (((index % 7) - 3) * 0.00038);
  const latOffset = ((((index * 2) % 7) - 3) * 0.00031);
  return {
    longitude: Number((location.lng + lngOffset).toFixed(7)),
    latitude: Number((location.lat + latOffset).toFixed(7)),
  };
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function resetDemoData() {
  const demoAccounts = await prisma.user_social_account.findMany({
    where: { provider: DEMO_PROVIDER },
    select: { user_id: true },
  });

  const userIds = [...new Set(demoAccounts.map((account) => account.user_id))];
  if (userIds.length === 0) return 0;

  await prisma.users_account.deleteMany({
    where: { user_id: { in: userIds } },
  });

  return userIds.length;
}

async function createDemoUsers() {
  const users = [];

  for (let index = 0; index < USERS.length; index += 1) {
    const location = LOCATIONS[index % LOCATIONS.length];
    const user = await prisma.users_account.create({
      data: {
        nickname: USERS[index],
        created_at: minutesAgo(60 * 24 * (USERS.length - index)),
        users_location: {
          create: {
            longitude: location.lng,
            latitude: location.lat,
          },
        },
        social_accounts: {
          create: {
            provider: DEMO_PROVIDER,
            sns_id: `demo-user-${String(index + 1).padStart(2, '0')}`,
            email: null,
            nickname: USERS[index],
          },
        },
      },
    });
    users.push(user);
  }

  return users;
}

async function createDemoPosts(users) {
  const baseUrl = mediaBaseUrl();
  const posts = [];
  const mediaRows = [];

  for (let index = 0; index < POST_BLUEPRINTS.length; index += 1) {
    const [contents, locIdx] = POST_BLUEPRINTS[index];
    const location = LOCATIONS[locIdx];
    const coords = addJitter(location, index);
    const user = users[index % users.length];

    const post = await prisma.posts.create({
      data: {
        user_id: user.user_id,
        contents,
        longitude: coords.longitude,
        latitude: coords.latitude,
        created_at: minutesAgo(8 + index * 17),
      },
    });
    posts.push(post);

    if (ATTACH_MEDIA && baseUrl && index < 24) {
      const mediaName = `demo-post-${String(index + 1).padStart(2, '0')}.webp`;
      const thumbName = `thumb_demo-post-${String(index + 1).padStart(2, '0')}.webp`;
      mediaRows.push({
        post_id: post.post_id,
        link: `${baseUrl}/${MEDIA_PREFIX}/${mediaName}`,
        thumbnail_link: `${baseUrl}/${MEDIA_PREFIX}/${thumbName}`,
        type: 'image',
        created_at: minutesAgo(7 + index * 17),
      });
    }
  }

  if (mediaRows.length > 0) {
    await prisma.media_storage.createMany({ data: mediaRows });
  }

  return { posts, mediaCount: mediaRows.length, mediaBase: baseUrl };
}

async function createDemoCommentsAndLikes(users, posts) {
  let commentCount = 0;
  let likeCount = 0;

  for (let postIndex = 0; postIndex < posts.length; postIndex += 1) {
    const post = posts[postIndex];
    const commentTotal = postIndex % 4 === 0 ? 3 : postIndex % 3 === 0 ? 2 : 1;

    for (let commentIndex = 0; commentIndex < commentTotal; commentIndex += 1) {
      const user = users[(postIndex + commentIndex + 1) % users.length];
      await prisma.comment.create({
        data: {
          postId: post.post_id,
          userId: user.user_id,
          contents: COMMENTS[(postIndex + commentIndex) % COMMENTS.length],
          createdAt: minutesAgo(3 + postIndex * 15 + commentIndex * 4),
        },
      });
      commentCount += 1;
    }

    const likeTotal = 2 + (postIndex % 6);
    for (let likeIndex = 0; likeIndex < likeTotal; likeIndex += 1) {
      const user = users[(postIndex + likeIndex + 2) % users.length];
      try {
        await prisma.post_like.create({
          data: {
            postId: post.post_id,
            userId: user.user_id,
            createdAt: minutesAgo(2 + postIndex * 13 + likeIndex),
          },
        });
        likeCount += 1;
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
      }
    }
  }

  return { commentCount, likeCount };
}

async function createUrgencyReports(users, posts) {
  const urgentPostIndexes = [0, 6, 20, 26, 32, 42, 48];
  const cautionPostIndexes = [3, 8, 14, 21, 30, 33, 40, 46, 54];
  const reports = [];

  for (const index of urgentPostIndexes) {
    const post = posts[index];
    if (!post) continue;
    reports.push({
      postId: post.post_id,
      userId: post.user_id,
      score: 8.2,
      level: 'urgent',
      category: 'accident',
      matchedKeywords: ['사고', '막힘', '조심'],
      confidence: 0.86,
      longitude: post.longitude,
      latitude: post.latitude,
      isConfirmed: true,
      reportCount: 3,
      createdAt: post.created_at ?? new Date(),
    });
  }

  for (const index of cautionPostIndexes) {
    const post = posts[index];
    if (!post) continue;
    reports.push({
      postId: post.post_id,
      userId: users[(index + 1) % users.length].user_id,
      score: 5.9,
      level: 'caution',
      category: 'lifeSafety',
      matchedKeywords: ['공사', '미끄럼', '통제'],
      confidence: 0.68,
      longitude: post.longitude,
      latitude: post.latitude,
      isConfirmed: index % 2 === 0,
      reportCount: 1 + (index % 3),
      createdAt: post.created_at ?? new Date(),
    });
  }

  if (reports.length > 0) {
    await prisma.urgency_report.createMany({ data: reports });
  }

  return reports.length;
}

async function createTrafficData() {
  await prisma.traffic_incidents.deleteMany({
    where: { incident_id: { startsWith: 'demo-incident-' } },
  });

  await prisma.road_traffic.deleteMany({
    where: { link_id: { startsWith: 'demo-link-' } },
  });

  const now = new Date();
  await prisma.traffic_incidents.createMany({
    data: TRAFFIC_INCIDENTS.map(
      ([incident_id, type, title, description, road_name, longitude, latitude, severity], index) => ({
        incident_id,
        type,
        title,
        description,
        road_name,
        longitude,
        latitude,
        start_time: minutesAgo(30 + index * 11),
        end_time: new Date(now.getTime() + (60 + index * 20) * 60 * 1000),
        severity,
        created_at: minutesAgo(28 + index * 11),
      }),
    ),
  });

  await prisma.road_traffic.createMany({
    data: ROAD_TRAFFIC.map(([road_name, link_id, speed, status, longitude, latitude], index) => ({
      road_name,
      link_id,
      speed,
      status,
      longitude,
      latitude,
      data_time: minutesAgo(index * 3),
      created_at: minutesAgo(index * 3),
    })),
  });

  return {
    incidentCount: TRAFFIC_INCIDENTS.length,
    roadTrafficCount: ROAD_TRAFFIC.length,
  };
}

function printMediaInstructions(mediaBase, mediaCount) {
  if (!ATTACH_MEDIA) {
    console.log('Media: disabled (DEMO_SEED_ATTACH_MEDIA=false)');
    return;
  }

  if (!mediaBase) {
    console.log('Media: skipped. Set DEMO_MEDIA_BASE_URL, CLOUDFRONT_DOMAIN, or AWS_S3_BUCKET_NAME to attach S3 URLs.');
    return;
  }

  console.log(`Media: ${mediaCount}개 S3/CloudFront URL 연결`);
  console.log(`Media base: ${mediaBase}`);
  console.log(`S3 key prefix: ${MEDIA_PREFIX}`);
  console.log('Replace/upload images at keys like:');
  console.log(`  ${MEDIA_PREFIX}/demo-post-01.webp`);
  console.log(`  ${MEDIA_PREFIX}/thumb_demo-post-01.webp`);
}

async function seed() {
  console.log('=== saveSNS demo seed 시작 ===');

  const removedUsers = await resetDemoData();
  console.log(`Removed previous demo users: ${removedUsers}`);

  const users = await createDemoUsers();
  console.log(`Users: ${users.length}개 생성`);

  const { posts, mediaCount, mediaBase } = await createDemoPosts(users);
  console.log(`Posts: ${posts.length}개 생성`);

  const { commentCount, likeCount } = await createDemoCommentsAndLikes(users, posts);
  console.log(`Comments: ${commentCount}개 생성`);
  console.log(`Likes: ${likeCount}개 생성`);

  const urgencyCount = await createUrgencyReports(users, posts);
  console.log(`Urgency reports: ${urgencyCount}개 생성`);

  const { incidentCount, roadTrafficCount } = await createTrafficData();
  console.log(`Traffic incidents: ${incidentCount}개 생성`);
  console.log(`Road traffic rows: ${roadTrafficCount}개 생성`);

  printMediaInstructions(mediaBase, mediaCount);
  console.log('=== saveSNS demo seed 완료 ===');
}

seed()
  .catch((error) => {
    console.error('Demo seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
