'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getBranchWallet,
  listBranchWalletTransactions,
  chargeBranchWallet,
  refundBranchWallet,
  updateBranchWalletConfig,
  type WalletTxType,
} from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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

const TX_TYPE_LABELS: Record<WalletTxType, { label: string; className: string }> = {
  CHARGE:       { label: '충전',          className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REFUND:       { label: '환불/조정',     className: 'bg-blue-100 text-blue-700 border-blue-200' },
  ORDER_FEE:    { label: '주문수수료',    className: 'bg-slate-100 text-slate-700 border-slate-200' },
  SMS_FEE:      { label: 'SMS',           className: 'bg-slate-100 text-slate-700 border-slate-200' },
  ADJUST:       { label: '조정',          className: 'bg-amber-100 text-amber-700 border-amber-200' },
  VBANK_HOLD:   { label: '가상계좌 차감', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  VBANK_SETTLE: { label: '가상계좌 환원', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export default function BranchWalletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const branchId = Number(id);
  const qc = useQueryClient();

  const [filterType, setFilterType] = useState<WalletTxType | ''>('');
  const [page, setPage] = useState(1);

  const walletQ = useQuery({
    queryKey: ['admin-wallet', branchId],
    queryFn: () => getBranchWallet(branchId),
    enabled: !Number.isNaN(branchId),
  });

  const txQ = useQuery({
    queryKey: ['admin-wallet-tx', branchId, filterType, page],
    queryFn: () =>
      listBranchWalletTransactions(branchId, {
        type: filterType || undefined,
        page,
        size: 20,
      }),
    enabled: !Number.isNaN(branchId),
  });

  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeMemo, setChargeMemo] = useState('');

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMemo, setRefundMemo] = useState('');

  const [configOpen, setConfigOpen] = useState(false);
  const [cfgSmsFee, setCfgSmsFee] = useState('');
  const [cfgLmsFee, setCfgLmsFee] = useState('');
  const [cfgOrderFee, setCfgOrderFee] = useState('');
  const [cfgMinBalance, setCfgMinBalance] = useState('');

  const chargeMutation = useMutation({
    mutationFn: () => chargeBranchWallet(branchId, Number(chargeAmount), chargeMemo.trim() || undefined),
    onSuccess: () => {
      toast.success('충전이 완료되었습니다.');
      setChargeOpen(false);
      setChargeAmount('');
      setChargeMemo('');
      qc.invalidateQueries({ queryKey: ['admin-wallet', branchId] });
      qc.invalidateQueries({ queryKey: ['admin-wallet-tx', branchId] });
    },
    onError: (err: Error) => toast.error(err.message || '충전에 실패했습니다.'),
  });

  const refundMutation = useMutation({
    mutationFn: () => refundBranchWallet(branchId, Number(refundAmount), refundMemo.trim() || undefined),
    onSuccess: () => {
      toast.success('환불 처리되었습니다.');
      setRefundOpen(false);
      setRefundAmount('');
      setRefundMemo('');
      qc.invalidateQueries({ queryKey: ['admin-wallet', branchId] });
      qc.invalidateQueries({ queryKey: ['admin-wallet-tx', branchId] });
    },
    onError: (err: Error) => toast.error(err.message || '환불에 실패했습니다.'),
  });

  const configMutation = useMutation({
    mutationFn: () => {
      const parseOrNull = (s: string) => {
        const t = s.trim();
        if (t === '') return undefined; // 변경 없음
        if (t === '-') return null; // 기본값 되돌리기
        const n = Number(t);
        return Number.isFinite(n) ? n : undefined;
      };
      return updateBranchWalletConfig(branchId, {
        smsFee: parseOrNull(cfgSmsFee),
        lmsFee: parseOrNull(cfgLmsFee),
        orderFee: parseOrNull(cfgOrderFee),
        minBalanceOverride: parseOrNull(cfgMinBalance),
      });
    },
    onSuccess: () => {
      toast.success('과금 설정이 저장되었습니다.');
      setConfigOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-wallet', branchId] });
    },
    onError: (err: Error) => toast.error(err.message || '저장에 실패했습니다.'),
  });

  const openConfig = () => {
    const c = walletQ.data?.config;
    setCfgSmsFee(c?.smsFeeOverride != null ? String(c.smsFeeOverride) : '');
    setCfgLmsFee(c?.lmsFeeOverride != null ? String(c.lmsFeeOverride) : '');
    setCfgOrderFee(c?.orderFeeOverride != null ? String(c.orderFeeOverride) : '');
    setCfgMinBalance(c?.minBalanceOverride != null ? String(c.minBalanceOverride) : '');
    setConfigOpen(true);
  };

  if (walletQ.isLoading) {
    return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  }
  if (walletQ.isError || !walletQ.data) {
    return <div className="text-center py-12 text-red-500">지갑 정보를 불러오지 못했습니다.</div>;
  }

  const { summary, config } = walletQ.data;
  const tx = txQ.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href={`/admin/branches/${id}`}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지사 상세로
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">충전금 관리</h1>
          <p className="text-xs text-slate-500 mt-0.5">{summary.branchName}</p>
        </div>
      </div>

      {/* 잔액 카드 */}
      <Card className={summary.isLow ? 'border-red-200 bg-red-50/30' : ''}>
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">현재 잔액</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{fmtWon(summary.balance)}</p>
            {summary.isLow && (
              <Badge className="mt-1.5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                ⚠ 최소 잔액 미만
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">최소 잔액 기준</p>
            <p className="text-lg font-medium text-slate-700 tabular-nums">{fmtWon(summary.minBalance)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {config.minBalanceOverride != null ? '지사별 커스텀' : '글로벌 기본값'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">마지막 업데이트</p>
            <p className="text-sm text-slate-600 tabular-nums">{fmtDateTime(summary.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* 액션 */}
      <div className="flex flex-wrap gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setChargeOpen(true)}>
          + 충전
        </Button>
        <Button variant="outline" onClick={() => setRefundOpen(true)}>환불/조정</Button>
        <Button variant="outline" onClick={openConfig}>과금 단가 설정</Button>
      </div>

      {/* 과금 단가 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">과금 단가</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <FeeItem label="SMS" value={config.smsFee} custom={config.smsFeeOverride != null} />
            <FeeItem label="LMS" value={config.lmsFee} custom={config.lmsFeeOverride != null} />
            <FeeItem label="주문 수수료" value={config.orderFee} custom={config.orderFeeOverride != null} />
            <FeeItem label="최소 잔액" value={config.minBalance} custom={config.minBalanceOverride != null} />
          </dl>
        </CardContent>
      </Card>

      {/* 거래 내역 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">거래 내역</CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              <FilterButton value="" current={filterType} setter={(v) => { setFilterType(v); setPage(1); }}>전체</FilterButton>
              {(['CHARGE','REFUND','ORDER_FEE','SMS_FEE','ADJUST','VBANK_HOLD','VBANK_SETTLE'] as WalletTxType[]).map((t) => (
                <FilterButton key={t} value={t} current={filterType} setter={(v) => { setFilterType(v); setPage(1); }}>
                  {TX_TYPE_LABELS[t].label}
                </FilterButton>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {txQ.isLoading ? (
            <div className="text-center py-8 text-slate-400">로딩 중...</div>
          ) : !tx || tx.items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">내역이 없습니다.</div>
          ) : (
            <>
              <div className="space-y-1.5">
                {tx.items.map((t) => {
                  const typeCfg = TX_TYPE_LABELS[t.type];
                  const isPositive = t.amount > 0;
                  return (
                    <div key={t.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <Badge className={`${typeCfg.className} shrink-0 hover:${typeCfg.className}`}>
                        {typeCfg.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className={`font-mono tabular-nums text-sm ${isPositive ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {isPositive ? '+' : ''}{t.amount.toLocaleString()}원
                          <span className="text-xs text-slate-400 ml-2">잔액 {t.balanceAfter.toLocaleString()}원</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {fmtDateTime(t.createdAt)}
                          {t.memo && <span className="ml-2">· {t.memo}</span>}
                          {t.refType && t.refId && <span className="ml-2 text-slate-400">· {t.refType}#{t.refId}</span>}
                          {t.actorType && <span className="ml-2 text-slate-400">· {t.actorType}{t.actorId ? `#${t.actorId}` : ''}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-slate-500">총 {tx.total}건 · {page}/{Math.max(1, Math.ceil(tx.total / tx.size))}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
                  <Button size="sm" variant="outline" disabled={page >= Math.ceil(tx.total / tx.size)} onClick={() => setPage((p) => p + 1)}>다음</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 충전 dialog */}
      <Dialog open={chargeOpen} onOpenChange={(o) => !o && setChargeOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>충전</DialogTitle>
            <DialogDescription>지사 계좌 입금 확인 후 반영하세요. 충전 후 잔액에 즉시 반영됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="chg-amount">충전 금액 (원)</Label>
              <Input id="chg-amount" type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="예: 100000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-memo">메모 (선택)</Label>
              <Input id="chg-memo" value={chargeMemo} onChange={(e) => setChargeMemo(e.target.value)} placeholder="예: 2026-04-21 은행 입금 확인" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>취소</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={chargeMutation.isPending || !chargeAmount || Number(chargeAmount) <= 0}
              onClick={() => chargeMutation.mutate()}
            >
              {chargeMutation.isPending ? '처리 중...' : '충전 실행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 환불 dialog */}
      <Dialog open={refundOpen} onOpenChange={(o) => !o && setRefundOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불/조정</DialogTitle>
            <DialogDescription>잔액에 추가 금액을 반영합니다. 오차 보정 또는 취소건 환수 용도.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rf-amount">금액 (원)</Label>
              <Input id="rf-amount" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="예: 5000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rf-memo">메모 (필수 권장)</Label>
              <Input id="rf-memo" value={refundMemo} onChange={(e) => setRefundMemo(e.target.value)} placeholder="예: 주문 #234 취소 수수료 환수" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={refundMutation.isPending || !refundAmount || Number(refundAmount) <= 0}
              onClick={() => refundMutation.mutate()}
            >
              {refundMutation.isPending ? '처리 중...' : '환불 실행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 과금 설정 dialog */}
      <Dialog open={configOpen} onOpenChange={(o) => !o && setConfigOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과금 단가 설정</DialogTitle>
            <DialogDescription>빈 칸은 변경 없음, &quot;-&quot; 입력 시 글로벌 기본값으로 되돌림.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ConfigField id="cfg-sms" label="SMS 단가 (원, 기본 30)" value={cfgSmsFee} setter={setCfgSmsFee} />
            <ConfigField id="cfg-lms" label="LMS 단가 (원, 기본 50)" value={cfgLmsFee} setter={setCfgLmsFee} />
            <ConfigField id="cfg-order" label="주문 수수료 (원, 기본 500)" value={cfgOrderFee} setter={setCfgOrderFee} />
            <ConfigField id="cfg-min" label="최소 잔액 (원, 기본 10,000)" value={cfgMinBalance} setter={setCfgMinBalance} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>취소</Button>
            <Button disabled={configMutation.isPending} onClick={() => configMutation.mutate()}>
              {configMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeeItem({ label, value, custom }: { label: string; value: number; custom: boolean }) {
  return (
    <div>
      <dt className="text-slate-400 text-xs">{label}</dt>
      <dd className="font-medium tabular-nums">{value.toLocaleString()}원</dd>
      <div className="text-[10px] text-slate-400 mt-0.5">{custom ? '커스텀' : '기본값'}</div>
    </div>
  );
}

function FilterButton({ value, current, setter, children }: {
  value: WalletTxType | ''; current: WalletTxType | ''; setter: (v: WalletTxType | '') => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setter(value)}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}

function ConfigField({ id, label, value, setter }: {
  id: string; label: string; value: string; setter: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => setter(e.target.value)} placeholder="- 입력 시 기본값" />
    </div>
  );
}
