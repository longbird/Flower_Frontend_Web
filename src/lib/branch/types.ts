/** 지사 공개 정보 */
export interface BranchInfo {
  id: number;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  description?: string;
  serviceAreas?: string;
  virtualAccountBank?: string;
  virtualAccountNumber?: string;
  homepageDesign?: string;
  /** 주문 시 전화번호 인증 필수 여부 (지사별 설정) */
  requirePhoneVerification?: boolean;
  /** 온라인 결제 사용 여부 (지사별 설정) */
  enableOnlinePayment?: boolean;
}

/** 지사 상품 (가격 오버라이드 포함) */
export interface BranchProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  grade?: string;
  basePrice: number;
  price: number;
  surcharge: number;
  sortOrder: number;
  serviceAreas?: string | null;
}

/** 추천 상품 (화원 사진 기반) */
export interface RecommendedPhoto {
  id: number;
  category?: string;
  grade?: string;
  name?: string;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  isRecommended?: boolean;
  floristName?: string;
  floristPhone?: string;
  serviceAreas?: string | null;
}

/** 페이지네이션 응답 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

/** 상담 요청 */
export interface ConsultRequest {
  id: number;
  branchId: number;
  customerName: string;
  customerPhone: string;
  productCode?: string;
  productName?: string;
  desiredDate?: string;
  deliveryPurpose?: string;
  deliveryTime?: string;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  ribbonText?: string;
  memo?: string;
  invoiceType?: string;
  cashReceiptPhone?: string;
  ribbonImagePath?: string;
  businessRegPath?: string;
  message?: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

/** 배송 용도 */
export type DeliveryPurpose = '까지' | '예식' | '장례' | '행사';

/** 증빙 타입 */
export type InvoiceType = 'NONE' | 'INVOICE' | 'CASH_RECEIPT';

/** 상담 요청 생성 폼 */
export interface ConsultRequestForm {
  customerName: string;
  customerPhone: string;
  productCode?: string;
  productName?: string;
  desiredDate?: string;
  message?: string;
}
