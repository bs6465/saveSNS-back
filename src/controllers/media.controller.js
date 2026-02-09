// media.controller.js
import * as mediaService from '../services/media.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { uploadFile, generateKey } from '../config/storage.config.js';
import { prisma } from '../prismaClient.js';

/*
미디어 업로드, 삭제 컨트롤러
*/

// POST /api/media/upload - 미디어 업로드 (Base64 JSON)
export const uploadMedia = async (req, res) => {
  try {
    console.log('=== 미디어 업로드 요청 ===');
    const { images } = req.body;
    console.log('images count:', images?.length);

    if (!images || images.length === 0) {
      return errorResponse(res, '업로드할 파일이 없습니다', null, 400);
    }

    if (images.length > 5) {
      return errorResponse(res, '최대 5개까지 업로드 가능합니다', null, 400);
    }

    // 각 이미지를 스토리지에 업로드 (S3 또는 로컬)
    const uploadPromises = images.map(async (image) => {
      const { filename, type, data } = image;
      const buffer = Buffer.from(data, 'base64');
      const key = generateKey(filename);
      const location = await uploadFile(buffer, key, type);

      return {
        location,
        key,
        mimetype: type,
        size: buffer.length,
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
    const media = await prisma.media_storage.findUnique({
      where: { media_id: mediaId },
      include: {
        posts: {
          select: { user_id: true },
        },
      },
    });

    if (!media) {
      return errorResponse(res, '미디어를 찾을 수 없습니다', null, 404);
    }

    if (media.posts.user_id !== userId) {
      return errorResponse(res, '본인의 미디어만 삭제할 수 있습니다', null, 403);
    }

    // 스토리지에서 파일 삭제
    if (media.link) {
      await mediaService.deleteMediaFromStorage(media.link);
    }

    // DB에서 미디어 레코드 삭제
    await prisma.media_storage.delete({
      where: { media_id: mediaId },
    });

    return successResponse(res, '미디어 삭제 성공', { mediaId }, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '미디어 삭제 실패', null, 500);
  }
};
