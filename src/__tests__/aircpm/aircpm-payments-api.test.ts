import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import {
  listAircpmBranches, upsertAircpmBranch,
  listAircpmTossCredentials, upsertAircpmTossCredentials,
  listAircpmCustomers, getAircpmCustomer, updateAircpmCustomer,
  deactivateAircpmCard, cancelAircpmPayment,
} from '@/lib/api/aircpm-payments';

vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
const mockApi = api as ReturnType<typeof vi.fn>;

describe('aircpm-payments API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listAircpmBranches → GET /admin/aircpm/branches', async () => {
    mockApi.mockResolvedValueOnce([]);
    await listAircpmBranches();
    expect(mockApi).toHaveBeenCalledWith('/admin/aircpm/branches');
  });

  it('upsertAircpmBranch → POST with body', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await upsertAircpmBranch({ brchCd: 'S001', name: '강남', cardPaymentEnabled: true });
    const [path, opts] = mockApi.mock.calls[0];
    expect(path).toBe('/admin/aircpm/branches');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).brchCd).toBe('S001');
  });

  it('upsertAircpmBranch → copyApps/pasteApps 바디 포함', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await upsertAircpmBranch({
      brchCd: 'S001',
      copyApps: [true, false, true, false, false],
      pasteApps: [true, true, true, true, true],
    });
    const [, opts] = mockApi.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.copyApps).toEqual([true, false, true, false, false]);
    expect(body.pasteApps).toEqual([true, true, true, true, true]);
  });

  it('upsertAircpmBranch → autoCallpassEnabled 바디 포함', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await upsertAircpmBranch({ brchCd: 'S001', autoCallpassEnabled: true });
    const [, opts] = mockApi.mock.calls[0];
    expect(JSON.parse(opts.body).autoCallpassEnabled).toBe(true);
  });

  it('upsertAircpmBranch → autoCallpassEnabled=false 도 바디에 실린다', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await upsertAircpmBranch({ brchCd: 'S001', autoCallpassEnabled: false });
    const [, opts] = mockApi.mock.calls[0];
    expect(JSON.parse(opts.body).autoCallpassEnabled).toBe(false);
  });

  it('listAircpmTossCredentials → GET /admin/aircpm/branches/:brchCd/toss-credentials', async () => {
    mockApi.mockResolvedValueOnce([]);
    await listAircpmTossCredentials('S001');
    expect(mockApi.mock.calls[0][0]).toBe('/admin/aircpm/branches/S001/toss-credentials');
  });

  it('upsertAircpmTossCredentials → PUT with body', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await upsertAircpmTossCredentials('S001', { env: 'TEST', mid: 'm', clientKey: 'c', secretKey: 's' });
    const [path, opts] = mockApi.mock.calls[0];
    expect(path).toBe('/admin/aircpm/branches/S001/toss-credentials');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body).env).toBe('TEST');
  });

  it('listAircpmCustomers → brchCd·q 쿼리 포함', async () => {
    mockApi.mockResolvedValueOnce({ customers: [] });
    await listAircpmCustomers({ brchCd: 'S001', q: 'kim' });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/aircpm/customers');
    expect(url).toContain('brchCd=S001');
    expect(url).toContain('q=kim');
  });

  it('getAircpmCustomer → GET /admin/aircpm/customers/:id', async () => {
    mockApi.mockResolvedValueOnce({ customer: {}, cards: [], payments: [] });
    await getAircpmCustomer(9, { brchCd: 'S001' });
    expect(mockApi.mock.calls[0][0]).toContain('/admin/aircpm/customers/9');
  });

  it('deactivateAircpmCard → DELETE /admin/aircpm/cards/:id', async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    await deactivateAircpmCard(11, { brchCd: 'S001' });
    const [path, opts] = mockApi.mock.calls[0];
    expect(path).toContain('/admin/aircpm/cards/11');
    expect(opts.method).toBe('DELETE');
  });

  it('cancelAircpmPayment → POST /admin/aircpm/payments/:id/cancel', async () => {
    mockApi.mockResolvedValueOnce({ paymentId: 21, status: 'CANCELED' });
    await cancelAircpmPayment(21, { brchCd: 'S001' }, '고객요청');
    const [path, opts] = mockApi.mock.calls[0];
    expect(path).toContain('/admin/aircpm/payments/21/cancel');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).cancelReason).toBe('고객요청');
  });
});
