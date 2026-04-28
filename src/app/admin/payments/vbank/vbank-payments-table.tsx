'use client';

import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { listVbankPayments } from '@/lib/api/admin-payments-vbank';
import { VbankStatusBadge } from './vbank-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type {
  AdminVbankPaymentRow,
  AdminVbankPaymentsFilters,
} from '@/lib/payments/innopay-types';

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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-500 mb-1">조회된 가상계좌 결제가 없습니다.</p>
      <p className="text-xs text-slate-400">
        지사 홈페이지에서 가상계좌 결제가 발생하면 여기에 표시됩니다.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      조회 실패: {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 p-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** 데스크탑 행 — overflow-x 가로 스크롤 가능 */
function DesktopRow({ row }: { row: AdminVbankPaymentRow }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.paymentId}</td>
      <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.orderId}</td>
      <td className="px-3 py-2 text-slate-800">
        {row.branchName ?? <span className="text-slate-400">{row.branchId ?? '-'}</span>}
      </td>
      <td className="px-3 py-2"><VbankStatusBadge status={row.status} mode={row.innopayMode} /></td>
      <td className="px-3 py-2 text-right text-slate-800">{fmtKRW(row.amountTotal)}</td>
      <td className="px-3 py-2 text-right text-slate-700">{fmtKRW(row.paidAmount)}</td>
      <td className="px-3 py-2">
        <div className="font-mono text-xs text-slate-700">{row.vbankAccountNumber}</div>
        <div className="text-xs text-slate-500">
          {row.vbankBankName ?? row.vbankBankCode} · {row.vbankHolderName}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(row.vbankDueDate)}</td>
      <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(row.paidAt)}</td>
    </tr>
  );
}

/** 모바일 카드 — sm 이하에서만 표시 */
function MobileCard({ row }: { row: AdminVbankPaymentRow }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">#{row.paymentId}</span>
        <VbankStatusBadge status={row.status} mode={row.innopayMode} />
      </div>
      <div className="text-sm font-medium text-slate-800">
        {row.branchName ?? `지사 #${row.branchId ?? '-'}`}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-500">요청액</span>
        <span className="text-right font-medium text-slate-800">{fmtKRW(row.amountTotal)}원</span>
        <span className="text-slate-500">입금액</span>
        <span className="text-right text-slate-700">{fmtKRW(row.paidAmount)}{row.paidAmount != null ? '원' : ''}</span>
        <span className="text-slate-500">가상계좌</span>
        <span className="text-right font-mono text-xs text-slate-700 truncate">{row.vbankAccountNumber}</span>
        <span className="text-slate-500">은행/예금주</span>
        <span className="text-right text-slate-600">{row.vbankBankName ?? row.vbankBankCode} · {row.vbankHolderName}</span>
        <span className="text-slate-500">마감</span>
        <span className="text-right text-slate-600">{fmtDateTime(row.vbankDueDate)}</span>
        {row.paidAt && (
          <>
            <span className="text-slate-500">입금시각</span>
            <span className="text-right text-emerald-700">{fmtDateTime(row.paidAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function VbankPaymentsTable({ filters, onPageChange }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-vbank-payments', filters],
    queryFn: () => listVbankPayments(filters),
  });

  if (isError) return <ErrorState message={error instanceof Error ? error.message : String(error)} />;

  const items: AdminVbankPaymentRow[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      {/* 데스크탑: 테이블 */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">결제ID</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">주문ID</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">지사</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">상태</th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">요청액</th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">입금액</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">가상계좌</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">마감</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">입금시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => <DesktopRow key={row.paymentId} row={row} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <EmptyState />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((row) => <MobileCard key={row.paymentId} row={row} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
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
      )}
    </div>
  );
}
