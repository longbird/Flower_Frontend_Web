'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBranchInfo, fetchRecommendedPhotos, submitConsultRequest } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, ConsultRequestForm, PaginatedResponse } from '@/lib/branch/types';

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

function formatPhone(value: string): string {
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

const CATEGORY_ORDER = [
  'CELEBRATION', 'CONDOLENCE', 'OBJET', 'ORIENTAL', 'WESTERN', 'FLOWER',
  'FOLIAGE', 'RICE', 'FRUIT', 'OTHER',
];

const GRADE_LABEL_MAP: Record<string, string> = {
  PREMIUM: '프리미엄', HIGH: '고급형', STANDARD: '실속형',
};

function gradeLabel(code: string) {
  return GRADE_LABEL_MAP[code] || code;
}

function categoryLabel(code: string) {
  return CATEGORY_LABEL_MAP[code] || code;
}

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return RAW_API_BASE ? `/api/proxy${url}` : url;
}

// ─── Hero Section ──────────────────────────────────────────────────

function HeroSection({ branch }: { branch: BranchInfo }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--branch-rose-light)] via-[var(--branch-peach-light)] to-[var(--branch-cream)] py-3 px-4 md:py-6">
      <div className="relative max-w-4xl mx-auto flex items-center justify-between md:flex-col md:text-center gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-3xl font-semibold text-[var(--branch-text)] leading-tight truncate">
            {branch.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 md:mt-2">
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/60 hover:bg-white transition-colors text-xs text-[var(--branch-text-light)]"
            >
              📞 <span className="hidden sm:inline">{branch.phone}</span><span className="sm:hidden">전화</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Product Card ─────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
}: {
  product: RecommendedPhoto;
  onClick: () => void;
}) {
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';

  return (
    <div
      className="group bg-[var(--branch-white)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-[var(--branch-rose-light)]/50 cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-[var(--branch-rose-light)] to-[var(--branch-peach-light)] flex items-center justify-center overflow-hidden relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name || '상품'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-4">
            <div className="text-5xl mb-2 opacity-60">🌸</div>
            <p className="text-sm text-[var(--branch-text-light)] font-light">
              {product.category ? categoryLabel(product.category) : '꽃'}
            </p>
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs backdrop-blur-sm">
            {categoryLabel(product.category)}
          </span>
        )}
        {product.grade && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/70 text-[var(--branch-text)] text-xs backdrop-blur-sm">
            {gradeLabel(product.grade)}
          </span>
        )}
      </div>
      <div className="p-4">
        {product.name && (
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-1 line-clamp-2">{product.name}</h3>
        )}
        {product.sellingPrice != null && (
          <span className="text-lg font-semibold text-[var(--branch-accent)]">
            {formatPrice(product.sellingPrice)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Full-screen Image Viewer ─────────────────────────────────────

function FullImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
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

// ─── Product Detail Modal ─────────────────────────────────────────

function ProductDetailModal({
  product,
  slug,
  onClose,
}: {
  product: RecommendedPhoto;
  slug: string;
  onClose: () => void;
}) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [form, setForm] = useState<ConsultRequestForm>({
    customerName: '',
    customerPhone: '',
    productCode: String(product.id),
    productName: product.name || (product.category ? categoryLabel(product.category) : '상품'),
    desiredDate: todayStr,
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

  const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--branch-white)] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--branch-rose-light)]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 text-[var(--branch-text-light)] hover:bg-white hover:text-[var(--branch-text)] transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {submitted ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🌸</div>
              <h2 className="text-xl text-[var(--branch-text)] mb-3">
                주문 요청이 완료되었습니다
              </h2>
              <p className="text-[var(--branch-text-light)] font-light mb-6 leading-relaxed">
                <strong>{displayName}</strong> 상품에 대해<br />
                빠른 시간 내에 연락드리겠습니다.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-[var(--branch-accent)] text-white rounded-full font-medium hover:bg-[var(--branch-rose)] transition-colors"
              >
                확인
              </button>
            </div>
          ) : showOrderForm ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-[var(--branch-cream)] border border-[var(--branch-rose-light)]/50">
                {imgSrc ? (
                  <img src={imgSrc} alt={displayName} className="w-14 h-14 rounded-lg object-contain bg-white" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[var(--branch-rose-light)] flex items-center justify-center text-2xl opacity-50">
                    🌸
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">{displayName}</h3>
                  {product.sellingPrice != null && (
                    <p className="text-sm font-bold text-[var(--branch-accent)]">{formatPrice(product.sellingPrice)}</p>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-semibold text-[var(--branch-text)] mb-4">주문 요청</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">이름</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">
                    연락처 <span className="text-[var(--branch-accent)]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: formatPhone(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                    placeholder="010-1234-5678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">희망 배달일</label>
                  <input
                    type="date"
                    value={form.desiredDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, desiredDate: e.target.value }))}
                    min={todayStr}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">요청 사항</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors resize-none"
                    placeholder="배달 주소, 카드 문구 등을 자유롭게 적어 주세요."
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowOrderForm(false)}
                    className="flex-1 py-3 rounded-full border-2 border-[var(--branch-rose-light)] text-[var(--branch-text-light)] font-medium hover:bg-[var(--branch-rose-light)]/30 transition-colors"
                  >
                    뒤로
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-full bg-[var(--branch-accent)] text-white font-medium hover:bg-[var(--branch-rose)] transition-colors disabled:opacity-60"
                  >
                    {submitting ? '전송 중...' : '주문 요청하기'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Image - full display, click to enlarge */}
              <div
                className="aspect-[3/4] bg-gradient-to-br from-[var(--branch-rose-light)] to-[var(--branch-peach-light)] flex items-center justify-center overflow-hidden rounded-t-3xl relative cursor-pointer group"
                onClick={() => imgSrc && setShowFullImage(true)}
              >
                {imgSrc ? (
                  <>
                    <img
                      src={imgSrc}
                      alt={displayName}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      크게 보기
                    </span>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="text-7xl mb-2 opacity-60">🌸</div>
                    <p className="text-[var(--branch-text-light)] font-light">
                      {product.category ? categoryLabel(product.category) : '꽃'}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6">
                {product.category && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[var(--branch-rose-light)] text-[var(--branch-accent)] text-xs mb-2">
                    {categoryLabel(product.category)}
                  </span>
                )}
                <h2 className="text-2xl font-semibold text-[var(--branch-text)] mb-2">
                  {displayName}
                </h2>

                {product.sellingPrice != null && (
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-[var(--branch-accent)]">
                      {formatPrice(product.sellingPrice)}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setShowOrderForm(true)}
                  className="w-full py-4 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors shadow-lg"
                >
                  이 상품 주문 요청하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-screen image viewer */}
      {showFullImage && imgSrc && (
        <FullImageViewer src={imgSrc} onClose={() => setShowFullImage(false)} />
      )}
    </>
  );
}

// ─── Products Section ─────────────────────────────────────────────

function ProductsSection({
  slug,
  branch,
  initialData,
  onProductClick,
}: {
  slug: string;
  branch: BranchInfo;
  initialData: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (product: RecommendedPhoto) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [areaInput, setAreaInput] = useState('');
  const [activeArea, setActiveArea] = useState('');
  const [page, setPage] = useState(1);
  const [photosData, setPhotosData] = useState<PaginatedResponse<RecommendedPhoto>>(initialData);
  const [loadingPage, setLoadingPage] = useState(false);

  // Derive category list from initialData so tabs don't disappear on category filter
  const categoryList = useMemo(() => {
    const cats = new Set<string>();
    for (const p of initialData.data) {
      if (p.category) cats.add(p.category);
    }
    const sorted = CATEGORY_ORDER.filter((c) => cats.has(c));
    const rest = Array.from(cats).filter((c) => !CATEGORY_ORDER.includes(c));
    return ['전체', ...sorted, ...rest];
  }, [initialData]);

  // Fetch from server when page, category, or area changes
  useEffect(() => {
    const category = selectedCategory === '전체' ? undefined : selectedCategory;
    const serviceArea = activeArea || undefined;

    async function loadPage() {
      setLoadingPage(true);
      const result = await fetchRecommendedPhotos(slug, { page, size: 40, category, serviceArea });
      setPhotosData(result);
      setLoadingPage(false);
    }
    loadPage();
  }, [slug, page, selectedCategory, activeArea]);

  // Reset page to 1 when category changes
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleAreaSearch = () => {
    setActiveArea(areaInput.trim());
    setPage(1);
  };

  const handleAreaClear = () => {
    setAreaInput('');
    setActiveArea('');
    setPage(1);
  };

  const filteredProducts = photosData.data;

  const totalPages = Math.ceil(photosData.total / photosData.size);

  if (initialData.data.length === 0) return null;

  return (
    <section className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            {categoryList.length > 2 && (
              <>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="sm:hidden w-full max-w-xs px-4 py-2.5 rounded-full border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237a6365%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]"
                >
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === '전체' ? '전체 상품' : categoryLabel(cat)}
                    </option>
                  ))}
                </select>
                <div className="hidden sm:flex flex-wrap justify-center gap-2">
                  {categoryList.map((cat) => {
                    const isActive = cat === selectedCategory;
                    const label = cat === '전체' ? '전체' : categoryLabel(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[var(--branch-accent)] text-white shadow-md'
                            : 'bg-white/70 text-[var(--branch-text-light)] hover:bg-white border border-[var(--branch-rose-light)]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

          </div>

          {/* Area search */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">🚗</span>
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
                  placeholder="배달 지역 검색 (예: 강남, 서초)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--branch-rose-light)] bg-white text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors text-sm"
                />
              </div>
              <button
                onClick={handleAreaSearch}
                className="px-4 py-2.5 rounded-full bg-[var(--branch-accent)] text-white text-sm font-medium hover:bg-[var(--branch-rose)] transition-colors shrink-0"
              >
                검색
              </button>
            </div>
            {activeArea && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-[var(--branch-text-light)]">
                  &quot;{activeArea}&quot; 지역 검색 결과: {filteredProducts.length}건
                </span>
                <button
                  onClick={handleAreaClear}
                  className="text-xs text-[var(--branch-accent)] hover:underline"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
        </div>

        {photosData.total > 0 && (
          <p className="text-sm text-[var(--branch-text-light)] text-center mb-4">
            총 {photosData.total}개 상품
          </p>
        )}

        {loadingPage ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">
            <div className="text-4xl mb-3 opacity-40 animate-pulse">🌸</div>
            <p className="font-light">불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[var(--branch-text-light)]">
            <div className="text-4xl mb-3 opacity-40">🌷</div>
            <p className="font-light">해당 조건에 맞는 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
              />
            ))}
          </div>
        )}

        {photosData.total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white/70 text-[var(--branch-text-light)] hover:bg-white border border-[var(--branch-rose-light)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-[var(--branch-text-light)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white/70 text-[var(--branch-text-light)] hover:bg-white border border-[var(--branch-rose-light)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href={`/branch/${slug}/consult`}
            className="inline-flex items-center justify-center px-10 py-4 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors shadow-lg"
          >
            주문 상담 요청하기
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────

function Footer({ branch }: { branch: BranchInfo }) {
  return (
    <footer className="bg-[var(--branch-text)] text-white/80 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-white mb-3">{branch.name}</h3>
          <div className="space-y-1 text-sm font-light">
            {branch.address && <p>{branch.address}</p>}
            {branch.phone && <p>전화: {branch.phone}</p>}
          </div>
        </div>
        {branch.virtualAccountBank && branch.virtualAccountNumber && (
          <div className="text-center mb-6 py-4 px-6 rounded-2xl bg-white/10 border border-white/20 max-w-sm mx-auto">
            <p className="text-xs text-white/50 tracking-wider mb-2">입금 계좌</p>
            <p className="text-white font-medium text-base">{branch.virtualAccountBank}</p>
            <p className="text-white/90 text-lg font-semibold tracking-wider mt-0.5">{branch.virtualAccountNumber}</p>
          </div>
        )}
        <div className="pt-4 border-t border-white/20 text-center text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {branch.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Utility screens ──────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--branch-cream)]">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🌸</div>
        <p className="text-[var(--branch-text-light)] font-light tracking-wider">로딩 중...</p>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--branch-cream)]">
      <div className="text-center p-8">
        <div className="text-6xl mb-6 opacity-50">🌷</div>
        <h1 className="text-2xl text-[var(--branch-text)] mb-3">페이지를 찾을 수 없습니다</h1>
        <p className="text-[var(--branch-text-light)] font-light">
          요청하신 지사 페이지가 존재하지 않거나 현재 서비스 중이 아닙니다.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function BranchHomePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [products, setProducts] = useState<PaginatedResponse<RecommendedPhoto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RecommendedPhoto | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      const [branchData, photosData] = await Promise.all([
        fetchBranchInfo(slug),
        fetchRecommendedPhotos(slug, { page: 1, size: 40 }),
      ]);

      if (!branchData) {
        setNotFound(true);
      } else {
        setBranch(branchData);
        setProducts(photosData);
      }
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) return <LoadingScreen />;
  if (notFound || !branch) return <NotFoundScreen />;

  return (
    <>
      <HeroSection branch={branch} />
      {products && products.data.length > 0 && (
        <ProductsSection
          slug={slug}
          branch={branch}
          initialData={products}
          onProductClick={(product) => setSelectedProduct(product)}
        />
      )}
      <Footer branch={branch} />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          slug={slug}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
