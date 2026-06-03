import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/config/storage.config.js', () => ({
  generateKey: vi.fn((filename) => `posts/test/${filename}`),
  uploadFile: vi.fn((_buffer, key) => Promise.resolve(`https://cdn.example.com/${key}`)),
}));

vi.mock('../../../src/utils/image.utils.js', () => ({
  generateVariants: vi.fn(() =>
    Promise.resolve({
      medium: { buffer: Buffer.from('medium'), contentType: 'image/webp' },
      thumbnail: { buffer: Buffer.from('thumbnail'), contentType: 'image/webp' },
    }),
  ),
}));

describe('media.controller', () => {
  describe('uploadMedia', () => {
    it('업로드 응답에 게시글 생성이 사용할 link 필드를 포함한다', async () => {
      const { uploadMedia } = await import('../../../src/controllers/media.controller.js');
      const req = {
        body: {
          images: [
            {
              filename: 'sample.jpg',
              data: Buffer.from('image').toString('base64'),
            },
          ],
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      uploadMedia(req, res, next);

      await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
      const payload = res.json.mock.calls[0][0];
      const file = payload.data.files[0];

      expect(file.link).toBe('https://cdn.example.com/posts/test/sample.webp');
      expect(file.location).toBe(file.link);
      expect(file.thumbnailLink).toBe('https://cdn.example.com/posts/test/thumb_sample.webp');
      expect(file.thumbnailLocation).toBe(file.thumbnailLink);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
