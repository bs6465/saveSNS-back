import type { Request, Response } from 'express';
import * as mediaService from '../services/media.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import { uploadFile, generateKey } from '../config/storage.config.ts';
import { prisma } from '../prismaClient.ts';
import { generateVariants } from '../utils/image.utils.ts';
import logger from '../config/logger.ts';

interface ImageUpload {
  filename: string;
  data: string;
}

export const uploadMedia = async (req: Request, res: Response) => {
  try {
    logger.info('Media upload requested');
    const { images } = req.body as { images?: ImageUpload[] };
    logger.info({ count: images?.length }, 'Media upload images');

    if (!images || images.length === 0) {
      return errorResponse(res, '업로드할 파일이 없습니다', null, 400);
    }

    if (images.length > 5) {
      return errorResponse(res, '최대 5개까지 업로드 가능합니다', null, 400);
    }

    const uploadPromises = images.map(async (image) => {
      const { filename, data } = image;
      const originalBuffer = Buffer.from(data, 'base64');

      const { medium, thumbnail } = await generateVariants(originalBuffer);

      const webpFilename = filename.replace(/\.[^.]+$/, '.webp');
      const key = generateKey(webpFilename);
      const location = await uploadFile(medium.buffer, key, medium.contentType);

      const thumbKey = generateKey(`thumb_${webpFilename}`);
      const thumbnailLocation = await uploadFile(thumbnail.buffer, thumbKey, thumbnail.contentType);

      return {
        location,
        thumbnailLocation,
        key,
        mimetype: 'image/webp',
        size: medium.buffer.length,
      };
    });

    const files = await Promise.all(uploadPromises);
    return successResponse(res, '미디어 업로드 성공', { files }, 201);
  } catch (err) {
    logger.error({ err }, 'Media operation failed');
    return errorResponse(res, '미디어 업로드 실패', null, 500);
  }
};

export const getMediaByPostId = async (req: Request, res: Response) => {
  const postId = req.params.postId as string;

  try {
    const media = await mediaService.getMediaByPostId(postId);
    return successResponse(res, '미디어 조회 성공', media, 200);
  } catch (err) {
    logger.error({ err }, 'Media operation failed');
    return errorResponse(res, '미디어 조회 실패', null, 500);
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  const mediaId = req.params.mediaId as string;
  const { userId } = (req as unknown as { user: { userId: string } }).user;

  try {
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

    if (media.link) {
      await mediaService.deleteMediaFromStorage(media.link);
    }

    await prisma.media_storage.delete({
      where: { media_id: mediaId },
    });

    return successResponse(res, '미디어 삭제 성공', { mediaId }, 200);
  } catch (err) {
    logger.error({ err }, 'Media operation failed');
    return errorResponse(res, '미디어 삭제 실패', null, 500);
  }
};
