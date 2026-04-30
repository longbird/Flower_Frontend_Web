'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ackVbankIssue, listVbankIssues, resolveVbankIssue } from '@/lib/api/admin-payments-vbank';
import { Button } from '@/components/ui/button';
import type { AdminVbankIssueRow } from '@/lib/payments/vbank-payment-types';

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  WARNING: 'bg-amber-100 text-amber-700',
  INFO: 'bg-slate-100 text-slate-700',
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

function IssueRow({ row }: { row: AdminVbankIssueRow }) {
  const qc = useQueryClient();
  const onSettled = () => {
    qc.invalidateQueries({ queryKey: ['admin-vbank-issues'] });
    qc.invalidateQueries({ queryKey: ['admin-vbank-overview'] });
  };
  const ack = useMutation({ mutationFn: () => ackVbankIssue(row.id), onSettled });
  const resolve = useMutation({ mutationFn: () => resolveVbankIssue(row.id), onSettled });

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASS[row.severity] ?? SEVERITY_CLASS.INFO}`}>
          {row.severity}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-slate-900">{row.title}</div>
        <div className="text-xs text-slate-500">{row.message}</div>
      </td>
      <td className="px-3 py-2 text-xs">{row.branchName ?? row.branchId ?? '-'}</td>
      <td className="px-3 py-2 font-mono text-xs">{row.accountNumber ?? '-'}</td>
      <td className="px-3 py-2 text-center">{row.occurrenceCount}</td>
      <td className="px-3 py-2 text-xs">{row.smsStatus} / {row.slackStatus}</td>
      <td className="px-3 py-2 text-xs">{fmtDateTime(row.lastSeenAt)}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={ack.isPending} onClick={() => ack.mutate()}>확인</Button>
          <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate()}>해결</Button>
        </div>
      </td>
    </tr>
  );
}

export function VbankIssuesTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-vbank-issues', { status: 'OPEN' }],
    queryFn: () => listVbankIssues({ status: 'OPEN', page: 1, pageSize: 20 }),
  });

  if (isLoading) return <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">조회 중...</div>;
  if (isError) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">문제 목록 조회 실패</div>;

  const items = data?.items ?? [];
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">심각도</th>
            <th className="px-3 py-2 text-left">문제</th>
            <th className="px-3 py-2 text-left">지사</th>
            <th className="px-3 py-2 text-left">계좌</th>
            <th className="px-3 py-2 text-center">횟수</th>
            <th className="px-3 py-2 text-left">SMS/Slack</th>
            <th className="px-3 py-2 text-left">최근 발생</th>
            <th className="px-3 py-2 text-left">처리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">열린 문제가 없습니다.</td></tr>
          )}
          {items.map((row) => <IssueRow key={row.id} row={row} />)}
        </tbody>
      </table>
    </div>
  );
}
