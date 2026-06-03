import * as mediaService from '../services/media.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { uploadFile, generateKey } from '../config/storage.config.ts';
import { prisma } from '../prismaClient.ts';
import { generateVariants } from '../utils/image.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors/index.ts';
import logger from '../config/logger.ts';

interface ImageUpload {
  filename: string;
  type?: string;
  data: string;
}

interface MediaUpload {
  filename: string;
  type: string;
  data: string;
}

const MAX_FILES_PER_POST = 5;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

const isImageType = (type: string): boolean => ALLOWED_IMAGE_TYPES.has(type);
const isVideoType = (type: string): boolean => ALLOWED_VIDEO_TYPES.has(type);

const normalizeUpload = (file: ImageUpload | MediaUpload): MediaUpload => {
  const filename = file.filename?.trim();
  const type = (file.type || 'image/jpeg').trim().toLowerCase();

  if (!filename || !file.data) {
    throw new ValidationError('파일 이름과 데이터가 필요합니다');
  }

  if (!isImageType(type) && !isVideoType(type)) {
    throw new ValidationError('지원하지 않는 미디어 형식입니다');
  }

  return { filename, type, data: file.data };
};

export const uploadMedia = asyncHandler(async (req, res) => {
  logger.info('Media upload requested');
  const { images, files: requestFiles } = req.body as {
    images?: ImageUpload[];
    files?: MediaUpload[];
  };
  const uploadFiles = (requestFiles || images || []).map(normalizeUpload);
  logger.info({ count: uploadFiles.length }, 'Media upload files');

  if (uploadFiles.length === 0) {
    throw new ValidationError('업로드할 파일이 없습니다');
  }

  if (uploadFiles.length > MAX_FILES_PER_POST) {
    throw new ValidationError('최대 5개까지 업로드 가능합니다');
  }

  let totalBytes = 0;
  const decodedFiles = uploadFiles.map((file) => {
    const originalBuffer = Buffer.from(file.data, 'base64');
    totalBytes += originalBuffer.length;

    if (isVideoType(file.type) && originalBuffer.length > MAX_VIDEO_BYTES) {
      throw new ValidationError('영상은 파일당 20MB 이하만 업로드할 수 있습니다');
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new ValidationError('첨부 파일 총 용량은 40MB 이하만 업로드할 수 있습니다');
    }

    return { ...file, originalBuffer };
  });

  const uploadPromises = decodedFiles.map(async (file) => {
    const { filename, type, originalBuffer } = file;

    if (isVideoType(type)) {
      const key = generateKey(filename);
      const location = await uploadFile(originalBuffer, key, type);

      return {
        link: location,
        thumbnailLink: null,
        location,
        thumbnailLocation: null,
        key,
        mimetype: type,
        type: 'video',
        size: originalBuffer.length,
      };
    }

    const { medium, thumbnail } = await generateVariants(originalBuffer);

    const webpFilename = filename.replace(/\.[^.]+$/, '.webp');
    const key = generateKey(webpFilename);
    const location = await uploadFile(medium.buffer, key, medium.contentType);

    const thumbKey = generateKey(`thumb_${webpFilename}`);
    const thumbnailLocation = await uploadFile(thumbnail.buffer, thumbKey, thumbnail.contentType);

    return {
      link: location,
      thumbnailLink: thumbnailLocation,
      location,
      thumbnailLocation,
      key,
      mimetype: 'image/webp',
      type: 'image',
      size: medium.buffer.length,
    };
  });

  const uploadedFiles = await Promise.all(uploadPromises);
  return successResponse(res, '미디어 업로드 성공', { files: uploadedFiles }, 201);
});

export const getMediaByPostId = asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const media = await mediaService.getMediaByPostId(postId);
  return successResponse(res, '미디어 조회 성공', media, 200);
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const mediaId = req.params.mediaId as string;
  const { userId } = req.user!;

  const media = await prisma.media_storage.findUnique({
    where: { media_id: mediaId },
    include: {
      posts: {
        select: { user_id: true },
      },
    },
  });

  if (!media) {
    throw new NotFoundError('미디어');
  }

  if (media.posts.user_id !== userId) {
    throw new ForbiddenError('본인의 미디어만 삭제할 수 있습니다');
  }

  if (media.link) {
    await mediaService.deleteMediaFromStorage(media.link);
  }
  if (media.thumbnail_link && media.thumbnail_link !== media.link) {
    await mediaService.deleteMediaFromStorage(media.thumbnail_link);
  }

  await prisma.media_storage.delete({
    where: { media_id: mediaId },
  });

  return successResponse(res, '미디어 삭제 성공', { mediaId }, 200);
});
