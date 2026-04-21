import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** 결제 방법 */
export type PaymentMethodChoice = 'card' | 'virtual-account';

/** 결제 페이지로 전달할 주문 데이터 */
export interface OrderPaymentData {
  slug: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productId: number;
  productName: string;
  productPrice: number;
  desiredDate: string;
  deliveryPurpose: string;
  deliveryTime: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  ribbonText: string;
  memo: string;
  invoiceType: string;
  cashReceiptPhone: string;
  message: string;
  paymentMethod?: PaymentMethodChoice;
  /**
   * 백엔드가 발급한 consult_request id. 결제 페이지에서 POST /public/payments/create 의
   * orderId 파라미터로 사용 (백엔드 payments.order_id 컬럼에 동일 값 저장됨).
   * 결제 진입 시점에 반드시 채워져 있어야 함.
   */
  consultRequestId?: number;
}

interface PaymentStore {
  orderData: OrderPaymentData | null;
  setOrderData: (data: OrderPaymentData) => void;
  clear: () => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set) => ({
      orderData: null,
      setOrderData: (data) => set({ orderData: data }),
      clear: () => set({ orderData: null }),
    }),
    {
      name: 'payment-order-data',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ orderData: state.orderData }),
    },
  ),
);
