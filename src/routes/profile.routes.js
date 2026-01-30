import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as profileController from '../controllers/profile.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';
import * as profileSchema from '../schema/profile.schema.js';

/*
프로필 routes
*/

router.get('/', [verifyToken], profileController.getProfile); // GET / 프로필 조회
router.patch('/', [verifyToken], profileController.updateProfile); // PATCH / 프로필 수정
router.get('/posts', [verifyToken], profileController.getUserPosts); // GET /posts 내 게시글 목록
router.post(
  '/location',
  [verifyToken, validateBody(profileSchema.setLocationSchema)],
  profileController.setLocation,
); // POST /location 위치 정보 저장

export default router;
