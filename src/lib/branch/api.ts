import type { BranchInfo, BranchProduct, RecommendedPhoto, PaginatedResponse, ConsultRequestForm } from './types';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_BASE = RAW_API_BASE ? '/api/proxy' : '';

/** 지사 공개 정보 조회 (인증 불필요) */
export async function fetchBranchInfo(slug: string): Promise<BranchInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** 지사 상품 목록 조회 (인증 불필요) */
export async function fetchBranchProducts(slug: string): Promise<BranchProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}/products`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

/** 추천 상품(화원 사진) 목록 조회 (인증 불필요) */
export async function fetchRecommendedPhotos(
  slug: string,
  params?: { page?: number; size?: number; category?: string; serviceArea?: string }
): Promise<PaginatedResponse<RecommendedPhoto>> {
  try {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.size) sp.set('size', String(params.size));
    if (params?.category) sp.set('category', params.category);
    if (params?.serviceArea) sp.set('serviceArea', params.serviceArea);
    const qs = sp.toString();
    const res = await fetch(`${API_BASE}/public/branch/${slug}/recommended-photos${qs ? `?${qs}` : ''}`);
    if (!res.ok) return { data: [], total: 0, page: 1, size: params?.size ?? 40 };
    const json = await res.json();
    // 하위 호환: 백엔드가 배열을 반환하면 PaginatedResponse로 래핑
    if (Array.isArray(json.data)) {
      return {
        data: json.data,
        total: json.total ?? json.data.length,
        page: json.page ?? params?.page ?? 1,
        size: json.size ?? params?.size ?? 40,
      };
    }
    return json;
  } catch {
    return { data: [], total: 0, page: 1, size: params?.size ?? 40 };
  }
}

/** SMS 인증번호 발송 */
export async function sendPhoneVerification(
  slug: string,
  phone: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}/verify/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, message: json.message || '인증번호 발송에 실패했습니다.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: '네트워크 오류가 발생했습니다.' };
  }
}

/** SMS 인증번호 확인 */
export async function verifyPhoneCode(
  slug: string,
  phone: string,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}/verify/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, message: json.message || '인증번호가 올바르지 않습니다.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: '네트워크 오류가 발생했습니다.' };
  }
}

/** 상담 요청 등록 (인증 불필요) */
export async function submitConsultRequest(
  slug: string,
  form: ConsultRequestForm
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}/consult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, message: json.message || '요청에 실패했습니다.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: '네트워크 오류가 발생했습니다.' };
  }
}
