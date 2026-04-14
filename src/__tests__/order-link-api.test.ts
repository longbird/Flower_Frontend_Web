import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCustomerOrderView, confirmCustomerOrder, type CustomerOrderView } from '@/lib/api/order-link';

const originalFetch = global.fetch;

describe('order-link API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchCustomerOrderView', () => {
    it('parses extended order fields', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            orderId: 1,
            editable: true,
            branchName: '강남지사',
            branchPhone: '02-1234-5678',
            order: {
              orderNo: 'ORD-001',
              receiverName: '김철수',
              receiverPhone: '010-0000-0000',
              deliveryAddress1: '서울시 강남구',
              status: 'DELIVERED',
              productName: '동양란',
              senderName: '한국전기기술인협회',
              invoiceMethod: '세금계산서',
              funeralHall: '고려대병원',
              hallName: '장례식장',
              roomNumber: '202호',
              recipientActualName: '박상덕',
              receivedAt: '2025-12-22T16:07:00',
              recipientRelationship: '친척',
              customerConfirmedAt: null,
            },
            deliveryPhotos: [{ id: 1, url: '/uploads/a.jpg', createdAt: '2025-12-22T16:00:00' }],
            scenePhotos: [{ id: 2, url: '/uploads/b.jpg', createdAt: '2025-12-22T16:05:00' }],
          },
        }),
      } as Response);

      const result = await fetchCustomerOrderView('ABC12345');
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unexpected');
      const view: CustomerOrderView = result.data;
      expect(view.order.productName).toBe('동양란');
      expect(view.order.senderName).toBe('한국전기기술인협회');
      expect(view.order.recipientActualName).toBe('박상덕');
      expect(view.scenePhotos).toHaveLength(1);
      expect(view.deliveryPhotos).toHaveLength(1);
    });

    it('handles missing optional fields', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            orderId: 1,
            editable: true,
            order: {
              receiverName: '김철수',
              receiverPhone: '010-0000-0000',
              deliveryAddress1: '서울',
              status: 'RECEIVED',
            },
            deliveryPhotos: [],
            scenePhotos: [],
          },
        }),
      } as Response);

      const result = await fetchCustomerOrderView('XYZ');
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unexpected');
      expect(result.data.order.productName).toBeUndefined();
      expect(result.data.scenePhotos).toEqual([]);
    });

    it('defensively defaults scenePhotos/deliveryPhotos to empty array if missing', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            orderId: 1,
            editable: true,
            order: {
              receiverName: '김',
              receiverPhone: '010-0',
              deliveryAddress1: '서울',
              status: 'RECEIVED',
            },
          },
        }),
      } as Response);

      const result = await fetchCustomerOrderView('NOPHOTOS');
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unexpected');
      expect(result.data.deliveryPhotos).toEqual([]);
      expect(result.data.scenePhotos).toEqual([]);
    });
  });

  describe('confirmCustomerOrder', () => {
    it('POSTs to confirm endpoint and returns timestamp', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, customerConfirmedAt: '2026-04-14T10:30:00' }),
      } as Response);

      const result = await confirmCustomerOrder('ABC12345');
      expect(result.ok).toBe(true);
      expect(result.customerConfirmedAt).toBe('2026-04-14T10:30:00');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/public/order-link/ABC12345/confirm'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('returns existing timestamp on re-call (idempotent)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, customerConfirmedAt: '2026-04-13T09:00:00' }),
      } as Response);

      const result = await confirmCustomerOrder('ABC12345');
      expect(result.customerConfirmedAt).toBe('2026-04-13T09:00:00');
    });

    it('throws on non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ message: 'server error' }),
      } as Response);

      await expect(confirmCustomerOrder('ABC')).rejects.toThrow();
    });
  });
});
