import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ackVbankIssue,
  getVbankOverview,
  listVbankIssues,
  listVbankLogs,
  listVbankPayments,
  listVbankPool,
  resolveVbankIssue,
} from '@/lib/api/admin-payments-vbank';
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

  it('gets vbank overview', async () => {
    await getVbankOverview();
    expect(apiSpy.mock.calls[0][0]).toBe('/admin/payments/vbank/overview');
    expect((apiSpy.mock.calls[0][1] as any)?.method).toBe('GET');
  });

  it('serializes issue filters', async () => {
    await listVbankIssues({ severity: 'CRITICAL', status: 'OPEN', page: 2 });
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toContain('/admin/payments/vbank/issues?');
    expect(url).toContain('severity=CRITICAL');
    expect(url).toContain('status=OPEN');
    expect(url).toContain('page=2');
  });

  it('serializes log filters', async () => {
    await listVbankLogs({ category: 'WEBHOOK', paymentId: 3 });
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toContain('/admin/payments/vbank/logs?');
    expect(url).toContain('category=WEBHOOK');
    expect(url).toContain('paymentId=3');
  });

  it('serializes pool filters', async () => {
    await listVbankPool({ status: 'IN_USE', accountNumber: '0820' });
    const url = apiSpy.mock.calls[0][0] as string;
    expect(url).toContain('/admin/payments/vbank/pool?');
    expect(url).toContain('status=IN_USE');
    expect(url).toContain('accountNumber=0820');
  });

  it('posts issue ack and resolve', async () => {
    await ackVbankIssue(9);
    expect(apiSpy.mock.calls[0][0]).toBe('/admin/payments/vbank/issues/9/ack');
    expect((apiSpy.mock.calls[0][1] as any)?.method).toBe('POST');

    await resolveVbankIssue(9);
    expect(apiSpy.mock.calls[1][0]).toBe('/admin/payments/vbank/issues/9/resolve');
    expect((apiSpy.mock.calls[1][1] as any)?.method).toBe('POST');
  });
});
