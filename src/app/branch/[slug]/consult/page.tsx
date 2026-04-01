'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchBranchInfo,
  fetchRecommendedPhotoById,
  submitConsultRequest,
} from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, DeliveryPurpose, InvoiceType } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import {
  todayString,
  tomorrowString,
  formatPrice,
  type DateOption,
} from './utils';

import { ProductCard } from './sections/product-card';
import { DeliveryDatetime } from './sections/delivery-datetime';
import { OrdererInfo } from './sections/orderer-info';
import { RecipientInfo } from './sections/recipient-info';
import { DeliveryAddress } from './sections/delivery-address';
import { RibbonText } from './sections/ribbon-text';
import { MemoSection } from './sections/memo-section';
import { InvoiceSelection } from './sections/invoice-selection';
import { PrivacyConsent } from './sections/privacy-consent';
import { usePaymentStore, fileToSerializedFile } from '@/lib/branch/payment-store';

// ─── Inner component (needs useSearchParams inside Suspense) ──
function ConsultPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = searchParams.get('productId');

  // Data
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [product, setProduct] = useState<RecommendedPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);

  // Delivery
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [customDate, setCustomDate] = useState('');
  const [selectedHour, setSelectedHour] = useState(() => {
    const h = (new Date().getHours() + 1) % 24;
    return h < 8 ? '08' : h > 21 ? '' : String(h).padStart(2, '0');
  });
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [deliveryPurpose, setDeliveryPurpose] = useState<DeliveryPurpose>('까지');
  const [preEventDate, setPreEventDate] = useState('');
  const [preEventHour, setPreEventHour] = useState('');
  const [preEventMinute, setPreEventMinute] = useState('00');

  // Orderer
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Recipient
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  // Ribbon
  const [ribbonLeft, setRibbonLeft] = useState('');
  const [ribbonRight, setRibbonRight] = useState('');
  const [ribbonImage, setRibbonImage] = useState<File | null>(null);

  // Memo
  const [memo, setMemo] = useState('');

  // Invoice
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('NONE');
  const [businessRegFile, setBusinessRegFile] = useState<File | null>(null);
  const [cashReceiptPhone, setCashReceiptPhone] = useState('');

  // Privacy
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // ─── Load data ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    async function load() {
      const [b, p] = await Promise.all([
        fetchBranchInfo(slug),
        productId ? fetchRecommendedPhotoById(slug, Number(productId)) : Promise.resolve(null),
      ]);
      setBranch(b);
      setProduct(p);
      setLoading(false);
      setProductLoading(false);
    }
    load();
  }, [slug, productId]);

  // ─── Derived ──────────────────────────────────────────
  const totalPrice = product?.sellingPrice ?? 0;
  const needsPhoneVerification = branch?.requirePhoneVerification === true;
  const isPaymentEnabled = Boolean(branch?.enableOnlinePayment);
  const buttonText = isPaymentEnabled ? '결제하기' : '주문 요청';

  const resolvedDate =
    dateOption === 'today'
      ? todayString()
      : dateOption === 'tomorrow'
        ? tomorrowString()
        : customDate;

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!senderName.trim()) { setError('주문자 이름을 입력해 주세요.'); return; }
    if (!senderPhone.trim() || senderPhone.replace(/\D/g, '').length < 10) {
      setError('주문자 연락처를 입력해 주세요.'); return;
    }
    if (needsPhoneVerification && !phoneVerified) {
      setError('전화번호 인증을 완료해 주세요.'); return;
    }
    if (!recipientName.trim()) { setError('받는분 이름을 입력해 주세요.'); return; }
    if (!recipientPhone.trim() || recipientPhone.replace(/\D/g, '').length < 10) {
      setError('받는분 연락처를 입력해 주세요.'); return;
    }
    if (!address.trim()) { setError('배송 주소를 검색해 주세요.'); return; }
    if (!privacyConsent) { setError('개인정보 수집에 동의해 주세요.'); return; }

    const fullAddress = addressDetail ? `${address} ${addressDetail}` : address;

    // ─── 온라인 결제 모드: 결제 페이지로 이동 ──────────────
    if (isPaymentEnabled && product) {
      const resolvedTime = selectedHour
        ? `${selectedHour}시 ${selectedMinute}분 ${deliveryPurpose}`
        : '';
      const msgParts = [
        `[주문자] ${senderName} / ${senderPhone}`,
        `[배송일시] ${resolvedDate} ${resolvedTime}`,
        `[받는분] ${recipientName} / ${recipientPhone}`,
        `[배송장소] ${fullAddress}`,
      ];
      if (ribbonLeft || ribbonRight) msgParts.push(`[리본문구] ${ribbonLeft} / ${ribbonRight}`);
      if (memo) msgParts.push(`[요청사항] ${memo}`);

      // File → SerializedFile 변환 (sessionStorage 저장용)
      const totalFileSize = (ribbonImage?.size || 0) + (businessRegFile?.size || 0);
      if (totalFileSize > 4 * 1024 * 1024) {
        setError('첨부파일 합계가 4MB를 초과합니다. 파일 크기를 줄여 주세요.');
        return;
      }
      const serializedRibbon = ribbonImage
        ? await fileToSerializedFile(ribbonImage)
        : null;
      const serializedBizFile = (invoiceType === 'INVOICE' && businessRegFile)
        ? await fileToSerializedFile(businessRegFile)
        : null;

      usePaymentStore.getState().setOrderData(
        {
          slug,
          customerName: senderName,
          customerPhone: senderPhone.replace(/\D/g, ''),
          productId: product.id,
          productName: product.name || '',
          productPrice: totalPrice,
          desiredDate: resolvedDate,
          deliveryPurpose,
          deliveryTime: selectedHour ? `${selectedHour}:${selectedMinute}` : '',
          recipientName,
          recipientPhone: recipientPhone.replace(/\D/g, ''),
          address: fullAddress,
          ribbonText: (ribbonLeft || ribbonRight) ? `${ribbonLeft} / ${ribbonRight}` : '',
          memo: memo || '',
          invoiceType,
          cashReceiptPhone: invoiceType === 'CASH_RECEIPT'
            ? (cashReceiptPhone || senderPhone).replace(/\D/g, '')
            : '',
          message: msgParts.join('\n'),
        },
        serializedRibbon,
        serializedBizFile,
      );
      router.push(`/branch/${slug}/payment`);
      return;
    }

    // ─── 주문 요청 모드 (JSON 전송) ──────────────────────
    const resolvedTime = selectedHour
      ? `${selectedHour}시 ${selectedMinute}분 ${deliveryPurpose}`
      : '';

    const messageParts = [
      `[주문자] ${senderName} / ${senderPhone}`,
      `[배송일시] ${resolvedDate} ${resolvedTime}`,
      `[받는분] ${recipientName} / ${recipientPhone}`,
      `[배송장소] ${fullAddress}`,
    ];
    if (deliveryPurpose !== '까지' && preEventDate) {
      const preTime = preEventHour ? `${preEventHour}시 ${preEventMinute}분` : '';
      messageParts.push(`[행사시간] ${preEventDate} ${preTime} 까지`);
    }
    if (ribbonLeft || ribbonRight) {
      messageParts.push(`[리본문구] ${ribbonLeft} / ${ribbonRight}`);
    }
    if (memo) {
      messageParts.push(`[요청사항] ${memo}`);
    }
    if (invoiceType === 'INVOICE') {
      messageParts.push(`[증빙] 계산서 발행`);
    } else if (invoiceType === 'CASH_RECEIPT') {
      const receiptPhone = cashReceiptPhone || senderPhone;
      messageParts.push(`[증빙] 현금영수증 발행 (${receiptPhone})`);
    }

    const jsonBody = {
      customerName: senderName,
      customerPhone: senderPhone.replace(/\D/g, ''),
      productCode: product ? String(product.id) : undefined,
      productName: product ? (product.name || '') : undefined,
      desiredDate: resolvedDate,
      deliveryPurpose,
      invoiceType,
      cashReceiptPhone: invoiceType === 'CASH_RECEIPT'
        ? (cashReceiptPhone || senderPhone).replace(/\D/g, '')
        : undefined,
      recipientName,
      recipientPhone: recipientPhone.replace(/\D/g, ''),
      address: fullAddress,
      deliveryTime: selectedHour ? `${selectedHour}:${selectedMinute}` : undefined,
      ribbonText: (ribbonLeft || ribbonRight) ? `${ribbonLeft} / ${ribbonRight}` : undefined,
      memo: memo || undefined,
      message: messageParts.join('\n'),
    };

    setSubmitting(true);
    const result = await submitConsultRequest(slug, jsonBody);
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.message || '요청에 실패했습니다.');
    }
  };

  // ─── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] md:bg-white">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] md:bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">페이지를 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  // No productId → guide back
  if (!productId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] md:bg-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">상품을 선택해 주세요</h1>
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-[var(--branch-green)] text-white rounded-full text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors"
          >
            상품 보러 가기
          </Link>
        </div>
      </div>
    );
  }

  const theme = getTheme(branch.homepageDesign);
  const themeStyle = {
    ...themeToStyle(theme),
    fontFamily: theme.fontFamily,
  } as React.CSSProperties;

  // ─── Success screen ────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white" style={themeStyle}>
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">주문 요청이 완료되었습니다</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            빠른 시간 내에 연락드리겠습니다.<br />감사합니다.
          </p>
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center justify-center px-8 py-3 bg-[var(--branch-green)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-green-hover)] transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f0] md:bg-gray-50" style={themeStyle}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center h-14 px-4 md:max-w-2xl md:mx-auto">
          <Link
            href={`/branch/${slug}`}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors mr-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900 truncate">{branch.name}</h1>
        </div>
      </header>

      {/* Form body */}
      <form onSubmit={handleSubmit} className="pb-28 md:pb-0 md:max-w-2xl md:mx-auto md:my-8">
        <div className="space-y-3 p-4 md:p-0 md:space-y-4">
          <ProductCard product={product} loading={productLoading} />

          <DeliveryDatetime
            dateOption={dateOption} setDateOption={setDateOption}
            customDate={customDate} setCustomDate={setCustomDate}
            selectedHour={selectedHour} setSelectedHour={setSelectedHour}
            selectedMinute={selectedMinute} setSelectedMinute={setSelectedMinute}
            deliveryPurpose={deliveryPurpose} setDeliveryPurpose={setDeliveryPurpose}
            preEventDate={preEventDate} setPreEventDate={setPreEventDate}
            preEventHour={preEventHour} setPreEventHour={setPreEventHour}
            preEventMinute={preEventMinute} setPreEventMinute={setPreEventMinute}
          />

          <OrdererInfo
            slug={slug}
            needsPhoneVerification={needsPhoneVerification}
            senderName={senderName} setSenderName={setSenderName}
            senderPhone={senderPhone} setSenderPhone={setSenderPhone}
            phoneVerified={phoneVerified} setPhoneVerified={setPhoneVerified}
          />

          <RecipientInfo
            recipientName={recipientName} setRecipientName={setRecipientName}
            recipientPhone={recipientPhone} setRecipientPhone={setRecipientPhone}
            address={address} setAddress={setAddress}
          />

          <DeliveryAddress
            address={address}
            addressDetail={addressDetail} setAddressDetail={setAddressDetail}
          />

          <RibbonText
            ribbonLeft={ribbonLeft} setRibbonLeft={setRibbonLeft}
            ribbonRight={ribbonRight} setRibbonRight={setRibbonRight}
            ribbonImage={ribbonImage} setRibbonImage={setRibbonImage}
          />

          <MemoSection memo={memo} setMemo={setMemo} />

          <InvoiceSelection
            invoiceType={invoiceType}
            setInvoiceType={(v) => {
              setInvoiceType(v);
              if (v === 'CASH_RECEIPT' && !cashReceiptPhone) {
                setCashReceiptPhone(senderPhone);
              }
            }}
            businessRegFile={businessRegFile} setBusinessRegFile={setBusinessRegFile}
            senderPhone={senderPhone}
            cashReceiptPhone={cashReceiptPhone} setCashReceiptPhone={setCashReceiptPhone}
          />

          <PrivacyConsent checked={privacyConsent} setChecked={setPrivacyConsent} />

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* PC Submit */}
          <div className="hidden md:block bg-white rounded-b-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                {totalPrice > 0 && (
                  <>
                    <span className="text-xs text-gray-400">총 금액</span>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(totalPrice)}</p>
                  </>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !privacyConsent}
                className="px-10 py-3.5 bg-[var(--branch-green)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '전송 중...' : buttonText}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Mobile Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-5 py-3.5 safe-area-bottom">
          <div>
            {totalPrice > 0 && (
              <>
                <span className="text-[10px] text-gray-400">총 금액</span>
                <p className="text-lg font-bold text-gray-900 -mt-0.5">{formatPrice(totalPrice)}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={submitting || !privacyConsent}
            className="px-8 py-3 bg-[var(--branch-green)] text-white rounded-full text-base font-bold hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '전송 중...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper (Suspense boundary for useSearchParams) ──
export default function ConsultPage() {
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
      <ConsultPageInner />
    </Suspense>
  );
}
