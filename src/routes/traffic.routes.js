import express from 'express';
const router = express.Router();
import * as trafficController from '../controllers/traffic.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';

/*
교통정보 routes
*/

// GET /api/traffic/summary - 교통 요약 정보 (홈 화면용)
router.get('/summary', verifyToken, trafficController.getTrafficSummary);

// GET /api/traffic/incidents - 주변 돌발상황 목록
router.get('/incidents', verifyToken, trafficController.getIncidents);

// GET /api/traffic/road - 주변 도로 소통정보 목록
router.get('/road', verifyToken, trafficController.getRoadTraffic);

export default router;
