import { NextRequest, NextResponse } from 'next/server';
import { getTossClient } from '@/lib/payments/toss-client';
import type { WebhookPayload } from '@/lib/payments/types';

// 처리된 transactionKey 저장 (프로세스 내 중복 방지)
// 주의: 서버 재시작 시 초기화됨. 프로덕션에서는 Redis 등 외부 저장소 권장.
const processedKeys = new Set<string>();
const MAX_PROCESSED_KEYS = 10000;

export async function POST(request: NextRequest) {
  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { secret, orderId, status, transactionKey, createdAt } = payload;

  // 1. 기본 검증
  if (!secret || !orderId || !transactionKey) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 2. 타임스탬프 검증 (10분 이내)
  const eventTime = new Date(createdAt).getTime();
  const now = Date.now();
  if (Number.isNaN(eventTime) || now - eventTime > 10 * 60 * 1000) {
    return NextResponse.json({ error: 'Event too old' }, { status: 400 });
  }

  // 3. 중복 체크
  if (processedKeys.has(transactionKey)) {
    return NextResponse.json({ ok: true, message: 'Already processed' });
  }

  // 4. secret 검증
  // TODO: 백엔드 DB에서 orderId에 연결된 secret 조회 후 비교
  // const storedSecret = await getSecretFromBackend(orderId)
  // if (storedSecret !== secret) {
  //   return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
  // }

  try {
    // 5. Toss API로 실제 결제 상태 확인
    const client = getTossClient();
    const payment = await client.getPaymentByOrderId(orderId);

    // 6. 상태에 따라 백엔드 주문 상태 변경
    if (payment.status === 'DONE') {
      // TODO: 백엔드 API 호출 — 주문 상태 '입금완료'로 변경
      console.log(`[Webhook] 입금 확인: orderId=${orderId}`);
    } else if (payment.status === 'CANCELED') {
      // TODO: 백엔드 API 호출 — 주문 상태 '결제취소'로 변경
      console.log(`[Webhook] 결제 취소: orderId=${orderId}`);
    }

    // 7. 처리 완료 기록 (Set 크기 제한)
    if (processedKeys.size >= MAX_PROCESSED_KEYS) {
      const firstKey = processedKeys.values().next().value;
      if (firstKey) processedKeys.delete(firstKey);
    }
    processedKeys.add(transactionKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
