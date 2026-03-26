'use client';

import { useState } from 'react';
import type { BranchInfo, RecommendedPhoto } from '@/lib/branch/types';
import { CustomerOrderForm } from './customer-order-form';

// ─── Utility Functions ──────────────────────────────────────────

export function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
};

export const CATEGORY_ORDER = [
  'CELEBRATION', 'CONDOLENCE', 'OBJET', 'ORIENTAL', 'WESTERN', 'FLOWER',
  'FOLIAGE', 'RICE', 'FRUIT', 'OTHER',
];

const GRADE_LABEL_MAP: Record<string, string> = {
  PREMIUM: '프리미엄', HIGH: '고급형', STANDARD: '실속형',
};

export function gradeLabel(code: string) {
  return GRADE_LABEL_MAP[code] || code;
}

export function categoryLabel(code: string) {
  return CATEGORY_LABEL_MAP[code] || code;
}

export function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return RAW_API_BASE ? `/api/proxy${url}` : url;
}

// ─── Full-screen Image Viewer ───────────────────────────────────

export function FullImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={src}
        alt="큰 이미지"
        className="max-w-[95vw] max-h-[95vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Star Rating ────────────────────────────────────────────────

export function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-[var(--branch-star)]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// @deprecated: Use /branch/[slug]/consult?productId=X page instead. Kept for backward compatibility.
// ─── Product Detail Modal (모든 테마 공용) ──────────────────────

export function ProductDetailModal({
  product,
  slug,
  branch,
  onClose,
}: {
  product: RecommendedPhoto;
  slug: string;
  branch?: BranchInfo;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--branch-text)] mb-3">주문 요청이 완료되었습니다</h2>
          <p className="text-[var(--branch-text-secondary)] text-sm mb-6 leading-relaxed">
            <strong>{displayName}</strong> 상품에 대해<br />빠른 시간 내에 연락드리겠습니다.
          </p>
          <button onClick={onClose} className="px-8 py-3 bg-[var(--branch-green)] text-white rounded-full font-medium hover:bg-[var(--branch-green-hover)] transition-colors">
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <CustomerOrderForm
      product={product}
      slug={slug}
      branch={branch}
      onClose={onClose}
      onSuccess={() => setSubmitted(true)}
    />
  );
}
