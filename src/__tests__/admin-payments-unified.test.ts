import { describe, expect, it } from 'vitest';
import {
  combinePaymentRows,
  mapVbankStatusToPaymentStatus,
  vbankRowsToTransactions,
} from '@/app/admin/payments/payments-list';
import type { TossTransaction } from '@/lib/payments/types';
import type { AdminVbankPaymentRow } from '@/lib/payments/vbank-payment-types';

const tossTx: TossTransaction = {
  mId: 'tosspayments',
  transactionKey: 'toss-tx-1',
  paymentKey: 'pay_toss_1',
  orderId: 'RF-TOSS-1',
  method: '카드',
  customerKey: null,
  useEscrow: false,
  receiptUrl: null,
  status: 'DONE',
  transactionAt: '2026-04-30T04:00:00.000Z',
  currency: 'KRW',
  amount: 10000,
};

const vbankRow: AdminVbankPaymentRow = {
  paymentId: 77,
  orderId: 123,
  orderNo: 'ORD-20260430-001',
  ordererName: '홍길동',
  receiverName: '김수령',
  deliveryAt: '2026-05-01T02:30:00.000Z',
  orderType: 'GENERAL',
  branchId: 9,
  branchName: '서울지사',
  status: 'PENDING',
  amountTotal: 55000,
  paidAmount: null,
  vbankAccountNumber: '08205040497612',
  vbankBankCode: '004',
  vbankBankName: '국민은행',
  vbankHolderName: '달려라꽃배달',
  vbankDueDate: '2026-05-01T15:00:00.000Z',
  paidAt: null,
  canceledAt: null,
  createdAt: '2026-04-30T05:00:00.000Z',
  innopayMode: 'TEST',
  innopayTid: 'pool-1',
};

describe('admin unified payments list', () => {
  it('maps vbank payments into payment-table transaction rows with order metadata', () => {
    const [tx] = vbankRowsToTransactions([vbankRow]);

    expect(tx.paymentKey).toBe('vbank-77');
    expect(tx.transactionKey).toBe('vbank-77');
    expect(tx.orderId).toBe('123');
    expect(tx.method).toBe('가상계좌');
    expect(tx.status).toBe('WAITING_FOR_DEPOSIT');
    expect(tx.amount).toBe(55000);
    expect(tx.orderInfo).toEqual({
      internalOrderId: 123,
      orderNo: 'ORD-20260430-001',
      ordererName: '홍길동',
      receiverName: '김수령',
      deliveryAt: '2026-05-01T02:30:00.000Z',
      orderType: 'GENERAL',
    });
    expect(tx.vbank).toEqual(expect.objectContaining({
      paymentId: 77,
      accountNumber: '08205040497612',
      bankName: '국민은행',
    }));
  });

  it('maps vbank statuses to existing payment status labels', () => {
    expect(mapVbankStatusToPaymentStatus('PAID')).toBe('DONE');
    expect(mapVbankStatusToPaymentStatus('PENDING')).toBe('WAITING_FOR_DEPOSIT');
    expect(mapVbankStatusToPaymentStatus('REVIEW_REQUIRED')).toBe('IN_PROGRESS');
    expect(mapVbankStatusToPaymentStatus('CANCELED')).toBe('CANCELED');
    expect(mapVbankStatusToPaymentStatus('FAILED')).toBe('ABORTED');
  });

  it('combines card and vbank rows sorted by transaction time desc', () => {
    const rows = combinePaymentRows([tossTx], [vbankRow]);

    expect(rows.map((row) => row.paymentKey)).toEqual(['vbank-77', 'pay_toss_1']);
  });
});
