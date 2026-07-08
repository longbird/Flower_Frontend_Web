import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { listAircpmDiagnostics, getAircpmDiagnosticLog } from '@/lib/api/aircpm';

vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
const mockApi = api as ReturnType<typeof vi.fn>;

describe('listAircpmDiagnostics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기본: limit=50, brchCd 미전송 — GET /admin/aircpm/diagnostics', async () => {
    mockApi.mockResolvedValueOnce([]);
    await listAircpmDiagnostics();
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/aircpm/diagnostics?');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('brchCd');
  });

  it('limit/brchCd 조립', async () => {
    mockApi.mockResolvedValueOnce([]);
    await listAircpmDiagnostics({ limit: 100, brchCd: 'B001' });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('limit=100');
    expect(url).toContain('brchCd=B001');
  });

  it('빈 brchCd 는 미전송', async () => {
    mockApi.mockResolvedValueOnce([]);
    await listAircpmDiagnostics({ brchCd: '' });
    expect(mockApi.mock.calls[0][0]).not.toContain('brchCd');
  });
});

describe('getAircpmDiagnosticLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /admin/aircpm/diagnostics/:callId/log, 결과 그대로', async () => {
    mockApi.mockResolvedValueOnce({ log: 'line1\nline2' });
    const res = await getAircpmDiagnosticLog(123);
    expect(mockApi.mock.calls[0][0]).toBe('/admin/aircpm/diagnostics/123/log');
    expect(res).toEqual({ log: 'line1\nline2' });
  });
});
