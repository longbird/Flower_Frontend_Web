import { NextRequest, NextResponse } from 'next/server';
import { getTossClient } from '@/lib/payments/toss-client';

const MAX_KEYS = 100;
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 5 * 60_000; // orderName 은 영구 불변에 가까움

// paymentKey → orderName 영속 캐시 (서버 메모리). 같은 키는 두 번 안 묻는다.
const orderNameCache = new Map<string, { value: string; expiresAt: number }>();

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('paymentKeys');
  if (!raw) {
    return NextResponse.json({ ok: true, data: {} });
  }

  const keys = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  ).slice(0, MAX_KEYS);

  if (keys.length === 0) {
    return NextResponse.json({ ok: true, data: {} });
  }

  const now = Date.now();
  const map: Record<string, string> = {};
  const missing: string[] = [];

  for (const k of keys) {
    const hit = orderNameCache.get(k);
    if (hit && hit.expiresAt > now) {
      map[k] = hit.value;
    } else {
      missing.push(k);
    }
  }

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, data: map, cached: true });
  }

  const client = getTossClient();
  const results = await Promise.allSettled(
    missing.map((k) =>
      Promise.race([
        client.getPayment(k),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
        ),
      ]),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const payment = r.value as { orderName?: string };
      if (payment?.orderName) {
        const k = missing[i];
        map[k] = payment.orderName;
        orderNameCache.set(k, { value: payment.orderName, expiresAt: now + CACHE_TTL_MS });
      }
    }
  });

  // housekeeping
  if (orderNameCache.size > 1000) {
    for (const [k, v] of orderNameCache.entries()) {
      if (v.expiresAt <= now) orderNameCache.delete(k);
    }
  }

  return NextResponse.json({ ok: true, data: map });
}
