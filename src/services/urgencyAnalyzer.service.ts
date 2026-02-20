/**
 * 긴급도 분석 서비스
 * 규칙 기반 + 신뢰도 점수로 게시글의 긴급도를 판단
 *
 * 점수 구성: 키워드 매칭(50%) + 지역 빈도(30%) + 사용자 신뢰도(20%)
 */

import { prisma } from '../prismaClient.ts';
import {
  URGENCY_KEYWORDS,
  URGENCY_THRESHOLDS,
  ALERT_RADIUS,
  FREQUENCY_CONFIG,
} from '../config/urgencyKeywords.ts';
import { sendPushToNearbyUsers } from './push.service.ts';
import logger from '../config/logger.ts';

interface UrgencyResult {
  score: number;
  level: string;
  category: string | null;
  matchedKeywords: string[];
  confidence: number;
}

interface KeywordResult {
  score: number;
  category: string | null;
  matchedKeywords: string[];
}

export const analyzePostUrgency = async (
  contents: string,
  longitude: number,
  latitude: number,
  userId: string,
): Promise<UrgencyResult> => {
  const keywordResult = analyzeKeywords(contents);

  if (keywordResult.score === 0) {
    return { score: 0, level: 'normal', category: null, matchedKeywords: [], confidence: 0 };
  }

  const frequencyScore = await analyzeAreaFrequency(
    keywordResult.matchedKeywords,
    longitude,
    latitude,
  );

  const userTrustScore = await calculateUserTrust(userId);

  const finalScore = Math.min(
    10,
    keywordResult.score * 0.5 + frequencyScore * 0.3 + userTrustScore * 0.2,
  );

  const confidence = Math.min(
    1,
    keywordResult.matchedKeywords.length * 0.2 + frequencyScore * 0.05,
  );

  const level = getUrgencyLevel(finalScore);

  logger.info(
    {
      finalScore: finalScore.toFixed(2),
      level,
      category: keywordResult.category,
      keywords: keywordResult.matchedKeywords,
      keywordScore: keywordResult.score.toFixed(2),
      frequencyScore: frequencyScore.toFixed(2),
      userTrustScore: userTrustScore.toFixed(2),
      confidence: confidence.toFixed(2),
    },
    'Urgency analysis completed',
  );

  return {
    score: Math.round(finalScore * 100) / 100,
    level,
    category: keywordResult.category,
    matchedKeywords: keywordResult.matchedKeywords,
    confidence: Math.round(confidence * 100) / 100,
  };
};

export const analyzeKeywords = (contents: string): KeywordResult => {
  const text = contents.toLowerCase();
  let bestScore = 0;
  let bestCategory: string | null = null;
  const allMatched: string[] = [];

  for (const [category, config] of Object.entries(URGENCY_KEYWORDS)) {
    for (const [keyword, weight] of Object.entries(config.keywords)) {
      if (text.includes(keyword.toLowerCase())) {
        const adjustedWeight = (weight as number) * config.weight;
        allMatched.push(keyword);
        if (adjustedWeight > bestScore) {
          bestScore = adjustedWeight;
          bestCategory = category;
        }
      }
    }
  }

  const multiBonus = Math.min(2, (allMatched.length - 1) * 0.5);
  const finalKeywordScore = Math.min(10, bestScore + (allMatched.length > 1 ? multiBonus : 0));

  return {
    score: finalKeywordScore,
    category: bestCategory,
    matchedKeywords: allMatched,
  };
};

const analyzeAreaFrequency = async (
  keywords: string[],
  longitude: number,
  latitude: number,
): Promise<number> => {
  if (!longitude || !latitude || keywords.length === 0) return 0;

  const timeWindow = new Date(Date.now() - FREQUENCY_CONFIG.timeWindowMinutes * 60 * 1000);

  const recentReports = await prisma.urgency_report.findMany({
    where: {
      createdAt: { gte: timeWindow },
      score: { gte: URGENCY_THRESHOLDS.caution },
    },
    select: { matchedKeywords: true, longitude: true, latitude: true },
  });

  const nearbyCount = recentReports.filter((report) => {
    if (!report.longitude || !report.latitude) return false;
    const dist = haversineDistance(latitude, longitude, report.latitude, report.longitude);
    return dist <= FREQUENCY_CONFIG.radiusMeters;
  }).length;

  if (nearbyCount >= FREQUENCY_CONFIG.boostThreshold) {
    return Math.min(10, 5 + FREQUENCY_CONFIG.boostAmount);
  }

  return Math.min(5, nearbyCount * 2);
};

const calculateUserTrust = async (userId: string): Promise<number> => {
  let trust = 5;

  const postCount = await prisma.posts.count({ where: { user_id: userId } });
  trust += Math.min(2, postCount * 0.1);

  const prevReports = await prisma.urgency_report.findMany({
    where: { userId },
    select: { isConfirmed: true },
  });

  if (prevReports.length > 0) {
    const confirmedRate = prevReports.filter((r) => r.isConfirmed).length / prevReports.length;
    trust += confirmedRate * 3;
  }

  return Math.min(10, trust);
};

const getUrgencyLevel = (score: number): string => {
  if (score >= URGENCY_THRESHOLDS.urgent) return 'urgent';
  if (score >= URGENCY_THRESHOLDS.caution) return 'caution';
  return 'normal';
};

export const saveUrgencyReport = async (
  postId: string,
  userId: string,
  analysisResult: UrgencyResult,
  longitude: number,
  latitude: number,
) => {
  return prisma.urgency_report.create({
    data: {
      postId,
      userId,
      score: analysisResult.score,
      level: analysisResult.level,
      category: analysisResult.category,
      matchedKeywords: analysisResult.matchedKeywords,
      confidence: analysisResult.confidence,
      longitude,
      latitude,
    },
  });
};

export const notifyNearbyUsers = async (
  post: { postId: string; contents: string; longitude: number; latitude: number },
  analysisResult: UrgencyResult,
): Promise<number> => {
  const radius = analysisResult.level === 'urgent' ? ALERT_RADIUS.urgent : ALERT_RADIUS.caution;

  const title = analysisResult.level === 'urgent' ? '🚨 긴급 상황 알림' : '⚠️ 주의 알림';

  const body = post.contents.length > 100 ? post.contents.substring(0, 100) + '...' : post.contents;

  const notifiedCount = await sendPushToNearbyUsers(
    post.longitude,
    post.latitude,
    radius,
    title,
    body,
    {
      type: 'urgent_post',
      postId: post.postId,
      urgencyLevel: analysisResult.level,
      category: analysisResult.category,
    },
  );

  logger.info(
    {
      postId: post.postId,
      level: analysisResult.level,
      radius,
      notifiedCount,
    },
    'Urgency notification sent',
  );

  return notifiedCount;
};

export const getUrgencyReports = async (
  longitude: number,
  latitude: number,
  radiusMeters: number = 5000,
  limit: number = 20,
) => {
  const reports = await prisma.$queryRaw`
    SELECT
      ur.urgency_report_id AS "reportId",
      ur.post_id AS "postId",
      ur.score,
      ur.level,
      ur.category,
      ur.matched_keywords AS "matchedKeywords",
      ur.confidence,
      ur.is_confirmed AS "isConfirmed",
      ur.report_count AS "reportCount",
      ur.created_at AS "createdAt",
      p.contents,
      p.longitude,
      p.latitude,
      u.nickname,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(ur.longitude, ur.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS distance
    FROM urgency_report ur
    JOIN posts p ON p.post_id = ur.post_id
    JOIN users_account u ON u.user_id = ur.user_id
    WHERE ur.created_at > NOW() - INTERVAL '24 hours'
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(ur.longitude, ur.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY ur.score DESC, ur.created_at DESC
    LIMIT ${limit}
  `;

  return reports;
};

export const submitFeedback = async (reportId: string, userId: string, action: string) => {
  const report = await prisma.urgency_report.findUnique({
    where: { urgencyReportId: reportId },
  });

  if (!report) return null;

  if (action === 'confirm') {
    return prisma.urgency_report.update({
      where: { urgencyReportId: reportId },
      data: {
        isConfirmed: true,
        reportCount: { increment: 1 },
      },
    });
  }

  if (action === 'report') {
    const updated = await prisma.urgency_report.update({
      where: { urgencyReportId: reportId },
      data: {
        reportCount: { increment: 1 },
      },
    });

    if (updated.reportCount >= 5 && !updated.isConfirmed) {
      await prisma.urgency_report.update({
        where: { urgencyReportId: reportId },
        data: { score: 0, level: 'normal' },
      });
    }

    return updated;
  }

  return report;
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
