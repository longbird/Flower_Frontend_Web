'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listVbankLogs } from '@/lib/api/admin-payments-vbank';
import { Input } from '@/components/ui/input';
import type { VbankLogCategory } from '@/lib/payments/vbank-payment-types';

const CATEGORIES: Array<VbankLogCategory | ''> = ['', 'WEBHOOK', 'ALERT', 'ACCOUNT', 'PAYMENT', 'WALLET'];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

export function VbankLogsTable() {
  const [category, setCategory] = useState<VbankLogCategory | ''>('');
  const [accountNumber, setAccountNumber] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-vbank-logs', { category, accountNumber }],
    queryFn: () => listVbankLogs({
      category: category || undefined,
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
          value={category}
          onChange={(e) => setCategory(e.target.value as VbankLogCategory | '')}
        >
          {CATEGORIES.map((c) => <option key={c || 'ALL'} value={c}>{c || '전체'}</option>)}
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
              <th className="px-3 py-2 text-left">시각</th>
              <th className="px-3 py-2 text-left">구분</th>
              <th className="px-3 py-2 text-left">심각도</th>
              <th className="px-3 py-2 text-left">내용</th>
              <th className="px-3 py-2 text-left">지사</th>
              <th className="px-3 py-2 text-left">계좌</th>
              <th className="px-3 py-2 text-right">금액</th>
              <th className="px-3 py-2 text-left">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">조회 중...</td></tr>}
            {isError && <tr><td colSpan={8} className="px-3 py-8 text-center text-red-600">타임라인 조회 실패</td></tr>}
            {!isLoading && !isError && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">로그가 없습니다.</td></tr>
            )}
            {(data?.items ?? []).map((row) => (
              <tr key={row.sourceId} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-xs">{fmtDateTime(row.occurredAt)}</td>
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2">{row.severity}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.eventType}</div>
                  <div className="text-xs text-slate-500">{row.message}</div>
                </td>
                <td className="px-3 py-2 text-xs">{row.branchName ?? row.branchId ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.accountNumber ?? '-'}</td>
                <td className="px-3 py-2 text-right">{row.amount == null ? '-' : row.amount.toLocaleString('ko-KR')}</td>
                <td className="px-3 py-2 text-xs">{row.status ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
