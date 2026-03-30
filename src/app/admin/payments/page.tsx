'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/store';
import type { TossTransaction, PaymentStatus } from '@/lib/payments/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentTable } from './components/PaymentTable';
import PaymentDetailModal from './components/PaymentDetailModal';
import CancelPaymentModal from './components/CancelPaymentModal';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'DONE', label: '완료' },
  { value: 'WAITING_FOR_DEPOSIT', label: '입금대기' },
  { value: 'CANCELED', label: '취소' },
];

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function PaymentsPage() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [statusFilter, setStatusFilter] = useState('');

  const [queryStartDate, setQueryStartDate] = useState(defaultRange.start);
  const [queryEndDate, setQueryEndDate] = useState(defaultRange.end);
  const [queryStatus, setQueryStatus] = useState('');

  const [detailPaymentKey, setDetailPaymentKey] = useState<string | null>(null);
  const [cancelPaymentKey, setCancelPaymentKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payments', queryStartDate, queryEndDate, queryStatus],
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const params = new URLSearchParams();
      params.set('startDate', queryStartDate);
      params.set('endDate', queryEndDate);
      if (queryStatus) {
        params.set('status', queryStatus);
      }

      const res = await fetch(`/api/payments/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('결제 내역 조회 실패');
      }

      return res.json() as Promise<{ ok: boolean; data: TossTransaction[] }>;
    },
  });

  const transactions = data?.data ?? [];

  const filteredTransactions = statusFilter
    ? transactions.filter((tx) => tx.status === statusFilter)
    : transactions;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryStartDate(startDate);
    setQueryEndDate(endDate);
    setQueryStatus(statusFilter);
  };

  const handleViewDetail = (paymentKey: string) => {
    setDetailPaymentKey(paymentKey);
  };

  const handleCancel = (paymentKey: string) => {
    setCancelPaymentKey(paymentKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">결제 관리</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-36 border-slate-200"
            />
            <span className="text-slate-400 text-sm">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-36 border-slate-200"
            />
          </div>

          <select
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white h-9"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button type="submit" size="sm" className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0">
            검색
          </Button>
        </form>
      </div>

      <PaymentTable
        transactions={filteredTransactions}
        isLoading={isLoading}
        onViewDetail={handleViewDetail}
        onCancel={handleCancel}
      />

      {detailPaymentKey && (
        <PaymentDetailModal
          paymentKey={detailPaymentKey}
          onClose={() => setDetailPaymentKey(null)}
        />
      )}

      {cancelPaymentKey && (
        <CancelPaymentModal
          paymentKey={cancelPaymentKey}
          onClose={() => setCancelPaymentKey(null)}
          onSuccess={() => {
            setCancelPaymentKey(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
