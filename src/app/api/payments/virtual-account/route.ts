import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

const VALID_BANKS = [
  '경남', '광주', '국민', '기업', '농협', '대구', '부산',
  '새마을', '수협', '신한', '우리', '우체국', '전북', '하나',
] as const;

const schema = z.object({
  amount: z.number().int().min(100, '최소 결제 금액은 100원입니다.'),
  orderId: z.string().min(6).max(64),
  orderName: z.string().min(1).max(100),
  customerName: z.string().min(1).max(100),
  bank: z.enum(VALID_BANKS, { error: '지원하지 않는 은행입니다.' }),
  validHours: z.number().int().min(1).max(2160).optional(),
  customerMobilePhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: firstError.message },
      { status: 400 },
    );
  }

  try {
    const client = getTossClient();
    const payment = await client.createVirtualAccount({
      ...parsed.data,
      validHours: parsed.data.validHours ?? 24,
    });

    // TODO: 백엔드 DB에 결제 데이터 + secret 저장 (웹훅 검증용)
    // await savePaymentToBackend({
    //   paymentKey: payment.paymentKey,
    //   orderId: payment.orderId,
    //   amount: payment.totalAmount,
    //   status: payment.status,
    //   secret: payment.secret,
    // })

    // secret은 응답에서 제외 (서버에서만 보관)
    const { secret: _secret, ...responseData } = payment;
    return NextResponse.json({ ok: true, data: responseData });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Virtual account error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '가상계좌 발급 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
