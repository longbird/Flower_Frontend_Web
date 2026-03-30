import { TOSS_API_BASE_URL } from './constants'
import type {
  TossPayment,
  TossTransaction,
  ConfirmRequest,
  KeyInRequest,
  VirtualAccountRequest,
  CancelRequest,
  TransactionListOptions,
  TossApiError,
} from './types'

export class TossPaymentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'TossPaymentError'
  }
}

export interface TossClient {
  confirmPayment(request: ConfirmRequest): Promise<TossPayment>
  keyInPayment(request: KeyInRequest): Promise<TossPayment>
  createVirtualAccount(request: VirtualAccountRequest): Promise<TossPayment>
  getPayment(paymentKey: string): Promise<TossPayment>
  getPaymentByOrderId(orderId: string): Promise<TossPayment>
  cancelPayment(paymentKey: string, request: CancelRequest, idempotencyKey: string): Promise<TossPayment>
  getTransactions(startDate: string, endDate: string, options?: TransactionListOptions): Promise<TossTransaction[]>
}

export function createTossClient(secretKey: string): TossClient {
  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

  async function request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    }

    const res = await fetch(`${TOSS_API_BASE_URL}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const data = await res.json()

    if (!res.ok) {
      const error = data as TossApiError
      throw new TossPaymentError(error.code, error.message, res.status)
    }

    return data as T
  }

  return {
    confirmPayment: (req) =>
      request<TossPayment>('/v1/payments/confirm', 'POST', req),

    keyInPayment: (req) =>
      request<TossPayment>('/v1/payments/key-in', 'POST', req),

    createVirtualAccount: (req) =>
      request<TossPayment>('/v1/virtual-accounts', 'POST', req),

    getPayment: (paymentKey) =>
      request<TossPayment>(`/v1/payments/${encodeURIComponent(paymentKey)}`, 'GET'),

    getPaymentByOrderId: (orderId) =>
      request<TossPayment>(`/v1/payments/orders/${encodeURIComponent(orderId)}`, 'GET'),

    cancelPayment: (paymentKey, req, idempotencyKey) =>
      request<TossPayment>(
        `/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
        'POST',
        req,
        { 'Idempotency-Key': idempotencyKey },
      ),

    getTransactions: (startDate, endDate, options) => {
      const params = new URLSearchParams({ startDate, endDate })
      if (options?.startingAfter) params.set('startingAfter', options.startingAfter)
      if (options?.limit) params.set('limit', String(options.limit))
      return request<TossTransaction[]>(`/v1/transactions?${params.toString()}`, 'GET')
    },
  }
}

/** 서버 환경에서 사용할 싱글턴 인스턴스 (lazy) */
let _defaultClient: TossClient | null = null

export function getTossClient(): TossClient {
  if (_defaultClient) return _defaultClient

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) {
    throw new Error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.')
  }
  _defaultClient = createTossClient(secretKey)
  return _defaultClient
}
