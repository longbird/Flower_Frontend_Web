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
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';

  const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 text-gray-500 hover:bg-white hover:text-gray-800 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {submitted ? (
            <div className="p-8 text-center">
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
          ) : (
            <>
              <div className="aspect-[3/4] bg-[var(--branch-bg-alt)] flex items-center justify-center overflow-hidden rounded-t-2xl relative cursor-pointer group"
                onClick={() => imgSrc && setShowFullImage(true)}>
                {imgSrc ? (
                  <>
                    <img src={imgSrc} alt={displayName} className="w-full h-full object-contain" />
                    <span className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      크게 보기
                    </span>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-16 h-16 mx-auto text-[var(--branch-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6">
                {product.category && (
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-[var(--branch-green-light)] text-[var(--branch-green)] text-xs font-medium mb-2">
                    {categoryLabel(product.category)}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-[var(--branch-text)] mb-2">{displayName}</h2>
                {product.sellingPrice != null && (
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-[var(--branch-green)]">{formatPrice(product.sellingPrice)}</span>
                  </div>
                )}
                <button onClick={() => setShowOrderForm(true)}
                  className="w-full py-4 bg-[var(--branch-green)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-green-hover)] transition-colors shadow-lg">
                  이 상품 주문 요청하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showFullImage && imgSrc && <FullImageViewer src={imgSrc} onClose={() => setShowFullImage(false)} />}
      {showOrderForm && (
        <CustomerOrderForm
          product={product}
          slug={slug}
          branch={branch}
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            setShowOrderForm(false);
            setSubmitted(true);
          }}
        />
      )}
    </>
  );
}
