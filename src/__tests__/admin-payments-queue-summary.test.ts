import { describe, expect, it } from 'vitest';
import { buildPaymentQueueSummary } from '@/app/admin/payments/payment-queue-summary';
import type { AdminPaymentTransaction } from '@/app/admin/payments/payments-list';

const baseTx: AdminPaymentTransaction = {
  mId: 'tosspayments',
  transactionKey: 'tx-1',
  paymentKey: 'pay-1',
  orderId: 'RF-1',
  method: '카드',
  customerKey: null,
  useEscrow: false,
  receiptUrl: null,
  status: 'DONE',
  transactionAt: '2026-05-06T01:00:00.000Z',
  currency: 'KRW',
  amount: 10000,
  source: 'TOSS',
};

function tx(partial: Partial<AdminPaymentTransaction>): AdminPaymentTransaction {
  return { ...baseTx, ...partial };
}

describe('buildPaymentQueueSummary', () => {
  it('counts operational payment buckets from the combined payment rows', () => {
    const summary = buildPaymentQueueSummary([
      tx({ paymentKey: 'done-1', status: 'DONE', amount: 10000 }),
      tx({ paymentKey: 'done-2', status: 'DONE', amount: 20000 }),
      tx({ paymentKey: 'review-1', status: 'IN_PROGRESS', amount: 30000 }),
      tx({ paymentKey: 'pending-1', status: 'WAITING_FOR_DEPOSIT', amount: 40000 }),
      tx({ paymentKey: 'failed-1', status: 'ABORTED', amount: 50000 }),
      tx({ paymentKey: 'canceled-1', status: 'CANCELED', amount: 60000 }),
    ]);

    expect(summary.reviewRequired).toBe(1);
    expect(summary.waitingForDeposit).toBe(1);
    expect(summary.completed).toBe(2);
    expect(summary.failedOrCanceled).toBe(2);
    expect(summary.completedAmount).toBe(30000);
  });
});
