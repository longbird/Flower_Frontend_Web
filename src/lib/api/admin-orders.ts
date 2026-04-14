import { api } from '@/lib/api/client';
import type { ProofItem } from '@/lib/types/partner';

export type ProofType = 'DELIVERY_PHOTO' | 'SCENE_PHOTO';

export interface AdminPresignRequest {
  fileName: string;
  contentType: string;
  size: number;
  proofType: ProofType;
}

export interface AdminPresignResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
  headers?: Record<string, string>;
}

export interface AdminCompleteProofRequest {
  proofType: ProofType;
  fileUrl: string;
  fileKey?: string;
}

export interface RecipientInfoPayload {
  name: string;
  receivedAt: string;
  relationship: string;
}

function idempotencyKey() {
  return crypto.randomUUID();
}

export async function presignAdminProof(
  orderId: number,
  payload: AdminPresignRequest,
): Promise<AdminPresignResponse> {
  return api<AdminPresignResponse>(`/admin/orders/${orderId}/proofs/presign`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  });
}

export async function completeAdminProof(
  orderId: number,
  payload: AdminCompleteProofRequest,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/orders/${orderId}/proofs/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  });
}

export async function listAdminProofs(
  orderId: number,
): Promise<{ ok: boolean; items: ProofItem[] }> {
  return api<{ ok: boolean; items: ProofItem[] }>(`/admin/orders/${orderId}/proofs`);
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

/**
 * presigned URL로 파일 PUT 업로드.
 * partner.ts의 uploadToPresignedUrl과 동일 로직이지만 의존성 분리 목적으로 복사.
 */
export async function uploadAdminProofFile(
  uploadUrl: string,
  file: File,
  headers?: Record<string, string>,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('파일 업로드 실패');
}
