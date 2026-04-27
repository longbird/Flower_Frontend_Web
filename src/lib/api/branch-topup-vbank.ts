import { api } from './client';
import type { BranchTopupVbank } from '@/lib/payments/innopay-types';

export async function getBranchTopupVbank(branchId: number): Promise<BranchTopupVbank | null> {
  return api<BranchTopupVbank | null>(`/admin/branches/${branchId}/topup-vbank`, { method: 'GET' });
}

export async function issueBranchTopupVbank(branchId: number, holderName: string): Promise<BranchTopupVbank> {
  return api<BranchTopupVbank>(`/admin/branches/${branchId}/topup-vbank`, {
    method: 'POST',
    body: JSON.stringify({ holderName }),
  });
}

export async function reissueBranchTopupVbank(branchId: number, holderName: string): Promise<BranchTopupVbank> {
  return api<BranchTopupVbank>(`/admin/branches/${branchId}/topup-vbank/reissue`, {
    method: 'PATCH',
    body: JSON.stringify({ holderName }),
  });
}
