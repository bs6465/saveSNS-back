import express from 'express';
import * as shelterController from '../controllers/shelter.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateQuery } from '../middleware/validate.ts';
import * as shelterSchema from '../schema/shelter.schema.ts';

const router = express.Router();

/**
 * @swagger
 * /shelters/nearby:
 *   get:
 *     summary: 주변 대피소 조회 (PostGIS 거리 기반)
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusMeters
 *         schema: { type: integer, default: 5000 }
 *       - in: query
 *         name: shelterType
 *         schema: { type: string, enum: [civil_defense, earthquake, flood] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: 주변 대피소 목록
 */
router.get(
  '/nearby',
  verifyToken,
  validateQuery(shelterSchema.nearbySheltersQuery),
  shelterController.getNearbyShelters,
);

/**
 * @swagger
 * /shelters/region:
 *   get:
 *     summary: 지역별 대피소 조회
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/region',
  verifyToken,
  validateQuery(shelterSchema.sheltersByRegionQuery),
  shelterController.getSheltersByRegion,
);

/**
 * @swagger
 * /shelters/offline:
 *   get:
 *     summary: 오프라인 다운로드용 대피소 데이터
 *     tags: [Shelters]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/offline',
  verifyToken,
  validateQuery(shelterSchema.offlineDownloadQuery),
  shelterController.getSheltersForOffline,
);

export default router;
