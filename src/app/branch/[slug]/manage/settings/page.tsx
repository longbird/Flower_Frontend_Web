'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetchMyBranchInfo, updateMyBranchInfo, type MyBranchInfo } from '@/lib/branch/branch-api';
import { getAllThemes, type BranchTheme } from '@/lib/branch/themes';

export default function BranchSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [info, setInfo] = useState<MyBranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [businessRegistrationNo, setBusinessRegistrationNo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [virtualAccountBank, setVirtualAccountBank] = useState('');
  const [virtualAccountNumber, setVirtualAccountNumber] = useState('');
  const [homepageDesign, setHomepageDesign] = useState('green');
  const [ecommerceLicenseNo, setEcommerceLicenseNo] = useState('');
  const [partnershipEmail, setPartnershipEmail] = useState('');
  const [enableOnlinePayment, setEnableOnlinePayment] = useState(false);

  const loadInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchMyBranchInfo();
      if (res.ok && res.data) {
        setInfo(res.data);
        setBusinessRegistrationNo(res.data.businessRegistrationNo || '');
        setOwnerName(res.data.ownerName || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setAddress(res.data.address || '');
        setDescription(res.data.description || '');
        setVirtualAccountBank(res.data.virtualAccountBank || '');
        setVirtualAccountNumber(res.data.virtualAccountNumber || '');
        setHomepageDesign(res.data.homepageDesign || 'green');
        setEcommerceLicenseNo(res.data.ecommerceLicenseNo || '');
        setPartnershipEmail(res.data.partnershipEmail || '');
        setEnableOnlinePayment(res.data.enableOnlinePayment ?? false);
      }
    } catch {
      setMessage({ type: 'error', text: '정보를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await updateMyBranchInfo({
        businessRegistrationNo,
        ownerName,
        email,
        phone,
        address,
        description,
        virtualAccountBank,
        virtualAccountNumber,
        homepageDesign,
        ecommerceLicenseNo,
        partnershipEmail,
        enableOnlinePayment,
      });
      if (res.ok && res.data) {
        setInfo(res.data);
        setMessage({ type: 'success', text: '저장되었습니다.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--branch-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center py-20 text-[var(--branch-text-light)]">
        정보를 불러올 수 없습니다.
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-[var(--branch-text)] mb-6">기본 정보 설정</h1>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)] p-5 space-y-5">
        {/* 지사명 (읽기전용) */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            지사명 (상호)
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm">
            {info.name}
          </div>
        </div>

        {/* 코드 (읽기전용) */}
        {info.code && (
          <div>
            <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
              지사 코드
            </label>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm">
              {info.code}
            </div>
          </div>
        )}

        {/* 페이지 URL (읽기전용) */}
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            홈페이지 URL
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm break-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/branch/${slug}` : `/branch/${slug}`}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
            관리자 페이지 URL
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-[var(--branch-cream)] text-[var(--branch-text)] text-sm break-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/branch/${slug}/manage/login` : `/branch/${slug}/manage/login`}
          </div>
        </div>

        {/* 사업자 정보 섹션 */}
        <div className="border-t border-[var(--branch-rose-light)] pt-5">
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-3">사업자 정보</h3>

          {/* 사업자등록번호 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">사업자등록번호</label>
              <input
                type="text"
                value={businessRegistrationNo}
                onChange={(e) => setBusinessRegistrationNo(e.target.value)}
                placeholder="예: 123-45-67890"
                className={inputClass}
              />
            </div>

            {/* 대표자명 */}
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">대표자명</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="대표자 이름"
                className={inputClass}
              />
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="예: info@example.com"
                className={inputClass}
              />
            </div>

            {/* 통신판매업신고 */}
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">통신판매업신고번호</label>
              <input
                type="text"
                value={ecommerceLicenseNo}
                onChange={(e) => setEcommerceLicenseNo(e.target.value)}
                placeholder="예: 제2023-경기안산-3299호"
                className={inputClass}
              />
            </div>

            {/* 제휴문의 이메일 */}
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">제휴문의 이메일</label>
              <input
                type="email"
                value={partnershipEmail}
                onChange={(e) => setPartnershipEmail(e.target.value)}
                placeholder="예: partner@example.com"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 연락처 / 주소 섹션 */}
        <div className="border-t border-[var(--branch-rose-light)] pt-5">
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-3">연락처 / 주소</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">전화번호</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 031-123-4567"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="사무실 주소"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 소개글 */}
        <div className="border-t border-[var(--branch-rose-light)] pt-5">
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-3">홈페이지 소개글</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="홈페이지에 표시되는 지사 소개글"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 입금 계좌 */}
        <div className="border-t border-[var(--branch-rose-light)] pt-5">
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-3">입금 계좌 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">은행명</label>
              <input
                type="text"
                value={virtualAccountBank}
                onChange={(e) => setVirtualAccountBank(e.target.value)}
                placeholder="예: 국민은행"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--branch-text-light)] mb-1">계좌번호</label>
              <input
                type="text"
                value={virtualAccountNumber}
                onChange={(e) => setVirtualAccountNumber(e.target.value)}
                placeholder="예: 123-456-789012"
                className={inputClass}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-[var(--branch-text-light)]">
            홈페이지 하단에 표시됩니다.
          </p>
        </div>
      </div>

      {/* 온라인 결제 설정 */}
      <div className="mt-6 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)] p-5">
        <h2 className="text-lg font-semibold text-[var(--branch-text)] mb-4">온라인 결제 설정</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--branch-text)]">온라인 결제 활성화</p>
            <p className="text-xs text-[var(--branch-text-light)] mt-0.5">
              활성화하면 고객이 주문 시 카드/계좌이체/간편결제로 즉시 결제할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnableOnlinePayment(!enableOnlinePayment)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enableOnlinePayment ? 'bg-[var(--branch-accent)]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enableOnlinePayment ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {enableOnlinePayment && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700">
              Toss Payments를 통해 결제가 처리됩니다. 비활성화 시 &ldquo;주문 요청&rdquo; 방식으로 전환됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 홈페이지 디자인 */}
      <div className="mt-6 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)] p-5">
        <h2 className="text-lg font-semibold text-[var(--branch-text)] mb-4">홈페이지 디자인</h2>
        <p className="text-xs text-[var(--branch-text-light)] mb-4">
          홈페이지에 적용할 디자인 테마를 선택하세요. 저장 후 홈페이지에 바로 반영됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {getAllThemes().map((theme: BranchTheme) => {
            const isSelected = homepageDesign === theme.key;
            const accent = theme.variables['--branch-green'];
            const bg = theme.variables['--branch-bg'];
            const bgAlt = theme.variables['--branch-bg-alt'];
            const text = theme.variables['--branch-text'];
            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => setHomepageDesign(theme.key)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-[var(--branch-accent)] ring-2 ring-[var(--branch-accent)]/20'
                    : 'border-[var(--branch-rose-light)] hover:border-[var(--branch-accent)]/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Color swatches */}
                <div className="flex gap-1.5 mb-3">
                  <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: accent }} />
                  <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: bg }} />
                  <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: bgAlt }} />
                  <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: text }} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--branch-text)]">{theme.name}</h3>
                <p className="text-xs text-[var(--branch-text-light)] mt-0.5">{theme.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="sticky bottom-0 mt-6 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-[var(--branch-cream)] border-t border-[var(--branch-rose-light)]">
        <div className="max-w-2xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[var(--branch-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
