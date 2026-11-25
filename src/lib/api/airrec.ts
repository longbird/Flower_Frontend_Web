import { api } from './client';

// ─── 화자 분리 녹취 PC 인증 (슈퍼 관리자 전용) ─────────────────────

export type AirrecCertStatus = 'pending' | 'approved' | 'rejected';

export interface AirrecCert {
  id: number;
  siteName: string;
  phone: string | null;
  computerName: string | null;
  /** 빈 값이면 하드웨어 일련번호를 못 읽어 MAC 만으로 등록된 PC. */
  serial: string;
  macAddress: string;
  publicIp: string | null;
  appVersion: string | null;
  status: AirrecCertStatus;
  requestedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  rejectReason: string | null;
  lastCheckedAt: string | null;
}

export interface AirrecCertListResponse {
  items: AirrecCert[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAirrecCertsParams {
  status?: AirrecCertStatus | 'all';
  q?: string;
  page?: number;
  limit?: number;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function listAirrecCerts(params: ListAirrecCertsParams = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  return api<AirrecCertListResponse>(`/admin/airrec/cert/requests?${query.toString()}`);
}

export async function approveAirrecCert(id: number) {
  return api<{ ok: boolean }>(`/admin/airrec/cert/${id}/approve`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  });
}

export async function rejectAirrecCert(id: number, reason?: string) {
  return api<{ ok: boolean }>(`/admin/airrec/cert/${id}/reject`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

export async function revokeAirrecCert(id: number, reason?: string) {
  return api<{ ok: boolean }>(`/admin/airrec/cert/${id}/revoke`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
