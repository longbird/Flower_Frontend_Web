import type { AdminPaymentTransaction } from './payments-list';

export interface PaymentQueueSummary {
  reviewRequired: number;
  waitingForDeposit: number;
  completed: number;
  failedOrCanceled: number;
  completedAmount: number;
}

export function buildPaymentQueueSummary(rows: AdminPaymentTransaction[]): PaymentQueueSummary {
  return rows.reduce<PaymentQueueSummary>(
    (summary, row) => {
      if (row.status === 'IN_PROGRESS') summary.reviewRequired += 1;
      if (row.status === 'WAITING_FOR_DEPOSIT') summary.waitingForDeposit += 1;
      if (row.status === 'DONE') {
        summary.completed += 1;
        summary.completedAmount += row.amount;
      }
      if (row.status === 'ABORTED' || row.status === 'CANCELED' || row.status === 'PARTIAL_CANCELED') {
        summary.failedOrCanceled += 1;
      }
      return summary;
    },
    {
      reviewRequired: 0,
      waitingForDeposit: 0,
      completed: 0,
      failedOrCanceled: 0,
      completedAmount: 0,
    },
  );
}
