'use client';

import { useQuery } from '@tanstack/react-query';
import { getVbankOverview } from '@/lib/api/admin-payments-vbank';
import type { AdminVbankOverview } from '@/lib/payments/vbank-payment-types';

function Metric({
  label,
  value,
  tone = 'normal',
}: {
  label: string;
  value: number;
  tone?: 'normal' | 'warning' | 'critical';
}) {
  const toneClass = {
    normal: 'border-slate-200 bg-white text-slate-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    critical: 'border-red-200 bg-red-50 text-red-900',
  }[tone];

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value.toLocaleString('ko-KR')}</div>
    </div>
  );
}

export function VbankOverviewCards() {
  const { data, isLoading, isError } = useQuery<AdminVbankOverview>({
    queryKey: ['admin-vbank-overview'],
    queryFn: getVbankOverview,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-20 animate-pulse rounded-md border border-slate-200 bg-slate-50" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        가상계좌 요약 조회 실패
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Metric label="긴급 문제" value={data?.issues.openCritical ?? 0} tone="critical" />
      <Metric label="주의 문제" value={data?.issues.openWarning ?? 0} tone="warning" />
      <Metric label="사용 가능 계좌" value={data?.pool.available ?? 0} />
      <Metric label="웹훅 실패(24h)" value={data?.webhooks.failed24h ?? 0} tone="warning" />
    </div>
  );
}
