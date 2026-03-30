import { NextRequest, NextResponse } from 'next/server';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { paymentKey, orderId, amount } = body;

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST', message: '필수 파라미터가 누락되었습니다.' },
      { status: 400 },
    );
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_AMOUNT', message: '유효하지 않은 금액입니다.' },
      { status: 400 },
    );
  }

  try {
    const client = getTossClient();
    const payment = await client.confirmPayment({ paymentKey, orderId, amount });

    // TODO: 백엔드 DB에 결제 데이터 저장 (재시도 포함)
    // const saved = await savePaymentToBackend({
    //   paymentKey, orderId, amount, status: payment.status,
    // })

    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Payment confirm error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
