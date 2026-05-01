'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchBranchVbankLogs,
  getMyTopupVbank,
  type BranchVbankLogRow,
} from '@/lib/branch/branch-api';
import {
  DateRangePresetSelect,
  getDateRangeForPreset,
  type DateRangePreset,
} from '@/components/branch/date-range-preset';

function fmtWon(n: number | null | undefined) {
  if (n == null) return '-';
  return `${n.toLocaleString()}원`;
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const PURPOSE_LABELS: Record<string, string> = {
  TOPUP: '충전용',
  CUSTOMER_ORDER: '고객결제',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: '사용중', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: '입금완료', className: 'bg-emerald-100 text-emerald-700' },
  RELEASED: { label: '회수', className: 'bg-slate-100 text-slate-700' },
  EXPIRED: { label: '만료', className: 'bg-red-100 text-red-700' },
  CANCELED: { label: '취소', className: 'bg-slate-100 text-slate-700' },
  REVIEW_REQUIRED: { label: '확인필요', className: 'bg-rose-100 text-rose-700' },
};

function statusBadge(status: string) {
  const cfg = STATUS_LABELS[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function BranchVbankLogsPage() {
  const defaultRange = getDateRangeForPreset('TODAY');
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState('');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('TODAY');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [queryDateFrom, setQueryDateFrom] = useState(defaultRange.from);
  const [queryDateTo, setQueryDateTo] = useState(defaultRange.to);
  const [page, setPage] = useState(1);

  const applyDatePreset = (preset: Exclude<DateRangePreset, 'CUSTOM'>) => {
    const next = getDateRangeForPreset(preset);
    setDatePreset(preset);
    setDateFrom(next.from);
    setDateTo(next.to);
  };

  const searchByDateRange = () => {
    setQueryDateFrom(dateFrom);
    setQueryDateTo(dateTo);
    setPage(1);
  };

  const topupQ = useQuery({
    queryKey: ['branch-vbank-log-topup'],
    queryFn: getMyTopupVbank,
  });
  const logsQ = useQuery({
    queryKey: ['branch-vbank-logs', purpose, status, queryDateFrom, queryDateTo, page],
    queryFn: () => fetchBranchVbankLogs({
      purpose: purpose || undefined,
      status: status || undefined,
      dateFrom: queryDateFrom || undefined,
      dateTo: queryDateTo || undefined,
      page,
      size: 20,
    }),
  });

  const data = logsQ.data;
  const lastPage = Math.max(1, Math.ceil((data?.total || 0) / (data?.size || 20)));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--branch-text)]">가상계좌 로그</h1>
        <p className="text-xs text-[var(--branch-text-light)] mt-1">
          지사에 할당된 충전용 계좌와 고객 결제용 계좌 이력을 조회합니다.
        </p>
      </div>

      <TopupAccountCard data={topupQ.data} loading={topupQ.isLoading} />

      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <SelectFilter label="용도" value={purpose} onChange={(v) => { setPurpose(v); setPage(1); }} options={[
            ['', '전체 용도'],
            ['TOPUP', '충전용'],
            ['CUSTOMER_ORDER', '고객결제'],
          ]} />
          <SelectFilter label="상태" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
            ['', '전체 상태'],
            ['ACTIVE', '사용중'],
            ['PAID', '입금완료'],
            ['RELEASED', '회수'],
            ['EXPIRED', '만료'],
            ['REVIEW_REQUIRED', '확인필요'],
          ]} />
          <DateRangePresetSelect value={datePreset} onChange={applyDatePreset} />
          <DateFilter label="시작일" value={dateFrom} onChange={(v) => { setDatePreset('CUSTOM'); setDateFrom(v); }} />
          <DateFilter label="종료일" value={dateTo} onChange={(v) => { setDatePreset('CUSTOM'); setDateTo(v); }} />
          <button
            type="button"
            onClick={searchByDateRange}
            className="h-9 rounded-lg border border-[var(--branch-accent)] bg-[var(--branch-accent)] px-4 text-sm font-medium text-white"
          >
            조회
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white overflow-hidden">
        {logsQ.isLoading ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">로딩 중...</div>
        ) : logsQ.isError ? (
          <div className="text-center py-12 text-red-600">가상계좌 로그를 불러오지 못했습니다.</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">가상계좌 로그가 없습니다.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--branch-cream)] text-[var(--branch-text-light)]">
                  <tr>
                    <Th>계좌</Th>
                    <Th>용도/상태</Th>
                    <Th>금액</Th>
                    <Th>주문/결제</Th>
                    <Th>Webhook</Th>
                    <Th>일시</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--branch-rose-light)]">
                  {data.items.map((row) => <LogRow key={row.allocationId} row={row} />)}
                </tbody>
              </table>
            </div>
            <Pager page={page} lastPage={lastPage} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

function TopupAccountCard({ data, loading }: { data: Awaited<ReturnType<typeof getMyTopupVbank>> | undefined; loading: boolean }) {
  if (loading) return null;
  if (!data || !data.active) {
    return (
      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-5 text-sm text-[var(--branch-text-light)]">
        본사 충전용 가상계좌가 아직 할당되지 않았습니다.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-5">
      <h2 className="text-sm font-semibold text-[var(--branch-text)] mb-3">본사 충전용 가상계좌</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <Info label="은행" value={data.bankName ?? data.bankCode} />
        <Info label="계좌번호" value={data.accountNumber} mono />
        <Info label="예금주" value={data.holderName} />
      </dl>
    </div>
  );
}

function LogRow({ row }: { row: BranchVbankLogRow }) {
  return (
    <tr className="align-top">
      <Td>
        <div className="font-mono text-xs text-[var(--branch-text)]">{row.accountNumber}</div>
        <div className="text-[11px] text-[var(--branch-text-light)]">{row.bankName || row.bankCode}</div>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--branch-text)]">{PURPOSE_LABELS[row.purpose] || row.purpose}</span>
          {statusBadge(row.status)}
        </div>
        <div className="text-[11px] text-[var(--branch-text-light)] font-mono mt-1">A{row.allocationId}</div>
      </Td>
      <Td>
        <div className="text-[var(--branch-text)]">예정 {fmtWon(row.expectedAmount)}</div>
        <div className="text-[11px] text-[var(--branch-text-light)]">입금 {fmtWon(row.paidAmount)} · {row.depositorName || '-'}</div>
      </Td>
      <Td>
        <div className="text-[var(--branch-text)]">{row.orderNo || (row.orderId ? `O${row.orderId}` : '-')}</div>
        <div className="text-[11px] text-[var(--branch-text-light)]">
          {row.paymentId ? `P${row.paymentId}` : '-'} · {row.ordererName || '-'}
        </div>
      </Td>
      <Td>
        {row.webhookEventId ? (
          <>
            <div className="text-[var(--branch-text)]">E{row.webhookEventId} · {row.webhookProcessed ? '처리됨' : '대기'}</div>
            <div className="text-[11px] text-red-600 max-w-xs truncate">{row.webhookError || '-'}</div>
          </>
        ) : (
          <span className="text-[var(--branch-text-light)]">-</span>
        )}
      </Td>
      <Td>
        <div className="text-[var(--branch-text)]">할당 {fmtDateTime(row.assignedAt)}</div>
        <div className="text-[11px] text-[var(--branch-text-light)]">입금 {fmtDateTime(row.paidAt)} · 회수 {fmtDateTime(row.releasedAt)}</div>
      </Td>
    </tr>
  );
}

function SelectFilter({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--branch-text-light)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-[var(--branch-rose-light)] bg-white px-3 text-sm text-[var(--branch-text)]"
      >
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

function DateFilter({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--branch-text-light)]">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-[var(--branch-rose-light)] bg-white px-3 text-sm text-[var(--branch-text)]"
      />
    </label>
  );
}

function Info({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[var(--branch-text-light)] text-xs mb-0.5">{label}</dt>
      <dd className={`font-medium text-[var(--branch-text)] ${mono ? 'font-mono' : ''}`}>{value || '-'}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 whitespace-nowrap">{children}</td>;
}

function Pager({ page, lastPage, total, onPage }: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--branch-rose-light)] px-4 py-3 text-sm">
      <span className="text-[var(--branch-text-light)]">총 {total}건 · {page}/{lastPage}</span>
      <div className="flex gap-1.5">
        <button className="px-3 py-1.5 rounded-lg border border-[var(--branch-rose-light)] disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>이전</button>
        <button className="px-3 py-1.5 rounded-lg border border-[var(--branch-rose-light)] disabled:opacity-40" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>다음</button>
      </div>
    </div>
  );
}
