'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listVbankPool } from '@/lib/api/admin-payments-vbank';
import { Input } from '@/components/ui/input';
import type { AdminVbankPoolFilters } from '@/lib/payments/vbank-payment-types';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

export function VbankPoolTable() {
  const [status, setStatus] = useState<AdminVbankPoolFilters['status'] | ''>('');
  const [accountNumber, setAccountNumber] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-vbank-pool', { status, accountNumber }],
    queryFn: () => listVbankPool({
      status: status || undefined,
      accountNumber: accountNumber || undefined,
      page: 1,
      pageSize: 30,
    }),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row">
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as AdminVbankPoolFilters['status'] | '')}
        >
          <option value="">전체</option>
          <option value="IN_USE">사용중</option>
          <option value="AVAILABLE">사용가능</option>
          <option value="DISABLED">비활성</option>
        </select>
        <Input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="계좌번호"
          className="sm:max-w-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">계좌</th>
              <th className="px-3 py-2 text-left">은행</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">용도</th>
              <th className="px-3 py-2 text-left">지사</th>
              <th className="px-3 py-2 text-left">결제/주문</th>
              <th className="px-3 py-2 text-left">배정</th>
              <th className="px-3 py-2 text-left">수정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">조회 중...</td></tr>}
            {isError && <tr><td colSpan={8} className="px-3 py-8 text-center text-red-600">계좌풀 조회 실패</td></tr>}
            {!isLoading && !isError && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">계좌가 없습니다.</td></tr>
            )}
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{row.accountNumber}</td>
                <td className="px-3 py-2 text-xs">{row.bankName ?? row.bankCode}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2 text-xs">{row.purpose ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{row.branchName ?? row.branchId ?? '-'}</td>
                <td className="px-3 py-2 text-xs">P {row.paymentId ?? '-'} / O {row.orderId ?? '-'}</td>
                <td className="px-3 py-2 text-xs">{fmtDateTime(row.assignedAt)}</td>
                <td className="px-3 py-2 text-xs">{fmtDateTime(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
