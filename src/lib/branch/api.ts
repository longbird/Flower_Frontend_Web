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

/** 추천 상품 단건 조회 (목록에서 ID 필터) */
export async function fetchRecommendedPhotoById(
  slug: string,
  photoId: number
): Promise<RecommendedPhoto | null> {
  // TODO: 백엔드에 GET /public/branch/{slug}/recommended-photos/{id} 추가 시 교체
  const res = await fetchRecommendedPhotos(slug, { size: 200 });
  return res.data.find((p) => p.id === photoId) ?? null;
}

/**
 * 주문 요청 등록 — FormData (파일 포함). 백엔드가 consult_request id와,
 * 결제 연동이 필요한 경우(amount>0) 함께 생성된 orders.id를 돌려준다.
 */
export async function submitOrderRequest(
  slug: string,
  data: FormData
): Promise<{ ok: boolean; message?: string; id?: number; orderId?: number }> {
  try {
    const res = await fetch(`${API_BASE}/public/branch/${slug}/consult`, {
      method: 'POST',
      body: data,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, message: json.message || '요청에 실패했습니다.' };
    }
    const id = typeof json?.data?.id === 'number' ? json.data.id : undefined;
    const orderId = typeof json?.data?.orderId === 'number' ? json.data.orderId : undefined;
    return { ok: true, id, orderId };
  } catch {
    return { ok: false, message: '네트워크 오류가 발생했습니다.' };
  }
}

/**
 * 상담 요청 등록 (인증 불필요). body에 amount를 포함하면 백엔드가 orders 행을
 * 함께 생성하고 orderId를 응답에 포함한다 (결제 연동용).
 */
export async function submitConsultRequest(
  slug: string,
  form: ConsultRequestForm & { amount?: number }
): Promise<{ ok: boolean; message?: string; id?: number; orderId?: number }> {
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
    const id = typeof json?.data?.id === 'number' ? json.data.id : undefined;
    const orderId = typeof json?.data?.orderId === 'number' ? json.data.orderId : undefined;
    return { ok: true, id, orderId };
  } catch {
    return { ok: false, message: '네트워크 오류가 발생했습니다.' };
  }
}

// ─── Toss payment integration (per-branch credentials) ───────
//
// 백엔드 흐름:
//   1) submitOrderRequest/submitConsultRequest로 consult_request id 확보
//   2) createPayment(consultId)로 clientSecret JSON 수령 (지사별 토스 키 포함)
//   3) 토스 SDK widgets.requestPayment 호출 (orderId 인자에 tossOrderId 사용)
//   4) successUrl 페이지에서 confirmTossPayment 호출 (멱등 보장)

export interface CreatePaymentBody {
  /** consult_request id 또는 orders.id (백엔드 payments.order_id에 들어감) */
  orderId: number;
  amount: number;
  method?: string;
  goodName?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
}

export interface CreatePaymentResponse {
  paymentId: number;
  status: string;
  provider: string;
  checkoutUrl: string | null;
  /** JSON 문자열 (mid/clientKey/env/tossOrderId). 토스 외 PG는 형식 다를 수 있음 */
  clientSecret: string | null;
}

export interface TossClientSecret {
  mid: string;
  clientKey: string;
  env: 'TEST' | 'LIVE';
  tossOrderId: string;
}

export async function createPayment(body: CreatePaymentBody): Promise<CreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/public/payments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, provider: 'toss' }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `결제 생성에 실패했습니다 (HTTP ${res.status}).`);
  }
  return res.json();
}

export function parseTossClientSecret(raw: string): TossClientSecret {
  const parsed = JSON.parse(raw);
  if (!parsed?.clientKey || !parsed?.tossOrderId) {
    throw new Error('clientSecret 형식이 올바르지 않습니다.');
  }
  return parsed;
}

export interface ConfirmTossPaymentBody {
  /** 토스 paymentKey */
  paymentKey: string;
  /** 토스 orderId (RF_<consultId>_<ts>) — 서버가 발급한 값 그대로 */
  orderId: string;
  amount: number;
}

export interface ConfirmTossPaymentResponse {
  ok: true;
  paymentKey?: string;
  alreadyPaid?: boolean;
}

export async function confirmTossPayment(
  body: ConfirmTossPaymentBody,
): Promise<ConfirmTossPaymentResponse> {
  const res = await fetch(`${API_BASE}/public/payments/toss/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let json: { message?: string } = {};
    try {
      json = await res.json();
    } catch {}
    throw new Error(json.message || `결제 확정에 실패했습니다 (HTTP ${res.status}).`);
  }
  return res.json();
}
