import express from 'express';
const router = express.Router();
import * as airqualityController from '../controllers/airquality.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';

/*
대기질 routes
*/

// GET /api/airquality - 사용자 위치 기반 대기질 조회
router.get('/', verifyToken, airqualityController.getAirQuality);

// GET /api/airquality/:sidoName - 시도별 대기질 조회
router.get('/:sidoName', verifyToken, airqualityController.getAirQualityBySido);

export default router;
