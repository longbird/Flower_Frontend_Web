'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bankName: string | null;
  bankCode: string;
  accountNumber: string;
  holderName: string;
  amount: number;
  dueDate: string; // ISO 8601
}

function formatPriceKRW(value: number): string {
  return value.toLocaleString('ko-KR') + '원';
}

export function VbankInfoCard({ bankName, bankCode, accountNumber, holderName, amount, dueDate }: Props) {
  const due = new Date(dueDate);
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">가상계좌 입금 안내</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <dt className="text-gray-500">은행</dt>
          <dd className="font-medium text-gray-900">{bankName ?? `(${bankCode})`}</dd>
        </div>
        <div className="flex justify-between items-center gap-2">
          <dt className="text-gray-500 shrink-0">계좌번호</dt>
          <dd className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-base font-semibold tracking-wider text-gray-900 truncate">
              {accountNumber}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(accountNumber);
                  toast.success('계좌번호 복사됨');
                } catch {
                  toast.error('계좌번호 복사 실패 — 직접 선택해 주세요');
                }
              }}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="계좌번호 복사"
            >
              <Copy className="h-4 w-4" />
            </button>
          </dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-gray-500">예금주</dt>
          <dd className="text-gray-900">{holderName}</dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-gray-500">입금액</dt>
          <dd className="font-semibold text-gray-900">{formatPriceKRW(amount)}</dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-gray-500">마감</dt>
          <dd className="text-gray-700 text-xs">{due.toLocaleString('ko-KR')}</dd>
        </div>
      </dl>

      <p className="text-xs text-gray-500 leading-relaxed">
        • 정확한 금액으로 입금하셔야 자동 처리됩니다. 부분/초과 입금 시 처리 지연 가능.<br />
        • 입금 후 자동으로 결제 완료 페이지로 이동합니다 (보통 1~3분 소요).
      </p>
    </div>
  );
}
