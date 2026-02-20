import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import logger from './logger.ts';

const s3Client = new S3Client({
  region: (process.env.AWS_REGION || 'ap-northeast-2').trim(),
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID?.trim() ?? '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY?.trim() ?? '',
  },
});

import type { Request } from 'express';

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)'));
  }
};

const uploadToS3 = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const getCloudFrontUrl = (s3Key: string): string => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();

  if (!cloudFrontDomain) {
    logger.warn('CLOUDFRONT_DOMAIN이 설정되지 않았습니다. S3 URL을 사용합니다.');
    const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
    const region = (process.env.AWS_REGION || 'ap-northeast-2').trim();
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  return `https://${cloudFrontDomain}/${s3Key}`;
};

export const extractS3Key = (url: string): string => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();

  if (cloudFrontDomain && url.includes(cloudFrontDomain)) {
    return url.split(cloudFrontDomain + '/')[1];
  }

  const urlParts = url.split('.amazonaws.com/');
  return urlParts.length > 1 ? urlParts[1] : url;
};

export { s3Client, uploadToS3 };
