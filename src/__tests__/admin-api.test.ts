import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import {
  listFlorists,
  getFlorist,
  getFloristPhotos,
  uploadFloristPhoto,
  updateFloristPhoto,
  deleteFloristPhoto,
} from '@/lib/api/admin';

// Mock the api client
vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public statusText: string, public data?: unknown) {
      super(statusText);
    }
  },
}));

const mockApi = api as ReturnType<typeof vi.fn>;

describe('Admin API - Florists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call listFlorists with correct params', async () => {
    mockApi.mockResolvedValueOnce({ ok: true, data: [], total: 0, page: 1, size: 30 });

    await listFlorists({ page: 1, size: 30, q: 'test' });

    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/partners/florists');
    expect(url).toContain('page=1');
    expect(url).toContain('size=30');
    expect(url).toContain('q=test');
  });

  it('should call getFlorist with string id', async () => {
    mockApi.mockResolvedValueOnce({ ok: true, data: { id: 'fs_123', name: 'Test' } });

    await getFlorist('fs_123');

    expect(mockApi).toHaveBeenCalledWith('/admin/partners/florists/fs_123');
  });

  it('should call getFloristPhotos with correct params', async () => {
    mockApi.mockResolvedValueOnce({ data: [] });

    await getFloristPhotos('fs_123', { category: 'FLOWER', includeHidden: true });

    const url = mockApi.mock.calls[0][0];
    expect(url).toContain('/admin/florists/fs_123/gallery');
    expect(url).toContain('category=FLOWER');
    expect(url).toContain('includeHidden=true');
  });

  it('should upload photo with FormData', async () => {
    mockApi.mockResolvedValueOnce({ data: { id: 1 } });

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    await uploadFloristPhoto('fs_123', file, { category: 'CELEBRATION', memo: 'test memo' });

    expect(mockApi).toHaveBeenCalledWith('/admin/florists/fs_123/gallery', {
      method: 'POST',
      body: expect.any(FormData),
    });

    const formData = mockApi.mock.calls[0][1].body as FormData;
    expect(formData.get('file')).toBeTruthy();
    expect(formData.get('category')).toBe('CELEBRATION');
    expect(formData.get('memo')).toBe('test memo');
  });

  it('should update photo with JSON', async () => {
    mockApi.mockResolvedValueOnce({ data: { id: 1 } });

    await updateFloristPhoto('fs_123', 10, { category: 'CONDOLENCE', isHidden: true });

    expect(mockApi).toHaveBeenCalledWith('/admin/florists/fs_123/gallery/10', {
      method: 'PATCH',
      body: JSON.stringify({ category: 'CONDOLENCE', isHidden: true }),
    });
  });

  it('should delete photo', async () => {
    mockApi.mockResolvedValueOnce(undefined);

    await deleteFloristPhoto('fs_123', 10);

    expect(mockApi).toHaveBeenCalledWith('/admin/florists/fs_123/gallery/10', {
      method: 'DELETE',
    });
  });
});
