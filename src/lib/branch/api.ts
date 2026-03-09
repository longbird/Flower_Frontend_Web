import type { BranchInfo, BranchProduct, ConsultRequestForm } from './types';

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
