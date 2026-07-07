import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { listAircpmCalls } from '@/lib/api/aircpm';

vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
const mockApi = api as ReturnType<typeof vi.fn>;

describe('listAircpmCalls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기본: page/limit 만 — GET /admin/aircpm/calls, 선택 파라미터 미전송', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmCalls();
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/aircpm/calls?');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('from=');
    expect(url).not.toContain('to=');
    expect(url).not.toContain('status=');
    expect(url).not.toContain('errorOnly');
    expect(url).not.toContain('brchCd');
  });

  it('전체 파라미터 조립', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 20 });
    await listAircpmCalls({
      page: 2, limit: 20, from: '2026-06-01', to: '2026-06-30',
      status: 'DISPATCHED', errorOnly: true, brchCd: 'B001',
    });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=20');
    expect(url).toContain('from=2026-06-01');
    expect(url).toContain('to=2026-06-30');
    expect(url).toContain('status=DISPATCHED');
    expect(url).toContain('errorOnly=true');
    expect(url).toContain('brchCd=B001');
  });

  it('errorOnly=false 는 파라미터 미전송', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmCalls({ errorOnly: false });
    expect(mockApi.mock.calls[0][0]).not.toContain('errorOnly');
  });

  it('errorType=postprocess 전송 (errorOnly 와 병행)', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmCalls({ errorOnly: true, errorType: 'postprocess' });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('errorOnly=true');
    expect(url).toContain('errorType=postprocess');
  });

  it('errorType 미지정 시 파라미터 미전송', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmCalls({ errorOnly: true });
    expect(mockApi.mock.calls[0][0]).not.toContain('errorType');
  });
});
