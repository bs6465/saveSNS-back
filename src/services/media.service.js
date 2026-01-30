// media.service.js
import { prisma } from '../prismaClient.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, extractS3Key } from '../config/s3.config.js';

/*
미디어 업로드, 삭제 로직
*/

// 미디어 정보 DB 저장
export const saveMediaInfo = async (postId, files) => {
  if (!files || files.length === 0) {
    return [];
  }

  const mediaData = files.map((file) => ({
    postId,
    link: file.location, // S3 URL
    type: file.mimetype.startsWith('image/') ? 'image' : 'video',
  }));

  const savedMedia = await prisma.mediaStorage.createMany({
    data: mediaData,
  });

  console.log(`Media saved: count:${savedMedia.count} for postId:${postId}`);
  return savedMedia;
};

// 게시글의 미디어 목록 조회
export const getMediaByPostId = async (postId) => {
  const media = await prisma.mediaStorage.findMany({
    where: { postId },
    select: {
      mediaId: true,
      link: true,
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return media;
};

// S3에서 파일 삭제 (CloudFront URL 또는 S3 URL 지원)
export const deleteMediaFromS3 = async (fileUrl) => {
  try {
    // CloudFront URL 또는 S3 URL에서 S3 key 추출
    const key = extractS3Key(fileUrl);

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Deleted from S3: ${key}`);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

// 게시글 삭제 시 미디어도 함께 삭제
export const deleteMediaByPostId = async (postId) => {
  // DB에서 미디어 정보 조회
  const mediaList = await prisma.mediaStorage.findMany({
    where: { postId },
    select: { mediaId: true, link: true },
  });

  // S3에서 파일 삭제
  for (const media of mediaList) {
    if (media.link) {
      try {
        await deleteMediaFromS3(media.link);
      } catch (error) {
        console.error(`Failed to delete media ${media.mediaId}:`, error);
      }
    }
  }

  // DB에서 미디어 레코드 삭제
  await prisma.mediaStorage.deleteMany({
    where: { postId },
  });

  console.log(`Media deleted for postId:${postId}, count:${mediaList.length}`);
  return mediaList;
};
