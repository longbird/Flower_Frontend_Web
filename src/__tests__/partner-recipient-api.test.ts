import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updatePartnerRecipientInfo } from '@/lib/api/partner';

vi.mock('@/lib/auth/partner-store', () => ({
  usePartnerAuthStore: {
    getState: () => ({
      accessToken: 'ptoken',
      logout: vi.fn(),
    }),
  },
}));

const originalFetch = global.fetch;

describe('updatePartnerRecipientInfo', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('PATCHes /partner/orders/{id}/recipient-info', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await updatePartnerRecipientInfo(42, {
      name: '김영희',
      receivedAt: '2026-04-14T11:00:00',
      relationship: '본인',
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/partner/orders/42/recipient-info');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.name).toBe('김영희');
    expect(body.relationship).toBe('본인');
  });
});
