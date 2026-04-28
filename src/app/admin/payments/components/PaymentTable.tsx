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
import { Inbox, MoreHorizontal } from 'lucide-react';

interface PaymentTableProps {
  transactions: TossTransaction[];
  isLoading: boolean;
  onViewDetail: (paymentKey: string) => void;
  onCancel: (paymentKey: string) => void;
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isCancelDisabled(status: string): boolean {
  return status === 'CANCELED' || status === 'EXPIRED' || status === 'ABORTED';
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
  onViewDetail,
  onCancel,
}: {
  paymentKey: string;
  status: string;
  onViewDetail: (k: string) => void;
  onCancel: (k: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">메뉴</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetail(paymentKey)}>
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCancel(paymentKey)}
          className="text-red-600 focus:text-red-600"
          disabled={isCancelDisabled(status)}
        >
          취소
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileCard({
  tx,
  onViewDetail,
  onCancel,
}: {
  tx: TossTransaction;
  onViewDetail: (k: string) => void;
  onCancel: (k: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Badge className={cn('text-[10px]', PAYMENT_STATUS_COLORS[tx.status])}>
          {PAYMENT_STATUS_LABELS[tx.status] || tx.status}
        </Badge>
        <ActionMenu
          paymentKey={tx.paymentKey}
          status={tx.status}
          onViewDetail={onViewDetail}
          onCancel={onCancel}
        />
      </div>
      <div className="font-mono text-xs text-slate-500 truncate">{tx.orderId}</div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold text-slate-900">{formatAmount(tx.amount)}</span>
        <span className="text-xs text-slate-500">{tx.method || '-'}</span>
      </div>
      <div className="text-xs text-slate-400">{formatDate(tx.createdAt)}</div>
    </div>
  );
}

export function PaymentTable({ transactions, isLoading, onViewDetail, onCancel }: PaymentTableProps) {
  return (
    <>
      {/* 데스크탑: 테이블 */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSkeleton />
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">상태</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">주문번호</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">결제금액</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">수단</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">일시</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.transactionKey}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px]', PAYMENT_STATUS_COLORS[tx.status])}>
                        {PAYMENT_STATUS_LABELS[tx.status] || tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {tx.orderId}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.method || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        paymentKey={tx.paymentKey}
                        status={tx.status}
                        onViewDetail={onViewDetail}
                        onCancel={onCancel}
                      />
                    </td>
                  </tr>
                ))}
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
