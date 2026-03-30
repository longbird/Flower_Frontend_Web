import { NextRequest, NextResponse } from 'next/server';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

export async function GET(
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

  try {
    const client = getTossClient();
    const payment = await client.getPayment(paymentKey);
    return NextResponse.json({ ok: true, data: payment });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Payment query error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
