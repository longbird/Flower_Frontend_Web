import { NextRequest, NextResponse } from 'next/server';

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

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    console.error('TOSS_SECRET_KEY is not configured');
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '결제 설정이 완료되지 않았습니다.' },
      { status: 500 },
    );
  }

  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');

  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const tossData = await tossRes.json();

  if (!tossRes.ok) {
    return NextResponse.json(
      { ok: false, code: tossData.code, message: tossData.message },
      { status: tossRes.status },
    );
  }

  return NextResponse.json({ ok: true, data: tossData });
}
