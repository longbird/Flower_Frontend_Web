'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchBranchInfo, fetchBranchProducts, submitConsultRequest } from '@/lib/branch/api';
import type { BranchInfo, BranchProduct, ConsultRequestForm } from '@/lib/branch/types';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function ConsultPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌸</div>
          <p className="text-[var(--branch-text-light)] font-light">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 opacity-50">🌷</div>
          <h1 className="text-2xl text-[var(--branch-text)] mb-3">페이지를 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center bg-[var(--branch-white)] rounded-3xl p-10 shadow-lg border border-[var(--branch-rose-light)]">
          <div className="text-6xl mb-6">🌸</div>
          <h1 className="text-2xl text-[var(--branch-text)] mb-4">
            상담 요청이 완료되었습니다
          </h1>
          <p className="text-[var(--branch-text-light)] font-light mb-8 leading-relaxed">
            빠른 시간 내에 연락드리겠습니다.<br />
            감사합니다.
          </p>
          <Link
            href={`/branch/${slug}`}
            className="inline-flex items-center justify-center px-8 py-3 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors"
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

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-8">
        <Link
          href={`/branch/${slug}`}
          className="inline-flex items-center text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] transition-colors text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {branch.name} 홈으로
        </Link>
      </div>

      {/* Form Card */}
      <div className="max-w-lg mx-auto bg-[var(--branch-white)] rounded-3xl p-8 md:p-10 shadow-lg border border-[var(--branch-rose-light)]">
        <div className="text-center mb-8">
          <p className="text-[var(--branch-accent)] text-sm tracking-[0.3em] uppercase mb-2 font-light">
            Consultation
          </p>
          <h1 className="text-2xl md:text-3xl text-[var(--branch-text)]">상담 요청</h1>
          <p className="text-[var(--branch-text-light)] text-sm mt-3 font-light">
            아래 정보를 입력해 주시면 빠른 시간 내에 연락드리겠습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
              이름 <span className="text-[var(--branch-accent)]">*</span>
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
              placeholder="홍길동"
              required
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
              연락처 <span className="text-[var(--branch-accent)]">*</span>
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
              className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
              placeholder="010-1234-5678"
              required
            />
          </div>

          {/* 상품 선택 */}
          {products.length > 0 && (
            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                관심 상품
              </label>
              <select
                value={form.productCode}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors appearance-none"
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

          {/* 희망 배달일 */}
          <div>
            <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
              희망 배달일
            </label>
            <input
              type="date"
              value={form.desiredDate}
              onChange={(e) => setForm((prev) => ({ ...prev, desiredDate: e.target.value }))}
              min={minDate}
              className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
            />
          </div>

          {/* 메시지 */}
          <div>
            <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
              요청 사항
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors resize-none"
              placeholder="배달 주소, 원하는 꽃 종류, 예산 등을 자유롭게 적어 주세요."
            />
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
            disabled={submitting}
            className="w-full py-4 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? '전송 중...' : '상담 요청하기'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto mt-8 text-center">
        <p className="text-sm text-[var(--branch-text-light)] font-light">
          {branch.phone && (
            <>
              전화 문의:{' '}
              <a href={`tel:${branch.phone}`} className="text-[var(--branch-accent)] hover:underline">
                {branch.phone}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
