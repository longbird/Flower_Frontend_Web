import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVbankPoll } from '@/app/branch/[slug]/payment/vbank/use-vbank-poll';
import * as branchApi from '@/lib/branch/api';

describe('useVbankPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('polls every 3s and calls onTerminal when status=PAID', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy
      .mockResolvedValueOnce({ status: 'PENDING', paidAt: null, paidAmount: null })
      .mockResolvedValueOnce({ status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50000 });

    const onTerminal = vi.fn();
    const future = new Date(Date.now() + 60 * 60_000).toISOString(); // 1h
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future, onTerminal }));

    // Initial tick (immediate) → PENDING
    await vi.advanceTimersByTimeAsync(0);
    // Next interval tick → PAID
    await vi.advanceTimersByTimeAsync(3000);

    await waitFor(() => expect(onTerminal).toHaveBeenCalled());
    expect(onTerminal.mock.calls[0][0].status).toBe('PAID');
    expect(onTerminal.mock.calls[0][0].paidAmount).toBe(50000);
  });

  it('calls onExpired when dueDate is in the past', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy.mockResolvedValue({ status: 'PENDING', paidAt: null, paidAmount: null });

    const onExpired = vi.fn();
    const past = new Date(Date.now() - 1000).toISOString();
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: past, onExpired }));

    await vi.advanceTimersByTimeAsync(0);
    await waitFor(() => expect(onExpired).toHaveBeenCalled());
  });

  it('cleanup stops interval on unmount', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy.mockResolvedValue({ status: 'PENDING', paidAt: null, paidAmount: null });

    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const { unmount } = renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future }));

    await vi.advanceTimersByTimeAsync(0); // initial call
    expect(pollSpy).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pollSpy).toHaveBeenCalledTimes(1); // no further calls
  });

  it('tolerates intermittent errors (continues polling and recovers)', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50000 });

    const onTerminal = vi.fn();
    const onError = vi.fn();
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future, onTerminal, onError }));

    await vi.advanceTimersByTimeAsync(0);     // 1st call → reject
    await vi.advanceTimersByTimeAsync(3000);  // 2nd call → PAID

    await waitFor(() => expect(onTerminal).toHaveBeenCalled());
    expect(onError).not.toHaveBeenCalled();   // single error doesn't trigger onError
  });

  it('calls onError after 5 consecutive failures', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy.mockRejectedValue(new Error('network'));

    const onError = vi.fn();
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future, onError }));

    // 5 failures: initial + 4 interval ticks
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(3000);
    }

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('does not call onTerminal/onExpired/onError if not provided (no crash)', async () => {
    const pollSpy = vi.spyOn(branchApi, 'pollVbankStatus');
    pollSpy.mockResolvedValue({ status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50000 });

    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const { unmount } = renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future }));

    await vi.advanceTimersByTimeAsync(0);
    // Should not throw even though no callbacks provided
    unmount();
  });
});
