import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePartnerAuthStore } from '@/lib/auth/partner-store';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Need to re-import after mock setup
import {
  getAssignedOrders,
  acceptOrder,
  updateOrderStatus,
  presignProof,
  completeProof,
  listProofs,
} from '@/lib/api/partner';

describe('Partner API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartnerAuthStore.getState().logout();
    usePartnerAuthStore.getState().login('partner-token', 'refresh', {
      id: 1,
      accountId: 'test',
      name: 'Test',
      type: 'FLORIST',
      partnerId: 1,
      partnerName: 'Test Florist',
    });
  });

  it('should fetch assigned orders with auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, orders: [{ orderId: 1, status: 'ASSIGNED' }] }),
    });

    const res = await getAssignedOrders('ASSIGNED');
    expect(res.orders).toHaveLength(1);

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders['Authorization']).toBe('Bearer partner-token');
  });

  it('should accept order with idempotency key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await acceptOrder(1);

    expect(mockFetch.mock.calls[0][0]).toContain('/partner/orders/1/accept');
    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders['Idempotency-Key']).toBeTruthy();
  });

  it('should update order status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await updateOrderStatus(1, 'IN_PROGRESS');

    expect(mockFetch.mock.calls[0][0]).toContain('/partner/orders/1/status');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.toStatus).toBe('IN_PROGRESS');
  });

  it('should request presigned URL for proof upload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        uploadUrl: 'https://s3.example.com/upload',
        fileUrl: '/proofs/file.jpg',
        fileKey: 'key123',
      }),
    });

    const res = await presignProof(1, 'photo.jpg', 'image/jpeg', 1024);

    expect(res.uploadUrl).toBe('https://s3.example.com/upload');
    expect(res.fileUrl).toBe('/proofs/file.jpg');
  });

  it('should complete proof upload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await completeProof(1, 'DELIVERY_PHOTO', '/proofs/file.jpg', 'key123');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.proofType).toBe('DELIVERY_PHOTO');
    expect(body.fileUrl).toBe('/proofs/file.jpg');
  });

  it('should list proofs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [{ proofType: 'DELIVERY_PHOTO', fileUrl: '/proofs/1.jpg' }],
      }),
    });

    const res = await listProofs(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].proofType).toBe('DELIVERY_PHOTO');
  });

  it('should logout on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(getAssignedOrders()).rejects.toThrow('세션이 만료되었습니다.');
    expect(usePartnerAuthStore.getState().isLoggedIn).toBe(false);
  });
});
