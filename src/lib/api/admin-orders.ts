import { api } from '@/lib/api/client';
import type { ProofItem } from '@/lib/types/partner';

export type ProofType = 'DELIVERY_PHOTO' | 'SCENE_PHOTO';

export interface AdminUploadProofResponse {
  ok: boolean;
  proofId: number;
  fileUrl: string;
}

export interface RecipientInfoPayload {
  name: string;
  receivedAt: string;
  relationship: string;
}

/**
 * Admin 증빙 사진 업로드 (multipart/form-data 단일 호출).
 * 서버: POST /admin/orders/:id/proofs/upload (FileInterceptor + StorageService)
 */
export async function uploadAdminProof(
  orderId: number,
  file: File,
  proofType: ProofType,
): Promise<AdminUploadProofResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('proofType', proofType);
  return api<AdminUploadProofResponse>(`/admin/orders/${orderId}/proofs/upload`, {
    method: 'POST',
    body: formData,
  });
}

export async function listAdminProofs(
  orderId: number,
): Promise<{ ok: boolean; items: ProofItem[] }> {
  return api<{ ok: boolean; items: ProofItem[] }>(`/admin/orders/${orderId}/proofs`);
}

export async function deleteAdminProof(
  orderId: number,
  proofId: number,
): Promise<{ ok: boolean; deletedId: number }> {
  return api<{ ok: boolean; deletedId: number }>(
    `/admin/orders/${orderId}/proofs/${proofId}`,
    { method: 'DELETE' },
  );
}

export async function updateAdminRecipientInfo(
  orderId: number,
  payload: RecipientInfoPayload,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/orders/${orderId}/recipient-info`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
