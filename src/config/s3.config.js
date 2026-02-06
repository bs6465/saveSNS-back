// AWS S3 설정
import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { randomBytes } from 'crypto';

// S3 클라이언트 생성
const s3Client = new S3Client({
  region: (process.env.AWS_REGION || 'ap-northeast-2').trim(),
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY?.trim(),
  },
});

// 파일 필터링 (이미지만 허용)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)'), false);
  }
};

// Multer 메모리 저장소 설정 (먼저 메모리에 저장 후 S3에 업로드)
const uploadToS3 = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// S3 Key를 CloudFront URL로 변환
export const getCloudFrontUrl = (s3Key) => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();

  if (!cloudFrontDomain) {
    console.warn('CLOUDFRONT_DOMAIN이 설정되지 않았습니다. S3 URL을 사용합니다.');
    // CloudFront 도메인이 없으면 S3 URL 사용
    const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
    const region = (process.env.AWS_REGION || 'ap-northeast-2').trim();
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  // CloudFront URL 반환
  return `https://${cloudFrontDomain}/${s3Key}`;
};

// S3 URL 또는 CloudFront URL에서 Key 추출
export const extractS3Key = (url) => {
  // CloudFront URL: https://d1234.cloudfront.net/posts/202401/abc.jpg
  // S3 URL: https://bucket.s3.region.amazonaws.com/posts/202401/abc.jpg

  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();

  if (cloudFrontDomain && url.includes(cloudFrontDomain)) {
    // CloudFront URL에서 key 추출
    return url.split(cloudFrontDomain + '/')[1];
  }

  // S3 URL에서 key 추출
  const urlParts = url.split('.amazonaws.com/');
  return urlParts.length > 1 ? urlParts[1] : url;
};

export { s3Client, uploadToS3 };
