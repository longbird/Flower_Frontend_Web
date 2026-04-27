'use client';

import { useState } from 'react';
import { VbankPaymentsTable } from './vbank-payments-table';
import { VbankPaymentsFilters } from './vbank-payments-filters';
import type { AdminVbankPaymentsFilters } from '@/lib/payments/innopay-types';

export default function AdminVbankPaymentsPage() {
  const [filters, setFilters] = useState<AdminVbankPaymentsFilters>({
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-800">가상계좌 결제 모니터링</h1>
      <VbankPaymentsFilters value={filters} onChange={setFilters} />
      <VbankPaymentsTable
        filters={filters}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
