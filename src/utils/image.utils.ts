import sharp from 'sharp';
import type { ProcessedImage } from '../types/index.ts';

const IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  thumbnail: { width: 300, height: 300 },
  medium: { width: 800, height: 800 },
};

export const processImage = async (
  buffer: Buffer,
  size: 'thumbnail' | 'medium' | 'original' = 'original',
): Promise<ProcessedImage> => {
  let pipeline = sharp(buffer);

  const dimensions = IMAGE_SIZES[size];
  if (dimensions) {
    pipeline = pipeline.resize(dimensions.width, dimensions.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const processed = await pipeline.webp({ quality: 80 }).toBuffer();

  return { buffer: processed, contentType: 'image/webp' };
};

export const generateVariants = async (
  buffer: Buffer,
): Promise<{ medium: ProcessedImage; thumbnail: ProcessedImage }> => {
  const [medium, thumbnail] = await Promise.all([
    processImage(buffer, 'medium'),
    processImage(buffer, 'thumbnail'),
  ]);

  return { medium, thumbnail };
};
