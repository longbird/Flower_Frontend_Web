import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentTable, type AdminPaymentTransaction } from '@/app/admin/payments/components/PaymentTable';

const vbankTx: AdminPaymentTransaction = {
  mId: 'innopay',
  transactionKey: 'vbank-77',
  paymentKey: 'vbank-77',
  orderId: '123',
  method: '가상계좌',
  customerKey: null,
  useEscrow: false,
  receiptUrl: null,
  status: 'WAITING_FOR_DEPOSIT',
  transactionAt: '2026-04-30T05:00:00.000Z',
  currency: 'KRW',
  amount: 55000,
  source: 'INNOPAY_VBANK',
  orderInfo: {
    internalOrderId: 123,
    orderNo: 'ORD-20260430-001',
    ordererName: '홍길동',
    receiverName: '김수령',
    deliveryAt: '2026-05-01T02:30:00.000Z',
    orderType: 'GENERAL',
  },
  vbank: {
    paymentId: 77,
    accountNumber: '08205040497612',
    bankCode: '004',
    bankName: '국민은행',
    holderName: '달려라꽃배달',
    dueDate: '2026-05-01T15:00:00.000Z',
    paidAmount: null,
    innopayMode: 'TEST',
  },
};

describe('PaymentTable vbank detail action', () => {
  it('opens detail for a vbank row instead of doing nothing', () => {
    const onViewDetail = vi.fn();

    render(
      <PaymentTable
        transactions={[vbankTx]}
        isLoading={false}
        onViewDetail={onViewDetail}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /홍길동/ })[0]);
    expect(onViewDetail).toHaveBeenCalledWith('vbank-77');
  });
});
