import { prisma } from '../prismaClient.js';

/*
지역 뉴스/재난알림 관련 로직
*/

// 사용자 위치 기반 시도명 조회
const getSidoNameByUserId = async (userId) => {
  const result = await prisma.$queryRaw`
    SELECT s.sido_nm AS "sidoName"
    FROM users_location ul
    JOIN sig s ON ST_Contains(s.geom, ul.location)
    WHERE ul.user_id = ${userId}::uuid
    LIMIT 1
  `;
  return result[0]?.sidoName || null;
};

// 사용자 위치 기반 지역 뉴스 조회
export const getLocalNewsByUserId = async (userId, limit = 10) => {
  const sidoName = await getSidoNameByUserId(userId);

  if (!sidoName) {
    return [];
  }

  // 시도명을 지역코드로 변환 (간단한 매핑)
  const regionCode = sidoName.substring(0, 2); // 예: "서울특별시" → "서울"

  const news = await prisma.local_news.findMany({
    where: {
      regionCode: {
        startsWith: regionCode,
      },
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      link: true,
      source: true,
      category: true,
      publishedAt: true,
    },
  });

  return news;
};

// 사용자 위치 기반 재난 알림 조회
export const getDisasterAlertsByUserId = async (userId, limit = 5) => {
  const sidoName = await getSidoNameByUserId(userId);

  if (!sidoName) {
    return [];
  }

  // 최근 24시간 내 재난 알림만 조회
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const alerts = await prisma.disaster_alert.findMany({
    where: {
      rcptnRgnNm: {
        contains: sidoName.substring(0, 2),
      },
      regYmd: {
        gte: oneDayAgoStr,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      msgCn: true,
      rcptnRgnNm: true,
      regYmd: true,
      emrgStepNm: true,
      dstSeNm: true,
      createdAt: true,
    },
  });

  return alerts;
};

// 전체 지역 뉴스 조회 (지역 필터 없음)
export const getAllLocalNews = async (limit = 20) => {
  const news = await prisma.local_news.findMany({
    orderBy: {
      publishedAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      link: true,
      source: true,
      category: true,
      regionCode: true,
      publishedAt: true,
    },
  });

  return news;
};

// 전체 재난 알림 조회 (최근 24시간)
export const getAllDisasterAlerts = async (limit = 10) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const alerts = await prisma.disaster_alert.findMany({
    where: {
      regYmd: {
        gte: oneDayAgoStr,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      msgCn: true,
      rcptnRgnNm: true,
      regYmd: true,
      emrgStepNm: true,
      dstSeNm: true,
      createdAt: true,
    },
  });

  return alerts;
};

// 뉴스/알림 요약 정보 조회 (홈 화면용)
export const getNewsSummaryByUserId = async (userId) => {
  const sidoName = await getSidoNameByUserId(userId);
  const regionCode = sidoName ? sidoName.substring(0, 2) : null;

  // 최근 뉴스 3개
  const recentNews = regionCode
    ? await prisma.local_news.findMany({
        where: {
          regionCode: {
            startsWith: regionCode,
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 3,
        select: {
          id: true,
          title: true,
          category: true,
          publishedAt: true,
        },
      })
    : [];

  // 최근 24시간 내 재난 알림
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const activeAlerts = regionCode
    ? await prisma.disaster_alert.findMany({
        where: {
          rcptnRgnNm: {
            contains: regionCode,
          },
          regYmd: {
            gte: oneDayAgoStr,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          msgCn: true,
          emrgStepNm: true,
          dstSeNm: true,
        },
      })
    : [];

  return {
    sidoName,
    recentNews,
    activeAlert: activeAlerts[0] || null,
    hasActiveAlert: activeAlerts.length > 0,
  };
};
