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

/** Toss API Base URL */
export const TOSS_API_BASE_URL = 'https://api.tosspayments.com'

/** 고유 주문 ID 생성 (Toss Payments용) */
export function generateOrderId(slug: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `RF-${slug}-${timestamp}-${random}`
}
