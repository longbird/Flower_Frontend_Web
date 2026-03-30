'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { submitOrderRequest } from '@/lib/branch/api';
import { usePaymentStore } from '@/lib/branch/payment-store';

function PaymentSuccessInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const method = searchParams.get('method');
  const isVirtualAccount = method === 'virtual-account';

  // 카드결제 파라미터
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  // 가상계좌 파라미터
  const vaBankCode = searchParams.get('bankCode');
  const vaAccountNumber = searchParams.get('accountNumber');
  const vaCustomerName = searchParams.get('customerName');
  const vaDueDate = searchParams.get('dueDate');
  const vaAmount = searchParams.get('amount');
  const vaOrderName = searchParams.get('orderName');

  const orderData = usePaymentStore((s) => s.orderData);
  const ribbonImage = usePaymentStore((s) => s.ribbonImage);
  const businessRegFile = usePaymentStore((s) => s.businessRegFile);
  const clearStore = usePaymentStore((s) => s.clear);

  const [status, setStatus] = useState<'loading' | 'success' | 'waiting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const processedRef = useRef(false);

  // 가상계좌: 바로 대기 화면 표시
  useEffect(() => {
    if (isVirtualAccount && vaAccountNumber) {
      clearStore();
      setStatus('waiting');
    }
  }, [isVirtualAccount, vaAccountNumber, clearStore]);

  // 카드결제: 기존 confirm 플로우
  useEffect(() => {
    if (isVirtualAccount || processedRef.current) return;
    processedRef.current = true;

    async function processPayment() {
      if (!paymentKey || !orderId || !amount) {
        setStatus('error');
        setErrorMessage('결제 정보가 올바르지 않습니다.');
        return;
      }

      if (!orderData) {
        setStatus('error');
        setErrorMessage('주문 정보를 찾을 수 없습니다. 페이지를 새로고침하면 주문 정보가 초기화됩니다.');
        return;
      }

      try {
        // 1. 결제 승인
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmData.ok) {
          setStatus('error');
          setErrorMessage(confirmData.message || '결제 승인에 실패했습니다.');
          return;
        }

        // 2. 주문 등록 (재시도 포함)
        let orderSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const formData = new FormData();
            formData.append('customerName', orderData.customerName);
            formData.append('customerPhone', orderData.customerPhone);
            formData.append('productCode', String(orderData.productId));
            formData.append('productName', orderData.productName);
            formData.append('desiredDate', orderData.desiredDate);
            formData.append('deliveryPurpose', orderData.deliveryPurpose);
            formData.append('invoiceType', orderData.invoiceType);
            if (orderData.invoiceType === 'CASH_RECEIPT' && orderData.cashReceiptPhone) {
              formData.append('cashReceiptPhone', orderData.cashReceiptPhone);
            }
            formData.append('recipientName', orderData.recipientName);
            formData.append('recipientPhone', orderData.recipientPhone);
            formData.append('address', orderData.address);
            if (orderData.deliveryTime) formData.append('deliveryTime', orderData.deliveryTime);
            if (orderData.ribbonText) formData.append('ribbonText', orderData.ribbonText);
            if (orderData.memo) formData.append('memo', orderData.memo);
            formData.append('message', orderData.message);
            formData.append('paymentKey', paymentKey);
            formData.append('orderId', orderId);
            formData.append('paymentAmount', amount);
            if (ribbonImage) formData.append('ribbonImage', ribbonImage);
            if (businessRegFile) formData.append('businessRegistration', businessRegFile);

            const orderResult = await submitOrderRequest(slug, formData);
            if (orderResult.ok) {
              orderSuccess = true;
              break;
            }
          } catch {
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (orderSuccess) {
          clearStore();
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(
            `결제는 완료되었으나 주문 등록에 실패했습니다.\n결제번호: ${paymentKey}\n주문번호: ${orderId}\n지사에 직접 연락해 주세요.`,
          );
        }
      } catch {
        setStatus('error');
        setErrorMessage('처리 중 오류가 발생했습니다. 지사에 직접 연락해 주세요.');
      }
    }

    processPayment();
  }, [paymentKey, orderId, amount, orderData, ribbonImage, businessRegFile, slug, clearStore, isVirtualAccount]);

  const handleCopyAccount = async () => {
    if (!vaAccountNumber) return;
    try {
      await navigator.clipboard.writeText(vaAccountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${d.getMinutes()}분`;
    } catch {
      return dateStr;
    }
  };

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

  // 가상계좌 입금 대기
  if (status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white">
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">가상계좌 발급 완료</h1>
          <p className="text-gray-500 text-sm mb-6">아래 계좌로 입금해 주세요.</p>

          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-3">
            {vaOrderName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품</span>
                <span className="font-medium text-gray-900">{vaOrderName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">금액</span>
              <span className="font-bold text-lg text-emerald-600">
                {vaAmount ? Number(vaAmount).toLocaleString() : '-'}원
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">입금 은행</span>
                <span className="font-medium text-gray-900">{vaBankCode}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-500">계좌번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">{vaAccountNumber}</span>
                  <button
                    onClick={handleCopyAccount}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">입금자명</span>
                <span className="text-gray-900">{vaCustomerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">입금 기한</span>
                <span className="text-red-600 font-medium">{formatDueDate(vaDueDate)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            입금 확인 후 주문이 자동 접수됩니다.
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

  // 카드결제 완료
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white">
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">결제가 완료되었습니다</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          빠른 시간 내에 연락드리겠습니다.<br />감사합니다.
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
