import { api } from './client';
import type {
  AdminVbankPaymentsListResponse,
  AdminVbankPaymentsFilters,
} from '@/lib/payments/vbank-payment-types';

export async function listVbankPayments(
  filters: AdminVbankPaymentsFilters = {},
): Promise<AdminVbankPaymentsListResponse> {
  const params = new URLSearchParams();
  filters.status?.forEach((s) => params.append('status', s));
  if (filters.branchId) params.set('branchId', String(filters.branchId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.mode) params.set('mode', filters.mode);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return api<AdminVbankPaymentsListResponse>(
    `/admin/payments/vbank${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
}
