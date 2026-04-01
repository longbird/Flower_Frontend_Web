'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { submitConsultRequest, submitOrderRequest } from '@/lib/branch/api';
import { usePaymentStore, dataUrlToFile } from '@/lib/branch/payment-store';

function PaymentSuccessInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const paymentType = searchParams.get('paymentType');

  const clearStore = usePaymentStore((s) => s.clear);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function processPayment() {
      if (!paymentKey || !orderId || !amount) {
        setStatus('error');
        setErrorMessage('결제 정보가 올바르지 않습니다.');
        return;
      }

      // persist 미들웨어 hydration 대기
      if (!usePaymentStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = usePaymentStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      const orderData = usePaymentStore.getState().orderData;
      const ribbonImage = usePaymentStore.getState().ribbonImage;
      const businessRegFile = usePaymentStore.getState().businessRegFile;

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

        // 2. 주문 등록
        const paymentInfo = `\n[결제] paymentKey=${paymentKey}, orderId=${orderId}, amount=${amount}, type=${paymentType}`;
        const message = `${orderData.message}${paymentInfo}`;
        const hasFiles = ribbonImage || businessRegFile;

        let orderSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            let result: { ok: boolean; message?: string };

            if (hasFiles) {
              // FormData 전송 (파일 포함)
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
              formData.append('message', message);

              if (ribbonImage) {
                formData.append('ribbonImage', dataUrlToFile(ribbonImage));
              }
              if (businessRegFile) {
                formData.append('businessRegFile', dataUrlToFile(businessRegFile));
              }

              result = await submitOrderRequest(slug, formData);
            } else {
              // JSON 전송 (파일 없음)
              result = await submitConsultRequest(slug, {
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                productCode: String(orderData.productId),
                productName: orderData.productName,
                desiredDate: orderData.desiredDate,
                deliveryPurpose: orderData.deliveryPurpose,
                invoiceType: orderData.invoiceType,
                cashReceiptPhone: orderData.invoiceType === 'CASH_RECEIPT' ? orderData.cashReceiptPhone : undefined,
                recipientName: orderData.recipientName,
                recipientPhone: orderData.recipientPhone,
                address: orderData.address,
                deliveryTime: orderData.deliveryTime || undefined,
                ribbonText: orderData.ribbonText || undefined,
                memo: orderData.memo || undefined,
                message,
              });
            }

            if (result.ok) {
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
  }, [paymentKey, orderId, amount, paymentType, slug, clearStore]);

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
