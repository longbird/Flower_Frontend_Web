'use client';

import { useQuery } from '@tanstack/react-query';
import { listVbankPayments } from '@/lib/api/admin-payments-vbank';
import { VbankStatusBadge } from './vbank-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { AdminVbankPaymentsFilters } from '@/lib/payments/innopay-types';

interface Props {
  filters: AdminVbankPaymentsFilters;
  onPageChange: (page: number) => void;
}

function fmtKRW(v: number | null): string {
  if (v == null) return '-';
  return v.toLocaleString('ko-KR');
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

export function VbankPaymentsTable({ filters, onPageChange }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-vbank-payments', filters],
    queryFn: () => listVbankPayments(filters),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        조회 실패: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { items = [], total = 0, page = 1, pageSize = 20 } = data ?? {};
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">결제ID</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">주문ID</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">지사</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">상태</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">요청액</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">입금액</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">가상계좌</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">마감</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">입금시각</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">모드</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                  결제 내역이 없습니다.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.paymentId} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono">{row.paymentId}</td>
                <td className="px-3 py-2 font-mono">{row.orderId}</td>
                <td className="px-3 py-2">
                  {row.branchName ?? <span className="text-slate-400">{row.branchId ?? '-'}</span>}
                </td>
                <td className="px-3 py-2"><VbankStatusBadge status={row.status} /></td>
                <td className="px-3 py-2 text-right">{fmtKRW(row.amountTotal)}</td>
                <td className="px-3 py-2 text-right">{fmtKRW(row.paidAmount)}</td>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">{row.vbankAccountNumber}</div>
                  <div className="text-xs text-slate-500">
                    {row.vbankBankName ?? row.vbankBankCode} / {row.vbankHolderName}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(row.vbankDueDate)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(row.paidAt)}</td>
                <td className="px-3 py-2 text-xs">
                  <span className={row.innopayMode === 'REAL' ? 'text-red-600 font-medium' : 'text-amber-700'}>
                    {row.innopayMode}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          총 <strong className="text-slate-800">{total}</strong>건 — 페이지 {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            이전
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
