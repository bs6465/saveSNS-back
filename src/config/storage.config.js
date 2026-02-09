// storage.config.js - S3/로컬 파일시스템 스토리지 어댑터
// STORAGE_TYPE 환경변수로 'local' 또는 's3' 전환
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_TYPE = process.env.STORAGE_TYPE || 's3';
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// ─── S3 구현 ───────────────────────────────────

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: (process.env.AWS_REGION || 'ap-northeast-2').trim(),
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY?.trim(),
      },
    });
  }
  return s3Client;
};

const getCloudFrontUrl = (s3Key) => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${s3Key}`;
  }
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const region = (process.env.AWS_REGION || 'ap-northeast-2').trim();
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};

const uploadToS3 = async (buffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME?.trim(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    StorageClass: 'ONEZONE_IA',
  });
  await getS3Client().send(command);
  return getCloudFrontUrl(key);
};

const deleteFromS3 = async (fileUrl) => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();
  let key;
  if (cloudFrontDomain && fileUrl.includes(cloudFrontDomain)) {
    key = fileUrl.split(cloudFrontDomain + '/')[1];
  } else {
    const urlParts = fileUrl.split('.amazonaws.com/');
    key = urlParts.length > 1 ? urlParts[1] : fileUrl;
  }

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME?.trim(),
    Key: key,
  });
  await getS3Client().send(command);
};

// ─── 로컬 파일시스템 구현 ──────────────────────

const uploadToLocal = async (buffer, key, contentType) => {
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/uploads/${key}`;
};

const deleteFromLocal = async (fileUrl) => {
  try {
    const urlObj = new URL(fileUrl);
    const relativePath = urlObj.pathname.replace('/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, relativePath);
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

// ─── 공개 API ──────────────────────────────────

export const generateKey = (filename) => {
  const ext = path.extname(filename);
  const now = new Date();
  const day = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
  const randomStr = crypto.randomBytes(16).toString('hex');
  const key = `posts/${day}/${randomStr}${ext}`;
  console.log('Generated key:', key); // 디버그 출력 - 로그 볼륨이 커지므로 개발중에만 사용
  return key;
};

export const uploadFile = async (buffer, key, contentType) => {
  if (STORAGE_TYPE === 'local') {
    return uploadToLocal(buffer, key, contentType);
  }
  return uploadToS3(buffer, key, contentType);
};

export const deleteFile = async (fileUrl) => {
  if (STORAGE_TYPE === 'local') {
    return deleteFromLocal(fileUrl);
  }
  return deleteFromS3(fileUrl);
};

export const getStorageType = () => STORAGE_TYPE;
