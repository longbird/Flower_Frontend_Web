/**
 * 고객 확인 URL (/o/[code]) API 헬퍼
 *
 * 백엔드의 /public/order-link/{token} 엔드포인트를 호출.
 * token 위치에는 단축 코드(8자) 또는 레거시 긴 토큰(48자) 모두 사용 가능.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ? '/api/proxy' : '';

export interface DeliveryPhoto {
  id: number;
  url: string;
  createdAt: string;
}

export interface CustomerOrderView {
  orderId: number;
  editable: boolean;
  order: {
    orderNo?: string | null;
    orderType?: string | null;
    receiverName: string;
    receiverPhone: string;
    deliveryAddress1: string;
    deliveryAddress2?: string | null;
    deliveryMemo?: string | null;
    cardMessage?: string | null;
    ribbonRight?: string | null;
    memo?: string | null;
    desiredDate?: string | null;
    desiredTimeSlot?: string | null;
    desiredDatetime?: string | null;
    status: string;
    amountTotal?: number | null;
    createdAt?: string | null;
  };
  deliveryPhotos?: DeliveryPhoto[];
}

/**
 * 고객 주문 확인 페이지 데이터 조회.
 * 404/410 등 만료/미존재는 null 반환.
 */
export async function fetchCustomerOrderView(
  code: string,
): Promise<{ status: 'ok'; data: CustomerOrderView } | { status: 'not_found' } | { status: 'error'; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/order-link/${encodeURIComponent(code)}`, {
      cache: 'no-store',
    });
    if (res.status === 404 || res.status === 410) {
      return { status: 'not_found' };
    }
    if (!res.ok) {
      return { status: 'error', message: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!json?.ok || !json?.data) {
      return { status: 'not_found' };
    }
    return { status: 'ok', data: json.data as CustomerOrderView };
  } catch (e: any) {
    return { status: 'error', message: e?.message || 'network error' };
  }
}

/**
 * 배달 사진 원본 URL 해석 (상대경로 → 절대 프록시 경로).
 */
export function resolvePhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // 상대경로는 백엔드 uploads 경로로 매핑
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base) {
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  }
  return url;
}
