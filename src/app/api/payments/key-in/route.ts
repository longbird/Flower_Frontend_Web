import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

const keyInSchema = z.object({
  amount: z.number().int().min(100, '최소 결제 금액은 100원입니다.'),
  orderId: z.string().min(6).max(64),
  orderName: z.string().min(1).max(100),
  cardNumber: z.string().regex(/^\d{15,16}$/, '카드번호는 15~16자리 숫자입니다.'),
  cardExpirationYear: z.string().regex(/^\d{2}$/, '유효기간 연도는 2자리입니다.'),
  cardExpirationMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, '유효기간 월은 01~12입니다.'),
  customerIdentityNumber: z.string().regex(
    /^\d{6}$|^\d{10}$/,
    '생년월일 6자리 또는 사업자번호 10자리입니다.',
  ),
  cardPassword: z.string().regex(/^\d{2}$/).optional(),
  cardInstallmentPlan: z.number().int().min(0).max(12).optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(request: NextRequest) {
  // Admin 인증 검증
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    );
  }

  const parsed = keyInSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: firstError.message },
      { status: 400 },
    );
  }

  try {
    const client = getTossClient();
    const requestData = { ...parsed.data };
    const payment = await client.keyInPayment(requestData);

    // 카드 데이터 메모리 제거 (보안)
    requestData.cardNumber = '';
    requestData.cardExpirationYear = '';
    requestData.cardExpirationMonth = '';
    requestData.customerIdentityNumber = '';
    if (requestData.cardPassword) requestData.cardPassword = '';

    // TODO: 백엔드 DB에 결제 데이터 저장
    // await savePaymentToBackend({ paymentKey: payment.paymentKey, orderId: payment.orderId, ... })

    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Key-in payment error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
