'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import type { TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { fetchBranchInfo } from '@/lib/branch/api';
import type { BranchInfo } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import { usePaymentStore } from '@/lib/branch/payment-store';
import { generateOrderId, TOSS_CLIENT_KEY } from '@/lib/branch/payment-utils';
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
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const initRef = useRef(false);

  // 주문 데이터 없으면 홈으로
  useEffect(() => {
    if (!orderData) {
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

  // Toss SDK 초기화
  useEffect(() => {
    if (!orderData || !branch || initRef.current) return;
    if (!TOSS_CLIENT_KEY) {
      setError('결제 설정이 완료되지 않았습니다. (클라이언트 키 없음)');
      return;
    }
    if (!orderData.productPrice || orderData.productPrice <= 0) {
      setError('결제 금액이 올바르지 않습니다.');
      return;
    }

    initRef.current = true;

    async function initWidgets() {
      try {
        console.log('[Payment] Loading SDK with key:', TOSS_CLIENT_KEY.slice(0, 15) + '...');
        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
        console.log('[Payment] SDK loaded, creating widgets...');

        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;
        console.log('[Payment] Widgets created, setting amount:', Math.floor(orderData!.productPrice));

        await widgets.setAmount({
          currency: 'KRW',
          value: Math.floor(orderData!.productPrice),
        });
        console.log('[Payment] Amount set, rendering payment methods...');

        await widgets.renderPaymentMethods({
          selector: '#payment-methods',
        });
        console.log('[Payment] Payment methods rendered, rendering agreement...');

        await widgets.renderAgreement({
          selector: '#payment-agreement',
        });
        console.log('[Payment] All widgets rendered successfully');
      } catch (err: unknown) {
        console.error('[Payment] SDK init error (full):', err);
        console.error('[Payment] Error type:', typeof err);
        if (err && typeof err === 'object') {
          console.error('[Payment] Error keys:', Object.keys(err));
          console.error('[Payment] Error JSON:', JSON.stringify(err, null, 2));
        }
        const message = err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err)
            ? String((err as Record<string, unknown>).message)
            : JSON.stringify(err);
        setError(`결제 모듈 초기화 실패: ${message}`);
      }
    }

    initWidgets();
  }, [orderData, branch]);

  const handlePayment = async () => {
    if (!widgetsRef.current || !orderData) return;
    setPaying(true);
    setError('');

    try {
      const orderId = generateOrderId(slug);
      const origin = window.location.origin;

      await widgetsRef.current.requestPayment({
        orderId,
        orderName: orderData.productName,
        customerName: orderData.customerName,
        customerMobilePhone: orderData.customerPhone,
        successUrl: `${origin}/branch/${slug}/payment/success`,
        failUrl: `${origin}/branch/${slug}/payment/fail`,
      });
    } catch (err) {
      console.error('Payment request error:', err);
      setError('결제 요청 중 오류가 발생했습니다.');
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

        {/* 결제수단 위젯 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div id="payment-methods" />
        </div>

        {/* 약관 위젯 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div id="payment-agreement" />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 결제 버튼 */}
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full py-4 bg-[var(--branch-green)] text-white rounded-2xl text-base font-semibold hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? '결제 진행 중...' : `${formatPrice(orderData.productPrice)} 결제하기`}
        </button>
      </div>
    </div>
  );
}
