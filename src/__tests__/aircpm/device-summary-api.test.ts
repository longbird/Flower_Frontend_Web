import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { listAircpmDeviceSummary } from '@/lib/api/aircpm';

vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
const mockApi = api as ReturnType<typeof vi.fn>;

describe('listAircpmDeviceSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기본: page/limit 만 — GET /admin/aircpm/devices/summary', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmDeviceSummary();
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/aircpm/devices/summary?');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('q=');
    expect(url).not.toContain('overLimitOnly');
    expect(url).not.toContain('brchCd');
  });

  it('전체 파라미터 조립', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 20 });
    await listAircpmDeviceSummary({ q: 'hong', overLimitOnly: true, page: 2, limit: 20 });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('q=hong');
    expect(url).toContain('overLimitOnly=true');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=20');
  });

  it('overLimitOnly=false 는 파라미터 미전송', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmDeviceSummary({ overLimitOnly: false });
    expect(mockApi.mock.calls[0][0]).not.toContain('overLimitOnly');
  });
});
