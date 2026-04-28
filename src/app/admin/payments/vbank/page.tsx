'use client';

import { useState } from 'react';
import { VbankPaymentsTable } from './vbank-payments-table';
import { VbankPaymentsFilters } from './vbank-payments-filters';
import type { AdminVbankPaymentsFilters } from '@/lib/payments/innopay-types';

function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

export default function AdminVbankPaymentsPage() {
  const today = getTodayKST();
  const [filters, setFilters] = useState<AdminVbankPaymentsFilters>({
    page: 1,
    pageSize: 20,
    from: today,
    to: today,
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">가상계좌 결제</h1>
      </div>
      <VbankPaymentsFilters value={filters} onChange={setFilters} />
      <VbankPaymentsTable
        filters={filters}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
