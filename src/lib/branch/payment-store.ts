import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** 결제 방법 */
export type PaymentMethodChoice = 'card' | 'virtual-account';

/** 직렬화 가능한 파일 표현 (sessionStorage 저장용) */
export interface SerializedFile {
  dataUrl: string;
  name: string;
  type: string;
}

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
  ribbonImage: SerializedFile | null;
  businessRegFile: SerializedFile | null;
  setOrderData: (
    data: OrderPaymentData,
    ribbonImage?: SerializedFile | null,
    businessRegFile?: SerializedFile | null,
  ) => void;
  clear: () => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set) => ({
      orderData: null,
      ribbonImage: null,
      businessRegFile: null,
      setOrderData: (data, ribbonImage = null, businessRegFile = null) =>
        set({ orderData: data, ribbonImage, businessRegFile }),
      clear: () => set({ orderData: null, ribbonImage: null, businessRegFile: null }),
    }),
    {
      name: 'payment-order-data',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        orderData: state.orderData,
        ribbonImage: state.ribbonImage,
        businessRegFile: state.businessRegFile,
      }),
    },
  ),
);

/** File → SerializedFile 변환 */
export function fileToSerializedFile(file: File): Promise<SerializedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        name: file.name,
        type: file.type,
      });
    };
    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

/** SerializedFile → File 복원 */
export function dataUrlToFile(serialized: SerializedFile): File {
  const [header, base64] = serialized.dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], serialized.name, { type: serialized.type });
}
