import { NextRequest, NextResponse } from 'next/server';
import { getTossClient, TossPaymentError } from '@/lib/payments/toss-client';
import type { TossTransaction } from '@/lib/payments/types';

// 단일 admin 페이지 왔다갔다 빠르게 하기 위한 짧은 인메모리 캐시.
// PM2 cluster 인스턴스별로 분리되지만 hit 만 나도 외부 Toss API 1회 절약.
const CACHE_TTL_MS = 30_000;
type CacheEntry = { data: TossTransaction[]; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(start: string, end: string, startingAfter: string | undefined, limit: number) {
  return `${start}|${end}|${startingAfter ?? ''}|${limit}`;
}

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

  const startingAfter = searchParams.get('startingAfter') ?? undefined;
  const limit = Number(searchParams.get('limit') ?? '100');
  const key = cacheKey(startDate, endDate, startingAfter, limit);
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return NextResponse.json({ ok: true, data: hit.data, cached: true });
  }

  try {
    const client = getTossClient();
    const transactions = await client.getTransactions(startDate, endDate, { startingAfter, limit });
    cache.set(key, { data: transactions, expiresAt: now + CACHE_TTL_MS });
    // 작은 housekeeping — 만료 항목 제거 (cache size 폭발 방지)
    if (cache.size > 50) {
      for (const [k, v] of cache.entries()) {
        if (v.expiresAt <= now) cache.delete(k);
      }
    }
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
