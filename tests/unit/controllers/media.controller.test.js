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
      expect(file.type).toBe('image');
      expect(next).not.toHaveBeenCalled();
    });

    it('영상 파일은 변환 없이 원본 MIME으로 업로드한다', async () => {
      const { uploadMedia } = await import('../../../src/controllers/media.controller.js');
      const req = {
        body: {
          files: [
            {
              filename: 'clip.mp4',
              type: 'video/mp4',
              data: Buffer.from('video').toString('base64'),
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

      expect(file.link).toBe('https://cdn.example.com/posts/test/clip.mp4');
      expect(file.thumbnailLink).toBeNull();
      expect(file.mimetype).toBe('video/mp4');
      expect(file.type).toBe('video');
      expect(next).not.toHaveBeenCalled();
    });

    it('지원하지 않는 MIME 타입을 거부한다', async () => {
      const { uploadMedia } = await import('../../../src/controllers/media.controller.js');
      const req = {
        body: {
          files: [
            {
              filename: 'sample.txt',
              type: 'text/plain',
              data: Buffer.from('text').toString('base64'),
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

      await vi.waitFor(() => expect(next).toHaveBeenCalled());
      expect(next.mock.calls[0][0].message).toBe('지원하지 않는 미디어 형식입니다');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('20MB를 초과하는 영상 파일을 거부한다', async () => {
      const { uploadMedia } = await import('../../../src/controllers/media.controller.js');
      const req = {
        body: {
          files: [
            {
              filename: 'large.mp4',
              type: 'video/mp4',
              data: Buffer.alloc(20 * 1024 * 1024 + 1).toString('base64'),
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

      await vi.waitFor(() => expect(next).toHaveBeenCalled());
      expect(next.mock.calls[0][0].message).toBe('영상은 파일당 20MB 이하만 업로드할 수 있습니다');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('40MB를 초과하는 전체 첨부 용량을 거부한다', async () => {
      const { uploadMedia } = await import('../../../src/controllers/media.controller.js');
      const req = {
        body: {
          files: [
            {
              filename: 'first.jpg',
              type: 'image/jpeg',
              data: Buffer.alloc(20 * 1024 * 1024).toString('base64'),
            },
            {
              filename: 'second.jpg',
              type: 'image/jpeg',
              data: Buffer.alloc(20 * 1024 * 1024 + 1).toString('base64'),
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

      await vi.waitFor(() => expect(next).toHaveBeenCalled());
      expect(next.mock.calls[0][0].message).toBe(
        '첨부 파일 총 용량은 40MB 이하만 업로드할 수 있습니다',
      );
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
