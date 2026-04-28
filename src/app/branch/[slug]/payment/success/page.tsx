'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmTossPayment, pollVbankStatus } from '@/lib/branch/api';
import { usePaymentStore } from '@/lib/branch/payment-store';

function PaymentSuccessInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const method = searchParams.get('method'); // 'vbank' for vbank flow
  const isVbank = method === 'vbank';
  const vbankPaymentIdRaw = searchParams.get('paymentId');
  const vbankPaymentId = vbankPaymentIdRaw ? Number(vbankPaymentIdRaw) : null;

  const paymentKey = searchParams.get('paymentKey');
  const tossOrderId = searchParams.get('orderId'); // RF_<consultId>_<ts>
  const amount = searchParams.get('amount');

  const clearStore = usePaymentStore((s) => s.clear);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Vbank flow: backend already SETTLED via webhook. Verify by polling status —
    // never trust the query parameter alone, otherwise anyone with the URL could
    // see a "성공" screen for an unpaid order.
    if (isVbank) {
      if (!vbankPaymentId || !Number.isFinite(vbankPaymentId)) {
        setStatus('error');
        setErrorMessage('가상계좌 결제 정보가 올바르지 않습니다.');
        return;
      }
      void (async () => {
        try {
          const res = await pollVbankStatus(vbankPaymentId);
          if (res.status === 'PAID') {
            clearStore();
            setStatus('success');
          } else {
            setStatus('error');
            setErrorMessage(
              `가상계좌 결제가 아직 완료되지 않았습니다 (현재 상태: ${res.status}).`,
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('error');
          setErrorMessage(`결제 상태 확인 실패: ${msg}`);
        }
      })();
      return;
    }

    async function processPayment() {
      if (!paymentKey || !tossOrderId || !amount) {
        setStatus('error');
        setErrorMessage('결제 정보가 올바르지 않습니다.');
        return;
      }

      try {
        // 백엔드가 멱등 보장 — 새로고침/재시도 시 alreadyPaid:true 응답
        const res = await confirmTossPayment({
          paymentKey,
          orderId: tossOrderId,
          amount: Number(amount),
        });
        if (res.ok) {
          setAlreadyPaid(Boolean(res.alreadyPaid));
          clearStore();
          setStatus('success');
          return;
        }
        // confirmTossPayment는 4xx/5xx에서 throw하므로 여기 도달하면 비정상
        setStatus('error');
        setErrorMessage('결제 처리 결과를 확인하지 못했습니다. 지사에 문의해 주세요.');
      } catch (err) {
        const message = err instanceof Error ? err.message : '결제 확정 중 오류가 발생했습니다.';
        setStatus('error');
        setErrorMessage(
          `${message}\n결제번호: ${paymentKey}\n주문번호: ${tossOrderId}\n지사에 직접 연락해 주세요.`,
        );
      }
    }

    processPayment();
  }, [paymentKey, tossOrderId, amount, slug, clearStore, isVbank, vbankPaymentId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] md:bg-white">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">결제 확인 중...</p>
          <p className="text-gray-400 text-sm mt-1">잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white">
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">결제 처리 중 오류</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed whitespace-pre-line">{errorMessage}</p>
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center justify-center px-8 py-3 bg-gray-900 text-white rounded-full text-base font-medium hover:bg-gray-800 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white">
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isVbank
            ? '입금이 확인되었습니다'
            : alreadyPaid
            ? '이미 결제가 완료된 주문입니다'
            : '결제가 완료되었습니다'}
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          {isVbank
            ? '가상계좌 입금이 자동으로 처리되었습니다. 빠른 시간 내에 연락드리겠습니다.'
            : <>빠른 시간 내에 연락드리겠습니다.<br />감사합니다.</>}
        </p>
        <Link
          href={`/branch/${slug}`}
          className="inline-flex items-center justify-center px-8 py-3 bg-emerald-600 text-white rounded-full text-base font-medium hover:bg-emerald-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
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
      <PaymentSuccessInner />
    </Suspense>
  );
}
