'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { submitConsultRequest, sendPhoneVerification, verifyPhoneCode } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto } from '@/lib/branch/types';
import { formatPrice, photoUrl, categoryLabel, formatPhone } from './shared';
import { CONDOLENCE_PRESETS } from '@/lib/types/order-register';

// ─── Types ──────────────────────────────────────────────────────

interface CustomerOrderFormProps {
  product: RecommendedPhoto;
  slug: string;
  branch?: BranchInfo;
  onClose: () => void;
  onSuccess: () => void;
}

type DateOption = 'today' | 'tomorrow' | 'custom';
type TimePeriod = 'morning' | 'afternoon';

const MORNING_HOUR_OPTIONS = [
  { value: '', label: '시간 선택' },
  { value: '08', label: '오전 8시' },
  { value: '09', label: '오전 9시' },
  { value: '10', label: '오전 10시' },
  { value: '11', label: '오전 11시' },
];

const AFTERNOON_HOUR_OPTIONS = [
  { value: '', label: '시간 선택' },
  { value: '12', label: '오후 12시' },
  { value: '13', label: '오후 1시' },
  { value: '14', label: '오후 2시' },
  { value: '15', label: '오후 3시' },
  { value: '16', label: '오후 4시' },
  { value: '17', label: '오후 5시' },
  { value: '18', label: '오후 6시' },
  { value: '19', label: '오후 7시' },
  { value: '20', label: '오후 8시' },
  { value: '21', label: '오후 9시' },
];

const MINUTE_OPTIONS = ['00', '10', '20', '30', '40', '50'];
type SampleTab = 'celebration' | 'condolence' | 'life';

// ─── Helpers ────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTimeLabel(period: TimePeriod, hour: string, minute: string): string {
  if (hour) {
    const h = Number(hour);
    const displayHour = h > 12 ? h - 12 : h;
    const prefix = period === 'morning' ? '오전' : '오후';
    return minute && minute !== '00'
      ? `${prefix} ${displayHour}시 ${minute}분`
      : `${prefix} ${displayHour}시`;
  }
  return period === 'morning' ? '오전' : '오후';
}

function openDaumPostcode(onComplete: (address: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daum = (window as any).daum;

  const run = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).daum.Postcode({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oncomplete(data: any) {
        const addr = data.roadAddress || data.jibunAddress || data.address;
        onComplete(addr);
      },
    }).open();
  };

  if (daum && daum.Postcode) {
    run();
    return;
  }

  const script = document.createElement('script');
  script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.onload = run;
  document.head.appendChild(script);
}

// ─── Sub-components ─────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </h3>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function CustomerOrderForm({
  product,
  slug,
  branch,
  onClose,
  onSuccess,
}: CustomerOrderFormProps) {
  const requireVerification = branch?.requirePhoneVerification ?? false;

  // Orderer info
  const [ordererName, setOrdererName] = useState('');
  const [ordererPhone, setOrdererPhone] = useState('');

  // Phone verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for verification code expiry
  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(180); // 3 minutes
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Send verification code
  const handleSendCode = async () => {
    const digits = ordererPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('주문자 전화번호를 올바르게 입력해주세요.');
      return;
    }
    setSendingCode(true);
    setError('');
    const result = await sendPhoneVerification(slug, digits);
    setSendingCode(false);
    if (result.ok) {
      setVerificationSent(true);
      setVerificationCode('');
      setIsVerified(false);
      startCountdown();
    } else {
      setError(result.message || '인증번호 발송에 실패했습니다.');
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('인증번호를 입력해주세요.');
      return;
    }
    const digits = ordererPhone.replace(/\D/g, '');
    setVerifying(true);
    setError('');
    const result = await verifyPhoneCode(slug, digits, verificationCode.trim());
    setVerifying(false);
    if (result.ok) {
      setIsVerified(true);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);
    } else {
      setError(result.message || '인증번호가 올바르지 않습니다.');
    }
  };

  // Date & time
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [deliveryDate, setDeliveryDate] = useState(todayString());
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => {
    const h = (new Date().getHours() + 1) % 24;
    return h < 12 ? 'morning' : 'afternoon';
  });
  const [selectedHour, setSelectedHour] = useState(() => {
    const h = (new Date().getHours() + 1) % 24;
    return h < 8 ? '08' : h > 21 ? '' : String(h).padStart(2, '0');
  });
  const [selectedMinute, setSelectedMinute] = useState('00');

  // Recipient
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  // Ribbon
  const [ribbonLeft, setRibbonLeft] = useState('');
  const [ribbonRight, setRibbonRight] = useState('');
  const [showSamples, setShowSamples] = useState(false);
  const [sampleTab, setSampleTab] = useState<SampleTab>('celebration');

  // Memo & submit
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';
  const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');
  const price = product.sellingPrice ?? 0;

  // Date option change handler
  const handleDateOption = (opt: DateOption) => {
    setDateOption(opt);
    if (opt === 'today') setDeliveryDate(todayString());
    if (opt === 'tomorrow') setDeliveryDate(tomorrowString());
  };

  // Address search
  const handleAddressSearch = () => {
    openDaumPostcode((addr) => setAddressLine1(addr));
  };

  // Submit
  const handleSubmit = async () => {
    setError('');

    // Orderer validation
    const ordererDigits = ordererPhone.replace(/\D/g, '');
    if (ordererDigits.length < 10) {
      setError('주문자 전화번호를 올바르게 입력해주세요.');
      return;
    }
    if (requireVerification && !isVerified) {
      setError('주문자 전화번호 인증이 필요합니다.');
      return;
    }

    // Recipient validation
    const phoneDigits = recipientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('받는 분 연락처를 올바르게 입력해주세요.');
      return;
    }
    if (!addressLine1.trim()) {
      setError('배송 주소를 입력해주세요.');
      return;
    }

    const timeStr = getTimeLabel(timePeriod, selectedHour, selectedMinute);
    const fullAddress = addressLine2.trim()
      ? `${addressLine1} ${addressLine2}`
      : addressLine1;
    const ribbonStr =
      ribbonLeft || ribbonRight
        ? `${ribbonLeft} / ${ribbonRight}`
        : '';

    const messageParts = [
      `[주문자] ${ordererName || '미입력'} / ${formatPhone(ordererPhone)}`,
      `[배송일시] ${deliveryDate} ${timeStr}`,
      `[받는분] ${recipientName || '미입력'} / ${formatPhone(recipientPhone)}`,
      `[배송장소] ${fullAddress}`,
      ribbonStr ? `[리본문구] ${ribbonStr}` : '',
      memo.trim() ? `[요청사항] ${memo.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setSubmitting(true);
    const result = await submitConsultRequest(slug, {
      customerName: ordererName || recipientName,
      customerPhone: ordererDigits,
      productCode: String(product.id),
      productName: displayName,
      desiredDate: deliveryDate,
      message: messageParts,
    });
    setSubmitting(false);

    if (result.ok) {
      onSuccess();
    } else {
      setError(result.message || '주문 요청에 실패했습니다.');
    }
  };

  const inputClassName =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 focus:outline-none transition-colors text-sm bg-white';
  const selectClassName =
    'px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 focus:outline-none transition-colors text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400';

  const SAMPLE_TAB_LABELS: Record<SampleTab, string> = {
    celebration: '축하',
    condolence: '근조',
    life: '생활',
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f5f5f0] md:bg-black/50 md:backdrop-blur-sm md:flex md:items-start md:justify-center md:overflow-y-auto">
      <div className="h-full flex flex-col max-w-lg mx-auto md:h-auto md:my-8 md:max-w-2xl md:w-full md:rounded-2xl md:shadow-2xl md:overflow-hidden md:bg-[#f5f5f0]">
        {/* ── Top Navigation Bar ────────────────────────────── */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center h-14 px-4 shrink-0 md:rounded-t-2xl">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-base font-bold text-gray-900">
            주문하기
          </h1>
          <button
            onClick={onClose}
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-9 md:hidden" />
        </header>

        {/* ── Scrollable Content ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="p-4 space-y-3 md:p-6 md:space-y-4">
            {/* ── Product Card ──────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex gap-4">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={displayName}
                    className="w-24 h-24 rounded-xl object-contain bg-gray-50 shrink-0 md:w-32 md:h-32"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 md:w-32 md:h-32">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 truncate md:text-xl">{displayName}</h2>
                  <p className="text-lg font-bold text-[var(--branch-green)] mb-3 md:text-xl">
                    {formatPrice(price)}
                  </p>
                  <div className="space-y-1.5 md:flex md:gap-4 md:space-y-0">
                    {['당일배송 가능', '리본 무료작성', '실물사진 제공'].map((text) => (
                      <div key={text} className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[var(--branch-green)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-gray-600">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 주문자 정보 Section ─────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="🧑" title="주문자 정보" />

              <div className="space-y-3">
                <input
                  type="text"
                  value={ordererName}
                  onChange={(e) => setOrdererName(e.target.value)}
                  placeholder="주문자 성명을 입력해주세요"
                  className={inputClassName}
                />

                {/* Phone + verification */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={ordererPhone}
                      onChange={(e) => {
                        setOrdererPhone(formatPhone(e.target.value));
                        if (isVerified) {
                          setIsVerified(false);
                          setVerificationSent(false);
                          setVerificationCode('');
                        }
                      }}
                      placeholder="주문자 전화번호를 입력해주세요"
                      className={`${inputClassName} flex-1`}
                      disabled={isVerified}
                    />
                    {requireVerification && (
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={sendingCode || isVerified || ordererPhone.replace(/\D/g, '').length < 10}
                        className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                          isVerified
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-[var(--branch-green)] text-white hover:bg-[var(--branch-green-hover)] disabled:opacity-50'
                        }`}
                      >
                        {isVerified ? '인증완료' : sendingCode ? '발송중...' : verificationSent ? '재발송' : '인증번호 발송'}
                      </button>
                    )}
                  </div>

                  {/* Verification code input */}
                  {requireVerification && verificationSent && !isVerified && (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="인증번호 6자리"
                            maxLength={6}
                            className={inputClassName}
                          />
                          {countdown > 0 && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-red-500">
                              {formatCountdown(countdown)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verifying || !verificationCode.trim() || countdown === 0}
                          className="shrink-0 px-4 py-3 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {verifying ? '확인중...' : '인증확인'}
                        </button>
                      </div>
                      {countdown === 0 && (
                        <p className="mt-1.5 text-xs text-red-500">인증 시간이 만료되었습니다. 다시 발송해주세요.</p>
                      )}
                    </div>
                  )}

                  {/* Verified indicator */}
                  {isVerified && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      전화번호가 인증되었습니다
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── 배송일시 Section ──────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="📅" title="배송일시" />

              <div className="md:grid md:grid-cols-2 md:gap-6">
                {/* Date buttons */}
                <div>
                  <p className="hidden md:flex text-sm font-medium text-gray-700 mb-2 items-center gap-1">배달 날짜</p>
                  <div className="flex gap-2">
                    {(
                      [
                        { key: 'today', label: '오늘' },
                        { key: 'tomorrow', label: '내일' },
                        { key: 'custom', label: '📅 날짜 선택' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDateOption(key)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          dateOption === key
                            ? 'bg-[var(--branch-green)] text-white border-[var(--branch-green)]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {dateOption === 'custom' && (
                    <input
                      type="date"
                      value={deliveryDate}
                      min={todayString()}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className={`${inputClassName} mt-3`}
                    />
                  )}
                </div>

                {/* Time selection */}
                <div className="mt-4 md:mt-0">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <span className="md:hidden">🕐</span> 시간 선택
                  </p>
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <select
                      value={selectedHour}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedHour(val);
                        if (val) {
                          setTimePeriod(Number(val) < 12 ? 'morning' : 'afternoon');
                        }
                      }}
                      className={selectClassName}
                    >
                      <option value="">시간 선택</option>
                      <optgroup label="오전">
                        {MORNING_HOUR_OPTIONS.filter((h) => h.value).map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="오후">
                        {AFTERNOON_HOUR_OPTIONS.filter((h) => h.value).map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className={selectClassName}
                      disabled={!selectedHour}
                    >
                      {MINUTE_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}분</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 받는분 정보 Section ───────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="👤" title="받는분 정보" />

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="이름을 입력해주세요"
                    className={inputClassName}
                  />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(formatPhone(e.target.value))}
                    placeholder="연락처를 입력해주세요"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <span>📍</span> 배송장소
                    </p>
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="px-4 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      주소검색
                    </button>
                  </div>
                  <input
                    type="text"
                    value={addressLine1}
                    readOnly
                    onClick={handleAddressSearch}
                    placeholder="주소를 검색해주세요"
                    className={`${inputClassName} cursor-pointer bg-gray-50 mb-3`}
                  />
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="상세주소를 입력해주세요"
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            {/* ── 리본 문구 Section ─────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="🎀" title="리본 문구" />

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">왼쪽 문구</label>
                  <input
                    type="text"
                    value={ribbonLeft}
                    onChange={(e) => setRibbonLeft(e.target.value)}
                    placeholder="예) 삼가 고인의 명복을 빕니다"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">오른쪽 문구</label>
                  <input
                    type="text"
                    value={ribbonRight}
                    onChange={(e) => setRibbonRight(e.target.value)}
                    placeholder="예) OO회사 임직원 일동"
                    className={inputClassName}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSamples((prev) => !prev)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors text-center"
              >
                {showSamples ? '샘플 문구 닫기' : '샘플 문구 보기'}
              </button>

              {showSamples && (
                <div className="mt-3">
                  {/* Tabs */}
                  <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
                    {(Object.keys(SAMPLE_TAB_LABELS) as SampleTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSampleTab(tab)}
                        className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                          sampleTab === tab
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {SAMPLE_TAB_LABELS[tab]}
                      </button>
                    ))}
                  </div>

                  {/* Preset phrases */}
                  <div className="flex flex-wrap gap-2">
                    {CONDOLENCE_PRESETS[sampleTab].map((phrase) => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => setRibbonLeft(phrase)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:border-[var(--branch-green)] hover:text-[var(--branch-green)] transition-colors"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── 요청사항 Section ──────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="📋" title="요청사항" />
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder={`배송 시 요청사항이 있으면 입력해주세요.\n(예: 부재 시 경비실에 맡겨주세요)`}
                className={`${inputClassName} resize-none`}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-1 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Sticky Bar ─────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 md:static md:rounded-b-2xl md:shrink-0">
          <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3 md:max-w-none md:px-6 md:py-4">
            <div>
              <p className="text-xs text-gray-500">총 금액</p>
              <p className="text-xl font-bold text-[var(--branch-green)]">
                {formatPrice(price)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-10 py-3.5 bg-[#3d5a28] text-white rounded-full text-base font-semibold shadow-lg hover:bg-[#344d22] transition-colors disabled:opacity-60"
            >
              {submitting ? '처리중...' : '결제하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
