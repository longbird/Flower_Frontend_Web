import { describe, it, expect, beforeEach } from 'vitest';
import { usePaymentStore } from '@/lib/branch/payment-store';

describe('payment-store vbank state', () => {
  beforeEach(() => {
    usePaymentStore.setState({ orderData: null, vbankInfo: null, pollingActive: false });
  });

  it('initial state: vbankInfo null, pollingActive false', () => {
    expect(usePaymentStore.getState().vbankInfo).toBeNull();
    expect(usePaymentStore.getState().pollingActive).toBe(false);
  });

  it('setVbankInfo stores issue response', () => {
    usePaymentStore.getState().setVbankInfo({
      paymentId: 999,
      innopayTid: 'tid',
      accountNumber: '1234',
      bankCode: '004',
      bankName: '국민',
      holderName: '홍길동',
      dueDate: '2026-04-29T14:59:59Z',
      amount: 50_000,
    });
    expect(usePaymentStore.getState().vbankInfo?.paymentId).toBe(999);
    expect(usePaymentStore.getState().vbankInfo?.accountNumber).toBe('1234');
  });

  it('setVbankInfo with null clears state', () => {
    usePaymentStore.setState({
      vbankInfo: { paymentId: 1 } as any,
    });
    usePaymentStore.getState().setVbankInfo(null);
    expect(usePaymentStore.getState().vbankInfo).toBeNull();
  });

  it('clearVbankInfo resets vbankInfo and pollingActive', () => {
    usePaymentStore.setState({
      vbankInfo: { paymentId: 999 } as any,
      pollingActive: true,
    });
    usePaymentStore.getState().clearVbankInfo();
    expect(usePaymentStore.getState().vbankInfo).toBeNull();
    expect(usePaymentStore.getState().pollingActive).toBe(false);
  });

  it('setPollingActive toggles state', () => {
    usePaymentStore.getState().setPollingActive(true);
    expect(usePaymentStore.getState().pollingActive).toBe(true);
    usePaymentStore.getState().setPollingActive(false);
    expect(usePaymentStore.getState().pollingActive).toBe(false);
  });

  it('does not affect existing orderData', () => {
    const orderData = {
      slug: 's',
      customerName: '홍',
      customerPhone: '01012345678',
      productId: 1,
      productName: '꽃',
      productPrice: 50_000,
      desiredDate: '',
      deliveryPurpose: '',
      deliveryTime: '',
      recipientName: '',
      recipientPhone: '',
      address: '',
      ribbonText: '',
      memo: '',
      invoiceType: '',
      cashReceiptPhone: '',
      message: '',
      orderId: 1,
    };
    usePaymentStore.getState().setOrderData(orderData);
    usePaymentStore.getState().setVbankInfo({ paymentId: 1 } as any);
    expect(usePaymentStore.getState().orderData).toEqual(orderData);
  });
});
