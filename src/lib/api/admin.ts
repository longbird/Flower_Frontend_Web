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
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  if (params?.q) sp.set('q', params.q);
  if (params?.branchId) sp.set('branchId', String(params.branchId));
  if (params?.status) sp.set('status', params.status);
  if (params?.regionCode) sp.set('regionCode', params.regionCode);
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
  memo?: string;
  serviceArea?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.size) sp.set('size', String(params.size));
  if (params?.category) sp.set('category', params.category);
  if (params?.grade) sp.set('grade', params.grade);
  if (params?.isRecommended) sp.set('isRecommended', 'true');
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

// ─── Service Areas ──────────────────────────────────────
export async function addFloristServiceArea(
  floristId: string,
  area: string,
  sido?: string
) {
  return api(`/admin/partners/florists/${floristId}/service-areas`, {
    method: 'POST',
    body: JSON.stringify({ area, ...(sido ? { sido } : {}) }),
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
