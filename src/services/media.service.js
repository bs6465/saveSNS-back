// media.service.js
import { prisma } from '../prismaClient.js';
import { deleteFile } from '../config/storage.config.js';

/*
미디어 업로드, 삭제 로직
*/

// 미디어 정보 DB 저장
export const saveMediaInfo = async (postId, files) => {
  if (!files || files.length === 0) {
    return [];
  }

  const mediaData = files.map((file) => ({
    post_id: postId,
    link: file.location, // S3 URL
    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
  }));

  const savedMedia = await prisma.media_storage.createMany({
    data: mediaData,
  });

  console.log(`Media saved: count:${savedMedia.count} for postId:${postId}`);
  return savedMedia;
};

// 게시글의 미디어 목록 조회
export const getMediaByPostId = async (postId) => {
  const media = await prisma.media_storage.findMany({
    where: { post_id: postId },
    select: {
      media_id: true,
      link: true,
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
    type: m.type,
    createdAt: m.created_at,
  }));
};

// 스토리지에서 파일 삭제 (S3 또는 로컬 자동 전환)
export const deleteMediaFromStorage = async (fileUrl) => {
  try {
    await deleteFile(fileUrl);
    console.log(`Deleted file: ${fileUrl}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// 게시글 삭제 시 미디어도 함께 삭제
export const deleteMediaByPostId = async (postId) => {
  // DB에서 미디어 정보 조회
  const mediaList = await prisma.media_storage.findMany({
    where: { post_id: postId },
    select: { media_id: true, link: true },
  });

  // 스토리지에서 파일 삭제
  for (const media of mediaList) {
    if (media.link) {
      try {
        await deleteMediaFromStorage(media.link);
      } catch (error) {
        console.error(`Failed to delete media ${media.media_id}:`, error);
      }
    }
  }

  // DB에서 미디어 레코드 삭제
  await prisma.media_storage.deleteMany({
    where: { post_id: postId },
  });

  console.log(`Media deleted for postId:${postId}, count:${mediaList.length}`);
  return mediaList;
};
