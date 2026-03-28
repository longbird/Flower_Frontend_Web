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
  const message = searchParams.get('message') || '결제가 취소되었습니다.';
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">결제에 실패했습니다</h1>
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
