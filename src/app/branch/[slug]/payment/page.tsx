'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { fetchBranchInfo } from '@/lib/branch/api';
import type { BranchInfo } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import { usePaymentStore, type PaymentMethodChoice } from '@/lib/branch/payment-store';
import { generateOrderId } from '@/lib/payments/constants';
import { VIRTUAL_ACCOUNT_BANKS } from '@/lib/payments/constants';
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

  // 결제 방법 선택
  const [method, setMethod] = useState<PaymentMethodChoice>('card');

  // 가상계좌 폼
  const [vaBank, setVaBank] = useState('');
  const [vaDepositorName, setVaDepositorName] = useState('');

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

  // 카드결제 (결제창 리다이렉트)
  const handleCardPayment = async () => {
    if (!orderData) return;
    setPaying(true);
    setError('');

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError('결제 설정이 완료되지 않았습니다.');
        setPaying(false);
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: 'ANONYMOUS' });
      const orderId = generateOrderId(slug);
      const origin = window.location.origin;

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: Math.floor(orderData.productPrice) },
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

  // 가상계좌 발급
  const handleVirtualAccount = async () => {
    if (!orderData) return;
    if (!vaBank) {
      setError('은행을 선택해주세요.');
      return;
    }
    if (!vaDepositorName.trim()) {
      setError('입금자명을 입력해주세요.');
      return;
    }

    setPaying(true);
    setError('');

    try {
      const orderId = generateOrderId(slug);
      const res = await fetch('/api/payments/virtual-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.floor(orderData.productPrice),
          orderId,
          orderName: orderData.productName,
          customerName: vaDepositorName.trim(),
          bank: vaBank,
          validHours: 24,
          customerMobilePhone: orderData.customerPhone,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.message || '가상계좌 발급에 실패했습니다.');
        setPaying(false);
        return;
      }

      // 가상계좌 정보와 함께 success 페이지로 이동
      const va = data.data.virtualAccount;
      const searchParams = new URLSearchParams({
        method: 'virtual-account',
        orderId,
        bankCode: va?.bankCode ?? '',
        accountNumber: va?.accountNumber ?? '',
        customerName: va?.customerName ?? '',
        dueDate: va?.dueDate ?? '',
        amount: String(Math.floor(orderData.productPrice)),
        orderName: orderData.productName,
      });
      router.push(`/branch/${slug}/payment/success?${searchParams.toString()}`);
    } catch {
      setError('가상계좌 발급 중 오류가 발생했습니다.');
      setPaying(false);
    }
  };

  const handlePayment = () => {
    if (method === 'card') {
      handleCardPayment();
    } else {
      handleVirtualAccount();
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

        {/* 결제 방법 선택 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">결제 방법</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${
                method === 'card'
                  ? 'border-[var(--branch-green)] bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-sm font-medium">카드/간편결제</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('virtual-account')}
              className={`p-4 rounded-xl border-2 text-center transition-colors ${
                method === 'virtual-account'
                  ? 'border-[var(--branch-green)] bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium">가상계좌</span>
            </button>
          </div>
        </div>

        {/* 가상계좌 입력 폼 */}
        {method === 'virtual-account' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">가상계좌 정보</h2>
            <div>
              <label className="block text-sm text-gray-600 mb-1">입금자명</label>
              <input
                type="text"
                value={vaDepositorName}
                onChange={(e) => setVaDepositorName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">입금 은행</label>
              <select
                value={vaBank}
                onChange={(e) => setVaBank(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">은행을 선택해주세요</option>
                {VIRTUAL_ACCOUNT_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400">
              입금 기한: 발급 후 24시간 이내
            </p>
          </div>
        )}

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
          {paying
            ? '처리 중...'
            : method === 'card'
              ? `${formatPrice(orderData.productPrice)} 결제하기`
              : `${formatPrice(orderData.productPrice)} 가상계좌 발급`
          }
        </button>
      </div>
    </div>
  );
}
