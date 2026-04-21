'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchBranchInfo,
  fetchRecommendedPhotoById,
  submitConsultRequest,
  submitOrderRequest,
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
import { usePaymentStore } from '@/lib/branch/payment-store';

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

    // ─── 온라인 결제 모드: consult 먼저 등록 → 결제 페이지로 이동 ──────
    //
    // 백엔드 흐름상 POST /public/payments/create는 orderId(=consult_request id)
    // 가 이미 존재해야 한다. 따라서 결제 전에 consult 요청을 먼저 등록하고
    // 발급받은 id를 결제 페이지로 전달한다.
    //
    // 부수 효과: 결제를 도중 포기해도 consult는 NEW 상태로 어드민에 노출 →
    // 운영자가 수동 응대 가능 (의도된 동작).
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
      if (invoiceType === 'INVOICE') msgParts.push(`[증빙] 계산서 발행`);
      else if (invoiceType === 'CASH_RECEIPT') {
        const receiptPhone = cashReceiptPhone || senderPhone;
        msgParts.push(`[증빙] 현금영수증 발행 (${receiptPhone})`);
      }

      const totalFileSize = (ribbonImage?.size || 0) + (businessRegFile?.size || 0);
      if (totalFileSize > 4 * 1024 * 1024) {
        setError('첨부파일 합계가 4MB를 초과합니다. 파일 크기를 줄여 주세요.');
        return;
      }

      const cashReceiptPhoneClean = invoiceType === 'CASH_RECEIPT'
        ? (cashReceiptPhone || senderPhone).replace(/\D/g, '')
        : '';

      setSubmitting(true);
      try {
        const hasFiles = ribbonImage || (invoiceType === 'INVOICE' && businessRegFile);
        let consultResult: { ok: boolean; message?: string; id?: number; orderId?: number };
        if (hasFiles) {
          const formData = new FormData();
          formData.append('customerName', senderName);
          formData.append('customerPhone', senderPhone.replace(/\D/g, ''));
          formData.append('productCode', String(product.id));
          formData.append('productName', product.name || '');
          formData.append('desiredDate', resolvedDate);
          formData.append('deliveryPurpose', deliveryPurpose);
          formData.append('invoiceType', invoiceType);
          if (cashReceiptPhoneClean) formData.append('cashReceiptPhone', cashReceiptPhoneClean);
          formData.append('recipientName', recipientName);
          formData.append('recipientPhone', recipientPhone.replace(/\D/g, ''));
          formData.append('address', fullAddress);
          if (selectedHour) formData.append('deliveryTime', `${selectedHour}:${selectedMinute}`);
          if (ribbonLeft || ribbonRight) formData.append('ribbonText', `${ribbonLeft} / ${ribbonRight}`);
          if (memo) formData.append('memo', memo);
          formData.append('message', msgParts.join('\n'));
          // 백엔드가 orders.total_price 에 사용. 이 값이 있어야 orders 행이 생성됨
          formData.append('amount', String(Math.floor(totalPrice)));
          if (ribbonImage) formData.append('ribbonImage', ribbonImage);
          if (invoiceType === 'INVOICE' && businessRegFile) {
            formData.append('businessRegistration', businessRegFile);
          }
          consultResult = await submitOrderRequest(slug, formData);
        } else {
          consultResult = await submitConsultRequest(slug, {
            customerName: senderName,
            customerPhone: senderPhone.replace(/\D/g, ''),
            productCode: String(product.id),
            productName: product.name || '',
            desiredDate: resolvedDate,
            deliveryPurpose,
            invoiceType,
            cashReceiptPhone: cashReceiptPhoneClean || undefined,
            recipientName,
            recipientPhone: recipientPhone.replace(/\D/g, ''),
            address: fullAddress,
            deliveryTime: selectedHour ? `${selectedHour}:${selectedMinute}` : undefined,
            ribbonText: (ribbonLeft || ribbonRight) ? `${ribbonLeft} / ${ribbonRight}` : undefined,
            memo: memo || undefined,
            message: msgParts.join('\n'),
            amount: Math.floor(totalPrice),
          });
        }
        if (!consultResult.ok || !consultResult.id) {
          setError(consultResult.message || '주문 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
          setSubmitting(false);
          return;
        }
        if (!consultResult.orderId) {
          // 결제 진행에 orders.id가 필요. 백엔드가 orders 생성에 실패한 경우.
          setError('주문 등록은 완료되었으나 결제 정보 발급에 실패했습니다. 지사에 직접 연락해 주세요.');
          setSubmitting(false);
          return;
        }

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
            cashReceiptPhone: cashReceiptPhoneClean,
            message: msgParts.join('\n'),
            orderId: consultResult.orderId,
            consultRequestId: consultResult.id,
          },
        );
        router.push(`/branch/${slug}/payment`);
      } catch (err) {
        console.error('Consult submit before payment failed:', err);
        setError('주문 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        setSubmitting(false);
      }
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

  const theme = getTheme(branch.homepageDesign);
  const themeStyle = {
    ...themeToStyle(theme),
    fontFamily: theme.fontFamily,
  } as React.CSSProperties;

  // No productId → render simple inquiry form (상품 없이도 문의 가능)
  if (!productId) {
    const purpose = searchParams.get('purpose');
    return (
      <SimpleInquiry branch={branch} slug={slug} initialPurpose={purpose} themeStyle={themeStyle} />
    );
  }

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

// ─── Simple Inquiry (상품 없이 상담만 신청) ──────────────────
const INQUIRY_PURPOSES: Array<{ key: string; label: string }> = [
  { key: 'celebration', label: '축하 화환' },
  { key: 'condolence', label: '근조 화환' },
  { key: 'bouquet', label: '꽃다발 · 부케' },
  { key: 'parents', label: '어버이날 · 기타' },
];

const INQUIRY_BUDGETS = ['5만원 이하', '5~10만원', '10~20만원', '20~30만원', '30만원 이상'];

function formatInquiryPhone(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

function SimpleInquiry({
  branch,
  slug,
  initialPurpose,
  themeStyle,
}: {
  branch: BranchInfo;
  slug: string;
  initialPurpose: string | null;
  themeStyle: React.CSSProperties;
}) {
  const [purpose, setPurpose] = useState<string>(initialPurpose || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [message, setMessage] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('이름을 입력해 주세요.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { setError('연락처를 정확히 입력해 주세요.'); return; }
    if (!privacy) { setError('개인정보 수집에 동의해 주세요.'); return; }

    const parts: string[] = [];
    if (purpose) {
      const label = INQUIRY_PURPOSES.find((p) => p.key === purpose)?.label || purpose;
      parts.push(`[용도] ${label}`);
    }
    if (budget) parts.push(`[예상 예산] ${budget}`);
    if (desiredDate) parts.push(`[희망 배송일] ${desiredDate}`);
    if (message.trim()) parts.push(`[상세 내용]\n${message.trim()}`);

    setSubmitting(true);
    const result = await submitConsultRequest(slug, {
      customerName: name.trim(),
      customerPhone: phone.replace(/\D/g, ''),
      desiredDate: desiredDate || undefined,
      message: parts.join('\n\n'),
    });
    setSubmitting(false);

    if (result.ok) setSubmitted(true);
    else setError(result.message || '요청에 실패했습니다.');
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f5f0] md:bg-white" style={themeStyle}>
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">상담 신청이 접수되었습니다</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            빠른 시간 내에 연락드려 맞춤 제안해 드리겠습니다.<br />감사합니다.
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

  return (
    <div className="min-h-screen bg-[#f5f5f0] md:bg-gray-50" style={themeStyle}>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center h-14 px-4 md:max-w-2xl md:mx-auto">
          <Link
            href={`/branch/${slug}`}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors mr-3"
            aria-label="뒤로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900 truncate">{branch.name}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="pb-28 md:pb-0 md:max-w-2xl md:mx-auto md:my-8">
        <div className="space-y-3 p-4 md:p-0 md:space-y-4">
          {/* Intro */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--branch-green)' }}>
              Simple Inquiry
            </p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">간단 상담 신청</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              상품을 아직 고르지 못하셨나요? 원하시는 자리 · 예상 예산 · 받으시는 분의 취향만 알려주시면,
              플로리스트가 직접 맞춤 제안해 드립니다.
            </p>
            <Link
              href={`/branch/${slug}#products`}
              className="inline-flex items-center gap-1 mt-4 text-sm font-medium underline underline-offset-4"
              style={{ color: 'var(--branch-green)' }}
            >
              상품을 먼저 둘러보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </section>

          {/* Purpose pills */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              어떤 자리인가요? <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INQUIRY_PURPOSES.map((p) => {
                const active = purpose === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPurpose(active ? '' : p.key)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{
                      background: active ? 'var(--branch-green)' : '#ffffff',
                      color: active ? '#ffffff' : '#4B5563',
                      border: '1px solid',
                      borderColor: active ? 'var(--branch-green)' : '#E5E7EB',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Orderer */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                주문자 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="성함을 입력해 주세요"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatInquiryPhone(e.target.value))}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors tnum"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
          </section>

          {/* Budget + date */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                예상 예산 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INQUIRY_BUDGETS.map((b) => {
                  const active = budget === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBudget(active ? '' : b)}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                      style={{
                        background: active ? 'var(--branch-green-light)' : '#F9FAFB',
                        color: active ? 'var(--branch-green)' : '#4B5563',
                        border: '1px solid',
                        borderColor: active ? 'var(--branch-green)' : '#E5E7EB',
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                희망 배송일 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors"
              />
            </div>
          </section>

          {/* Message */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              상세 내용 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="받으시는 분의 취향, 원하는 꽃 종류·컬러, 리본 문구 등 편하게 남겨주세요."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors resize-none leading-relaxed"
            />
          </section>

          {/* Privacy */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="inquiry-privacy"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[var(--branch-green)]"
              />
              <label htmlFor="inquiry-privacy" className="text-sm text-gray-500 leading-relaxed cursor-pointer">
                상담 응대를 위해 개인정보(성함, 연락처)를 수집 및 이용하는 것에 동의합니다.
              </label>
            </div>
          </section>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* PC Submit */}
          <div className="hidden md:block bg-white rounded-2xl p-5 shadow-sm">
            <button
              type="submit"
              disabled={submitting || !privacy}
              className="w-full px-10 py-3.5 bg-[var(--branch-green)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '전송 중...' : '상담 신청하기'}
            </button>
          </div>
        </div>
      </form>

      {/* Mobile sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-center px-5 py-3.5 safe-area-bottom">
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={submitting || !privacy}
            className="w-full px-8 py-3 bg-[var(--branch-green)] text-white rounded-full text-base font-bold hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '전송 중...' : '상담 신청하기'}
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
