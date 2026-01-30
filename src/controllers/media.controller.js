// media.controller.js
import * as mediaService from '../services/media.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { getCloudFrontUrl } from '../config/s3.config.js';

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

    // 업로드된 파일 정보를 CloudFront URL로 변환하여 반환
    const files = req.files.map((file) => ({
      location: getCloudFrontUrl(file.key), // S3 key를 CloudFront URL로 변환
      key: file.key,
      mimetype: file.mimetype,
      size: file.size,
    }));

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
