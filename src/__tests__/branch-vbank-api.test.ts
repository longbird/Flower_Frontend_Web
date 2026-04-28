import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { issueInnopayVbank, pollVbankStatus } from '@/lib/branch/api';
import type { IssueVbankResponse, PollVbankStatus as PollVbankStatusType } from '@/lib/payments/innopay-types';

type MockFetch = {
  mockResolvedValue: (value: Record<string, unknown>) => void;
  mock: { calls: Array<readonly unknown[]> };
};

describe('issueInnopayVbank', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs to /public/payments/vbank with body', async () => {
    const mockResponse: IssueVbankResponse = {
      paymentId: 999, innopayTid: 'tid-1', accountNumber: '1234',
      bankCode: '004', bankName: '국민', holderName: '홍길동',
      dueDate: '2026-04-29T14:59:59Z', amount: 50000,
    };
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await issueInnopayVbank({ orderId: 1, orderName: '꽃다발' });

    expect(result.paymentId).toBe(999);
    expect(result.accountNumber).toBe('1234');

    const calls = (global.fetch as unknown as MockFetch).mock.calls[0];
    const [url, init] = calls as [string, Record<string, unknown>];
    expect(url).toContain('/public/payments/vbank');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ orderId: 1, orderName: '꽃다발' });
  });

  it('throws with backend error message on non-ok response', async () => {
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: '충전금이 부족합니다' }),
    });
    await expect(issueInnopayVbank({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(/충전금이 부족/);
  });

  it('throws generic message when error JSON missing', async () => {
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: false, status: 500,
      json: async () => { throw new Error('not json'); },
    });
    await expect(issueInnopayVbank({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(/500/);
  });

  it('passes optional customerName/customerPhone in body', async () => {
    const mockResponse: IssueVbankResponse = {
      paymentId: 1, innopayTid: 't', accountNumber: 'a', bankCode: '004', bankName: null, holderName: 'x', dueDate: '2026-04-29T14:59:59Z', amount: 50000
    };
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    await issueInnopayVbank({
      orderId: 1, orderName: '꽃',
      customerName: '김철수', customerPhone: '01012345678',
    });
    const calls = (global.fetch as unknown as MockFetch).mock.calls[0];
    const init = calls[1] as Record<string, unknown>;
    expect(JSON.parse(init.body as string)).toEqual({
      orderId: 1, orderName: '꽃',
      customerName: '김철수', customerPhone: '01012345678',
    });
  });
});

describe('pollVbankStatus', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('GETs /public/payments/vbank/:id/status', async () => {
    const mockResponse: PollVbankStatusType = { status: 'PENDING', paidAt: null, paidAmount: null };
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    const result = await pollVbankStatus(999);
    expect(result.status).toBe('PENDING');
    const calls = (global.fetch as unknown as MockFetch).mock.calls[0];
    const [url] = calls as [string];
    expect(url).toContain('/public/payments/vbank/999/status');
  });

  it('throws on non-ok status', async () => {
    (global.fetch as unknown as MockFetch).mockResolvedValue({ ok: false, status: 404 });
    await expect(pollVbankStatus(999)).rejects.toThrow(/404/);
  });

  it('returns PAID with paidAt + paidAmount', async () => {
    const mockResponse: PollVbankStatusType = { status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50000 };
    (global.fetch as unknown as MockFetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    const result = await pollVbankStatus(999);
    expect(result.status).toBe('PAID');
    expect(result.paidAt).toBe('2026-04-28T10:00:00Z');
    expect(result.paidAmount).toBe(50000);
  });
});
