import { prisma } from '../prismaClient.ts';
import { deleteFile } from '../config/storage.config.ts';
import logger from '../config/logger.ts';

/*
미디어 업로드, 삭제 로직
*/

interface MediaFile {
  location: string;
  thumbnailLocation?: string | null;
  mimetype: string;
  type?: 'image' | 'video';
}

interface TransformedMedia {
  mediaId: string;
  link: string | null;
  thumbnailLink: string | null;
  type: string | null;
  createdAt: Date | null;
}

export const saveMediaInfo = async (postId: string, files: MediaFile[]) => {
  if (!files || files.length === 0) {
    return [];
  }

  const mediaData = files.map((file) => ({
    post_id: postId,
    link: file.location,
    thumbnail_link: file.thumbnailLocation ?? null,
    type: file.type || (file.mimetype.startsWith('image/') ? 'image' : 'video'),
  }));

  const savedMedia = await prisma.media_storage.createMany({
    data: mediaData,
  });

  logger.info(`Media saved: count:${savedMedia.count} for postId:${postId}`);
  return savedMedia;
};

export const getMediaByPostId = async (postId: string): Promise<TransformedMedia[]> => {
  const media = await prisma.media_storage.findMany({
    where: { post_id: postId },
    select: {
      media_id: true,
      link: true,
      thumbnail_link: true,
      type: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  return media.map((m) => ({
    mediaId: m.media_id,
    link: m.link,
    thumbnailLink: m.thumbnail_link,
    type: m.type,
    createdAt: m.created_at,
  }));
};

export const deleteMediaFromStorage = async (fileUrl: string): Promise<void> => {
  try {
    await deleteFile(fileUrl);
    logger.info(`Deleted file: ${fileUrl}`);
  } catch (error) {
    logger.error({ err: error }, 'Error deleting file');
    throw error;
  }
};

export const deleteMediaByPostId = async (postId: string) => {
  const mediaList = await prisma.media_storage.findMany({
    where: { post_id: postId },
    select: { media_id: true, link: true, thumbnail_link: true },
  });

  for (const media of mediaList) {
    if (media.link) {
      try {
        await deleteMediaFromStorage(media.link);
      } catch (error) {
        logger.error({ err: error }, `Failed to delete media ${media.media_id}`);
      }
    }
    if (media.thumbnail_link && media.thumbnail_link !== media.link) {
      try {
        await deleteMediaFromStorage(media.thumbnail_link);
      } catch (error) {
        logger.error({ err: error }, `Failed to delete media thumbnail ${media.media_id}`);
      }
    }
  }

  await prisma.media_storage.deleteMany({
    where: { post_id: postId },
  });

  logger.info(`Media deleted for postId:${postId}, count:${mediaList.length}`);
  return mediaList;
};
