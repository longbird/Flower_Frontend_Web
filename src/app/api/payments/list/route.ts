import { NextRequest, NextResponse } from 'next/server';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST', message: 'startDate, endDate 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  // Toss API 7일 범위 제한
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 7) {
    return NextResponse.json(
      { ok: false, code: 'RANGE_TOO_WIDE', message: '조회 범위는 최대 7일입니다.' },
      { status: 400 },
    );
  }

  try {
    const client = getTossClient();
    const startingAfter = searchParams.get('startingAfter') ?? undefined;
    const limit = Number(searchParams.get('limit') ?? '100');
    const transactions = await client.getTransactions(startDate, endDate, { startingAfter, limit });
    return NextResponse.json({ ok: true, data: transactions });
  } catch (error) {
    if (error instanceof TossPaymentError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error('Transaction list error:', error);
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: '거래 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
