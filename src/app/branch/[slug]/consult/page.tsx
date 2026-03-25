'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchBranchInfo,
  fetchRecommendedPhotos,
  submitConsultRequest,
  sendPhoneVerification,
  verifyPhoneCode,
} from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import { CONDOLENCE_PRESETS } from '@/lib/types/order-register';

// ─── Types ───────────────────────────────────────────────
type DateOption = 'today' | 'tomorrow' | 'custom';
type TimeOption = 'morning' | 'afternoon' | 'custom';

// ─── Helpers ─────────────────────────────────────────────
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

function photoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return RAW ? `/api/proxy${url}` : url;
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const w = weekdays[d.getDay()];
  return `${m}월 ${day}일 (${w})`;
}

function openDaumPostcode(onComplete: (address: string) => void) {
  const daum = (window as any).daum;
  const run = () => {
    new (window as any).daum.Postcode({
      oncomplete(data: any) {
        onComplete(data.roadAddress || data.jibunAddress || data.address);
      },
    }).open();
  };
  if (daum?.Postcode) {
    run();
    return;
  }
  const script = document.createElement('script');
  script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.onload = run;
  document.head.appendChild(script);
}

// ─── Sub-components ──────────────────────────────────────
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </h3>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function ConsultPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Data
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [photos, setPhotos] = useState<RecommendedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [customDate, setCustomDate] = useState('');
  const [timeOption, setTimeOption] = useState<TimeOption>('morning');
  const [customTime, setCustomTime] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  const [ribbonLeft, setRibbonLeft] = useState('');
  const [ribbonRight, setRibbonRight] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presetTab, setPresetTab] = useState<'celebration' | 'condolence' | 'life'>('celebration');

  const [memo, setMemo] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Phone verification
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // ─── Load data ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    async function load() {
      const [b, photosRes] = await Promise.all([
        fetchBranchInfo(slug),
        fetchRecommendedPhotos(slug, { size: 40 }),
      ]);
      setBranch(b);
      setPhotos(photosRes.data);
      setLoading(false);
    }
    load();
  }, [slug]);

  // ─── Countdown timer ───────────────────────────────────
  useEffect(() => {
    if (verifyCountdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setVerifyCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [verifyCountdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived ────────────────────────────────────────────
  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) ?? null;
  const totalPrice = selectedPhoto?.sellingPrice ?? 0;

  const resolvedDate =
    dateOption === 'today'
      ? todayString()
      : dateOption === 'tomorrow'
        ? tomorrowString()
        : customDate;

  const resolvedTime =
    timeOption === 'morning'
      ? '오전'
      : timeOption === 'afternoon'
        ? '오후'
        : customTime;

  const needsPhoneVerification = branch?.requirePhoneVerification === true;

  // ─── Handlers ───────────────────────────────────────────
  const handleSendVerification = useCallback(async () => {
    const digits = senderPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setVerifyError('올바른 연락처를 입력해 주세요.');
      return;
    }
    setVerifyError('');
    const result = await sendPhoneVerification(slug, digits);
    if (result.ok) {
      setVerificationSent(true);
      setVerifyCountdown(180);
    } else {
      setVerifyError(result.message || '인증번호 발송에 실패했습니다.');
    }
  }, [slug, senderPhone]);

  const handleVerifyCode = useCallback(async () => {
    const digits = senderPhone.replace(/\D/g, '');
    if (!verificationCode.trim()) {
      setVerifyError('인증번호를 입력해 주세요.');
      return;
    }
    setVerifyError('');
    const result = await verifyPhoneCode(slug, digits, verificationCode.trim());
    if (result.ok) {
      setPhoneVerified(true);
      setVerifyCountdown(0);
    } else {
      setVerifyError(result.message || '인증번호가 올바르지 않습니다.');
    }
  }, [slug, senderPhone, verificationCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!senderName.trim()) {
      setError('주문자 이름을 입력해 주세요.');
      return;
    }
    if (!senderPhone.trim() || senderPhone.replace(/\D/g, '').length < 10) {
      setError('주문자 연락처를 입력해 주세요.');
      return;
    }
    if (needsPhoneVerification && !phoneVerified) {
      setError('전화번호 인증을 완료해 주세요.');
      return;
    }
    if (!recipientName.trim()) {
      setError('받는분 이름을 입력해 주세요.');
      return;
    }
    if (!recipientPhone.trim() || recipientPhone.replace(/\D/g, '').length < 10) {
      setError('받는분 연락처를 입력해 주세요.');
      return;
    }
    if (!address.trim()) {
      setError('배송 주소를 입력해 주세요.');
      return;
    }
    if (!privacyConsent) {
      setError('개인정보 수집에 동의해 주세요.');
      return;
    }

    const dateLabel =
      dateOption === 'today'
        ? `오늘 (${formatDateLabel(todayString())})`
        : dateOption === 'tomorrow'
          ? `내일 (${formatDateLabel(tomorrowString())})`
          : formatDateLabel(customDate);

    const fullAddress = addressDetail ? `${address} ${addressDetail}` : address;

    const messageParts = [
      `[주문자] ${senderName} / ${senderPhone}`,
      `[배송일시] ${dateLabel} ${resolvedTime}`,
      `[받는분] ${recipientName} / ${recipientPhone}`,
      `[배송장소] ${fullAddress}`,
    ];
    if (ribbonLeft || ribbonRight) {
      messageParts.push(`[리본문구] ${ribbonLeft} / ${ribbonRight}`);
    }
    if (memo) {
      messageParts.push(`[요청사항] ${memo}`);
    }

    setSubmitting(true);
    const result = await submitConsultRequest(slug, {
      customerName: senderName,
      customerPhone: senderPhone.replace(/\D/g, ''),
      productCode: selectedPhoto ? String(selectedPhoto.id) : '',
      productName: selectedPhoto?.name || '',
      desiredDate: resolvedDate,
      message: messageParts.join('\n'),
    });
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.message || '요청에 실패했습니다.');
    }
  };

  // ─── Loading ────────────────────────────────────────────
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
          <svg
            className="w-16 h-16 mx-auto mb-6 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
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

  // ─── Success screen ─────────────────────────────────────
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
            빠른 시간 내에 연락드리겠습니다.
            <br />
            감사합니다.
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

  // ─── Input classes ──────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 focus:outline-none transition-colors text-sm';

  const toggleBase =
    'px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer';
  const toggleSelected =
    'bg-[var(--branch-green)] text-white border-[var(--branch-green)]';
  const toggleUnselected =
    'bg-white text-gray-600 border-gray-200 hover:border-gray-300';

  // ─── Render ─────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#f5f5f0] md:bg-gray-50"
      style={themeStyle}
    >
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
      <form
        onSubmit={handleSubmit}
        className="pb-28 md:pb-0 md:max-w-2xl md:mx-auto md:my-8"
      >
        <div className="space-y-3 p-4 md:p-0 md:space-y-4">

          {/* ── Product Picker ──────────────────────────── */}
          {photos.length > 0 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionTitle icon="🌸" title="상품 선택" />

              {/* Horizontal scroll picker */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {photos.map((photo) => {
                  const isSelected = selectedPhotoId === photo.id;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedPhotoId(isSelected ? null : photo.id)}
                      className={`flex-shrink-0 w-[88px] rounded-xl border-2 p-1.5 transition-all ${
                        isSelected
                          ? 'border-[var(--branch-green)] bg-[var(--branch-green-light)]'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-gray-50">
                        {photo.imageUrl ? (
                          <img
                            src={photoUrl(photo.imageUrl)}
                            alt={photo.name || '상품'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-700 font-medium mt-1.5 truncate text-center">
                        {photo.name || '상품'}
                      </p>
                      {photo.sellingPrice != null && photo.sellingPrice > 0 && (
                        <p className="text-[11px] text-[var(--branch-green)] font-bold text-center">
                          {formatPrice(photo.sellingPrice)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected product card */}
              {selectedPhoto && (
                <div className="mt-4 flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-white flex-shrink-0">
                    {selectedPhoto.imageUrl ? (
                      <img
                        src={photoUrl(selectedPhoto.imageUrl)}
                        alt={selectedPhoto.name || '선택 상품'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {selectedPhoto.name || '선택 상품'}
                    </h4>
                    {selectedPhoto.sellingPrice != null && selectedPhoto.sellingPrice > 0 && (
                      <p className="text-lg font-bold text-[var(--branch-green)] mt-1">
                        {formatPrice(selectedPhoto.sellingPrice)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--branch-green-light)] text-[var(--branch-green)] text-[10px] font-medium">
                        당일배송 가능
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--branch-green-light)] text-[var(--branch-green)] text-[10px] font-medium">
                        리본 무료작성
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--branch-green-light)] text-[var(--branch-green)] text-[10px] font-medium">
                        실물사진 제공
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── 배송일시 ────────────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionTitle icon="📅" title="배송일시" />
            <div className="md:grid md:grid-cols-2 md:gap-6">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">배송일</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateOption('today')}
                    className={`flex-1 ${toggleBase} ${dateOption === 'today' ? toggleSelected : toggleUnselected}`}
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateOption('tomorrow')}
                    className={`flex-1 ${toggleBase} ${dateOption === 'tomorrow' ? toggleSelected : toggleUnselected}`}
                  >
                    내일
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateOption('custom')}
                    className={`flex-1 ${toggleBase} ${dateOption === 'custom' ? toggleSelected : toggleUnselected}`}
                  >
                    날짜 선택
                  </button>
                </div>
                {dateOption === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={todayString()}
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>

              {/* Time */}
              <div className="mt-4 md:mt-0">
                <label className="block text-xs font-medium text-gray-500 mb-2">배송시간</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeOption('morning')}
                    className={`flex-1 ${toggleBase} ${timeOption === 'morning' ? toggleSelected : toggleUnselected}`}
                  >
                    오전
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeOption('afternoon')}
                    className={`flex-1 ${toggleBase} ${timeOption === 'afternoon' ? toggleSelected : toggleUnselected}`}
                  >
                    오후
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeOption('custom')}
                    className={`flex-1 ${toggleBase} ${timeOption === 'custom' ? toggleSelected : toggleUnselected}`}
                  >
                    시간 지정
                  </button>
                </div>
                {timeOption === 'custom' && (
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>
            </div>
          </section>

          {/* ── 주문자 정보 ─────────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionTitle icon="👤" title="주문자 정보" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  연락처 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => {
                      setSenderPhone(formatPhone(e.target.value));
                      if (phoneVerified) {
                        setPhoneVerified(false);
                        setVerificationSent(false);
                        setVerificationCode('');
                        setVerifyCountdown(0);
                      }
                    }}
                    placeholder="010-1234-5678"
                    className={`flex-1 ${inputClass}`}
                    required
                  />
                  {needsPhoneVerification && !phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      disabled={verifyCountdown > 0}
                      className="flex-shrink-0 px-4 py-3 rounded-xl bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {verifyCountdown > 0
                        ? `${Math.floor(verifyCountdown / 60)}:${String(verifyCountdown % 60).padStart(2, '0')}`
                        : verificationSent
                          ? '재발송'
                          : '인증번호 발송'}
                    </button>
                  )}
                  {needsPhoneVerification && phoneVerified && (
                    <div className="flex-shrink-0 flex items-center gap-1 px-3 text-green-600 text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      인증완료
                    </div>
                  )}
                </div>
              </div>

              {/* Verification code input */}
              {needsPhoneVerification && verificationSent && !phoneVerified && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">인증번호</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6자리 인증번호"
                      maxLength={6}
                      className={`flex-1 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="flex-shrink-0 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                      인증확인
                    </button>
                  </div>
                  {verifyCountdown > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      남은 시간: {Math.floor(verifyCountdown / 60)}:{String(verifyCountdown % 60).padStart(2, '0')}
                    </p>
                  )}
                </div>
              )}

              {verifyError && (
                <p className="text-xs text-red-500">{verifyError}</p>
              )}
            </div>
          </section>

          {/* ── 받는분 정보 ─────────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionTitle icon="🎁" title="받는분 정보" />
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    이름 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="받는분 이름"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    연락처 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(formatPhone(e.target.value))}
                    placeholder="010-1234-5678"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  배송 주소 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    readOnly
                    placeholder="주소를 검색해 주세요"
                    className={`flex-1 ${inputClass} bg-gray-50 cursor-pointer`}
                    onClick={() => openDaumPostcode(setAddress)}
                  />
                  <button
                    type="button"
                    onClick={() => openDaumPostcode(setAddress)}
                    className="flex-shrink-0 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    주소검색
                  </button>
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="상세 주소 (건물명, 동/호수, 층 등)"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ── 리본 문구 ───────────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionTitle icon="🎀" title="리본 문구" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">좌측 (보내는분)</label>
                <input
                  type="text"
                  value={ribbonLeft}
                  onChange={(e) => setRibbonLeft(e.target.value)}
                  placeholder="예: 주식회사 OO 대표 홍길동"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">우측 (경조사어)</label>
                <input
                  type="text"
                  value={ribbonRight}
                  onChange={(e) => setRibbonRight(e.target.value)}
                  placeholder="예: 축 개업"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="mt-3 text-sm text-[var(--branch-green)] font-medium hover:underline flex items-center gap-1"
            >
              <span>{showPresets ? '▾' : '▸'}</span>
              <span>샘플 문구 보기</span>
            </button>

            {showPresets && (
              <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                {/* Tabs */}
                <div className="flex gap-1 mb-3">
                  {(
                    [
                      { key: 'celebration', label: '축하' },
                      { key: 'condolence', label: '근조' },
                      { key: 'life', label: '생활' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPresetTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        presetTab === tab.key
                          ? 'bg-[var(--branch-green)] text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Preset items */}
                <div className="flex flex-wrap gap-1.5">
                  {CONDOLENCE_PRESETS[presetTab].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRibbonRight(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        ribbonRight === preset
                          ? 'bg-[var(--branch-green)] text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[var(--branch-green)] hover:text-[var(--branch-green)]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 요청사항 ────────────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionTitle icon="📝" title="요청사항" />
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="배송 관련 요청사항을 입력해 주세요. (예: 경비실에 맡겨주세요)"
              className={`${inputClass} resize-none`}
            />
          </section>

          {/* ── 개인정보 동의 ───────────────────────────── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacy-consent"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[var(--branch-green)] focus:ring-[var(--branch-green)] accent-[var(--branch-green)]"
              />
              <label
                htmlFor="privacy-consent"
                className="text-sm text-gray-500 leading-relaxed cursor-pointer"
              >
                주문 처리를 위해 개인정보(성함, 연락처, 주소)를 수집 및 이용하는 것에 동의합니다.
              </label>
            </div>
          </section>

          {/* ── Error ───────────────────────────────────── */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ── PC Submit (md:static) ──────────────────── */}
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
                {submitting ? '전송 중...' : '결제하기'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Mobile Bottom Sticky Bar ──────────────────── */}
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
            onClick={(e) => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={submitting || !privacyConsent}
            className="px-8 py-3 bg-[var(--branch-green)] text-white rounded-full text-base font-bold hover:bg-[var(--branch-green-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '전송 중...' : '결제하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
