/** 지사 공개 정보 */
export interface BranchInfo {
  id: number;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  description?: string;
  serviceAreas?: string;
}

/** 지사 상품 (가격 오버라이드 포함) */
export interface BranchProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  basePrice: number;
  price: number;
  sortOrder: number;
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
  message?: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

/** 상담 요청 생성 폼 */
export interface ConsultRequestForm {
  customerName: string;
  customerPhone: string;
  productCode?: string;
  productName?: string;
  desiredDate?: string;
  message?: string;
}
