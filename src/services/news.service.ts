import { prisma } from '../prismaClient.ts';

/*
지역 뉴스/재난알림 관련 로직
*/

interface SidoResult {
  sidoName: string;
}

const getSidoNameByUserId = async (userId: string): Promise<string | null> => {
  const result = await prisma.$queryRaw<SidoResult[]>`
    SELECT s.sido_nm AS "sidoName"
    FROM users_location ul
    JOIN sig s ON ST_Contains(s.geom, ul.location)
    WHERE ul.user_id = ${userId}::uuid
    LIMIT 1
  `;
  return result[0]?.sidoName || null;
};

export const getLocalNewsByUserId = async (userId: string, limit: number = 10) => {
  const sidoName = await getSidoNameByUserId(userId);

  if (!sidoName) {
    return [];
  }

  const regionCode = sidoName.substring(0, 2);

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

export const getDisasterAlertsByUserId = async (userId: string, limit: number = 5) => {
  const sidoName = await getSidoNameByUserId(userId);

  if (!sidoName) {
    return [];
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const alerts = await prisma.disaster_alert.findMany({
    where: {
      rcptn_rgn_nm: {
        contains: sidoName.substring(0, 2),
      },
      crt_dt: {
        gte: new Date(oneDayAgoStr),
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
    select: {
      id: true,
      msg_cn: true,
      rcptn_rgn_nm: true,
      crt_dt: true,
      emrg_step_nm: true,
      dst_se_nm: true,
      created_at: true,
    },
  });

  return alerts.map((a) => ({
    id: a.id,
    msgCn: a.msg_cn,
    rcptnRgnNm: a.rcptn_rgn_nm,
    regYmd: a.crt_dt,
    emrgStepNm: a.emrg_step_nm,
    dstSeNm: a.dst_se_nm,
    createdAt: a.created_at,
  }));
};

export const getAllLocalNews = async (limit: number = 20) => {
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

export const getAllDisasterAlerts = async (limit: number = 10) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const alerts = await prisma.disaster_alert.findMany({
    where: {
      crt_dt: {
        gte: new Date(oneDayAgoStr),
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: limit,
    select: {
      id: true,
      msg_cn: true,
      rcptn_rgn_nm: true,
      crt_dt: true,
      emrg_step_nm: true,
      dst_se_nm: true,
      created_at: true,
    },
  });

  return alerts.map((a) => ({
    id: a.id,
    msgCn: a.msg_cn,
    rcptnRgnNm: a.rcptn_rgn_nm,
    regYmd: a.crt_dt,
    emrgStepNm: a.emrg_step_nm,
    dstSeNm: a.dst_se_nm,
    createdAt: a.created_at,
  }));
};

export const getNewsSummaryByUserId = async (userId: string) => {
  const sidoName = await getSidoNameByUserId(userId);
  const regionCode = sidoName ? sidoName.substring(0, 2) : null;

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

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const activeAlerts = regionCode
    ? (
        await prisma.disaster_alert.findMany({
          where: {
            rcptn_rgn_nm: {
              contains: regionCode,
            },
            crt_dt: {
              gte: new Date(oneDayAgoStr),
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
          select: {
            id: true,
            msg_cn: true,
            emrg_step_nm: true,
            dst_se_nm: true,
          },
        })
      ).map((a) => ({
        id: a.id,
        msgCn: a.msg_cn,
        emrgStepNm: a.emrg_step_nm,
        dstSeNm: a.dst_se_nm,
      }))
    : [];

  return {
    sidoName,
    recentNews,
    activeAlert: activeAlerts[0] || null,
    hasActiveAlert: activeAlerts.length > 0,
  };
};
