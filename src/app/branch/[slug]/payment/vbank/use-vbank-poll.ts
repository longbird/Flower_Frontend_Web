'use client';

import { useEffect, useRef } from 'react';
import { pollVbankStatus } from '@/lib/branch/api';
import type { PollVbankStatus } from '@/lib/payments/innopay-types';

const POLL_INTERVAL_MS = 3000;
const MAX_CONSECUTIVE_ERRORS = 5;

interface Options {
  paymentId: number;
  dueDate: string; // ISO 8601
  onTerminal?: (status: PollVbankStatus) => void;
  onExpired?: () => void;
  onError?: (err: Error) => void;
}

export function useVbankPoll(opts: Options) {
  // Use ref so latest callbacks are used without retriggering effect
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let stopped = false;
    let errorCount = 0;
    const dueAt = new Date(opts.dueDate).getTime();

    const tick = async () => {
      if (stopped) return;
      // Check expiry before issuing the request
      if (Date.now() >= dueAt) {
        stopped = true;
        optsRef.current.onExpired?.();
        return;
      }
      try {
        const result = await pollVbankStatus(opts.paymentId);
        errorCount = 0;
        if (stopped) return;
        if (result.status !== 'PENDING') {
          stopped = true;
          optsRef.current.onTerminal?.(result);
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
  }, [opts.paymentId, opts.dueDate]);
}
