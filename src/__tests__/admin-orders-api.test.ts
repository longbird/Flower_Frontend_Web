import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  presignAdminProof,
  completeAdminProof,
  listAdminProofs,
  updateAdminRecipientInfo,
} from '@/lib/api/admin-orders';

vi.mock('@/lib/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'test-token',
      refreshToken: 'refresh',
      setTokens: vi.fn(),
      logout: vi.fn(),
    }),
  },
}));

const originalFetch = global.fetch;

describe('admin-orders API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('presignAdminProof POSTs with proofType', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        uploadUrl: 'https://s3/put',
        fileUrl: '/uploads/x.jpg',
        fileKey: 'x.jpg',
        headers: {},
      }),
    } as Response);

    const res = await presignAdminProof(123, {
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      size: 1024,
      proofType: 'DELIVERY_PHOTO',
    });
    expect(res.uploadUrl).toBe('https://s3/put');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/admin/orders/123/proofs/presign');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.proofType).toBe('DELIVERY_PHOTO');
  });

  it('completeAdminProof sends proofType', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await completeAdminProof(123, {
      proofType: 'SCENE_PHOTO',
      fileUrl: '/uploads/a.jpg',
      fileKey: 'a.jpg',
    });
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.proofType).toBe('SCENE_PHOTO');
  });

  it('listAdminProofs returns items', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [
          { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
          { proofType: 'SCENE_PHOTO', fileUrl: '/b.jpg' },
        ],
      }),
    } as Response);

    const res = await listAdminProofs(123);
    expect(res.items).toHaveLength(2);
    expect(res.items[0].proofType).toBe('DELIVERY_PHOTO');
  });

  it('updateAdminRecipientInfo PATCHes with full payload', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await updateAdminRecipientInfo(123, {
      name: '박상덕',
      receivedAt: '2026-04-14T10:00:00',
      relationship: '친척',
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/admin/orders/123/recipient-info');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({ name: '박상덕', receivedAt: '2026-04-14T10:00:00', relationship: '친척' });
  });
});
