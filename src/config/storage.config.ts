import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import logger from './logger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_TYPE = process.env.STORAGE_TYPE || 's3';
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: (process.env.AWS_REGION || 'ap-northeast-2').trim(),
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID?.trim() ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY?.trim() ?? '',
      },
    });
  }
  return s3Client;
};

const getCloudFrontUrl = (s3Key: string): string => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${s3Key}`;
  }
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const region = (process.env.AWS_REGION || 'ap-northeast-2').trim();
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
};

const uploadToS3 = async (buffer: Buffer, key: string, contentType: string): Promise<string> => {
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

const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN?.trim();
  let key: string;
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

const uploadToLocal = async (
  buffer: Buffer,
  key: string,
  _contentType: string,
): Promise<string> => {
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/uploads/${key}`;
};

const deleteFromLocal = async (fileUrl: string): Promise<void> => {
  try {
    const urlObj = new URL(fileUrl);
    const relativePath = urlObj.pathname.replace('/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, relativePath);
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
};

export const generateKey = (filename: string): string => {
  const ext = path.extname(filename);
  const now = new Date();
  const day = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
  const randomStr = crypto.randomBytes(16).toString('hex');
  const key = `posts/${day}/${randomStr}${ext}`;
  logger.debug({ key }, 'Generated storage key');
  return key;
};

export const uploadFile = async (
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> => {
  if (STORAGE_TYPE === 'local') {
    return uploadToLocal(buffer, key, contentType);
  }
  return uploadToS3(buffer, key, contentType);
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  if (STORAGE_TYPE === 'local') {
    return deleteFromLocal(fileUrl);
  }
  return deleteFromS3(fileUrl);
};

export const getStorageType = (): string => STORAGE_TYPE;
