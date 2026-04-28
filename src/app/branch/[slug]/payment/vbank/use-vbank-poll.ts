'use client';

import { useEffect, useRef } from 'react';
import { pollVbankStatus } from '@/lib/branch/api';
import type { PollVbankStatus } from '@/lib/payments/innopay-types';

const POLL_INTERVAL_MS = 3000;
const MAX_CONSECUTIVE_ERRORS = 5;
/** dueDate를 넘긴 후에도 백엔드 cron이 CANCELED 처리하기까지 시간이 걸린다 (매시간 5분).
 *  서버 응답이 PENDING으로 계속 오면 그래도 1시간 후엔 클라이언트가 만료 처리. */
const CLIENT_EXPIRY_GRACE_MS = 60 * 60 * 1000;

interface Options {
  paymentId: number;
  dueDate: string; // ISO 8601
  /** false면 폴링 중지 (vbankInfo 로딩 중 등). 기본값 true. */
  enabled?: boolean;
  onTerminal?: (status: PollVbankStatus) => void;
  onExpired?: () => void;
  onError?: (err: Error) => void;
}

export function useVbankPoll(opts: Options) {
  // Use ref so latest callbacks are used without retriggering effect
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const enabled = opts.enabled !== false;

  useEffect(() => {
    if (!enabled) return;
    if (!opts.paymentId || opts.paymentId <= 0) return;

    let stopped = false;
    let errorCount = 0;
    const dueAt = new Date(opts.dueDate).getTime();
    const isValidDueDate = Number.isFinite(dueAt);

    const tick = async () => {
      if (stopped) return;
      // 서버 상태가 authoritative — 클라이언트 시계만으로 단축 회로 만료 처리하지 않음.
      try {
        const result = await pollVbankStatus(opts.paymentId);
        errorCount = 0;
        if (stopped) return;
        if (result.status !== 'PENDING') {
          stopped = true;
          optsRef.current.onTerminal?.(result);
          return;
        }
        // 서버가 여전히 PENDING이지만 dueDate + grace를 넘기면 cron이 늦은 것으로 간주하고 만료.
        if (isValidDueDate && Date.now() > dueAt + CLIENT_EXPIRY_GRACE_MS) {
          stopped = true;
          optsRef.current.onExpired?.();
        }
      } catch (err: unknown) {
        errorCount += 1;
        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
          stopped = true;
          const e = err instanceof Error ? err : new Error(String(err));
          optsRef.current.onError?.(e);
        }
      }
    };

    // Immediate first call, then every POLL_INTERVAL_MS
    void tick();
    const id = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [opts.paymentId, opts.dueDate, enabled]);
}
