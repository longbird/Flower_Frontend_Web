import { useBranchAuthStore } from './auth-store';
import type { ConsultRequest } from './types';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_BASE = RAW_API_BASE ? '/api/proxy' : '';

/** 지사 관리자 로그인 (같은 admin auth 엔드포인트 사용) */
export async function branchAdminLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || '로그인에 실패했습니다.');
  }

  const data = await res.json();

  // BRANCH_ADMIN 역할 체크
  const role = data.admin?.role;
  if (role !== 'BRANCH_ADMIN') {
    throw new Error('지사 관리자 계정이 아닙니다.');
  }

  // API는 admin.organization.id 로 반환하지만 store는 organizationId를 기대
  // 호환성을 위해 매핑
  if (data.admin && data.admin.organization && !data.admin.organizationId) {
    data.admin.organizationId = data.admin.organization.id;
  }

  return data;
}

/** 인증된 지사 API 호출 */
async function branchApi<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken, logout } = useBranchAuthStore.getState();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    throw new Error('인증이 만료되었습니다.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || '요청에 실패했습니다.');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** 내 지사 정보 조회 */
export interface MyBranchInfo {
  id: number;
  name: string;
  code?: string;
  businessRegistrationNo?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  serviceAreas?: string;
  virtualAccountBank?: string;
  virtualAccountNumber?: string;
  defaultSurcharge?: number;
  allowFloristSearch?: boolean;
  homepageDesign?: string;
}

export async function fetchMyBranchInfo() {
  return branchApi<{ ok: boolean; data: MyBranchInfo }>('/branch/me');
}

/** 내 지사 정보 수정 */
export async function updateMyBranchInfo(body: {
  businessRegistrationNo?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  virtualAccountBank?: string;
  virtualAccountNumber?: string;
  defaultSurcharge?: number;
  homepageDesign?: string;
}) {
  return branchApi<{ ok: boolean; data: MyBranchInfo }>('/branch/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 상담 요청 목록 조회 */
export async function fetchConsultRequests(params?: {
  status?: string;
  page?: number;
  size?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  const qs = sp.toString();
  return branchApi<{
    ok: boolean;
    data: ConsultRequest[];
    total: number;
    page: number;
    size: number;
  }>(`/branch/consults${qs ? `?${qs}` : ''}`);
}

/** 상담 요청 상태 변경 */
export async function updateConsultRequestStatus(id: number, status: string) {
  return branchApi<{ ok: boolean; data: { id: number; status: string } }>(
    `/branch/consults/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

/** 지사 상품 목록 조회 (관리자) */
export interface BranchProductSetting {
  id: number;
  name: string;
  sku: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  basePrice: number;
  isVisible: boolean;
  sellingPrice: number | null;
  surcharge: number;
}

export async function fetchBranchProducts() {
  return branchApi<{ ok: boolean; data: BranchProductSetting[] }>('/branch/products');
}

/** 지사 상품 설정 변경 (관리자) */
export async function updateBranchProduct(
  productId: number,
  body: { isVisible?: boolean; sellingPrice?: number | null; surcharge?: number }
) {
  return branchApi<{ ok: boolean }>(`/branch/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** 지사 상품 추가금 일괄 설정 */
export async function bulkUpdateBranchSurcharge(surcharge: number) {
  return branchApi<{ ok: boolean; updated: number }>('/branch/products/bulk-surcharge', {
    method: 'PATCH',
    body: JSON.stringify({ surcharge }),
  });
}

/** 지사 추가 요금 목록 조회 (관리자) */
export interface BranchSurcharge {
  id: number;
  surchargeType: string;
  name: string;
  amount: number;
}

export async function fetchBranchSurcharges() {
  return branchApi<{ ok: boolean; data: BranchSurcharge[] }>('/branch/surcharges');
}
