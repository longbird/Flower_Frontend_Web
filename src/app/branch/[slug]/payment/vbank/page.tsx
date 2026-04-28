'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { usePaymentStore } from '@/lib/branch/payment-store';
import { useVbankPoll } from './use-vbank-poll';
import { VbankInfoCard } from './vbank-info-card';

function VbankPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const paymentIdQuery = Number(searchParams.get('paymentId') ?? '0');

  const vbankInfo = usePaymentStore((s) => s.vbankInfo);
  const clearVbankInfo = usePaymentStore((s) => s.clearVbankInfo);

  // 발급 정보 없거나 paymentId 미일치 → fail 페이지
  useEffect(() => {
    if (!vbankInfo || vbankInfo.paymentId !== paymentIdQuery) {
      router.replace(`/branch/${slug}/payment/fail?reason=missing-vbank-info`);
    }
  }, [vbankInfo, paymentIdQuery, router, slug]);

  useVbankPoll({
    paymentId: paymentIdQuery,
    dueDate: vbankInfo?.dueDate ?? new Date(Date.now() - 1).toISOString(),
    onTerminal: (result) => {
      if (result.status === 'PAID') {
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/success?paymentId=${paymentIdQuery}&method=vbank`);
      } else if (result.status === 'REVIEW_REQUIRED') {
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/fail?reason=review-required&paymentId=${paymentIdQuery}`);
      } else {
        // CANCELED or FAILED
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/fail?reason=${result.status.toLowerCase()}`);
      }
    },
    onExpired: () => {
      clearVbankInfo();
      router.replace(`/branch/${slug}/payment/fail?reason=expired`);
    },
    onError: (err) => {
      toast.error(`상태 조회 오류 — 새로고침해 주세요 (${err.message})`);
    },
  });

  if (!vbankInfo) return null; // useEffect handles redirect

  return (
    <div className="min-h-screen bg-[#f5f5f0] md:bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <h1 className="text-lg font-semibold text-gray-900">결제 진행 중</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <VbankInfoCard
          bankName={vbankInfo.bankName}
          bankCode={vbankInfo.bankCode}
          accountNumber={vbankInfo.accountNumber}
          holderName={vbankInfo.holderName}
          amount={vbankInfo.amount}
          dueDate={vbankInfo.dueDate}
        />

        <p className="text-center text-xs text-gray-500">
          입금 확인 시 자동으로 다음 페이지로 이동합니다.
        </p>
      </div>
    </div>
  );
}

export default function VbankPage() {
  return (
    <Suspense fallback={null}>
      <VbankPageInner />
    </Suspense>
  );
}
