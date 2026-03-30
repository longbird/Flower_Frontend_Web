import { create } from 'zustand';

/** 결제 방법 */
export type PaymentMethodChoice = 'card' | 'virtual-account';

/** 결제 페이지로 전달할 주문 데이터 */
export interface OrderPaymentData {
  slug: string;
  customerName: string;
  customerPhone: string;
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
}

interface PaymentStore {
  orderData: OrderPaymentData | null;
  ribbonImage: File | null;
  businessRegFile: File | null;
  setOrderData: (
    data: OrderPaymentData,
    ribbonImage?: File | null,
    businessRegFile?: File | null,
  ) => void;
  clear: () => void;
}

export const usePaymentStore = create<PaymentStore>((set) => ({
  orderData: null,
  ribbonImage: null,
  businessRegFile: null,
  setOrderData: (data, ribbonImage = null, businessRegFile = null) =>
    set({ orderData: data, ribbonImage, businessRegFile }),
  clear: () => set({ orderData: null, ribbonImage: null, businessRegFile: null }),
}));
