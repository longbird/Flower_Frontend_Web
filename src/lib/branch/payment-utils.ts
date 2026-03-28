/** 고유 주문 ID 생성 (Toss Payments용) */
export function generateOrderId(slug: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `RF-${slug}-${timestamp}-${random}`;
}

/** Toss 클라이언트 키 */
export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

/** Toss Payments 결제 확인 응답 */
export interface TossPaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  requestedAt: string;
  approvedAt: string;
}
