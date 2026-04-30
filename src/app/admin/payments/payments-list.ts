import type { TossTransaction, PaymentStatus } from '@/lib/payments/types';
import type { AdminVbankPaymentRow, VbankPaymentStatus } from '@/lib/payments/vbank-payment-types';
import type { OrderInfo } from './components/PaymentTable';

export type PaymentSource = 'TOSS' | 'INNOPAY_VBANK';

export interface AdminPaymentTransaction extends TossTransaction {
  source: PaymentSource;
  orderInfo?: OrderInfo;
  vbank?: {
    paymentId: number;
    accountNumber: string;
    bankCode: string;
    bankName: string | null;
    holderName: string;
    dueDate: string;
    paidAmount: number | null;
    innopayMode: 'TEST' | 'REAL';
  };
}

export function mapVbankStatusToPaymentStatus(status: VbankPaymentStatus): PaymentStatus {
  if (status === 'PAID') return 'DONE';
  if (status === 'PENDING') return 'WAITING_FOR_DEPOSIT';
  if (status === 'REVIEW_REQUIRED') return 'IN_PROGRESS';
  if (status === 'CANCELED') return 'CANCELED';
  return 'ABORTED';
}

export function mapPaymentStatusToVbankStatuses(status: string): VbankPaymentStatus[] | undefined {
  if (!status) return undefined;
  if (status === 'DONE') return ['PAID'];
  if (status === 'WAITING_FOR_DEPOSIT') return ['PENDING'];
  if (status === 'IN_PROGRESS') return ['REVIEW_REQUIRED'];
  if (status === 'CANCELED') return ['CANCELED'];
  if (status === 'ABORTED') return ['FAILED'];
  return undefined;
}

export function vbankRowsToTransactions(rows: AdminVbankPaymentRow[]): AdminPaymentTransaction[] {
  return rows.map((row) => ({
    mId: 'innopay',
    transactionKey: `vbank-${row.paymentId}`,
    paymentKey: `vbank-${row.paymentId}`,
    orderId: String(row.orderId),
    method: '가상계좌',
    customerKey: null,
    useEscrow: false,
    receiptUrl: null,
    status: mapVbankStatusToPaymentStatus(row.status),
    transactionAt: row.paidAt ?? row.canceledAt ?? row.createdAt,
    currency: 'KRW',
    amount: row.paidAmount ?? row.amountTotal,
    source: 'INNOPAY_VBANK',
    orderInfo: {
      internalOrderId: row.orderId,
      orderNo: row.orderNo,
      ordererName: row.ordererName,
      receiverName: row.receiverName,
      deliveryAt: row.deliveryAt,
      orderType: row.orderType,
    },
    vbank: {
      paymentId: row.paymentId,
      accountNumber: row.vbankAccountNumber,
      bankCode: row.vbankBankCode,
      bankName: row.vbankBankName,
      holderName: row.vbankHolderName,
      dueDate: row.vbankDueDate,
      paidAmount: row.paidAmount,
      innopayMode: row.innopayMode,
    },
  }));
}

export function tossRowsToTransactions(rows: TossTransaction[]): AdminPaymentTransaction[] {
  return rows.map((row) => ({ ...row, source: 'TOSS' }));
}

export function combinePaymentRows(
  tossRows: TossTransaction[],
  vbankRows: AdminVbankPaymentRow[],
): AdminPaymentTransaction[] {
  return [...tossRowsToTransactions(tossRows), ...vbankRowsToTransactions(vbankRows)]
    .sort((a, b) => new Date(b.transactionAt).getTime() - new Date(a.transactionAt).getTime());
}
