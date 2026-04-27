'use client';

import { CreditCard, Banknote } from 'lucide-react';

interface Props {
  onSelect: (method: 'card' | 'virtual-account') => void;
  loading: 'card' | 'virtual-account' | null;
}

export function PaymentMethodSelector({ onSelect, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">결제수단 선택</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect('card')}
          disabled={loading !== null}
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-gray-300 disabled:opacity-50 transition-colors"
        >
          <CreditCard className="h-6 w-6 text-gray-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-900">카드 결제</div>
            <div className="text-xs text-gray-500">신용/체크 카드 즉시 결제</div>
          </div>
          {loading === 'card' && (
            <span className="text-xs text-gray-400">준비 중…</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect('virtual-account')}
          disabled={loading !== null}
          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-gray-300 disabled:opacity-50 transition-colors"
        >
          <Banknote className="h-6 w-6 text-gray-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-900">가상계좌</div>
            <div className="text-xs text-gray-500">계좌 입금 후 자동 처리</div>
          </div>
          {loading === 'virtual-account' && (
            <span className="text-xs text-gray-400">계좌 발급 중…</span>
          )}
        </button>
      </div>
    </div>
  );
}
