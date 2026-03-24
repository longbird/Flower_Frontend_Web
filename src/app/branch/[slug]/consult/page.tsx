'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBranchInfo, fetchBranchProducts, submitConsultRequest } from '@/lib/branch/api';
import type { BranchInfo, BranchProduct, ConsultRequestForm } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

export default function ConsultPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [form, setForm] = useState<ConsultRequestForm>({
    customerName: '',
    customerPhone: '',
    productCode: '',
    productName: '',
    desiredDate: '',
    message: '',
  });

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const [b, p] = await Promise.all([
        fetchBranchInfo(slug),
        fetchBranchProducts(slug),
      ]);
      setBranch(b);
      setProducts(p);
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleProductSelect = (sku: string) => {
    const product = products.find((p) => p.sku === sku);
    setForm((prev) => ({
      ...prev,
      productCode: sku,
      productName: product?.name || '',
    }));
  };

  const selectedProduct = products.find((p) => p.sku === form.productCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customerName.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    if (!form.customerPhone.trim() || form.customerPhone.replace(/\D/g, '').length < 10) {
      setError('올바른 연락처를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    const result = await submitConsultRequest(slug, {
      ...form,
      customerPhone: form.customerPhone.replace(/\D/g, ''),
    });
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.message || '요청에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--branch-text-muted)] text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-6 text-[var(--branch-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-[var(--branch-text)] mb-3">페이지를 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  if (submitted) {
    const submittedTheme = getTheme(branch.homepageDesign);
    const submittedStyle = {
      ...themeToStyle(submittedTheme),
      fontFamily: submittedTheme.fontFamily,
    } as React.CSSProperties;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white" style={submittedStyle}>
        <div className="max-w-md mx-auto text-center bg-white rounded-2xl p-10 shadow-lg border border-[var(--branch-border)]">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--branch-text)] mb-4">
            상담 요청이 완료되었습니다
          </h1>
          <p className="text-[var(--branch-text-secondary)] text-sm mb-8 leading-relaxed">
            빠른 시간 내에 연락드리겠습니다.<br />
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

  // Get tomorrow as min date for desired_date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const theme = getTheme(branch.homepageDesign);
  const themeStyle = {
    ...themeToStyle(theme),
    fontFamily: theme.fontFamily,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-white" style={themeStyle}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[var(--branch-border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-8">
          <Link href={`/branch/${slug}`} className="branch-serif text-lg md:text-xl font-bold text-[var(--branch-text)] truncate">
            {branch.name}
          </Link>
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--branch-text-secondary)] hover:text-[var(--branch-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="hidden sm:inline">{branch.phone}</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Left Column - Product Info */}
          <div className="lg:w-2/5">
            <div className="bg-white rounded-2xl border border-[var(--branch-border)] overflow-hidden lg:sticky lg:top-24">
              {/* Premium Collection Badge */}
              <div className="p-6 pb-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--branch-green-light)] text-[var(--branch-green)] text-xs font-semibold tracking-wide uppercase">
                  Premium Collection
                </span>
              </div>

              {/* Product image */}
              <div className="p-6">
                <div className="aspect-square rounded-xl bg-[var(--branch-bg-alt)] flex items-center justify-center overflow-hidden">
                  {selectedProduct?.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl.startsWith('http') ? selectedProduct.imageUrl : `/api/proxy${selectedProduct.imageUrl}`}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <svg className="w-16 h-16 mx-auto text-[var(--branch-green)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-[var(--branch-text-muted)] text-sm mt-3">
                        {selectedProduct ? selectedProduct.name : '상품을 선택해 주세요'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product info */}
              {selectedProduct && (
                <div className="px-6 pb-4">
                  <h3 className="text-lg font-bold text-[var(--branch-text)]">{selectedProduct.name}</h3>
                  <p className="text-lg font-bold text-[var(--branch-green)] mt-1">{formatPrice(selectedProduct.price)}</p>
                </div>
              )}

              {/* Divider + Features */}
              <div className="mx-6 border-t border-[var(--branch-border)]" />
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--branch-text)]">시즌 큐레이션 플라워</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--branch-text)]">친환경 포장 제공</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:w-3/5">
            <div className="bg-[var(--branch-bg-alt)] rounded-2xl p-6 md:p-8 lg:p-10">
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--branch-text)]">상담 및 주문 요청</h1>
                <p className="text-[var(--branch-text-secondary)] text-sm mt-2 leading-relaxed">
                  아래 정보를 입력해 주시면 담당 플로리스트가 빠른 시간 내에 연락드리겠습니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name + Phone - 2 col on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                      성함 <span className="text-[var(--branch-green)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--branch-border)] bg-white text-[var(--branch-text)] placeholder-[var(--branch-text-muted)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors"
                      placeholder="홍길동"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                      연락처 <span className="text-[var(--branch-green)]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.customerPhone}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customerPhone: formatPhone(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-[var(--branch-border)] bg-white text-[var(--branch-text)] placeholder-[var(--branch-text-muted)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors"
                      placeholder="010-1234-5678"
                      required
                    />
                  </div>
                </div>

                {/* Product selection */}
                {products.length > 0 && (
                  <div>
                    <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                      관심 상품
                    </label>
                    <select
                      value={form.productCode}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--branch-border)] bg-white text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]"
                    >
                      <option value="">선택해 주세요 (선택사항)</option>
                      {products.map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} - {p.price.toLocaleString('ko-KR')}원
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Desired date */}
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                    희망 배송일
                  </label>
                  <input
                    type="date"
                    value={form.desiredDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, desiredDate: e.target.value }))}
                    min={minDate}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-border)] bg-white text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                    상세 요청 사항
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-border)] bg-white text-[var(--branch-text)] placeholder-[var(--branch-text-muted)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors resize-none"
                    placeholder="배달 주소, 원하는 꽃 종류, 예산, 카드 문구 등을 자유롭게 적어 주세요."
                  />
                </div>

                {/* Privacy consent */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy-consent"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[var(--branch-border)] text-[var(--branch-green)] focus:ring-[var(--branch-green)] accent-[var(--branch-green)]"
                  />
                  <label htmlFor="privacy-consent" className="text-sm text-[var(--branch-text-secondary)] leading-relaxed cursor-pointer">
                    상담 및 주문 처리를 위해 개인정보(성함, 연락처)를 수집 및 이용하는 것에 동의합니다.
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !privacyConsent}
                  className="w-full py-4 bg-[var(--branch-green)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-green-hover)] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '전송 중...' : '상담 요청하기'}
                </button>

                {/* Note */}
                <p className="text-xs text-[var(--branch-text-muted)] text-center leading-relaxed">
                  요청하신 정보는 담당 플로리스트 확인 후 30분 이내로 연락 드립니다.
                </p>
              </form>
            </div>

            {/* Back link */}
            <div className="mt-6">
              <Link
                href={`/branch/${slug}`}
                className="inline-flex items-center text-[var(--branch-text-secondary)] hover:text-[var(--branch-green)] transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                이전으로
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
