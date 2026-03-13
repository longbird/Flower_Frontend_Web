'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetchConsultRequests, updateConsultRequestStatus, fetchMyBranchInfo } from '@/lib/branch/branch-api';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { ConsultRequest, RecommendedPhoto } from '@/lib/branch/types';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: '신규', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { label: '처리중', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  COMPLETED: { label: '완료', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  CANCELLED: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function productImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const API_BASE = RAW_API_BASE ? '/api/proxy' : '';
  return `${API_BASE}${url}`;
}

function formatPrice(n: number) {
  return n.toLocaleString() + '원';
}

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
      <img
        src={src}
        alt={alt}
        className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

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

          {/* Image with zoom - no forced aspect ratio */}
          {imgSrc ? (
            <div
              className="bg-slate-50 cursor-zoom-in relative group"
              onClick={() => setShowFullImage(true)}
            >
              <img src={imgSrc} alt={product.name || ''} className="w-full h-auto block max-h-[50vh] object-contain" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                  크게 보기
                </span>
              </div>
            </div>
          ) : (
            <div className="h-48 bg-slate-50 flex items-center justify-center text-5xl opacity-30">🌸</div>
          )}

          <div className="p-5 space-y-4">
            {/* Product name + badges */}
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{product.name || '상품명 없음'}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categoryLabel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {categoryLabel}
                  </span>
                )}
                {gradeInfo && (
                  <span className={`text-xs px-2.5 py-1 rounded-full ${gradeInfo.color}`}>
                    {gradeInfo.name}
                  </span>
                )}
              </div>
            </div>

            {/* Price section */}
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

            {/* Florist info */}
            {(product.floristName || product.floristPhone) && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider">소속 화원</h4>
                {product.floristName && (
                  <p className="text-sm font-medium text-slate-800">{product.floristName}</p>
                )}
                {product.floristPhone && (
                  <a
                    href={`tel:${product.floristPhone}`}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {formatPhone(product.floristPhone)}
                  </a>
                )}
                {product.serviceAreas && (
                  <p className="text-xs text-slate-500">배송지역: {product.serviceAreas}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen image viewer */}
      {showFullImage && imgSrc && (
        <ImageViewer src={imgSrc} alt={product.name || ''} onClose={() => setShowFullImage(false)} />
      )}
    </>
  );
}

function ConsultCard({
  consult,
  onStatusChange,
  photos,
  onProductClick,
}: {
  consult: ConsultRequest;
  onStatusChange: (id: number, status: string) => void;
  photos: RecommendedPhoto[];
  onProductClick: (product: RecommendedPhoto) => void;
}) {
  const statusInfo = STATUS_LABELS[consult.status] || STATUS_LABELS.NEW;
  const transitions = STATUS_TRANSITIONS[consult.status] || [];

  return (
    <div className="bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]/50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-medium text-[var(--branch-text)]">
            {consult.customerName}
          </h3>
          <a
            href={`tel:${consult.customerPhone}`}
            className="text-sm text-[var(--branch-accent)] hover:underline"
          >
            {formatPhone(consult.customerPhone)}
          </a>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {consult.productName && (() => {
          const matched = consult.productCode
            ? photos.find((p) => String(p.id) === consult.productCode)
            : photos.find((p) => p.name === consult.productName);
          return (
            <div className="flex gap-2">
              <span className="text-[var(--branch-text-light)] shrink-0">상품:</span>
              {matched ? (
                <button
                  onClick={() => onProductClick(matched)}
                  className="text-[var(--branch-accent)] hover:underline text-left"
                >
                  {consult.productName}
                </button>
              ) : (
                <span className="text-[var(--branch-text)]">{consult.productName}</span>
              )}
            </div>
          );
        })()}
        {consult.desiredDate && (
          <div className="flex gap-2">
            <span className="text-[var(--branch-text-light)] shrink-0">희망일:</span>
            <span className="text-[var(--branch-text)]">{consult.desiredDate}</span>
          </div>
        )}
        {consult.message && (
          <div className="mt-2 p-3 rounded-xl bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] leading-relaxed">
            {consult.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--branch-rose-light)]/30">
        <span className="text-xs text-[var(--branch-text-light)]">
          {formatDate(consult.createdAt)}
        </span>
        <div className="flex gap-2">
          {transitions.map((nextStatus) => {
            const info = STATUS_LABELS[nextStatus];
            return (
              <button
                key={nextStatus}
                onClick={() => onStatusChange(consult.id, nextStatus)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:shadow-sm ${
                  nextStatus === 'CANCELLED'
                    ? 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    : 'border-[var(--branch-accent)] text-[var(--branch-accent)] hover:bg-[var(--branch-accent)] hover:text-white'
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
      fetchRecommendedPhotos(slug)
        .then((data) => setPhotos(data))
        .catch(() => {});
    }
    fetchMyBranchInfo()
      .then((res) => { if (res.data?.defaultSurcharge) setBranchSurcharge(res.data.defaultSurcharge); })
      .catch(() => {});
  }, [slug]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateConsultRequestStatus(id, newStatus);
      // Refresh list
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--branch-text)]">상담 요청 관리</h1>
        <p className="text-sm text-[var(--branch-text-light)] mt-1 font-light">
          고객의 상담 요청을 확인하고 처리하세요. (총 {total}건)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
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
          <div className="text-4xl mb-3 animate-pulse">🌸</div>
          <p className="text-sm text-[var(--branch-text-light)] font-light">로딩 중...</p>
        </div>
      ) : consults.length === 0 ? (
        <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]/50">
          <div className="text-5xl mb-4 opacity-40">📋</div>
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
                onProductClick={setSelectedProduct}
              />
            ))}
          </div>

          {/* Pagination */}
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
