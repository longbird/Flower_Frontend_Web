import { api } from './client';
import type { JisamapRule } from '@/lib/aircpm/jisamap';

/**
 * 지사 콜패스 매핑 관리자 API.
 *
 * ★비-super 는 brchCd 를 아예 보내지 않는다 — 서버가 자기 지사를 강제한다.
 *   (대시보드/통계와 같은 규칙. 클라이언트가 지사를 정하는 순간 위조 경로가 생긴다.)
 */

export interface AdminJisamapResponse {
  brchCd: string;
  isSuper: boolean;
  version: number;
  rules: JisamapRule[];
  createdAt: string | null;
  createdBy: number | null;
  note: string | null;
}

export interface JisamapHistoryItem {
  version: number;
  isActive: boolean;
  /** 되돌리기 전에 내용을 확인할 수 있도록 서버가 함께 내려준다. */
  rules: JisamapRule[];
  createdAt: string | null;
  createdBy: number | null;
  note: string | null;
}

export interface JisamapHistoryResponse {
  brchCd: string;
  items: JisamapHistoryItem[];
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function getJisamap(brchCd?: string): Promise<AdminJisamapResponse> {
  return api<AdminJisamapResponse>(`/admin/aircpm/config/jisamap${qs({ brchCd })}`);
}

export async function getJisamapHistory(
  brchCd?: string,
  limit = 50,
): Promise<JisamapHistoryResponse> {
  return api<JisamapHistoryResponse>(
    `/admin/aircpm/config/jisamap/history${qs({ brchCd, limit })}`,
  );
}

export async function updateJisamap(body: {
  brchCd?: string;
  rules: JisamapRule[];
  note?: string;
}): Promise<{ ok: true; version: number; warnings: string[] }> {
  return api(`/admin/aircpm/config/jisamap`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function revertJisamap(body: {
  brchCd?: string;
  toVersion?: number;
}): Promise<{ ok: true; version: number; revertedFrom: number }> {
  return api(`/admin/aircpm/config/jisamap/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
