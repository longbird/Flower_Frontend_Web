import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadAdminProof,
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

  it('uploadAdminProof POSTs multipart with file + proofType', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, proofId: 1, fileUrl: '/uploads/x.jpg' }),
    } as Response);

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const res = await uploadAdminProof(123, file, 'DELIVERY_PHOTO');
    expect(res.ok).toBe(true);
    expect(res.fileUrl).toBe('/uploads/x.jpg');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/admin/orders/123/proofs/upload');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeInstanceOf(FormData);
    const fd = call[1].body as FormData;
    expect(fd.get('proofType')).toBe('DELIVERY_PHOTO');
    expect(fd.get('file')).toBe(file);
  });

  it('uploadAdminProof sends SCENE_PHOTO when scene tab selected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, proofId: 2, fileUrl: '/uploads/y.jpg' }),
    } as Response);

    const file = new File(['y'], 'scene.jpg', { type: 'image/jpeg' });
    await uploadAdminProof(123, file, 'SCENE_PHOTO');
    const fd = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData;
    expect(fd.get('proofType')).toBe('SCENE_PHOTO');
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
