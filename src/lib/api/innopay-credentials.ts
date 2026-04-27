import { api } from './client';
import type {
  InnopayCredentialsMasked,
  UpdateInnopayCredentialsRequest,
} from '@/lib/payments/innopay-types';

export async function getInnopayCredentials(): Promise<InnopayCredentialsMasked> {
  return api<InnopayCredentialsMasked>('/admin/innopay/credentials', { method: 'GET' });
}

export async function updateInnopayCredentials(
  payload: UpdateInnopayCredentialsRequest,
): Promise<{ ok: true }> {
  return api<{ ok: true }>('/admin/innopay/credentials', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
