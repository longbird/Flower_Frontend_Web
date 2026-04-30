import { api } from './client';
import type {
  AdminVbankIssuesFilters,
  AdminVbankIssuesListResponse,
  AdminVbankLogsFilters,
  AdminVbankLogsListResponse,
  AdminVbankOverview,
  AdminVbankPoolFilters,
  AdminVbankPoolListResponse,
  AdminVbankPaymentsListResponse,
  AdminVbankPaymentsFilters,
} from '@/lib/payments/vbank-payment-types';

function toQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

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

export async function getVbankOverview(): Promise<AdminVbankOverview> {
  return api<AdminVbankOverview>('/admin/payments/vbank/overview', { method: 'GET' });
}

export async function listVbankIssues(
  filters: AdminVbankIssuesFilters = {},
): Promise<AdminVbankIssuesListResponse> {
  const qs = toQuery(filters as Record<string, unknown>);
  return api<AdminVbankIssuesListResponse>(
    `/admin/payments/vbank/issues${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
}

export async function listVbankLogs(
  filters: AdminVbankLogsFilters = {},
): Promise<AdminVbankLogsListResponse> {
  const qs = toQuery(filters as Record<string, unknown>);
  return api<AdminVbankLogsListResponse>(
    `/admin/payments/vbank/logs${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
}

export async function listVbankPool(
  filters: AdminVbankPoolFilters = {},
): Promise<AdminVbankPoolListResponse> {
  const qs = toQuery(filters as Record<string, unknown>);
  return api<AdminVbankPoolListResponse>(
    `/admin/payments/vbank/pool${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
}

export async function ackVbankIssue(id: number): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/admin/payments/vbank/issues/${id}/ack`, { method: 'POST' });
}

export async function resolveVbankIssue(id: number): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/admin/payments/vbank/issues/${id}/resolve`, { method: 'POST' });
}
