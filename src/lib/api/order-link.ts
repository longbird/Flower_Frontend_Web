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
  branchName?: string | null;
  branchPhone?: string | null;
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
    productName?: string | null;
    senderName?: string | null;
    invoiceMethod?: string | null;
    funeralHall?: string | null;
    hallName?: string | null;
    roomNumber?: string | null;
    recipientActualName?: string | null;
    receivedAt?: string | null;
    recipientRelationship?: string | null;
    customerConfirmedAt?: string | null;
  };
  deliveryPhotos: DeliveryPhoto[];
  scenePhotos: DeliveryPhoto[];
}

export interface ConfirmOrderResponse {
  ok: boolean;
  customerConfirmedAt: string;
}

/**
 * 고객 주문 확인 페이지 데이터 조회.
 */
export async function fetchCustomerOrderView(
  code: string,
): Promise<
  | { status: 'ok'; data: CustomerOrderView }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
> {
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
    const data = json.data as CustomerOrderView;
    return {
      status: 'ok',
      data: {
        ...data,
        deliveryPhotos: data.deliveryPhotos ?? [],
        scenePhotos: data.scenePhotos ?? [],
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'network error';
    return { status: 'error', message };
  }
}

/**
 * 고객이 주문 내용에 동의하고 확인 완료 처리.
 * 멱등: 이미 확인 완료된 경우 기존 timestamp를 반환.
 */
export async function confirmCustomerOrder(code: string): Promise<ConfirmOrderResponse> {
  const res = await fetch(`${API_BASE}/public/order-link/${encodeURIComponent(code)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = String(data.message);
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as ConfirmOrderResponse;
}

/**
 * 배달 사진 원본 URL 해석 (상대경로 → 절대 프록시 경로).
 */
export function resolvePhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base) {
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  }
  return url;
}
