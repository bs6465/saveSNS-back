import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as weatherController from '../controllers/weather.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateToken } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';

/*
날씨 routes
*/

router.get(
  '/ultrashort',
  validateToken(verifyToken),
  weatherController.getUltraShortTermForecast
); // GET /api/weather/ultrashort 초단기 예보 조회

export default router;