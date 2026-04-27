import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listVbankPayments } from '@/lib/api/admin-payments-vbank';
import * as client from '@/lib/api/client';

describe('listVbankPayments', () => {
  let apiSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    apiSpy = vi.spyOn(client, 'api').mockResolvedValue({
      items: [], total: 0, page: 1, pageSize: 20,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes status[] as repeated query params', async () => {
    await listVbankPayments({ status: ['PENDING', 'PAID'] });
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/status=PENDING/);
    expect(url).toMatch(/status=PAID/);
  });

  it('serializes branchId, from, to, mode, page, pageSize', async () => {
    await listVbankPayments({
      branchId: 10, from: '2026-04-01', to: '2026-04-30',
      mode: 'TEST', page: 2, pageSize: 50,
    });
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/branchId=10/);
    expect(url).toMatch(/from=2026-04-01/);
    expect(url).toMatch(/to=2026-04-30/);
    expect(url).toMatch(/mode=TEST/);
    expect(url).toMatch(/page=2/);
    expect(url).toMatch(/pageSize=50/);
  });

  it('omits query string when no filters', async () => {
    await listVbankPayments();
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toBe('/admin/payments/vbank');
  });

  it('passes GET method', async () => {
    await listVbankPayments();
    const opts = apiSpy.mock.calls[0][1] as any;
    expect(opts?.method).toBe('GET');
  });
});
