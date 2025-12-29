import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as profileController from '../controllers/profile.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateToken } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';
import * as profileSchema from '../schema/profile.schema.js';


/*
프로필 routes
*/

router.get(
  '/',
  [verifyToken, validateToken(authSchema.checkAuth)],
  profileController.getProfile,
); // GET / 프로필 조회
router.post('/location',
  [verifyToken, validateToken(authSchema.checkAuth), validateBody(profileSchema.setLocationSchema)],
  profileController.setLocation,
); // POST / 위치 정보 저장
