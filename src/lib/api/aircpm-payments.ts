import { api } from './client';

export interface AircpmBranch {
  brchCd: string;
  name: string | null;
  cardPaymentEnabled: boolean;
  copyApps: boolean[];   // 5슬롯: 0=AUTO,1=D5,2=XE4,3=ICON,4=D2
  pasteApps: boolean[];
}
export interface AircpmTossCredential {
  brchCd: string;
  env: 'TEST' | 'LIVE';
  mid: string;
  clientKey: string;
  isActive: boolean;
}
export interface AircpmCustomer {
  id: number;
  brchCd: string;
  customerPhone: string;
  name: string | null;
  memo: string | null;
}
export interface AircpmCard {
  id: number;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  cardType: string | null;
  registeredAt: string;
}
export interface AircpmPayment {
  id: number;
  amount: number;
  status: 'DONE' | 'CANCELED' | 'FAILED';
  createdAt: string;
}
export interface AircpmCustomerDetail {
  customer: AircpmCustomer;
  cards: AircpmCard[];
  payments: AircpmPayment[];
}

// 쿼리스트링 헬퍼 — brchCd가 있으면 추가(super), 없으면 생략(지사 관리자)
function withBrch(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function listAircpmBranches(): Promise<AircpmBranch[]> {
  return api<AircpmBranch[]>('/admin/aircpm/branches');
}

export async function upsertAircpmBranch(body: {
  brchCd: string; name?: string; cardPaymentEnabled?: boolean;
  copyApps?: boolean[]; pasteApps?: boolean[];
}): Promise<{ ok: true }> {
  return api('/admin/aircpm/branches', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function listAircpmTossCredentials(brchCd: string): Promise<AircpmTossCredential[]> {
  return api(`/admin/aircpm/branches/${encodeURIComponent(brchCd)}/toss-credentials`);
}

export async function upsertAircpmTossCredentials(brchCd: string, body: {
  env: 'TEST' | 'LIVE'; mid: string; clientKey: string; secretKey: string; isActive?: boolean;
}): Promise<{ ok: true }> {
  return api(`/admin/aircpm/branches/${encodeURIComponent(brchCd)}/toss-credentials`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function listAircpmCustomers(p: { brchCd?: string; q?: string }): Promise<{ customers: AircpmCustomer[] }> {
  return api(`/admin/aircpm/customers${withBrch({ brchCd: p.brchCd, q: p.q })}`);
}

export async function getAircpmCustomer(id: number, p: { brchCd?: string }): Promise<AircpmCustomerDetail> {
  return api(`/admin/aircpm/customers/${id}${withBrch({ brchCd: p.brchCd })}`);
}

export async function updateAircpmCustomer(id: number, p: { brchCd?: string }, body: {
  name?: string; memo?: string;
}): Promise<{ ok: true }> {
  return api(`/admin/aircpm/customers/${id}${withBrch({ brchCd: p.brchCd })}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deactivateAircpmCard(cardId: number, p: { brchCd?: string }): Promise<{ ok: true }> {
  return api(`/admin/aircpm/cards/${cardId}${withBrch({ brchCd: p.brchCd })}`, { method: 'DELETE' });
}

export async function cancelAircpmPayment(paymentId: number, p: { brchCd?: string }, reason?: string): Promise<{ paymentId: number; status: string }> {
  return api(`/admin/aircpm/payments/${paymentId}/cancel${withBrch({ brchCd: p.brchCd })}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelReason: reason }),
  });
}
