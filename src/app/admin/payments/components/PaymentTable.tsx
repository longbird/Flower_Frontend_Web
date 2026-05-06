'use client';

import type { TossTransaction } from '@/lib/payments/types';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/payments/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CheckCircle2, Eye, Inbox, MoreHorizontal } from 'lucide-react';

export interface OrderInfo {
  internalOrderId: number | null;
  orderNo: string | null;
  ordererName: string | null;
  receiverName: string | null;
  deliveryAt: string | null;
  orderType: string | null;
}
export type OrderInfoMap = Record<string, OrderInfo | undefined>;

export interface AdminPaymentTransaction extends TossTransaction {
  source?: 'TOSS' | 'INNOPAY_VBANK';
  orderInfo?: OrderInfo;
  vbank?: {
    paymentId: number;
    accountNumber: string;
    bankCode: string;
    bankName: string | null;
    holderName: string;
    dueDate: string;
    paidAmount: number | null;
    innopayMode: 'TEST' | 'REAL';
  };
}

interface PaymentTableProps {
  transactions: AdminPaymentTransaction[];
  orderInfo?: OrderInfoMap;
  orderNames?: Record<string, string>;
  isLoading: boolean;
  isEnriching?: boolean; // orderInfo / orderNames 가 아직 안 도착한 상태
  onViewDetail: (paymentKey: string) => void;
  onCancel: (paymentKey: string) => void;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  WEDDING: '결혼식',
  FUNERAL: '장례식',
  CONGRATULATION: '축하',
  CONDOLENCE: '근조',
  GENERAL: '일반',
  GIFT: '선물',
  EVENT: '행사',
};

function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDeliveryDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isCancelDisabled(status: string): boolean {
  return status === 'CANCELED' || status === 'EXPIRED' || status === 'ABORTED';
}

function paymentState(tx: AdminPaymentTransaction): { label: string; reason: string; className: string } {
  if (tx.source === 'INNOPAY_VBANK') {
    if (tx.status === 'WAITING_FOR_DEPOSIT') {
      return {
        label: '입금대기',
        reason: '가상계좌 입금 대기',
        className: 'border-sky-200 bg-sky-50 text-sky-800',
      };
    }
    if (tx.status === 'IN_PROGRESS') {
      return {
        label: '검토필요',
        reason: '자동 매칭 확인 필요',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    }
  }

  if (tx.status === 'IN_PROGRESS') {
    return {
      label: '확인필요',
      reason: '승인 진행 중',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  if (tx.status === 'WAITING_FOR_DEPOSIT') {
    return {
      label: '입금대기',
      reason: '입금 확인 전',
      className: 'border-sky-200 bg-sky-50 text-sky-800',
    };
  }
  if (tx.status === 'DONE') {
    return {
      label: '완료',
      reason: tx.source === 'INNOPAY_VBANK' ? '자동 매칭' : '승인 완료',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }
  if (tx.status === 'ABORTED') {
    return {
      label: '실패',
      reason: '승인 실패',
      className: 'border-rose-200 bg-rose-50 text-rose-800',
    };
  }
  if (tx.status === 'CANCELED' || tx.status === 'PARTIAL_CANCELED') {
    return {
      label: PAYMENT_STATUS_LABELS[tx.status] || tx.status,
      reason: '취소 처리',
      className: 'border-rose-200 bg-rose-50 text-rose-800',
    };
  }

  return {
    label: PAYMENT_STATUS_LABELS[tx.status] || tx.status,
    reason: '상태 확인',
    className: PAYMENT_STATUS_COLORS[tx.status],
  };
}

function StatusBlock({ tx }: { tx: AdminPaymentTransaction }) {
  const state = paymentState(tx);
  return (
    <div className="space-y-1">
      <Badge variant="outline" className={cn('rounded-md px-2 py-1 text-xs', state.className)}>
        {state.label}
      </Badge>
      <div className="text-xs font-medium text-slate-500">{state.reason}</div>
    </div>
  );
}

/**
 * 주문 메타 → 사람이 읽는 한 줄 요약.
 * 우선순위: orders 매칭 > Toss orderName > (enrichment 진행 중이면 placeholder) > orderId truncate.
 */
function orderLabel(
  tx: TossTransaction,
  info: OrderInfo | undefined,
  orderName: string | undefined,
  enriching: boolean,
): { primary: string; secondary: string | null; pending: boolean } {
  if (info) {
    const typeLabel = info.orderType ? (ORDER_TYPE_LABELS[info.orderType] ?? info.orderType) : null;
    const primary = info.ordererName ?? (info.orderNo ?? tx.orderId);
    const secondaryParts: string[] = [];
    if (typeLabel) secondaryParts.push(typeLabel);
    if (info.receiverName) secondaryParts.push(`→ ${info.receiverName}`);
    const delivery = formatDeliveryDate(info.deliveryAt);
    if (delivery) secondaryParts.push(delivery);
    return {
      primary,
      secondary: secondaryParts.length > 0 ? secondaryParts.join(' · ') : null,
      pending: false,
    };
  }
  if (orderName) {
    return { primary: orderName, secondary: null, pending: false };
  }
  // 아직 enrichment 진행 중 → orderId 노출 대신 placeholder (깜빡임 방지)
  if (enriching) {
    return { primary: '주문명 불러오는 중…', secondary: null, pending: true };
  }
  // 최종 fallback: orderId 앞 30자 truncate
  return {
    primary: tx.orderId.length > 30 ? tx.orderId.slice(0, 30) + '…' : tx.orderId,
    secondary: null,
    pending: false,
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded flex-1" />
          <div className="h-8 w-8 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function MobileLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-12 bg-slate-200 rounded-full" />
            <div className="h-4 w-4 bg-slate-200 rounded" />
          </div>
          <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
          <div className="h-6 w-1/3 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-500">결제 내역이 없습니다.</p>
    </div>
  );
}

function ActionMenu({
  paymentKey,
  status,
  source,
  onViewDetail,
  onCancel,
}: {
  paymentKey: string;
  status: string;
  source?: 'TOSS' | 'INNOPAY_VBANK';
  onViewDetail: (k: string) => void;
  onCancel: (k: string) => void;
}) {
  if (source === 'INNOPAY_VBANK') {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="h-7 gap-1.5 rounded-md px-2 text-xs"
        onClick={() => onViewDetail(paymentKey)}
      >
        <Eye className="h-3 w-3" />
        상세
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="h-7 gap-1.5 rounded-md px-2 text-xs"
        onClick={() => onViewDetail(paymentKey)}
      >
        <Eye className="h-3 w-3" />
        상세
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">메뉴</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onCancel(paymentKey)}
            className="text-red-600 focus:text-red-600"
            disabled={isCancelDisabled(status)}
          >
            취소
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MobileActions({
  paymentKey,
  status,
  source,
  onViewDetail,
  onCancel,
}: {
  paymentKey: string;
  status: string;
  source?: 'TOSS' | 'INNOPAY_VBANK';
  onViewDetail: (k: string) => void;
  onCancel: (k: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-md"
        onClick={() => onViewDetail(paymentKey)}
      >
        상세
      </Button>
      {source === 'INNOPAY_VBANK' || isCancelDisabled(status) ? (
        <Button
          type="button"
          size="sm"
          className="rounded-md bg-[#4f6d38] hover:bg-[#3d5229]"
          onClick={() => onViewDetail(paymentKey)}
        >
          <CheckCircle2 className="h-4 w-4" />
          확인
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md text-red-600 hover:text-red-700"
          onClick={() => onCancel(paymentKey)}
        >
          취소
        </Button>
      )}
    </div>
  );
}

function MobileCard({
  tx,
  info,
  orderName,
  enriching,
  onViewDetail,
  onCancel,
}: {
  tx: AdminPaymentTransaction;
  info: OrderInfo | undefined;
  orderName: string | undefined;
  enriching: boolean;
  onViewDetail: (k: string) => void;
  onCancel: (k: string) => void;
}) {
  const label = orderLabel(tx, info, orderName, enriching);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <StatusBlock tx={tx} />
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </div>
      <button
        type="button"
        onClick={() => onViewDetail(tx.paymentKey)}
        className="block w-full text-left"
      >
        <div className={cn('text-sm font-medium truncate', label.pending ? 'text-slate-400 italic' : 'text-slate-900')}>
          {label.primary}
        </div>
        {label.secondary && (
          <div className="text-xs text-slate-500 truncate mt-0.5">{label.secondary}</div>
        )}
      </button>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold text-slate-900">{formatAmount(tx.amount)}</span>
        <span className="text-xs text-slate-500">{tx.method || '-'}</span>
      </div>
      {tx.vbank && (
        <div className="text-xs text-slate-500">
          {tx.vbank.bankName ?? tx.vbank.bankCode} {tx.vbank.accountNumber}
        </div>
      )}
      <div className="text-xs text-slate-400">{formatDate(tx.transactionAt)}</div>
      <MobileActions
        paymentKey={tx.paymentKey}
        status={tx.status}
        source={tx.source}
        onViewDetail={onViewDetail}
        onCancel={onCancel}
      />
    </div>
  );
}

export function PaymentTable({ transactions, orderInfo = {}, orderNames = {}, isLoading, isEnriching = false, onViewDetail, onCancel }: PaymentTableProps) {
  return (
    <>
      {/* 데스크탑: 테이블 */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        {isLoading ? (
          <LoadingSkeleton />
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">주문</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">결제금액</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">수단</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">결제일시</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const info = tx.orderInfo ?? orderInfo[tx.orderId];
                  const label = orderLabel(tx, info, orderNames[tx.paymentKey], isEnriching);
                  return (
                    <tr
                      key={tx.transactionKey}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <StatusBlock tx={tx} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onViewDetail(tx.paymentKey)}
                          className="text-left hover:underline focus:underline focus:outline-none"
                          title={tx.source === 'INNOPAY_VBANK' ? '가상계좌 결제' : '상세 보기'}
                        >
                          <div className={cn('font-medium', label.pending ? 'text-slate-400 italic' : 'text-slate-900')}>
                            {label.primary}
                          </div>
                          {label.secondary && (
                            <div className="text-xs text-slate-500 mt-0.5">{label.secondary}</div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{tx.method || '-'}</div>
                        {tx.vbank && (
                          <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                            {tx.vbank.accountNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(tx.transactionAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          paymentKey={tx.paymentKey}
                          status={tx.status}
                          source={tx.source}
                          onViewDetail={onViewDetail}
                          onCancel={onCancel}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="md:hidden">
        {isLoading ? (
          <MobileLoadingSkeleton />
        ) : transactions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <EmptyState />
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <MobileCard
                key={tx.transactionKey}
                tx={tx}
                info={tx.orderInfo ?? orderInfo[tx.orderId]}
                orderName={orderNames[tx.paymentKey]}
                enriching={isEnriching}
                onViewDetail={onViewDetail}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
