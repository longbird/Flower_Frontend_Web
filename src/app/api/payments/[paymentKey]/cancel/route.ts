import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

const cancelSchema = z.object({
  cancelReason: z.string().min(1, '취소 사유를 입력해주세요.').max(200),
  cancelAmount: z.number().int().min(1).optional(),
  refundReceiveAccount: z.object({
    bank: z.string(),
    accountNumber: z.string().regex(/^\d{1,20}$/),
    holderName: z.string().min(1).max(60),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentKey: string }> },
) {
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { paymentKey } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    );
  }

  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: firstError.message },
      { status: 400 },
    );
  }

  const idempotencyKey = `${paymentKey}-cancel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const client = getTossClient();
    const payment = await client.cancelPayment(paymentKey, parsed.data, idempotencyKey);

    // TODO: 백엔드 주문 상태 변경 API 호출

    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Payment cancel error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 취소 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
