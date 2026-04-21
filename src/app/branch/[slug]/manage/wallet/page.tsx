'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMyBranchWallet,
  fetchMyBranchWalletTransactions,
  type BranchWalletTxType,
} from '@/lib/branch/branch-api';

function fmtWon(n: number | null | undefined) {
  if (n == null) return '-';
  return `${n.toLocaleString()}원`;
}

function fmtDateTime(iso: string | null) {
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

const TX_TYPE_LABELS: Record<BranchWalletTxType, { label: string; className: string }> = {
  CHARGE:    { label: '충전',      className: 'bg-emerald-100 text-emerald-700' },
  REFUND:    { label: '환불',      className: 'bg-blue-100 text-blue-700' },
  ORDER_FEE: { label: '주문수수료', className: 'bg-slate-100 text-slate-700' },
  SMS_FEE:   { label: 'SMS',       className: 'bg-slate-100 text-slate-700' },
  ADJUST:    { label: '조정',      className: 'bg-amber-100 text-amber-700' },
};

export default function MyBranchWalletPage() {
  const [filterType, setFilterType] = useState<BranchWalletTxType | ''>('');
  const [page, setPage] = useState(1);

  const walletQ = useQuery({
    queryKey: ['my-branch-wallet'],
    queryFn: fetchMyBranchWallet,
  });

  const txQ = useQuery({
    queryKey: ['my-branch-wallet-tx', filterType, page],
    queryFn: () =>
      fetchMyBranchWalletTransactions({
        type: filterType || undefined,
        page,
        size: 20,
      }),
  });

  if (walletQ.isLoading) {
    return <div className="text-center py-12 text-[var(--branch-text-light)]">로딩 중...</div>;
  }
  if (walletQ.isError || !walletQ.data) {
    return <div className="text-center py-12 text-red-600">지갑 정보를 불러오지 못했습니다.</div>;
  }

  const { summary, config } = walletQ.data;
  const tx = txQ.data;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--branch-text)]">충전금</h1>
        <p className="text-xs text-[var(--branch-text-light)] mt-1">
          SMS 발송과 주문 처리 수수료에 사용됩니다. 잔액이 최소 기준 미만이 되면 본사에 충전 요청을 주세요.
        </p>
      </div>

      {/* 잔액 카드 */}
      <div className={`rounded-2xl border p-6 shadow-sm ${summary.isLow ? 'bg-red-50/70 border-red-200' : 'bg-white border-[var(--branch-rose-light)]'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[var(--branch-text-light)] mb-1">현재 잔액</p>
            <p className="text-3xl font-bold text-[var(--branch-text)] tabular-nums">{fmtWon(summary.balance)}</p>
            {summary.isLow && (
              <p className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                ⚠ 최소 잔액({fmtWon(summary.minBalance)}) 미만 — 본사에 충전 요청이 필요합니다
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-[var(--branch-text-light)] mb-1">최소 잔액 기준</p>
            <p className="text-lg font-medium text-[var(--branch-text)] tabular-nums">{fmtWon(summary.minBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--branch-text-light)] mb-1">마지막 업데이트</p>
            <p className="text-sm text-[var(--branch-text-light)] tabular-nums">{fmtDateTime(summary.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* 과금 단가 */}
      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-5">
        <h2 className="text-sm font-semibold text-[var(--branch-text)] mb-3">과금 단가</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <FeeItem label="SMS" value={config.smsFee} />
          <FeeItem label="LMS" value={config.lmsFee} />
          <FeeItem label="주문 수수료" value={config.orderFee} />
          <FeeItem label="최소 잔액" value={config.minBalance} />
        </dl>
      </div>

      {/* 거래 내역 */}
      <div className="rounded-2xl border border-[var(--branch-rose-light)] bg-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--branch-text)]">거래 내역</h2>
          <div className="flex gap-1.5 flex-wrap">
            <FilterButton value="" current={filterType} setter={(v) => { setFilterType(v); setPage(1); }}>전체</FilterButton>
            {(['CHARGE','REFUND','ORDER_FEE','SMS_FEE','ADJUST'] as BranchWalletTxType[]).map((t) => (
              <FilterButton key={t} value={t} current={filterType} setter={(v) => { setFilterType(v); setPage(1); }}>
                {TX_TYPE_LABELS[t].label}
              </FilterButton>
            ))}
          </div>
        </div>

        {txQ.isLoading ? (
          <div className="text-center py-8 text-[var(--branch-text-light)]">로딩 중...</div>
        ) : !tx || tx.items.length === 0 ? (
          <div className="text-center py-10 text-[var(--branch-text-light)]">내역이 없습니다.</div>
        ) : (
          <>
            <div className="divide-y divide-[var(--branch-rose-light)]">
              {tx.items.map((t) => {
                const cfg = TX_TYPE_LABELS[t.type];
                const isPositive = t.amount > 0;
                return (
                  <div key={t.id} className="flex items-start gap-3 py-3">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono tabular-nums text-sm ${isPositive ? 'text-emerald-700' : 'text-[var(--branch-text)]'}`}>
                        {isPositive ? '+' : ''}{t.amount.toLocaleString()}원
                        <span className="text-xs text-[var(--branch-text-light)] ml-2">
                          잔액 {t.balanceAfter.toLocaleString()}원
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--branch-text-light)] mt-0.5">
                        {fmtDateTime(t.createdAt)}
                        {t.memo && <span className="ml-2">· {t.memo}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-[var(--branch-text-light)]">
                총 {tx.total}건 · {page}/{Math.max(1, Math.ceil(tx.total / tx.size))}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-[var(--branch-rose-light)] text-sm disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  이전
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-[var(--branch-rose-light)] text-sm disabled:opacity-40"
                  disabled={page >= Math.ceil(tx.total / tx.size)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeeItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[var(--branch-text-light)] text-xs">{label}</dt>
      <dd className="font-medium tabular-nums text-[var(--branch-text)]">{value.toLocaleString()}원</dd>
    </div>
  );
}

function FilterButton({ value, current, setter, children }: {
  value: BranchWalletTxType | ''; current: BranchWalletTxType | '';
  setter: (v: BranchWalletTxType | '') => void; children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setter(value)}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-[var(--branch-accent)] text-white border-[var(--branch-accent)]' : 'bg-white text-[var(--branch-text-light)] border-[var(--branch-rose-light)] hover:bg-[var(--branch-rose-light)]/30'}`}
    >
      {children}
    </button>
  );
}
