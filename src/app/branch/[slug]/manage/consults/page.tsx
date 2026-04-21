'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetchConsultRequests, updateConsultRequestStatus, fetchMyBranchInfo, fetchBranchProducts, type BranchProductSetting } from '@/lib/branch/branch-api';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { ConsultRequest, RecommendedPhoto } from '@/lib/branch/types';

// ─── Constants ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW: { label: '신규', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: '처리중', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  COMPLETED: { label: '완료', color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  CANCELLED: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

/** 결제 상태 배지 설정 — null이면 배지 표시 안 함(결제 없는 단순 상담) */
const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  PAID:     { label: '결제완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  PENDING:  { label: '결제대기', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  CREATED:  { label: '결제대기', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  FAILED:   { label: '결제실패', className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELED: { label: '결제취소', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  REFUNDED: { label: '환불됨',   className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const CATEGORY_LABELS: Record<string, string> = {
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
};

const GRADE_LABELS: Record<string, { name: string; color: string }> = {
  PREMIUM: { name: '프리미엄', color: 'bg-amber-700 text-white' },
  HIGH: { name: '고급형', color: 'bg-blue-600 text-white' },
  STANDARD: { name: '실속형', color: 'bg-teal-600 text-white' },
};

// ─── Utility Functions ────────────────────────────────────────────

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatPhone(phone: string | undefined | null) {
  if (!phone) return '-';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function formatPrice(n: number) {
  return n.toLocaleString() + '원';
}

function productImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return RAW_API_BASE ? `/api/proxy${url}` : url;
}

// ─── Message Parser ───────────────────────────────────────────────

interface ParsedOrder {
  orderer?: string;
  deliveryTime?: string;
  recipient?: string;
  address?: string;
  eventTime?: string;
  ribbon?: string;
  memo?: string;
  invoice?: string;
  raw?: string;
}

function parseOrderMessage(message: string | undefined | null): ParsedOrder | null {
  if (!message) return null;

  const tags: Record<string, string> = {};
  const lines = message.split('\n');
  let hasTag = false;

  for (const line of lines) {
    const m = line.match(/^\[(.+?)\]\s*(.*)$/);
    if (m) {
      tags[m[1]] = m[2].trim();
      hasTag = true;
    }
  }

  if (!hasTag) return { raw: message };

  return {
    orderer: tags['주문자'],
    deliveryTime: tags['배송일시'],
    recipient: tags['받는분'],
    address: tags['배송장소'],
    eventTime: tags['행사시간'],
    ribbon: tags['리본문구'],
    memo: tags['요청사항'],
    invoice: tags['증빙'],
  };
}

// ─── SVG Icons ────────────────────────────────────────────────────

function IconPerson() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconRibbon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

// ─── Info Row Component ───────────────────────────────────────────

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex items-start gap-2 w-20 shrink-0 text-[var(--branch-text-light)]">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex-1 text-sm text-[var(--branch-text)] min-w-0">
        {children}
      </div>
    </div>
  );
}

// ─── Image Viewer ─────────────────────────────────────────────────

function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img src={src} alt={alt} className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Product Detail Popup ─────────────────────────────────────────

function ProductDetailPopup({
  product,
  surcharge,
  onClose,
}: {
  product: RecommendedPhoto;
  surcharge: number;
  onClose: () => void;
}) {
  const [showFullImage, setShowFullImage] = useState(false);
  const imgSrc = product.imageUrl ? productImageUrl(product.imageUrl) : '';
  const categoryLabel = product.category ? (CATEGORY_LABELS[product.category] || product.category) : '';
  const gradeInfo = product.grade ? GRADE_LABELS[product.grade] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-slate-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {imgSrc ? (
            <div className="bg-slate-50 cursor-zoom-in relative group" onClick={() => setShowFullImage(true)}>
              <img src={imgSrc} alt={product.name || ''} className="w-full h-auto block max-h-[50vh] object-contain" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">크게 보기</span>
              </div>
            </div>
          ) : (
            <div className="h-48 bg-slate-50 flex items-center justify-center">
              <IconPackage />
            </div>
          )}

          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{product.name || '상품명 없음'}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categoryLabel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">{categoryLabel}</span>
                )}
                {gradeInfo && (
                  <span className={`text-xs px-2.5 py-1 rounded-full ${gradeInfo.color}`}>{gradeInfo.name}</span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">가격 정보</h4>
              <div className="space-y-1.5">
                {product.sellingPrice != null && product.sellingPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">판매가</span>
                    <span className="font-bold text-[var(--branch-accent,#e91e63)] text-base">{formatPrice(product.sellingPrice)}</span>
                  </div>
                )}
                {product.costPrice != null && product.costPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">입금가</span>
                    <span className="text-sm text-slate-700">{formatPrice(product.costPrice)}</span>
                  </div>
                )}
                {surcharge > 0 && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                    <span className="text-sm text-slate-600">추가금</span>
                    <span className="text-sm font-medium text-emerald-600">+{formatPrice(surcharge)}</span>
                  </div>
                )}
              </div>
            </div>

            {(product.floristName || product.floristPhone) && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider">소속 화원</h4>
                {product.floristName && <p className="text-sm font-medium text-slate-800">{product.floristName}</p>}
                {product.floristPhone && (
                  <a href={`tel:${product.floristPhone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                    <IconPhone />
                    {formatPhone(product.floristPhone)}
                  </a>
                )}
                {product.serviceAreas && <p className="text-xs text-slate-500">배송지역: {product.serviceAreas}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      {showFullImage && imgSrc && (
        <ImageViewer src={imgSrc} alt={product.name || ''} onClose={() => setShowFullImage(false)} />
      )}
    </>
  );
}

// ─── Status Border Colors ─────────────────────────────────────────

const STATUS_CARD_STYLE: Record<string, string> = {
  NEW: 'border-l-blue-500 bg-blue-50/20',
  IN_PROGRESS: 'border-l-amber-500 bg-amber-50/20',
  COMPLETED: 'border-l-green-500 bg-green-50/10',
  CANCELLED: 'border-l-slate-400 bg-slate-50/20 opacity-70',
};

const ALL_STATUSES = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

// ─── Consult Card ─────────────────────────────────────────────────

function ConsultCard({
  consult,
  onStatusChange,
  photos,
  branchProducts,
  onProductClick,
}: {
  consult: ConsultRequest;
  onStatusChange: (id: number, status: string) => void;
  photos: RecommendedPhoto[];
  branchProducts: BranchProductSetting[];
  onProductClick: (product: RecommendedPhoto) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = STATUS_CONFIG[consult.status] || STATUS_CONFIG.NEW;
  const parsed = parseOrderMessage(consult.message);
  const cardStyle = STATUS_CARD_STYLE[consult.status] || '';

  // Fallback: extract name/phone from parsed message when top-level fields are empty
  const ordererParts = parsed?.orderer?.split('/').map((s) => s.trim()) || [];
  const displayName = consult.customerName || ordererParts[0] || '주문자';
  const displayPhone = consult.customerPhone || ordererParts[1] || '';

  // 구조화 필드 우선, message 파싱 fallback
  const detail = {
    orderer: consult.customerName && consult.customerPhone
      ? `${consult.customerName} / ${formatPhone(consult.customerPhone)}`
      : parsed?.orderer,
    recipient: consult.recipientName
      ? `${consult.recipientName}${consult.recipientPhone ? ` / ${formatPhone(consult.recipientPhone)}` : ''}`
      : parsed?.recipient,
    deliveryTime: consult.desiredDate
      ? `${consult.desiredDate}${consult.deliveryTime ? ` ${consult.deliveryTime}` : ''}${consult.deliveryPurpose ? ` ${consult.deliveryPurpose}` : ''}`
      : parsed?.deliveryTime,
    address: consult.address || parsed?.address,
    eventTime: parsed?.eventTime,
    ribbon: consult.ribbonText || parsed?.ribbon,
    memo: consult.memo || parsed?.memo,
    invoice: consult.invoiceType
      ? consult.invoiceType === 'INVOICE'
        ? '계산서 발행'
        : consult.invoiceType === 'CASH_RECEIPT'
          ? `현금영수증 발행 (${formatPhone(consult.cashReceiptPhone)})`
          : null
      : parsed?.invoice,
  };

  // Match against recommended photos first, then branch products as fallback
  let matchedProduct: RecommendedPhoto | null = null;
  let productImgSrc = '';

  if (consult.productCode) {
    matchedProduct = photos.find((p) => String(p.id) === consult.productCode) || null;
  }
  if (!matchedProduct && consult.productName) {
    matchedProduct = photos.find((p) => p.name === consult.productName) || null;
  }
  // Fallback: match from branch products and convert to RecommendedPhoto shape
  if (!matchedProduct && (consult.productCode || consult.productName)) {
    const bp = consult.productCode
      ? branchProducts.find((p) => String(p.id) === consult.productCode)
      : branchProducts.find((p) => p.name === consult.productName);
    if (bp) {
      matchedProduct = {
        id: bp.id,
        name: bp.name,
        imageUrl: bp.imageUrl,
        category: bp.category,
        sellingPrice: bp.sellingPrice ?? bp.basePrice,
      };
    }
  }
  if (matchedProduct?.imageUrl) {
    productImgSrc = productImageUrl(matchedProduct.imageUrl);
  }

  const handleProductClick = () => {
    if (matchedProduct) onProductClick(matchedProduct);
  };

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === consult.status) return;
    const nextLabel = STATUS_CONFIG[next]?.label || next;
    if (confirm(`상태를 "${nextLabel}"(으)로 변경하시겠습니까?`)) {
      onStatusChange(consult.id, next);
    } else {
      e.target.value = consult.status;
    }
  };

  return (
    <div className={`rounded-2xl border border-[var(--branch-rose-light)]/50 border-l-4 shadow-sm overflow-hidden ${cardStyle}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.dot}`} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--branch-text)] truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-[var(--branch-text-light)]">
                {formatDate(consult.createdAt)}
              </span>
              {/* 결제 상태 배지 — 결제 연동된 consult만 */}
              {consult.paymentStatus && PAYMENT_BADGE[consult.paymentStatus] && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border tabular-nums ${PAYMENT_BADGE[consult.paymentStatus].className}`}
                  title={
                    consult.paidAt
                      ? `${PAYMENT_BADGE[consult.paymentStatus].label} · ${formatDate(consult.paidAt)}`
                      : PAYMENT_BADGE[consult.paymentStatus].label
                  }
                >
                  {PAYMENT_BADGE[consult.paymentStatus].label}
                  {consult.paymentAmount != null && consult.paymentStatus === 'PAID' && (
                    <span className="opacity-70">· {formatPrice(consult.paymentAmount)}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Status select */}
        <select
          value={consult.status}
          onChange={handleStatusSelect}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border appearance-none cursor-pointer outline-none shrink-0 ${statusInfo.bg} ${statusInfo.color}`}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Product + Quick Info Summary */}
      <div className="px-5 pb-3">
        <div className="flex gap-3 items-start">
          {/* Product thumbnail */}
          {(consult.productName || consult.productCode) && (
            <button
              onClick={handleProductClick}
              className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[var(--branch-rose-light)] transition-opacity ${matchedProduct ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
            >
              {productImgSrc ? (
                <img src={productImgSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--branch-cream)] flex items-center justify-center text-[var(--branch-text-light)]">
                  <IconPackage />
                </div>
              )}
            </button>
          )}

          {/* Quick info */}
          <div className="flex-1 min-w-0 space-y-1">
            {consult.productName && (
              <p className="text-sm font-medium text-[var(--branch-text)] truncate">
                <button
                  onClick={handleProductClick}
                  className={`text-left truncate ${matchedProduct ? 'text-[var(--branch-accent)] hover:underline cursor-pointer' : 'text-[var(--branch-text)] cursor-default'}`}
                >
                  {consult.productName}
                </button>
              </p>
            )}
            {(consult.desiredDate || parsed?.deliveryTime) && (
              <p className="text-xs text-[var(--branch-text-light)] flex items-center gap-1">
                <IconCalendar />
                {consult.desiredDate || parsed?.deliveryTime}
              </p>
            )}
            {displayPhone && (
              <a href={`tel:${displayPhone.replace(/\D/g, '')}`} className="text-xs text-[var(--branch-accent)] hover:underline flex items-center gap-1">
                <IconPhone />
                {formatPhone(displayPhone)}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Order Details (expandable) — 구조화 필드 우선, message 파싱 fallback */}
      {(detail.orderer || detail.recipient || detail.address || detail.invoice) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] hover:bg-[var(--branch-cream)]/50 transition-colors border-t border-[var(--branch-rose-light)]/30"
          >
            {expanded ? '접기' : '주문 상세 보기'}
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-5 pb-4 border-t border-[var(--branch-rose-light)]/30 bg-[var(--branch-cream)]/30">
              <div className="divide-y divide-[var(--branch-rose-light)]/20">
                {detail.orderer && <InfoRow icon={<IconPerson />} label="주문자">{detail.orderer}</InfoRow>}
                {detail.recipient && <InfoRow icon={<IconPerson />} label="받는분">{detail.recipient}</InfoRow>}
                {detail.deliveryTime && <InfoRow icon={<IconCalendar />} label="배송일시">{detail.deliveryTime}</InfoRow>}
                {detail.address && <InfoRow icon={<IconMapPin />} label="배송장소"><span className="break-all">{detail.address}</span></InfoRow>}
                {detail.eventTime && <InfoRow icon={<IconClock />} label="행사시간">{detail.eventTime}</InfoRow>}
                {detail.ribbon && <InfoRow icon={<IconRibbon />} label="리본문구">{detail.ribbon}</InfoRow>}
                {detail.memo && <InfoRow icon={<IconClipboard />} label="요청사항">{detail.memo}</InfoRow>}
                {detail.invoice && (
                  <InfoRow icon={<IconReceipt />} label="증빙">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--branch-white)] border border-[var(--branch-rose-light)] text-xs">{detail.invoice}</span>
                  </InfoRow>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback: raw message (태그 없는 옛 데이터) */}
      {parsed?.raw && (
        <div className="px-5 pb-4">
          <div className="p-3 rounded-xl bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] leading-relaxed whitespace-pre-wrap">{parsed.raw}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ConsultsPage() {
  const [consults, setConsults] = useState<ConsultRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [photos, setPhotos] = useState<RecommendedPhoto[]>([]);
  const [branchProductsList, setBranchProductsList] = useState<BranchProductSetting[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<RecommendedPhoto | null>(null);
  const [branchSurcharge, setBranchSurcharge] = useState(0);

  const loadConsults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchConsultRequests({
        status: statusFilter || undefined,
        page,
        size: pageSize,
      });
      setConsults(res.data);
      setTotal(res.total);
    } catch {
      // auth error handled by store
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadConsults();
  }, [loadConsults]);

  useEffect(() => {
    if (slug) {
      fetchRecommendedPhotos(slug, { size: 200 })
        .then((res) => setPhotos(res.data))
        .catch(() => {});
    }
    fetchMyBranchInfo()
      .then((res) => { if (res.data?.defaultSurcharge) setBranchSurcharge(res.data.defaultSurcharge); })
      .catch(() => {});
    fetchBranchProducts()
      .then((res) => setBranchProductsList(res.data || []))
      .catch(() => {});
  }, [slug]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateConsultRequestStatus(id, newStatus);
      loadConsults();
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const filterOptions = [
    { value: '', label: '전체' },
    { value: 'NEW', label: '신규' },
    { value: 'IN_PROGRESS', label: '처리중' },
    { value: 'COMPLETED', label: '완료' },
    { value: 'CANCELLED', label: '취소' },
  ];

  // Count by status
  const newCount = consults.filter((c) => c.status === 'NEW').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--branch-text)]">상담 요청 관리</h1>
          {newCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
              {newCount}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--branch-text-light)] mt-1 font-light">
          총 {total}건의 상담 요청
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-[var(--branch-accent)] text-white shadow-sm'
                : 'bg-[var(--branch-white)] text-[var(--branch-text-light)] border border-[var(--branch-rose-light)] hover:border-[var(--branch-accent)] hover:text-[var(--branch-accent)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-[var(--branch-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--branch-text-light)] font-light">로딩 중...</p>
        </div>
      ) : consults.length === 0 ? (
        <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]/50">
          <svg className="w-12 h-12 mx-auto mb-4 text-[var(--branch-text-light)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-[var(--branch-text-light)] font-light">
            {statusFilter ? '해당 상태의 상담 요청이 없습니다.' : '아직 상담 요청이 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {consults.map((c) => (
              <ConsultCard
                key={c.id}
                consult={c}
                onStatusChange={handleStatusChange}
                photos={photos}
                branchProducts={branchProductsList}
                onProductClick={setSelectedProduct}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full text-sm border border-[var(--branch-rose-light)] text-[var(--branch-text-light)] hover:border-[var(--branch-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-[var(--branch-text)]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-full text-sm border border-[var(--branch-rose-light)] text-[var(--branch-text-light)] hover:border-[var(--branch-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {selectedProduct && (
        <ProductDetailPopup product={selectedProduct} surcharge={branchSurcharge} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
