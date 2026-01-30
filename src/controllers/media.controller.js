// media.controller.js
import * as mediaService from '../services/media.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { getCloudFrontUrl, s3Client } from '../config/s3.config.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import path from 'path';

/*
미디어 업로드, 삭제 컨트롤러
*/

// POST /api/media/upload - 미디어 업로드
export const uploadMedia = async (req, res) => {
  try {
    console.log('=== 미디어 업로드 요청 ===');
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);

    if (!req.files || req.files.length === 0) {
      console.error('파일이 없습니다. req.files:', req.files);
      return errorResponse(res, '업로드할 파일이 없습니다', null, 400);
    }

    // 각 파일을 S3에 업로드
    const uploadPromises = req.files.map(async (file) => {
      // 파일명 생성: posts/YYYYMM/랜덤문자열.확장자
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const randomName = randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      const key = `posts/${year}${month}/${randomName}${ext}`;

      // S3에 업로드
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);

      return {
        location: getCloudFrontUrl(key),
        key,
        mimetype: file.mimetype,
        size: file.size,
      };
    });

    const files = await Promise.all(uploadPromises);

    return successResponse(res, '미디어 업로드 성공', { files }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '미디어 업로드 실패', null, 500);
  }
};

// GET /api/media/:postId - 게시글의 미디어 목록 조회
export const getMediaByPostId = async (req, res) => {
  const { postId } = req.params;

  try {
    const media = await mediaService.getMediaByPostId(postId);
    return successResponse(res, '미디어 조회 성공', media, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '미디어 조회 실패', null, 500);
  }
};

// DELETE /api/media/:mediaId - 미디어 삭제
export const deleteMedia = async (req, res) => {
  const { mediaId } = req.params;
  const { userId } = req.user;

  try {
    // 미디어 정보 조회 및 권한 확인
    const media = await prisma.mediaStorage.findUnique({
      where: { mediaId },
      include: {
        post: {
          select: { userId: true },
        },
      },
    });

    if (!media) {
      return errorResponse(res, '미디어를 찾을 수 없습니다', null, 404);
    }

    if (media.post.userId !== userId) {
      return errorResponse(res, '본인의 미디어만 삭제할 수 있습니다', null, 403);
    }

    // S3에서 파일 삭제
    if (media.link) {
      await mediaService.deleteMediaFromS3(media.link);
    }

    // DB에서 미디어 레코드 삭제
    await prisma.mediaStorage.delete({
      where: { mediaId },
    });

    return successResponse(res, '미디어 삭제 성공', { mediaId }, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '미디어 삭제 실패', null, 500);
  }
};
