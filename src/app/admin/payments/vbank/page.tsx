'use client';

import { useState } from 'react';
import { VbankPaymentsTable } from './vbank-payments-table';
import { VbankPaymentsFilters } from './vbank-payments-filters';
import { VbankOverviewCards } from './vbank-overview-cards';
import { VbankIssuesTable } from './vbank-issues-table';
import { VbankLogsTable } from './vbank-logs-table';
import { VbankPoolTable } from './vbank-pool-table';
import type { AdminVbankPaymentsFilters } from '@/lib/payments/innopay-types';
import {
  buildIssueDetail,
  buildLogDetail,
  buildPaymentDetail,
  VbankDetailDialog,
  type VbankDetail,
} from './vbank-detail-dialog';

type TabKey = 'issues' | 'logs' | 'payments' | 'pool';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'issues', label: '문제' },
  { key: 'logs', label: '타임라인' },
  { key: 'payments', label: '결제' },
  { key: 'pool', label: '계좌풀' },
];

export default function AdminVbankPaymentsPage() {
  const [tab, setTab] = useState<TabKey>('issues');
  const [filters, setFilters] = useState<AdminVbankPaymentsFilters>({
    page: 1,
    pageSize: 20,
  });
  const [detail, setDetail] = useState<VbankDetail | null>(null);

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">가상계좌 운영 로그</h1>
      </div>

      <VbankOverviewCards />

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'issues' && <VbankIssuesTable onSelect={(row) => setDetail(buildIssueDetail(row))} />}
      {tab === 'logs' && <VbankLogsTable onSelect={(row) => setDetail(buildLogDetail(row))} />}
      {tab === 'payments' && (
        <div className="space-y-4">
          <VbankPaymentsFilters value={filters} onChange={setFilters} />
          <VbankPaymentsTable
            filters={filters}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            onSelect={(row) => setDetail(buildPaymentDetail(row))}
          />
        </div>
      )}
      {tab === 'pool' && <VbankPoolTable />}

      <VbankDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
