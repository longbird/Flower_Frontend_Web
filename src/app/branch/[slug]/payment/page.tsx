'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import {
  fetchBranchInfo,
  createPayment,
  parseTossClientSecret,
  type TossClientSecret,
} from '@/lib/branch/api';
import type { BranchInfo } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import { usePaymentStore } from '@/lib/branch/payment-store';
import { formatPrice } from '../consult/utils';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const orderData = usePaymentStore((s) => s.orderData);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<unknown>(null);
  const tossSecretRef = useRef<TossClientSecret | null>(null);
  const initStartedRef = useRef(false);

  // 주문 데이터 없거나 consultRequestId 없으면 홈으로
  useEffect(() => {
    if (!orderData || !orderData.consultRequestId) {
      router.replace(`/branch/${slug}`);
    }
  }, [orderData, router, slug]);

  // 지사 정보 로드
  useEffect(() => {
    if (!slug) return;
    fetchBranchInfo(slug).then((b) => {
      setBranch(b);
      setLoading(false);
    });
  }, [slug]);

  // 결제 위젯 초기화: 백엔드에서 clientSecret(JSON) 수령 → 토스 SDK 로드
  useEffect(() => {
    if (!orderData || !orderData.consultRequestId || loading) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    async function initWidget() {
      try {
        const created = await createPayment({
          orderId: orderData!.consultRequestId!,
          amount: Math.floor(orderData!.productPrice),
          method: 'CARD',
          goodName: orderData!.productName || '꽃배달 상품',
          buyerName: orderData!.customerName || undefined,
          buyerTel: orderData!.customerPhone || undefined,
          buyerEmail: orderData!.customerEmail || undefined,
        });
        if (!created.clientSecret) {
          throw new Error('결제 정보를 받지 못했습니다. 본사에 문의해 주세요.');
        }
        const secret = parseTossClientSecret(created.clientSecret);
        tossSecretRef.current = secret;

        const tossPayments = await loadTossPayments(secret.clientKey);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;

        await widgets.setAmount({
          currency: 'KRW',
          value: Math.floor(orderData!.productPrice),
        });

        await widgets.renderPaymentMethods({ selector: '#payment-methods' });
        await widgets.renderAgreement({ selector: '#payment-agreement' });

        setWidgetReady(true);
      } catch (err: unknown) {
        console.error('Widget init error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        // 지사 미설정 등 백엔드 5xx → 안내 문구로 변환
        if (/no active toss/.test(msg) || /credentials/i.test(msg)) {
          setError('결제 시스템 점검 중입니다. 본사로 문의 바랍니다.');
        } else {
          setError(`결제 위젯 오류: ${msg}`);
        }
      }
    }

    initWidget();
  }, [orderData, loading]);

  // 결제 요청 — 토스가 successUrl로 리다이렉트
  const handlePayment = async () => {
    const widgets = widgetsRef.current as { requestPayment: (req: Record<string, unknown>) => Promise<void> } | null;
    const secret = tossSecretRef.current;
    if (!widgets || !secret || !orderData) return;
    setPaying(true);
    setError('');

    try {
      const origin = window.location.origin;
      const paymentRequest: Record<string, unknown> = {
        // 반드시 서버가 내려준 tossOrderId(RF_<id>_<ts>)를 그대로 사용해야
        // successUrl에서 paymentService.confirmTossPayment의 정규식 매칭이 성공함.
        orderId: secret.tossOrderId,
        orderName: orderData.productName || '꽃배달 상품',
        successUrl: `${origin}/branch/${slug}/payment/success`,
        failUrl: `${origin}/branch/${slug}/payment/fail`,
      };
      if (orderData.customerName) {
        paymentRequest.customerName = orderData.customerName;
      }
      const phone = orderData.customerPhone?.replace(/\D/g, '');
      if (phone && phone.length === 11 && phone.startsWith('01')) {
        paymentRequest.customerMobilePhone = phone;
      }
      if (orderData.customerEmail) {
        paymentRequest.customerEmail = orderData.customerEmail;
      }

      await widgets.requestPayment(paymentRequest);
    } catch (err: unknown) {
      console.error('Payment request error:', err);
      const errObj = err as Record<string, unknown>;
      const code = errObj?.code || '';
      const message = errObj?.message || (err instanceof Error ? err.message : String(err));
      if (String(code) !== 'USER_CANCEL' && !String(message).includes('USER_CANCEL')) {
        setError(`결제 오류: ${message}${code ? ` (${code})` : ''}`);
      }
      setPaying(false);
    }
  };

  if (!orderData) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  const theme = branch ? getTheme(branch.homepageDesign) : getTheme('green');
  const themeStyle = {
    ...themeToStyle(theme),
    fontFamily: theme.fontFamily,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-[#f5f5f0] md:bg-white" style={themeStyle}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="mr-3 p-1 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">결제하기</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* 주문 요약 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">주문 정보</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">상품</span>
              <span className="font-medium text-gray-900">{orderData.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">주문자</span>
              <span className="text-gray-700">{orderData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">받는분</span>
              <span className="text-gray-700">{orderData.recipientName}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-gray-900">결제 금액</span>
              <span className="text-xl font-bold text-[var(--branch-green)]">
                {formatPrice(orderData.productPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* 결제 위젯 영역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div id="payment-methods" className="min-h-[200px]" />
        </div>

        {/* 이용약관 위젯 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div id="payment-agreement" />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={paying || !widgetReady}
          className="w-full py-4 bg-[var(--branch-green)] text-white rounded-2xl text-base font-semibold hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? '처리 중...' : `${formatPrice(orderData.productPrice)} 결제하기`}
        </button>
      </div>
    </div>
  );
}
