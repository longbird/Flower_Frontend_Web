import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTossClient } from '@/lib/payments/toss-client'
import type { ConfirmRequest, KeyInRequest, VirtualAccountRequest, CancelRequest } from '@/lib/payments/types'

const mockFetch = vi.fn()
global.fetch = mockFetch

const client = createTossClient('test_sk_secret_key')

const mockPayment = {
  paymentKey: 'pk_test_123',
  orderId: 'RF-test-123',
  orderName: '테스트 꽃다발',
  status: 'DONE' as const,
  method: '카드' as const,
  totalAmount: 50000,
  balanceAmount: 50000,
  suppliedAmount: 45455,
  vat: 4545,
  requestedAt: '2026-03-30T10:00:00+09:00',
  approvedAt: '2026-03-30T10:00:01+09:00',
  card: null,
  virtualAccount: null,
  cancels: null,
  receipt: null,
  cashReceipt: null,
  secret: null,
  mId: 'test_mid',
  version: '2022-11-16',
  lastTransactionKey: 'txn_123',
  currency: 'KRW',
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('TossClient', () => {
  describe('confirmPayment', () => {
    it('결제 승인 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayment,
      })

      const req: ConfirmRequest = { paymentKey: 'pk_test_123', orderId: 'RF-test-123', amount: 50000 }
      const result = await client.confirmPayment(req)

      expect(result.paymentKey).toBe('pk_test_123')
      expect(result.status).toBe('DONE')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tosspayments.com/v1/payments/confirm',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      )
    })

    it('Toss API 에러 시 TossPaymentError throw', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 'INVALID_REQUEST', message: '잘못된 요청입니다.' }),
      })

      const req: ConfirmRequest = { paymentKey: 'pk_test_123', orderId: 'RF-test-123', amount: 50000 }
      await expect(client.confirmPayment(req)).rejects.toThrow('잘못된 요청입니다.')
    })
  })

  describe('keyInPayment', () => {
    it('Key-in 결제 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayment,
      })

      const req: KeyInRequest = {
        amount: 50000,
        orderId: 'RF-test-123',
        orderName: '꽃다발',
        cardNumber: '4242424242424242',
        cardExpirationYear: '28',
        cardExpirationMonth: '12',
        customerIdentityNumber: '960101',
      }
      const result = await client.keyInPayment(req)
      expect(result.status).toBe('DONE')
    })
  })

  describe('createVirtualAccount', () => {
    it('가상계좌 발급 성공', async () => {
      const vaPayment = {
        ...mockPayment,
        status: 'WAITING_FOR_DEPOSIT' as const,
        method: '가상계좌' as const,
        secret: 'ps_test_secret',
        virtualAccount: {
          accountType: '일반',
          accountNumber: '12345678901234',
          bankCode: '신한',
          customerName: '홍길동',
          dueDate: '2026-03-31T23:59:59+09:00',
          refundStatus: 'NONE',
          expired: false,
          settlementStatus: 'INCOMPLETED',
          refundReceiveAccount: null,
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => vaPayment,
      })

      const req: VirtualAccountRequest = {
        amount: 50000,
        orderId: 'RF-test-456',
        orderName: '꽃바구���',
        customerName: '홍길동',
        bank: '신한',
      }
      const result = await client.createVirtualAccount(req)
      expect(result.status).toBe('WAITING_FOR_DEPOSIT')
      expect(result.virtualAccount?.accountNumber).toBe('12345678901234')
      expect(result.secret).toBe('ps_test_secret')
    })
  })

  describe('getPayment', () => {
    it('결제 조회 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayment,
      })

      const result = await client.getPayment('pk_test_123')
      expect(result.paymentKey).toBe('pk_test_123')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tosspayments.com/v1/payments/pk_test_123',
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  describe('getPaymentByOrderId', () => {
    it('주문번호로 결제 조회 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayment,
      })

      const result = await client.getPaymentByOrderId('RF-test-123')
      expect(result.orderId).toBe('RF-test-123')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tosspayments.com/v1/payments/orders/RF-test-123',
        expect.objectContaining({ method: 'GET' }),
      )
    })
  })

  describe('cancelPayment', () => {
    it('결제 취소 성공 (멱등키 포함)', async () => {
      const canceledPayment = {
        ...mockPayment,
        status: 'CANCELED' as const,
        balanceAmount: 0,
        cancels: [{ cancelAmount: 50000, cancelReason: '고객 요청', canceledAt: '2026-03-30T11:00:00+09:00', transactionKey: 'txn_cancel_1', taxFreeAmount: 0, taxExemptionAmount: 0, refundableAmount: 0, easyPayDiscountAmount: 0, receiptKey: null }],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => canceledPayment,
      })

      const req: CancelRequest = { cancelReason: '고객 요청' }
      const result = await client.cancelPayment('pk_test_123', req, 'idem-key-1')
      expect(result.status).toBe('CANCELED')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.tosspayments.com/v1/payments/pk_test_123/cancel',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'idem-key-1',
          }),
        }),
      )
    })
  })

  describe('getTransactions', () => {
    it('거래 내역 조회 성공', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ paymentKey: 'pk_1' }, { paymentKey: 'pk_2' }],
      })

      const result = await client.getTransactions('2026-03-01', '2026-03-07')
      expect(result).toHaveLength(2)
    })
  })

  describe('Auth header', () => {
    it('Basic Auth 헤더가 올바르게 생성됨', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayment,
      })

      await client.getPayment('pk_test_123')

      const expectedAuth = `Basic ${Buffer.from('test_sk_secret_key:').toString('base64')}`
      const callHeaders = mockFetch.mock.calls[0][1].headers
      expect(callHeaders.Authorization).toBe(expectedAuth)
    })
  })
})
