'use client';

import { useState } from 'react';
import type { BranchInfo, RecommendedPhoto } from '@/lib/branch/types';

// ─── Business Info Footer (공통 사업자 정보) ────────────────────

/** 지사 홈페이지 하단 사업자 정보 표시 */
export function BusinessInfoFooter({ branch }: { branch: BranchInfo }) {
  const hasBusinessInfo = branch.ownerName || branch.businessRegistrationNo || branch.ecommerceLicenseNo;
  if (!hasBusinessInfo && !branch.email && !branch.partnershipEmail) return null;

  const items: string[] = [];
  if (branch.name) items.push(branch.name);
  if (branch.ownerName) items.push(`대표 : ${branch.ownerName}`);
  if (branch.businessRegistrationNo) items.push(`사업자등록번호 : ${branch.businessRegistrationNo}`);

  return (
    <div className="text-xs leading-loose text-white/40 space-y-0.5">
      {items.length > 0 && <p>{items.join('  |  ')}</p>}
      {branch.ecommerceLicenseNo && (
        <p>통신판매업신고 : {branch.ecommerceLicenseNo}{branch.phone ? `  |  전화 : ${branch.phone}` : ''}</p>
      )}
      {(branch.email || branch.partnershipEmail) && (
        <p>
          {branch.email && <>이메일 : {branch.email}</>}
          {branch.email && branch.partnershipEmail && '  |  '}
          {branch.partnershipEmail && <>제휴문의 : {branch.partnershipEmail}</>}
        </p>
      )}
      {branch.address && <p>주소 : {branch.address}</p>}
    </div>
  );
}

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
        <svg
          key={i}
          className="w-4 h-4 text-[var(--branch-star)] branch-animate-fade-up"
          style={{ animationDelay: `${i * 0.05}s` }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Product Detail Modal (상품 상세 + 주문 버튼) ──────────────

export function ProductDetailModal({
  product,
  slug,
  branch,
  onClose,
  onOrder,
}: {
  product: RecommendedPhoto;
  slug: string;
  branch?: BranchInfo;
  onClose: () => void;
  onOrder?: (product: RecommendedPhoto) => void;
}) {
  const [fullImage, setFullImage] = useState(false);
  const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm branch-animate-fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto branch-animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Product image */}
        {imgSrc && (
          <div
            className="w-full aspect-square bg-gray-100 cursor-pointer"
            onClick={() => setFullImage(true)}
          >
            <img src={imgSrc} alt={displayName} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Product info */}
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
          {product.sellingPrice != null && product.sellingPrice > 0 && (
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatPrice(product.sellingPrice)}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge label="당일배송 가능" />
            <Badge label="리본 무료작성" />
            <Badge label="실물사진 제공" />
          </div>

          {/* Category & Grade */}
          <div className="flex gap-2 mt-3">
            {product.category && (
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-lg">
                {categoryLabel(product.category)}
              </span>
            )}
            {product.grade && (
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-lg">
                {gradeLabel(product.grade)}
              </span>
            )}
          </div>

          {/* Order button */}
          <button
            onClick={() => onOrder ? onOrder(product) : onClose()}
            className="w-full mt-5 py-3.5 bg-[var(--branch-green)] text-white rounded-full text-base font-bold hover:bg-[var(--branch-green-hover)] transition-colors"
          >
            주문하기
          </button>
        </div>
      </div>

      {/* Full image viewer */}
      {fullImage && imgSrc && (
        <FullImageViewer src={imgSrc} onClose={() => setFullImage(false)} />
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--branch-green)] font-medium bg-[var(--branch-green-light)] px-2.5 py-1 rounded-full">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  );
}
