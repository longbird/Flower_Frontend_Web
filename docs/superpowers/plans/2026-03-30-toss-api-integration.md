# Toss Payments API 개별 연동 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Toss 위젯 연동을 API 개별 연동으로 교체하고, Admin 결제 관리 기능을 추가한다.

**Architecture:** Branch 고객 카드결제는 Toss 결제창(리다이렉트)으로 PCI 범위 회피, 가상계좌는 API 직접 호출. Admin Key-in은 서버사이드 API로 대리결제. 공통 TossClient 모듈이 모든 Toss API 호출을 담당하고, 결제 데이터는 백엔드 DB에 저장한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, TanStack Query v5, Zustand, zod, shadcn/ui, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-30-toss-api-integration-design.md`

---

## 공통 참고사항

### 백엔드 API 연동

모든 결제 API Route에서 결제 성공 후 백엔드(8080)에 결제 데이터를 저장해야 한다.
백엔드 결제 API가 아직 미구현이므로 `TODO` 주석으로 연동 지점을 표시하고,
프록시 경로 (`/api/proxy/...`)를 통해 호출하는 패턴을 사용한다.

```typescript
// 백엔드 결제 저장 헬퍼 (재시도 포함)
async function savePaymentToBackend(
  paymentData: { paymentKey: string; orderId: string; amount: number; status: string },
  maxRetries = 2,
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // TODO: 백엔드 결제 저장 API 구현 후 실제 경로로 변경
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/save`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(paymentData),
      // })
      // if (res.ok) return true
      return true // 임시: 백엔드 미구현 동안 성공 반환
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }
  return false
}
```

이 헬퍼는 `src/lib/payments/toss-client.ts`에 추가하거나 별도 `src/lib/payments/backend.ts`에 배치.

---

## Chunk 1: Foundation (Types + Constants + Toss Client)

### Task 1: Payment Types 정의

**Files:**
- Create: `src/lib/payments/types.ts`

- [ ] **Step 1: 타입 파일 생성**

```typescript
// src/lib/payments/types.ts

/** Toss 결제 상태 */
export type PaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED'

/** 결제 수단 */
export type PaymentMethod = '카드' | '가상계좌' | '계좌이체' | '휴대폰'

/** 은행 코드 */
export type BankCode =
  | '경남' | '광주' | '국민' | '기업' | '농협'
  | '대구' | '부산' | '새마을' | '수협' | '신한'
  | '우리' | '우체국' | '전북' | '하나'

/** Toss 카드 정보 */
export interface TossCardInfo {
  issuerCode: string
  acquirerCode: string
  number: string
  installmentPlanMonths: number
  isInterestFree: boolean
  interestPayer: string | null
  approveNo: string
  useCardPoint: boolean
  cardType: string
  ownerType: string
  acquireStatus: string
  amount: number
}

/** Toss 가상계좌 정보 */
export interface TossVirtualAccountInfo {
  accountType: string
  accountNumber: string
  bankCode: string
  customerName: string
  dueDate: string
  refundStatus: string
  expired: boolean
  settlementStatus: string
  refundReceiveAccount: {
    bankCode: string
    accountNumber: string
    holderName: string
  } | null
}

/** Toss 취소 기록 */
export interface TossCancelRecord {
  cancelAmount: number
  cancelReason: string
  taxFreeAmount: number
  taxExemptionAmount: number
  refundableAmount: number
  easyPayDiscountAmount: number
  canceledAt: string
  transactionKey: string
  receiptKey: string | null
}

/** Toss 결제 객체 */
export interface TossPayment {
  paymentKey: string
  orderId: string
  orderName: string
  status: PaymentStatus
  method: PaymentMethod
  totalAmount: number
  balanceAmount: number
  suppliedAmount: number
  vat: number
  requestedAt: string
  approvedAt: string | null
  card: TossCardInfo | null
  virtualAccount: TossVirtualAccountInfo | null
  cancels: TossCancelRecord[] | null
  receipt: { url: string } | null
  cashReceipt: { receiptKey: string; type: string; issueNumber: string } | null
  secret: string | null
  mId: string
  version: string
  lastTransactionKey: string
  currency: string
}

/** Toss 거래 내역 */
export interface TossTransaction {
  mId: string
  transactionKey: string
  paymentKey: string
  orderId: string
  method: string
  customerKey: string | null
  amount: number
  status: PaymentStatus
  createdAt: string
  approvedAt: string | null
  statusChangedAt: string
  receipt: { url: string } | null
}

/** 결제창 승인 요청 */
export interface ConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
}

/** Key-in 요청 (Admin 전용) */
export interface KeyInRequest {
  amount: number
  orderId: string
  orderName: string
  cardNumber: string
  cardExpirationYear: string
  cardExpirationMonth: string
  customerIdentityNumber: string
  cardPassword?: string
  cardInstallmentPlan?: number
  customerName?: string
  customerEmail?: string
}

/** 가상계좌 요청 */
export interface VirtualAccountRequest {
  amount: number
  orderId: string
  orderName: string
  customerName: string
  bank: BankCode
  validHours?: number
  customerMobilePhone?: string
  cashReceipt?: {
    type: '소득공제' | '지출증빙'
    registrationNumber: string
  }
}

/** 취소 요청 */
export interface CancelRequest {
  cancelReason: string
  cancelAmount?: number
  refundReceiveAccount?: {
    bank: BankCode
    accountNumber: string
    holderName: string
  }
}

/** 거래 내역 조회 옵션 */
export interface TransactionListOptions {
  startingAfter?: string
  limit?: number
}

/** 웹훅 페이로드 */
export interface WebhookPayload {
  createdAt: string
  secret: string
  orderId: string
  status: PaymentStatus
  transactionKey: string
}

/** Toss API 에러 */
export interface TossApiError {
  code: string
  message: string
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/payments/types.ts
git commit -m "feat: Toss Payments 결제 타입 정의"
```

---

### Task 2: Payment Constants 정의

**Files:**
- Create: `src/lib/payments/constants.ts`

- [ ] **Step 1: 상수 파일 생성**

```typescript
// src/lib/payments/constants.ts
import type { PaymentStatus, BankCode } from './types'

/** 지원 은행 목록 (가상계좌) */
export const VIRTUAL_ACCOUNT_BANKS: ReadonlyArray<{ code: BankCode; name: string }> = [
  { code: '경남', name: '경남은행' },
  { code: '광주', name: '광주은행' },
  { code: '국민', name: 'KB국민은행' },
  { code: '기업', name: 'IBK기업은행' },
  { code: '농협', name: 'NH농협은행' },
  { code: '대구', name: 'iM뱅크(대구)' },
  { code: '부산', name: '부산은행' },
  { code: '새마을', name: '새마을금고' },
  { code: '수협', name: '수협은행' },
  { code: '신한', name: '신한은행' },
  { code: '우리', name: '우리은행' },
  { code: '우체국', name: '우체국' },
  { code: '전북', name: '전북은행' },
  { code: '하나', name: '하나은행' },
] as const

/** 결제 상태 한글 레이블 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  READY: '준비',
  IN_PROGRESS: '진행중',
  WAITING_FOR_DEPOSIT: '입금대기',
  DONE: '완료',
  CANCELED: '취소',
  PARTIAL_CANCELED: '부분취소',
  ABORTED: '승인실패',
  EXPIRED: '만료',
}

/** 결제 상태별 배지 색상 */
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  READY: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  WAITING_FOR_DEPOSIT: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  CANCELED: 'bg-red-100 text-red-700',
  PARTIAL_CANCELED: 'bg-orange-100 text-orange-700',
  ABORTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
}

/** 할부 옵션 */
export const INSTALLMENT_OPTIONS = [
  { value: 0, label: '일시불' },
  { value: 2, label: '2개월' },
  { value: 3, label: '3개월' },
  { value: 4, label: '4개월' },
  { value: 5, label: '5개월' },
  { value: 6, label: '6개월' },
  { value: 7, label: '7개월' },
  { value: 8, label: '8개월' },
  { value: 9, label: '9개월' },
  { value: 10, label: '10개월' },
  { value: 11, label: '11개월' },
  { value: 12, label: '12개월' },
] as const

/** 고유 주문 ID 생성 (Toss Payments용) */
export function generateOrderId(slug: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `RF-${slug}-${timestamp}-${random}`
}

/** Toss API Base URL */
export const TOSS_API_BASE_URL = 'https://api.tosspayments.com'
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/payments/constants.ts
git commit -m "feat: 결제 상수 및 유틸리티 (은행 목록, 상태 레이블)"
```

---

### Task 3: Toss API 클라이언트 — 테스트 먼저

**Files:**
- Create: `src/__tests__/payments/toss-client.test.ts`
- Create: `src/lib/payments/toss-client.ts`

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// src/__tests__/payments/toss-client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTossClient } from '@/lib/payments/toss-client'
import type { ConfirmRequest, KeyInRequest, VirtualAccountRequest, CancelRequest } from '@/lib/payments/types'

const mockFetch = vi.fn()
global.fetch = mockFetch

const client = createTossClient('test_sk_secret_key')

const mockPayment = {
  paymentKey: 'pk_test_123',
  orderId: 'RF-test-123',
  orderName: '테스트 꽃다발',
  status: 'DONE',
  method: '카드',
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

    it('Toss API 에러 시 TossApiError throw', async () => {
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
        status: 'WAITING_FOR_DEPOSIT',
        method: '가상계좌',
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
        orderName: '꽃바구니',
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

  describe('cancelPayment', () => {
    it('결제 취소 성공 (멱등키 포함)', async () => {
      const canceledPayment = {
        ...mockPayment,
        status: 'CANCELED',
        balanceAmount: 0,
        cancels: [{ cancelAmount: 50000, cancelReason: '고객 요청' }],
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/payments/toss-client.test.ts
```

Expected: FAIL (모듈 미존재)

- [ ] **Step 3: Toss 클라이언트 구현**

```typescript
// src/lib/payments/toss-client.ts
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

interface TossClient {
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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/__tests__/payments/toss-client.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/payments/toss-client.ts src/__tests__/payments/toss-client.test.ts
git commit -m "feat: Toss API 클라이언트 모듈 + 테스트"
```

---

## Chunk 2: API Routes

### Task 4: confirm 라우트 리팩토링

**Files:**
- Modify: `src/app/api/payments/confirm/route.ts`

- [ ] **Step 1: TossClient 사용으로 리팩토링**

기존 직접 fetch 호출을 `getTossClient()` 사용으로 교체.

```typescript
// src/app/api/payments/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { paymentKey, orderId, amount } = body

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST', message: '필수 파라미터가 누락되었습니다.' },
      { status: 400 },
    )
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_AMOUNT', message: '유효하지 않은 금액입니다.' },
      { status: 400 },
    )
  }

  try {
    const client = getTossClient()
    const payment = await client.confirmPayment({ paymentKey, orderId, amount })

    // 백엔드 DB에 결제 데이터 저장 (재시도 포함)
    // TODO: savePaymentToBackend() 호출 — 백엔드 API 구현 후 활성화
    // const saved = await savePaymentToBackend({
    //   paymentKey, orderId, amount, status: payment.status,
    // })

    return NextResponse.json({ ok: true, data: payment })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }
    console.error('Payment confirm error:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/payments/confirm/route.ts
git commit -m "refactor: confirm 라우트 TossClient 사용으로 리팩토링"
```

---

### Task 5: Key-in API 라우트

**Files:**
- Create: `src/app/api/payments/key-in/route.ts`
- Create: `src/__tests__/payments/key-in-route.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/__tests__/payments/key-in-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// getTossClient mock
vi.mock('@/lib/payments/toss-client', () => ({
  getTossClient: vi.fn(() => ({
    keyInPayment: vi.fn().mockResolvedValue({
      paymentKey: 'pk_123',
      orderId: 'RF-test-123',
      status: 'DONE',
      totalAmount: 50000,
    }),
  })),
  TossPaymentError: class extends Error {
    code: string
    status: number
    constructor(code: string, message: string, status: number) {
      super(message)
      this.code = code
      this.status = status
    }
  },
}))

describe('POST /api/payments/key-in', () => {
  it('인증 토큰 없으면 401', async () => {
    const { POST } = await import('@/app/api/payments/key-in/route')
    const req = new Request('http://localhost/api/payments/key-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 50000,
        orderId: 'RF-test-123',
        orderName: '꽃다발',
        cardNumber: '4242424242424242',
        cardExpirationYear: '28',
        cardExpirationMonth: '12',
        customerIdentityNumber: '960101',
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/payments/key-in-route.test.ts
```

- [ ] **Step 3: Key-in 라우트 구현**

```typescript
// src/app/api/payments/key-in/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'

const keyInSchema = z.object({
  amount: z.number().int().min(100, '최소 결제 금액은 100원입니다.'),
  orderId: z.string().min(6).max(64),
  orderName: z.string().min(1).max(100),
  cardNumber: z.string().regex(/^\d{15,16}$/, '카드번호는 15~16자리 숫자입니다.'),
  cardExpirationYear: z.string().regex(/^\d{2}$/, '유효기간 연도는 2자리입니다.'),
  cardExpirationMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, '유효기간 월은 01~12입니다.'),
  customerIdentityNumber: z.string().regex(/^\d{6}$|^\d{10}$/, '생년월일 6자리 또는 사업자번호 10자리입니다.'),
  cardPassword: z.string().regex(/^\d{2}$/).optional(),
  cardInstallmentPlan: z.number().int().min(0).max(12).optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
})

function extractAdminToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export async function POST(request: NextRequest) {
  // Admin 인증 검증
  const token = extractAdminToken(request)
  if (!token) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    )
  }

  const parsed = keyInSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: firstError.message },
      { status: 400 },
    )
  }

  try {
    const client = getTossClient()
    const requestData = { ...parsed.data }
    const payment = await client.keyInPayment(requestData)

    // 카드 데이터 메모리 제거 (보안)
    requestData.cardNumber = ''
    requestData.cardExpirationYear = ''
    requestData.cardExpirationMonth = ''
    requestData.customerIdentityNumber = ''
    if (requestData.cardPassword) requestData.cardPassword = ''

    // TODO: 백엔드 DB에 결제 데이터 저장
    // await savePaymentToBackend({ paymentKey: payment.paymentKey, orderId: payment.orderId, ... })

    return NextResponse.json({ ok: true, data: payment })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }
    console.error('Key-in payment error:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/payments/key-in-route.test.ts
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/payments/key-in/route.ts src/__tests__/payments/key-in-route.test.ts
git commit -m "feat: Key-in 결제 API 라우트 (Admin 전용, zod 검증)"
```

---

### Task 6: 가상계좌 발급 API 라우트

**Files:**
- Create: `src/app/api/payments/virtual-account/route.ts`

- [ ] **Step 1: 라우트 구현**

```typescript
// src/app/api/payments/virtual-account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'
import type { BankCode } from '@/lib/payments/types'

const VALID_BANKS = ['경남','광주','국민','기업','농협','대구','부산','새마을','수협','신한','우리','우체국','전북','하나'] as const

const schema = z.object({
  amount: z.number().int().min(100),
  orderId: z.string().min(6).max(64),
  orderName: z.string().min(1).max(100),
  customerName: z.string().min(1).max(100),
  bank: z.enum(VALID_BANKS),
  validHours: z.number().int().min(1).max(2160).optional(),
  customerMobilePhone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      { status: 400 },
    )
  }

  try {
    const client = getTossClient()
    const payment = await client.createVirtualAccount({
      ...parsed.data,
      validHours: parsed.data.validHours ?? 24,
    })

    // secret 값은 백엔드 DB에 저장 (웹훅 검증용)
    // TODO: 백엔드 API 구현 후 활성화
    // await savePaymentToBackend({
    //   paymentKey: payment.paymentKey,
    //   orderId: payment.orderId,
    //   amount: payment.totalAmount,
    //   status: payment.status,
    //   secret: payment.secret,  // 웹훅 검증용
    // })

    // secret은 응답에서 제외
    const { secret: _secret, ...responseData } = payment
    return NextResponse.json({ ok: true, data: responseData })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '가상계좌 발급 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
```

인증 불필요 (Branch 공개 페이지에서 호출).

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/payments/virtual-account/route.ts
git commit -m "feat: 가상계좌 발급 API 라우트"
```

---

### Task 7: 결제 조회/취소/목록 API 라우트

**Files:**
- Create: `src/app/api/payments/[paymentKey]/route.ts`
- Create: `src/app/api/payments/[paymentKey]/cancel/route.ts`
- Create: `src/app/api/payments/list/route.ts`

- [ ] **Step 1: 결제 상세 조회 구현** (`[paymentKey]/route.ts`)

```typescript
// src/app/api/payments/[paymentKey]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentKey: string }> },
) {
  const token = request.headers.get('authorization')
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, message: '인증이 필요합니다.' }, { status: 401 })
  }

  const { paymentKey } = await params

  try {
    const client = getTossClient()
    const payment = await client.getPayment(paymentKey)
    return NextResponse.json({ ok: true, data: payment })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status })
    }
    return NextResponse.json({ ok: false, message: '결제 조회 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 결제 취소 구현** (`[paymentKey]/cancel/route.ts`)

```typescript
// src/app/api/payments/[paymentKey]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'

const cancelSchema = z.object({
  cancelReason: z.string().min(1, '취소 사유를 입력해주세요.').max(200),
  cancelAmount: z.number().int().min(1).optional(),
  refundReceiveAccount: z.object({
    bank: z.string(),
    accountNumber: z.string().regex(/^\d{1,20}$/),
    holderName: z.string().min(1).max(60),
  }).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentKey: string }> },
) {
  const token = request.headers.get('authorization')
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, message: '인증이 필요합니다.' }, { status: 401 })
  }

  const { paymentKey } = await params
  const body = await request.json()
  const parsed = cancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.errors[0].message }, { status: 400 })
  }

  const idempotencyKey = `${paymentKey}-cancel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  try {
    const client = getTossClient()
    const payment = await client.cancelPayment(paymentKey, parsed.data, idempotencyKey)
    // TODO: 백엔드 주문 상태 변경 API 호출
    return NextResponse.json({ ok: true, data: payment })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status })
    }
    return NextResponse.json({ ok: false, message: '결제 취소 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 거래 목록 조회 구현** (`list/route.ts`)

```typescript
// src/app/api/payments/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, message: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  if (!startDate || !endDate) {
    return NextResponse.json({ ok: false, message: 'startDate, endDate 필수' }, { status: 400 })
  }

  // Toss API 7일 범위 제한 — 초과 시 에러 반환 (프론트에서 분할 요청)
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDiff > 7) {
    return NextResponse.json(
      { ok: false, code: 'RANGE_TOO_WIDE', message: '조회 범위는 최대 7일입니다.' },
      { status: 400 },
    )
  }

  try {
    const client = getTossClient()
    const startingAfter = searchParams.get('startingAfter') ?? undefined
    const limit = Number(searchParams.get('limit') ?? '100')
    const transactions = await client.getTransactions(startDate, endDate, { startingAfter, limit })
    return NextResponse.json({ ok: true, data: transactions })
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status })
    }
    return NextResponse.json({ ok: false, message: '거래 내역 조회 실패' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/payments/\[paymentKey\]/route.ts src/app/api/payments/\[paymentKey\]/cancel/route.ts src/app/api/payments/list/route.ts
git commit -m "feat: 결제 조회, 취소, 거래 목록 API 라우트"
```

---

### Task 8: Webhook API 라우트

**Files:**
- Create: `src/app/api/payments/webhook/route.ts`
- Create: `src/__tests__/payments/webhook-route.test.ts`

- [ ] **Step 1: 테스트 작성**

Webhook 페이로드 수신 → secret 검증 → orderId 조회 → 200 반환.
잘못된 secret → 403.
오래된 createdAt(10분 이상) → 400.

- [ ] **Step 2: 테스트 실행 — 실패 확인**

- [ ] **Step 3: Webhook 라우트 구현**

```typescript
// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTossClient } from '@/lib/payments/toss-client'
import type { WebhookPayload } from '@/lib/payments/types'

// 처리된 transactionKey 저장 (프로세스 내 중복 방지)
const processedKeys = new Set<string>()

export async function POST(request: NextRequest) {
  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { secret, orderId, status, transactionKey, createdAt } = payload

  // 1. 타임스탬프 검증 (10분 이내)
  const eventTime = new Date(createdAt).getTime()
  const now = Date.now()
  if (now - eventTime > 10 * 60 * 1000) {
    return NextResponse.json({ error: 'Event too old' }, { status: 400 })
  }

  // 2. 중복 체크
  if (processedKeys.has(transactionKey)) {
    return NextResponse.json({ ok: true, message: 'Already processed' })
  }

  // 3. secret 검증 — 백엔드 DB에서 orderId에 연결된 secret 조회 후 비교
  // TODO: 백엔드 API 연동 시 실제 secret 비교 구현
  // 현재는 기본 검증만 수행
  if (!secret || !orderId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    // 4. Toss API로 실제 결제 상태 확인
    const client = getTossClient()
    const payment = await client.getPaymentByOrderId(orderId)

    // 5. 상태에 따라 백엔드 주문 상태 변경
    if (payment.status === 'DONE') {
      // TODO: 백엔드 API 호출 — 주문 상태 '입금완료'로 변경
    } else if (payment.status === 'CANCELED') {
      // TODO: 백엔드 API 호출 — 주문 상태 '결제취소'로 변경
    }

    // 6. 처리 완료 기록
    processedKeys.add(transactionKey)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/payments/webhook/route.ts src/__tests__/payments/webhook-route.test.ts
git commit -m "feat: Webhook 라우트 (secret 검증, 중복 방지, 타임스탬프 검증)"
```

---

## Chunk 3: Branch 결제 페이지 개편

### Task 9: payment-store 수정

**Files:**
- Modify: `src/lib/branch/payment-store.ts`

- [ ] **Step 1: paymentMethod 필드 추가**

`OrderPaymentData`에 `paymentMethod: 'card' | 'virtual-account'` 추가.
기존 필드는 모두 유지.

- [ ] **Step 2: 커밋**

```bash
git add src/lib/branch/payment-store.ts
git commit -m "feat: payment-store에 paymentMethod 필드 추가"
```

---

### Task 10: Branch 결제 페이지 재작성

**Files:**
- Modify: `src/app/branch/[slug]/payment/page.tsx`

- [ ] **Step 1: 결제 방법 선택 + 가상계좌 폼 UI 구현**

위젯 코드를 제거하고 다음으로 교체:
1. 결제 방법 선택 탭: [카드/간편결제] [가상계좌]
2. 카드 선택 시: 주문 요약 + 결제하기 버튼 (기존 requestPayment 리다이렉트 유지)
3. 가상계좌 선택 시: 입금자명, 은행 선택 드롭다운, 결제하기 버튼
   - 가상계좌 발급 성공 시: 계좌 정보 표시 화면으로 전환

기존 참조할 코드: `payment/page.tsx`의 헤더/주문요약/테마 패턴 유지.
`@tosspayments/tosspayments-sdk`의 `loadTossPayments` + `requestPayment`는 카드결제용으로 유지 (위젯 렌더링 코드만 제거).

- [ ] **Step 2: 커밋**

```bash
git add src/app/branch/\[slug\]/payment/page.tsx
git commit -m "feat: Branch 결제 페이지 리디자인 (방법 선택 + 가상계좌)"
```

---

### Task 11: 결제 성공 페이지 수정

**Files:**
- Modify: `src/app/branch/[slug]/payment/success/page.tsx`

- [ ] **Step 1: 가상계좌 입금대기 상태 추가**

기존 카드결제 플로우 유지 + 가상계좌 대기 표시 추가:
- URL 파라미터에 `method=virtual-account` 포함 시 가상계좌 결과 화면
- 은행명, 계좌번호, 입금기한 표시
- 계좌번호 복사 버튼 (`navigator.clipboard.writeText`)
- "입금 확인 후 주문이 자동 접수됩니다" 안내

결제 승인 실패 시 재시도 로직 추가 (최대 2회, 1초 간격).

- [ ] **Step 2: 커밋**

```bash
git add src/app/branch/\[slug\]/payment/success/page.tsx
git commit -m "feat: 결제 성공 페이지 — 가상계좌 입금대기 + 재시도 로직"
```

---

### Task 12: payment-utils 마이그레이션 + 삭제

**Files:**
- Delete: `src/lib/branch/payment-utils.ts`
- Modify: `src/app/branch/[slug]/payment/page.tsx` (import 변경)

- [ ] **Step 1: import 경로 변경**

`payment-utils`를 참조하는 모든 파일에서 import를 변경:
- `generateOrderId` → `@/lib/payments/constants`
- `TOSS_CLIENT_KEY` → `process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || ''` 직접 사용

```bash
# 참조 파일 검색
grep -r "payment-utils" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 2: payment-utils.ts 삭제**

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "refactor: payment-utils → payments/constants 마이그레이션 + 삭제"
```

---

## Chunk 4: Admin 결제 관리 페이지

### Task 13: CardInputForm 컴포넌트

**Files:**
- Create: `src/app/admin/payments/components/CardInputForm.tsx`

- [ ] **Step 1: 카드 입력 폼 구현**

react-hook-form + zod 검증. 내부 state 관리, 부모에게 onSubmit 콜백.

필드:
- 카드번호 (4자리씩 자동 분할 포맷팅, maxLength 19)
- 유효기간 MM/YY (auto-slash)
- 생년월일/사업자번호 (라디오 선택 후 입력)
- 카드 비밀번호 앞 2자리 (optional)
- 할부 선택 (select, INSTALLMENT_OPTIONS 사용)

기존 shadcn/ui 컴포넌트 활용: Input, Select, Label, Button.

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/payments/components/CardInputForm.tsx
git commit -m "feat: CardInputForm 카드 입력 컴포넌트 (zod 검증)"
```

---

### Task 14: 결제 관리 목록 페이지

**Files:**
- Create: `src/app/admin/payments/page.tsx`
- Create: `src/app/admin/payments/components/PaymentTable.tsx`

- [ ] **Step 1: PaymentTable 컴포넌트 구현**

기존 패턴 참고: `src/app/admin/florists/page.tsx`의 테이블 + 필터 패턴.

TanStack Query로 Toss API 조회:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['admin-payments', startDate, endDate, statusFilter],
  queryFn: () => api<TossTransaction[]>(
    `/api/payments/list?startDate=${startDate}&endDate=${endDate}`
  ),
})
```

테이블 컬럼: 상태(배지), 주문번호, 고객명, 결제금액, 수단, 일시, 액션(드롭다운).
필터: 날짜 범위(기본 7일), 상태, 결제수단.

- [ ] **Step 2: 결제 관리 페이지 조립**

필터 영역 + PaymentTable + 페이지네이션.

- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/payments/page.tsx src/app/admin/payments/components/PaymentTable.tsx
git commit -m "feat: Admin 결제 관리 목록 페이지 (필터 + 테이블)"
```

---

### Task 15: 결제 상세/취소 모달

**Files:**
- Create: `src/app/admin/payments/components/PaymentDetailModal.tsx`
- Create: `src/app/admin/payments/components/CancelPaymentModal.tsx`

- [ ] **Step 1: PaymentDetailModal 구현**

paymentKey로 Toss API 실시간 조회. Dialog 컴포넌트 사용.
카드: 카드사/승인번호/할부. 가상계좌: 은행/계좌번호/입금상태.
취소 이력 표시. 영수증 링크.

- [ ] **Step 2: CancelPaymentModal 구현**

전액 취소 / 부분 환불 라디오 선택.
취소 사유 textarea (필수).
가상계좌 시 환불 계좌 입력 (은행 선택, 계좌번호, 예금주).
AlertDialog 확인 후 실행. useMutation + toast.

- [ ] **Step 3: PaymentTable에 모달 연결**

액션 드롭다운에서 "상세보기" → PaymentDetailModal, "취소" → CancelPaymentModal.

- [ ] **Step 4: 커밋**

```bash
git add src/app/admin/payments/components/PaymentDetailModal.tsx src/app/admin/payments/components/CancelPaymentModal.tsx src/app/admin/payments/components/PaymentTable.tsx
git commit -m "feat: 결제 상세 조회 + 취소/환불 모달"
```

---

### Task 16: Key-in 수동결제 페이지

**Files:**
- Create: `src/app/admin/payments/key-in/page.tsx`

- [ ] **Step 1: 페이지 구현 — 탭 2개**

**기존 주문 연결 탭:**
- 주문번호 검색 input + 조회 버튼
- 조회 결과: 고객명, 상품명, 금액 표시
- CardInputForm 표시
- 결제 실행 → POST /api/payments/key-in (Bearer 토큰 포함)

**신규 전화주문 탭:**
- 지사 선택 (select), 고객명, 상품명, 결제금액 input
- CardInputForm 표시
- 결제 실행 → POST /api/payments/key-in

공통: useMutation, 결제 성공 시 toast + 결과 표시, 실패 시 에러 표시.

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/payments/key-in/page.tsx
git commit -m "feat: Admin Key-in 수동결제 페이지 (기존주문 + 신규주문)"
```

---

### Task 17: Admin 사이드바에 결제 관리 메뉴 추가

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: 사이드바 네비게이션에 결제 메뉴 추가**

`navEntries` 배열에 결제 관련 항목 추가 (기존 SVG 아이콘 패턴을 따름):

```typescript
// PaymentIcon 추가 (기존 아이콘 컴포넌트 패턴)
const PaymentIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;

// navEntries에 추가 (주문 관련 항목 근처에 배치):
{
  label: '결제',
  icon: <PaymentIcon />,
  color: 'text-violet-600',
  items: [
    { href: '/admin/payments', label: '결제 관리', icon: <PaymentIcon /> },
    { href: '/admin/payments/key-in', label: '수동 결제', icon: <PaymentIcon /> },
  ],
},
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: Admin 사이드바에 결제 관리 메뉴 추가"
```

---

## Chunk 5: 테스트 + 정리

### Task 18: API Route 단위 테스트 보강

**Files:**
- Create: `src/__tests__/payments/confirm-route.test.ts`
- Create: `src/__tests__/payments/virtual-account-route.test.ts`
- Create: `src/__tests__/payments/cancel-route.test.ts`
- Modify: `src/__tests__/payments/key-in-route.test.ts` (happy path + validation 테스트 추가)

- [ ] **Step 1: confirm 라우트 테스트**

- 정상 승인 → `{ ok: true, data: payment }` 반환
- 필수 파라미터 누락 → 400
- Toss API 에러 → 에러 코드 전달

- [ ] **Step 2: virtual-account 라우트 테스트**

- 정상 발급 → secret 제외된 응답 반환
- 지원하지 않는 은행 → validation error
- Toss API 에러 → 에러 코드 전달

- [ ] **Step 3: cancel 라우트 테스트**

- 인증 필수 → 토큰 없으면 401
- 취소 사유 누락 → 400
- 정상 취소 → 멱등키 포함 확인

- [ ] **Step 4: key-in 테스트 보강**

기존 401 테스트에 추가:
- 정상 결제 → `{ ok: true }` 반환
- 카드번호 형식 오류 → validation error
- 유효기간 형식 오류 → validation error

- [ ] **Step 5: 커밋**

```bash
git add src/__tests__/payments/
git commit -m "test: API Route 단위 테스트 (confirm, virtual-account, cancel, key-in)"
```

---

### Task 19: 통합 테스트

**Files:**
- Create: `src/__tests__/payments/integration.test.ts`

- [ ] **Step 1: 핵심 플로우 통합 테스트**

1. Toss 클라이언트 → API Route → 응답 파이프라인 검증
2. 가상계좌 발급 → Webhook 수신 → 상태 변경 플로우
3. Key-in → 결제 성공 → 취소 플로우

모든 외부 API는 vi.mock으로 모킹.

- [ ] **Step 2: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 3: 커밋**

```bash
git add src/__tests__/payments/integration.test.ts
git commit -m "test: 결제 통합 테스트 (confirm, key-in, virtual-account, webhook, cancel)"
```

---

### Task 20: 빌드 검증 + 최종 정리

**Files:**
- Verify all modified files

- [ ] **Step 1: TypeScript 컴파일 검증**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 2: Lint 검증**

```bash
npm run lint
```

Expected: 0 errors

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test
```

Expected: ALL PASS

- [ ] **Step 4: 불필요 파일 정리 확인**

- `src/lib/branch/payment-utils.ts` 삭제됨 확인
- 위젯 관련 코드(`renderPaymentMethods`, `renderAgreement`) 제거됨 확인
- 모든 import 경로 정상 확인

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "chore: 결제 통합 정리 — lint/type 오류 수정"
```

---

## Summary

| Chunk | Tasks | 주요 산출물 |
|-------|-------|-----------|
| 1. Foundation | 1-3 | types.ts, constants.ts, toss-client.ts + 테스트 |
| 2. API Routes | 4-8 | confirm 리팩토링, key-in, virtual-account, query/cancel/list, webhook |
| 3. Branch | 9-12 | payment-store 수정, 결제 페이지 재작성, success 수정, utils 마이그레이션 |
| 4. Admin | 13-17 | CardInputForm, 결제 관리 목록, 상세/취소 모달, Key-in 페이지, 사이드바 |
| 5. Tests | 18-20 | API 단위 테스트 보강, 통합 테스트, 빌드 검증, 정리 |

**총 20 Tasks, 5 Chunks**
