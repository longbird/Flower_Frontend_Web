import { api } from './client';
import type { AdminUser, LoginResponse } from '@/lib/types/auth';
import type {
  FloristSummary,
  FloristListResponse,
  FloristPhoto,
  FloristPhotoListResponse,
  FloristPhotoSearchResponse,
} from '@/lib/types/florist';

// ─── Auth ────────────────────────────────────────────────
export async function adminLogin(username: string, password: string) {
  return api<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function adminLogout(refreshToken: string) {
  return api('/admin/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function getMe() {
  return api<AdminUser>('/admin/auth/me');
}

// ─── Florists ────────────────────────────────────────────
export async function listFlorists(params?: {
  page?: number;
  size?: number;
  q?: string;
  branchId?: number;
  status?: string;
  regionCode?: string;
  capabilities?: string[];
  photoGrade?: string;
  isRecommended?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  if (params?.q) sp.set('q', params.q);
  if (params?.branchId) sp.set('branchId', String(params.branchId));
  if (params?.status) sp.set('status', params.status);
  if (params?.regionCode) sp.set('regionCode', params.regionCode);
  if (params?.capabilities?.length) sp.set('capabilities', params.capabilities.join(','));
  if (params?.photoGrade) sp.set('photoGrade', params.photoGrade);
  if (params?.isRecommended) sp.set('isRecommended', 'true');
  const qs = sp.toString();
  return api<FloristListResponse>(`/admin/partners/florists${qs ? `?${qs}` : ''}`);
}

export async function getFlorist(id: string) {
  return api<{ ok: boolean; data: FloristSummary }>(`/admin/partners/florists/${id}`);
}

export async function createFlorist(data: Record<string, unknown>) {
  return api<{ ok: boolean; data: FloristSummary }>('/admin/partners/florists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFlorist(id: string, data: Record<string, unknown>) {
  return api<{ ok: boolean }>(`/admin/partners/florists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateFloristStatus(id: string, status: string) {
  return api<{ ok: boolean }>(`/admin/partners/florists/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteFlorist(id: string) {
  return api(`/admin/partners/florists/${id}`, { method: 'DELETE' });
}

// ─── Florist Photos ──────────────────────────────────────
// ─── Photo Search (All Florists) ─────────────────────────
export async function searchAllPhotos(params?: {
  page?: number;
  size?: number;
  category?: string;
  grade?: string;
  isRecommended?: boolean;
  includeHidden?: boolean;
  memo?: string;
  serviceArea?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  if (params?.category) sp.set('category', params.category);
  if (params?.grade) sp.set('grade', params.grade);
  if (params?.isRecommended) sp.set('isRecommended', 'true');
  if (params?.includeHidden) sp.set('includeHidden', 'true');
  if (params?.memo) sp.set('memo', params.memo);
  if (params?.serviceArea) sp.set('serviceArea', params.serviceArea);
  const qs = sp.toString();
  return api<FloristPhotoSearchResponse>(
    `/admin/florists/all-photos${qs ? `?${qs}` : ''}`
  );
}

// ─── Florist Photos ──────────────────────────────────────
export async function getFloristPhotos(
  floristId: string,
  params?: { category?: string; includeHidden?: boolean }
) {
  const sp = new URLSearchParams();
  if (params?.category) sp.set('category', params.category);
  if (params?.includeHidden !== undefined) {
    sp.set('includeHidden', String(params.includeHidden));
  }
  const qs = sp.toString();
  return api<FloristPhotoListResponse>(
    `/admin/florists/${floristId}/gallery${qs ? `?${qs}` : ''}`
  );
}

export async function uploadFloristPhoto(
  floristId: string,
  file: File,
  meta?: {
    category?: string;
    grade?: string;
    isRecommended?: boolean;
    costPrice?: number;
    sellingPrice?: number;
    memo?: string;
    description?: string;
    internalMemo?: string;
  }
) {
  const formData = new FormData();
  formData.append('file', file);
  if (meta?.category) formData.append('category', meta.category);
  if (meta?.grade) formData.append('grade', meta.grade);
  if (meta?.isRecommended) formData.append('isRecommended', 'true');
  if (meta?.costPrice) formData.append('costPrice', String(meta.costPrice));
  if (meta?.sellingPrice) formData.append('sellingPrice', String(meta.sellingPrice));
  if (meta?.memo) formData.append('memo', meta.memo);
  if (meta?.description) formData.append('description', meta.description);
  if (meta?.internalMemo) formData.append('internalMemo', meta.internalMemo);

  return api<{ data: FloristPhoto }>(`/admin/florists/${floristId}/gallery`, {
    method: 'POST',
    body: formData,
  });
}

export async function updateFloristPhoto(
  floristId: string,
  photoId: number,
  data: Record<string, unknown>
) {
  return api<{ data: FloristPhoto }>(
    `/admin/florists/${floristId}/gallery/${photoId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteFloristPhoto(floristId: string, photoId: number) {
  return api(`/admin/florists/${floristId}/gallery/${photoId}`, {
    method: 'DELETE',
  });
}

export async function removeFloristPhotoText(
  floristId: string,
  photoId: number,
  maskBlob: Blob,
  mode: 'preview' | 'apply' = 'preview'
) {
  const formData = new FormData();
  formData.append('mask', maskBlob, 'mask.png');
  return api<{ ok: boolean; previewUrl?: string; message?: string }>(
    `/admin/florists/${floristId}/gallery/${photoId}/remove-text?mode=${mode}`,
    {
      method: 'POST',
      body: formData,
    }
  );
}

export async function rotateFloristPhoto(
  floristId: string,
  photoId: number,
  angle: number
) {
  return api<{ ok: boolean; message: string; fileUrl?: string }>(
    `/admin/florists/${floristId}/gallery/${photoId}/rotate`,
    {
      method: 'POST',
      body: JSON.stringify({ angle }),
    }
  );
}

// ─── Service Areas ──────────────────────────────────────
export interface SidoItem {
  id: number;
  name: string;
}

export interface GugunItem {
  id: number;
  name: string;
  sidoId: number;
}

export async function listFloristSidos(): Promise<SidoItem[]> {
  const res = await api<{ ok: boolean; data: SidoItem[] }>('/admin/partners/florists/sidos');
  return res.data;
}

export async function listFloristGuguns(sidoId: number): Promise<GugunItem[]> {
  const res = await api<{ ok: boolean; data: GugunItem[] }>(`/admin/partners/florists/sidos/${sidoId}/guguns`);
  return res.data;
}

export async function addFloristServiceArea(
  floristId: string,
  area: string,
  gugunId?: number
) {
  return api(`/admin/partners/florists/${floristId}/service-areas`, {
    method: 'POST',
    body: JSON.stringify({ area, ...(gugunId ? { gugunId } : {}) }),
  });
}

export async function removeFloristServiceArea(
  floristId: string,
  area: string
) {
  return api(`/admin/partners/florists/${floristId}/service-areas`, {
    method: 'DELETE',
    body: JSON.stringify({ area }),
  });
}

// ─── Orders ─────────────────────────────────────────────
export async function listOrders(params?: {
  page?: number;
  size?: number;
  q?: string;
  status?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  if (params?.q) sp.set('q', params.q);
  if (params?.status) sp.set('status', params.status);
  const qs = sp.toString();
  return api<{ items: any[]; total: number; page: number; size: number }>(
    `/admin/orders${qs ? `?${qs}` : ''}`
  );
}

export async function getOrder(id: number) {
  return api<any>(`/admin/orders/${id}`);
}

// TODO: 백엔드 API 확인 후 body 타입을 OrderRegisterForm 기반으로 확정
export async function createOrder(data: Record<string, unknown>) {
  return api<{ ok: boolean; data: any }>('/admin/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Order Public Link (고객 확인 URL) ──────────────────────
export interface OrderPublicLinkInfo {
  shortCode: string | null;
  shortUrl: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  reactivatedAt: string | null;
  reactivatedBy: string | null;
  lastSentAt: string | null;
  sendCount: number;
  isActive: boolean;
}

export async function getOrderPublicLink(orderId: number) {
  return api<{ ok: boolean; data?: OrderPublicLinkInfo; message?: string }>(
    `/admin/orders/${orderId}/public-link`,
  );
}

export async function reactivateOrderPublicLink(orderId: number) {
  return api<{ ok: boolean; message?: string }>(
    `/admin/orders/${orderId}/public-link/reactivate`,
    { method: 'POST' },
  );
}

export async function resendOrderPublicLink(orderId: number) {
  return api<{ ok: boolean; shortCode?: string; shortUrl?: string; message?: string }>(
    `/admin/orders/${orderId}/public-link/resend`,
    { method: 'POST' },
  );
}

export async function deactivateOrderPublicLink(orderId: number) {
  return api<{ ok: boolean; message?: string }>(
    `/admin/orders/${orderId}/public-link/deactivate`,
    { method: 'POST' },
  );
}

// ─── Consult Request Public Link (지사 상담요청 고객 확인 URL) ─
export async function getConsultRequestPublicLink(consultId: number) {
  return api<{ ok: boolean; data?: OrderPublicLinkInfo; message?: string }>(
    `/admin/orders/consult-requests/${consultId}/public-link`,
  );
}

export async function reactivateConsultRequestPublicLink(consultId: number) {
  return api<{ ok: boolean; message?: string }>(
    `/admin/orders/consult-requests/${consultId}/public-link/reactivate`,
    { method: 'POST' },
  );
}

export async function resendConsultRequestPublicLink(consultId: number) {
  return api<{ ok: boolean; shortCode?: string; shortUrl?: string; message?: string }>(
    `/admin/orders/consult-requests/${consultId}/public-link/resend`,
    { method: 'POST' },
  );
}

export async function deactivateConsultRequestPublicLink(consultId: number) {
  return api<{ ok: boolean; message?: string }>(
    `/admin/orders/consult-requests/${consultId}/public-link/deactivate`,
    { method: 'POST' },
  );
}

// ─── Branch Wallets (충전금) ─────────
export type WalletTxType = 'CHARGE' | 'REFUND' | 'ORDER_FEE' | 'SMS_FEE' | 'ADJUST';

export interface WalletSummary {
  branchId: number;
  branchName?: string;
  balance: number;
  minBalance: number;
  isLow: boolean;
  lowAlertSentAt: string | null;
  updatedAt: string | null;
}

export interface WalletConfig {
  branchId: number;
  smsFee: number;
  lmsFee: number;
  orderFee: number;
  minBalance: number;
  smsFeeOverride: number | null;
  lmsFeeOverride: number | null;
  orderFeeOverride: number | null;
  minBalanceOverride: number | null;
}

export interface WalletTransaction {
  id: number;
  branchId: number;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  refType: string | null;
  refId: string | null;
  memo: string | null;
  actorType: 'ADMIN' | 'SYSTEM' | 'WEBHOOK' | null;
  actorId: number | null;
  createdAt: string;
}

export interface WalletTxListResponse {
  items: WalletTransaction[];
  total: number;
  page: number;
  size: number;
}

export async function listBranchWallets() {
  return api<{ data: WalletSummary[] }>('/admin/wallets');
}

export async function getBranchWallet(branchId: number) {
  return api<{ summary: WalletSummary; config: WalletConfig }>(`/admin/wallets/${branchId}`);
}

export async function listBranchWalletTransactions(
  branchId: number,
  params: { type?: WalletTxType | ''; page?: number; size?: number } = {},
) {
  const sp = new URLSearchParams();
  if (params.type) sp.set('type', params.type);
  if (params.page) sp.set('page', String(params.page));
  if (params.size) sp.set('size', String(params.size));
  const qs = sp.toString();
  return api<WalletTxListResponse>(
    `/admin/wallets/${branchId}/transactions${qs ? `?${qs}` : ''}`,
  );
}

export async function chargeBranchWallet(branchId: number, amount: number, memo?: string) {
  return api<{ ok: true; transaction: WalletTransaction }>(
    `/admin/wallets/${branchId}/charge`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, memo }),
    },
  );
}

export async function refundBranchWallet(branchId: number, amount: number, memo?: string) {
  return api<{ ok: true; transaction: WalletTransaction }>(
    `/admin/wallets/${branchId}/refund`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, memo }),
    },
  );
}

export interface UpdateWalletConfigBody {
  smsFee?: number | null;
  lmsFee?: number | null;
  orderFee?: number | null;
  minBalanceOverride?: number | null;
}

export async function updateBranchWalletConfig(branchId: number, body: UpdateWalletConfigBody) {
  return api<{ ok: true; config: WalletConfig }>(
    `/admin/wallets/${branchId}/config`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

// ─── Branch Payment Credentials (Toss per-branch) ─────────
export type PaymentProvider = 'toss';
export type PaymentEnv = 'TEST' | 'LIVE';

export interface BranchPaymentCredential {
  id: number;
  branchId: number;
  provider: PaymentProvider;
  env: PaymentEnv;
  mid: string;
  clientKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  clientKeyMasked: string;
}

export async function listBranchPaymentCredentials(branchId: number) {
  return api<BranchPaymentCredential[]>(`/admin/branches/${branchId}/payment-credentials`);
}

export interface UpsertBranchPaymentCredentialBody {
  provider: PaymentProvider;
  env: PaymentEnv;
  mid: string;
  clientKey: string;
  secretKey: string;
  isActive?: boolean;
}

export async function upsertBranchPaymentCredential(
  branchId: number,
  body: UpsertBranchPaymentCredentialBody,
) {
  return api<{ ok: true }>(`/admin/branches/${branchId}/payment-credentials`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deactivateBranchPaymentCredential(
  branchId: number,
  body: { provider: PaymentProvider; env: PaymentEnv },
) {
  return api<{ ok: true }>(`/admin/branches/${branchId}/payment-credentials`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
