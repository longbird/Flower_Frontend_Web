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
