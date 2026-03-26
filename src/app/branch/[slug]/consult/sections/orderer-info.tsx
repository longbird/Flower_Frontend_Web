'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendPhoneVerification, verifyPhoneCode } from '@/lib/branch/api';
import { formatPhone, inputClass } from '../utils';

// TODO: 로그인 고객은 이 섹션을 숨기고 자동 채움

interface Props {
  slug: string;
  needsPhoneVerification: boolean;
  senderName: string;
  setSenderName: (v: string) => void;
  senderPhone: string;
  setSenderPhone: (v: string) => void;
  phoneVerified: boolean;
  setPhoneVerified: (v: boolean) => void;
}

export function OrdererInfo({
  slug,
  needsPhoneVerification,
  senderName, setSenderName,
  senderPhone, setSenderPhone,
  phoneVerified, setPhoneVerified,
}: Props) {
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [slug, senderPhone, verificationCode, setPhoneVerified]);

  const handlePhoneChange = (val: string) => {
    setSenderPhone(formatPhone(val));
    if (phoneVerified) {
      setPhoneVerified(false);
      setVerificationSent(false);
      setVerificationCode('');
      setVerifyCountdown(0);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">&#x1F464;</span>
        <span>주문자 정보</span>
      </h3>
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
              onChange={(e) => handlePhoneChange(e.target.value)}
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
  );
}
