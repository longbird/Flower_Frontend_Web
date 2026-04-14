import { usePartnerAuthStore } from '@/lib/auth/partner-store';
import type {
  PartnerStep1Response,
  PartnerStep2Response,
  PartnerSimpleLoginResponse,
  PartnerOrder,
  PartnerOrderDetail,
  PresignResponse,
  ProofItem,
} from '@/lib/types/partner';

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_BASE_URL = RAW_API_BASE ? '/api/proxy' : '';

async function partnerApi<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = usePartnerAuthStore.getState();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    usePartnerAuthStore.getState().logout();
    throw new Error('세션이 만료되었습니다.');
  }

  if (!res.ok) {
    let data: unknown;
    try { data = await res.json(); } catch {}
    const msg = data && typeof data === 'object' && 'message' in data
      ? String((data as Record<string, unknown>).message)
      : res.statusText;
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function idempotencyKey() {
  return crypto.randomUUID();
}

// ─── Auth ────────────────────────────────────────────────
export async function partnerLoginStep1(accountId: string, password: string) {
  return partnerApi<PartnerStep1Response>('/partner/auth/login/step1', {
    method: 'POST',
    body: JSON.stringify({ accountId, password, deviceFingerprint: 'web' }),
  });
}

export async function partnerLoginStep2(sessionToken: string, verificationCode: string) {
  return partnerApi<PartnerStep2Response>('/partner/auth/login/step2', {
    method: 'POST',
    body: JSON.stringify({ sessionToken, verificationCode }),
  });
}

export async function partnerSimpleLogin(accountId: string, password: string) {
  return partnerApi<PartnerSimpleLoginResponse>('/partner/auth/login', {
    method: 'POST',
    body: JSON.stringify({ accountId, password }),
  });
}

// ─── Orders ──────────────────────────────────────────────
export async function getAssignedOrders(status?: string, limit = 50) {
  const sp = new URLSearchParams();
  if (status) sp.set('status', status);
  sp.set('limit', String(limit));
  return partnerApi<{ ok: boolean; orders: PartnerOrder[] }>(
    `/partner/orders/assigned?${sp.toString()}`
  );
}

export async function getPartnerOrderDetail(orderId: number) {
  return partnerApi<PartnerOrderDetail>(`/partner/orders/${orderId}`);
}

export async function acceptOrder(orderId: number) {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/accept`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({}),
  });
}

export async function rejectOrder(orderId: number, reasonCode: string, reasonText: string) {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/reject`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reasonCode, reasonText }),
  });
}

export async function updateOrderStatus(orderId: number, toStatus: string) {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ toStatus }),
  });
}

// ─── Evidence Upload ─────────────────────────────────────
export async function presignProof(
  orderId: number,
  fileName: string,
  contentType: string,
  size: number
) {
  return partnerApi<PresignResponse>(`/partner/orders/${orderId}/proofs/presign`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ fileName, contentType, size }),
  });
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  headers?: Record<string, string>
) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('파일 업로드 실패');
}

export async function completeProof(
  orderId: number,
  proofType: string,
  fileUrl: string,
  fileKey?: string
) {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/proofs/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ proofType, fileUrl, ...(fileKey ? { fileKey } : {}) }),
  });
}

export async function listProofs(orderId: number) {
  return partnerApi<{ ok: boolean; items: ProofItem[] }>(
    `/partner/orders/${orderId}/proofs`
  );
}

// ─── Recipient Info ──────────────────────────────────────
export interface PartnerRecipientInfoPayload {
  name: string;
  receivedAt: string;
  relationship: string;
}

export async function updatePartnerRecipientInfo(
  orderId: number,
  payload: PartnerRecipientInfoPayload,
): Promise<{ ok: boolean }> {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/recipient-info`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
