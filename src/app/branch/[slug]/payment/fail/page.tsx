'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePaymentStore } from '@/lib/branch/payment-store';

function PaymentFailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const code = searchParams.get('code') || '';
  const reason = searchParams.get('reason') || '';
  const queryMessage = searchParams.get('message') || '';

  // Vbank reason → 한국어 메시지 매핑
  const VBANK_REASON_MESSAGES: Record<string, { title: string; sub: string }> = {
    expired: {
      title: '입금 시간이 만료되었습니다',
      sub: '마감 시간 내에 입금이 확인되지 않았습니다. 다시 결제를 시도해 주세요.',
    },
    canceled: {
      title: '결제가 취소되었습니다',
      sub: '본사 또는 PG에서 결제 취소 처리되었습니다.',
    },
    'review-required': {
      title: '입금액 확인이 필요합니다',
      sub: '입금액이 결제 요청 금액과 다릅니다. 본사가 확인 후 처리합니다.',
    },
    'missing-vbank-info': {
      title: '결제 정보를 찾을 수 없습니다',
      sub: '주문 페이지로 돌아가 다시 시도해 주세요.',
    },
    failed: {
      title: '결제에 실패했습니다',
      sub: '결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    },
  };

  const vbankMsg = reason ? VBANK_REASON_MESSAGES[reason] : null;
  const title = vbankMsg?.title ?? '결제에 실패했습니다';
  const message = vbankMsg?.sub ?? queryMessage ?? '결제가 취소되었습니다.';
  const clearStore = usePaymentStore((s) => s.clear);

  useEffect(() => {
    clearStore();
  }, [clearStore]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white">
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-500 text-sm mb-2 leading-relaxed">{message}</p>
        {code && (
          <p className="text-gray-400 text-xs mb-8">오류 코드: {code}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            홈으로
          </Link>
          <button
            onClick={() => window.history.go(-2)}
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] md:bg-white">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">로딩 중...</p>
          </div>
        </div>
      }
    >
      <PaymentFailInner />
    </Suspense>
  );
}
