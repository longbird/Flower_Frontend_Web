'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronDown, Filter, Info, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/store';
import { api } from '@/lib/api/client';
import type { TossTransaction } from '@/lib/payments/types';
import { listVbankPayments } from '@/lib/api/admin-payments-vbank';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { PaymentTable, type OrderInfoMap } from './components/PaymentTable';
import PaymentDetailModal from './components/PaymentDetailModal';
import CancelPaymentModal from './components/CancelPaymentModal';
import {
  combinePaymentRows,
  mapPaymentStatusToVbankStatuses,
} from './payments-list';
import {
  buildTransactionPaymentDetail,
  VbankDetailDialog,
  type VbankDetail,
} from './vbank/vbank-detail-dialog';
import { buildPaymentQueueSummary } from './payment-queue-summary';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'DONE', label: '완료' },
  { value: 'WAITING_FOR_DEPOSIT', label: '입금대기' },
  { value: 'IN_PROGRESS', label: '확인필요' },
  { value: 'CANCELED', label: '취소' },
];

const SAVED_VIEWS: { key: string; label: string; status: string }[] = [
  { key: 'review', label: '처리 필요', status: 'IN_PROGRESS' },
  { key: 'pending', label: '입금대기', status: 'WAITING_FOR_DEPOSIT' },
  { key: 'done', label: '오늘 완료', status: 'DONE' },
  { key: 'all', label: '전체', status: '' },
];

function getDefaultDateRange(): { start: string; end: string } {
  // 한국 시간 기준 당일 (UTC 변환 시 새벽 시간 어긋남 방지).
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  return { start: today, end: today };
}

function dayStartIso(date: string): string {
  return new Date(`${date}T00:00:00+09:00`).toISOString();
}

function dayEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999+09:00`).toISOString();
}

export default function PaymentsPage() {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeView, setActiveView] = useState('all');

  const [queryStartDate, setQueryStartDate] = useState(defaultRange.start);
  const [queryEndDate, setQueryEndDate] = useState(defaultRange.end);
  const [queryStatus, setQueryStatus] = useState('');

  const [detailPaymentKey, setDetailPaymentKey] = useState<string | null>(null);
  const [vbankDetail, setVbankDetail] = useState<VbankDetail | null>(null);
  const [cancelPaymentKey, setCancelPaymentKey] = useState<string | null>(null);

  // 1) Toss 거래 목록 — 페이지 진입 시 즉시 호출
  const txsQuery = useQuery({
    queryKey: ['admin-payments-toss', queryStartDate, queryEndDate, queryStatus],
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const params = new URLSearchParams();
      params.set('startDate', queryStartDate);
      params.set('endDate', queryEndDate);
      if (queryStatus) params.set('status', queryStatus);
      const res = await fetch(`/api/payments/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('결제 내역 조회 실패');
      const json = (await res.json()) as { ok: boolean; data: TossTransaction[] };
      return json.data ?? [];
    },
    staleTime: 30_000,           // 30초 동안 cache 활용 — 다른 페이지 갔다 와도 즉시
    placeholderData: (prev) => prev, // 필터 변경 시 빈 화면 안 뜨게 이전 결과 유지
  });

  const transactions = txsQuery.data ?? [];
  const vbankQuery = useQuery({
    queryKey: ['admin-payments-vbank-integrated', queryStartDate, queryEndDate, queryStatus],
    queryFn: async () => listVbankPayments({
      from: dayStartIso(queryStartDate),
      to: dayEndIso(queryEndDate),
      status: mapPaymentStatusToVbankStatuses(queryStatus),
      page: 1,
      pageSize: 100,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const vbankRows = vbankQuery.data?.items ?? [];
  const combinedTransactions = combinePaymentRows(transactions, vbankRows);
  const isLoading = txsQuery.isLoading || vbankQuery.isLoading;
  const isFetching = txsQuery.isFetching || vbankQuery.isFetching; // background refetch (재진입/재검색) 표시용

  // 2) Enrichment — Toss 결과 도착 후 백그라운드로 시작. UI 는 Toss 결과만으로도 일단 렌더.
  const orderIds = transactions.map((t) => t.orderId).join(',');
  const enrichQuery = useQuery({
    queryKey: ['admin-payments-orderinfo', orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      try {
        return await api<OrderInfoMap>(
          `/admin/payments/order-info?orderIds=${encodeURIComponent(orderIds)}`,
          { method: 'GET' },
        );
      } catch {
        return {} as OrderInfoMap; // enrichment 실패 시 빈 map (UI fallback)
      }
    },
    staleTime: 60_000,
  });
  const orderInfo: OrderInfoMap = enrichQuery.data ?? {};

  // 3) Toss orderName enrichment — DB 에 없는 결제 (충전금/구독/외부) 의 사람이 읽는 라벨.
  const paymentKeys = transactions.map((t) => t.paymentKey).join(',');
  const orderNamesQuery = useQuery({
    queryKey: ['admin-payments-ordernames', paymentKeys],
    enabled: paymentKeys.length > 0,
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `/api/payments/order-names?paymentKeys=${encodeURIComponent(paymentKeys)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return {} as Record<string, string>;
      const json = (await res.json()) as { ok: boolean; data: Record<string, string> };
      return json.data ?? {};
    },
    staleTime: 5 * 60_000, // orderName 은 한 번 받으면 안 변함
  });
  const orderNames: Record<string, string> = orderNamesQuery.data ?? {};

  // 어느 한 enrichment 라도 첫 결과가 아직 없으면 행마다 placeholder 표시.
  const isEnriching =
    transactions.length > 0 &&
    ((enrichQuery.isFetching && !enrichQuery.data) ||
      (orderNamesQuery.isFetching && !orderNamesQuery.data));

  const refetch = () => {
    txsQuery.refetch();
    vbankQuery.refetch();
    enrichQuery.refetch();
    orderNamesQuery.refetch();
  };

  const filteredTransactions = statusFilter
    ? combinedTransactions.filter((tx) => tx.status === statusFilter)
    : combinedTransactions;
  const summary = buildPaymentQueueSummary(combinedTransactions);
  const activeViewCounts: Record<string, number> = {
    review: summary.reviewRequired,
    pending: summary.waitingForDeposit,
    done: summary.completed,
    all: combinedTransactions.length,
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const matchingView = SAVED_VIEWS.find((view) => view.status === statusFilter);
    setActiveView(matchingView?.key ?? 'custom');
    setQueryStartDate(startDate);
    setQueryEndDate(endDate);
    setQueryStatus(statusFilter);
  };

  const handleSavedView = (view: { key: string; status: string }) => {
    setActiveView(view.key);
    setStatusFilter(view.status);
    setQueryStatus(view.status);
    setQueryStartDate(startDate);
    setQueryEndDate(endDate);
  };

  const handleViewDetail = (paymentKey: string) => {
    const tx = combinedTransactions.find((row) => row.paymentKey === paymentKey);
    if (tx?.source === 'INNOPAY_VBANK') {
      setVbankDetail(buildTransactionPaymentDetail(tx));
      return;
    }
    setDetailPaymentKey(paymentKey);
  };

  const handleCancel = (paymentKey: string) => {
    setCancelPaymentKey(paymentKey);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-medium text-[#4f6d38]">결제 운영</div>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950">오늘 처리할 결제 큐</h1>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="조회 안내"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                결제 내역은 카드결제와 가상계좌 결제를 통합 조회합니다.
                <br />
                카드결제는 토스페이먼츠 외부 API, 가상계좌는 내부 결제 DB에서 조회합니다.
                <br />
                조회 후 30초 안에는 캐시로 즉시 응답합니다.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            결제 상태와 처리 이유를 먼저 보고, 필요한 항목만 상세에서 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            오늘
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isFetching}
            className="bg-[#4f6d38] hover:bg-[#3d5229]"
            onClick={refetch}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                갱신 중
              </>
            ) : (
              '새로고침'
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="처리 필요" value={`${summary.reviewRequired}건`} detail="검토 또는 매칭 확인" tone="text-amber-700" />
        <SummaryCard label="입금대기" value={`${summary.waitingForDeposit}건`} detail="가상계좌/입금 확인 전" tone="text-sky-700" />
        <SummaryCard
          label="오늘 완료"
          value={`${summary.completed}건`}
          detail={`${summary.completedAmount.toLocaleString('ko-KR')}원`}
          tone="text-emerald-700"
        />
        <SummaryCard label="실패/취소" value={`${summary.failedOrCanceled}건`} detail="승인 실패 및 취소" tone="text-rose-700" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-3 md:px-4">
          <div className="flex flex-wrap items-center gap-2">
            {SAVED_VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => handleSavedView(view)}
                className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                  activeView === view.key
                    ? 'border-[#4f6d38] bg-[#e8f0e0] text-[#3d5229]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {view.label}
                <span className="text-xs opacity-70">{activeViewCounts[view.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 px-3 py-3 flex-wrap md:px-4">
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

          <Button
            type="submit"
            size="sm"
            disabled={isFetching}
            className="bg-[#5B7A3D] hover:bg-[#4A6830] shrink-0"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                조회 중...
              </>
            ) : (
              '적용'
            )}
          </Button>

          {isFetching && !isLoading && (
            <span className="ml-auto text-xs text-slate-500 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              결제 내역 갱신 중
            </span>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-3 text-sm md:px-4">
          <Badge variant="outline" className="gap-1 rounded-md border-slate-300 px-2 py-1 text-slate-700">
            <Filter className="h-3 w-3" />
            상태: {STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? '사용자 지정'}
          </Badge>
          <Badge variant="outline" className="rounded-md border-slate-300 px-2 py-1 text-slate-700">
            기간: {queryStartDate === queryEndDate ? queryStartDate : `${queryStartDate} ~ ${queryEndDate}`}
          </Badge>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
            onClick={() => {
              setActiveView('all');
              setStatusFilter('');
              setQueryStatus('');
            }}
          >
            초기화
          </button>
        </div>
      </div>

      <PaymentTable
        transactions={filteredTransactions}
        orderInfo={orderInfo}
        orderNames={orderNames}
        isLoading={isLoading}
        isEnriching={isEnriching}
        onViewDetail={handleViewDetail}
        onCancel={handleCancel}
      />

      {detailPaymentKey && (
        <PaymentDetailModal
          paymentKey={detailPaymentKey}
          onClose={() => setDetailPaymentKey(null)}
        />
      )}

      <VbankDetailDialog detail={vbankDetail} onClose={() => setVbankDetail(null)} />

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

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}
