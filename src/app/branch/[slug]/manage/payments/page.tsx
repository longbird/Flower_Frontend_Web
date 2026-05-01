'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchBranchPayments,
  type BranchPaymentRow,
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  CREATED: { label: '생성', className: 'bg-slate-100 text-slate-700' },
  PENDING: { label: '대기', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: '완료', className: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
  CANCELED: { label: '취소', className: 'bg-slate-100 text-slate-700' },
  REFUNDED: { label: '환불', className: 'bg-blue-100 text-blue-700' },
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

function methodLabel(row: BranchPaymentRow) {
  if (row.method === 'VBANK' || row.provider === 'innopay') return '가상계좌';
  if (row.method === 'CARD') return '카드';
  return row.method || row.provider;
}

export default function BranchPaymentsPage() {
  const defaultRange = getDateRangeForPreset('TODAY');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('TODAY');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [page, setPage] = useState(1);

  const applyDatePreset = (preset: Exclude<DateRangePreset, 'CUSTOM'>) => {
    const next = getDateRangeForPreset(preset);
    setDatePreset(preset);
    setDateFrom(next.from);
    setDateTo(next.to);
    setPage(1);
  };

  const paymentsQ = useQuery({
    queryKey: ['branch-payments', status, method, dateFrom, dateTo, page],
    queryFn: () => fetchBranchPayments({
      status: status || undefined,
      method: method || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size: 20,
    }),
  });

  const data = paymentsQ.data;
  const lastPage = Math.max(1, Math.ceil((data?.total || 0) / (data?.size || 20)));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--branch-text)]">결제 내역</h1>
        <p className="text-xs text-[var(--branch-text-light)] mt-1">
          고객 카드 결제와 가상계좌 결제를 함께 조회합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <SelectFilter label="상태" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
            ['', '전체 상태'],
            ['PENDING', '대기'],
            ['PAID', '완료'],
            ['REVIEW_REQUIRED', '확인필요'],
            ['FAILED', '실패'],
            ['CANCELED', '취소'],
            ['REFUNDED', '환불'],
          ]} />
          <SelectFilter label="수단" value={method} onChange={(v) => { setMethod(v); setPage(1); }} options={[
            ['', '전체 수단'],
            ['CARD', '카드'],
            ['VBANK', '가상계좌'],
          ]} />
          <DateRangePresetSelect value={datePreset} onChange={applyDatePreset} />
          <DateFilter label="시작일" value={dateFrom} onChange={(v) => { setDatePreset('CUSTOM'); setDateFrom(v); setPage(1); }} />
          <DateFilter label="종료일" value={dateTo} onChange={(v) => { setDatePreset('CUSTOM'); setDateTo(v); setPage(1); }} />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDatePreset('CUSTOM'); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="h-9 rounded-lg border border-[var(--branch-rose-light)] bg-white px-3 text-sm text-[var(--branch-text)]"
            >
              전체 기간
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white overflow-hidden">
        {paymentsQ.isLoading ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">로딩 중...</div>
        ) : paymentsQ.isError ? (
          <div className="text-center py-12 text-red-600">결제 내역을 불러오지 못했습니다.</div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">결제 내역이 없습니다.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--branch-cream)] text-[var(--branch-text-light)]">
                  <tr>
                    <Th>결제</Th>
                    <Th>주문</Th>
                    <Th>고객</Th>
                    <Th>금액</Th>
                    <Th>가상계좌</Th>
                    <Th>일시</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--branch-rose-light)]">
                  {data.items.map((row) => (
                    <tr key={row.paymentId} className="align-top">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--branch-text)]">{methodLabel(row)}</span>
                          {statusBadge(row.status)}
                        </div>
                        <div className="text-[11px] text-[var(--branch-text-light)] font-mono mt-1">
                          P{row.paymentId}
                        </div>
                      </Td>
                      <Td>
                        <div className="font-medium text-[var(--branch-text)]">{row.orderNo || `O${row.orderId ?? '-'}`}</div>
                        <div className="text-[11px] text-[var(--branch-text-light)]">
                          {row.orderType || '-'} · 배송 {fmtDateTime(row.deliveryAt)}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-[var(--branch-text)]">{row.ordererName || '-'}</div>
                        <div className="text-[11px] text-[var(--branch-text-light)]">수령 {row.receiverName || '-'}</div>
                      </Td>
                      <Td>
                        <div className="font-mono tabular-nums font-medium text-[var(--branch-text)]">{fmtWon(row.amount)}</div>
                      </Td>
                      <Td>
                        {row.vbankAccountNumber ? (
                          <>
                            <div className="font-mono text-xs text-[var(--branch-text)]">{row.vbankAccountNumber}</div>
                            <div className="text-[11px] text-[var(--branch-text-light)]">
                              {row.vbankBankName || '-'} · 마감 {fmtDateTime(row.vbankDueAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[var(--branch-text-light)]">-</span>
                        )}
                      </Td>
                      <Td>
                        <div className="text-[var(--branch-text)]">{fmtDateTime(row.paidAt)}</div>
                        <div className="text-[11px] text-[var(--branch-text-light)]">요청 {fmtDateTime(row.createdAt)}</div>
                      </Td>
                    </tr>
                  ))}
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
