'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import type { BranchThemeProps } from './types';
import {
  formatPrice,
  photoUrl,
  categoryLabel,
  gradeLabel,
  StarRating,
  CATEGORY_ORDER,
  ProductDetailModal,
} from './shared';

// ─── Constants ────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const TRUST_STEPS = [
  {
    number: '01',
    title: '주문 접수',
    desc: '온라인 또는 전화로\n간편하게 주문하세요.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    number: '02',
    title: '전문 제작',
    desc: '숙련된 플로리스트가\n정성껏 제작합니다.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    number: '03',
    title: '품질 검수',
    desc: '배송 전 꽃 상태를\n꼼꼼히 확인합니다.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    number: '04',
    title: '안전 배달',
    desc: '지정 시간에 맞춰\n안전하게 전달합니다.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
];

const REVIEWS = [
  {
    name: '김*영',
    date: '2024.12',
    text: '어머니 생신에 화환을 보내드렸는데 사진으로 봤을 때보다 실물이 훨씬 풍성하고 예뻤다고 하시더라고요. 배송도 정시에 도착해서 정말 만족했습니다.',
    rating: 5,
  },
  {
    name: '이*호',
    date: '2024.11',
    text: '개업 축하 화환을 주문했는데, 다른 곳과 비교가 안 될 정도로 고급스러웠습니다. 거래처에서도 칭찬이 자자했어요. 앞으로도 계속 이용할 예정입니다.',
    rating: 5,
  },
  {
    name: '박*진',
    date: '2025.01',
    text: '장례식장 조화를 급하게 주문했는데 신속하고 정성스럽게 보내주셨습니다. 어려운 상황에서 세심하게 배려해주셔서 정말 감사했습니다.',
    rating: 5,
  },
];

// ─── Sticky Header ─────────────────────────────────────────────────

function NavyHeader({ branchName, phone, slug }: { branchName: string; phone?: string; slug: string }) {
  return (
    <header className="sticky top-0 z-40">
      {/* Dark navy bar */}
      <div className="bg-[var(--branch-green)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 md:h-16 px-5 md:px-10">
          <h1 className="text-white text-base md:text-lg font-bold tracking-tight truncate">
            {branchName}
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-white/70 text-sm hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {phone}
              </a>
            )}
            <Link
              href={`/branch/${slug}/consult`}
              className="inline-flex items-center px-5 py-2 rounded-sm bg-[var(--branch-star)] text-[var(--branch-green)] text-sm font-semibold hover:brightness-110 transition-all"
            >
              상담 요청
            </Link>
          </div>
        </div>
      </div>
      {/* Thin gold accent line */}
      <div className="h-[2px] bg-[var(--branch-star)]" />
    </header>
  );
}

// ─── Hero Section (Typographic + Geometric) ────────────────────────

function HeroSection({
  branch,
  products,
  slug,
  onProductClick,
}: {
  branch: BranchThemeProps['branch'];
  products: RecommendedPhoto[];
  slug: string;
  onProductClick: (p: RecommendedPhoto) => void;
}) {
  const heroThumbs = products.filter((p) => p.imageUrl).slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-[var(--branch-green)]">
      {/* Geometric CSS pattern */}
      <div className="absolute inset-0 opacity-[0.06]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(30deg, transparent 40%, currentColor 40%, currentColor 40.5%, transparent 40.5%),
              linear-gradient(-30deg, transparent 40%, currentColor 40%, currentColor 40.5%, transparent 40.5%),
              linear-gradient(150deg, transparent 40%, currentColor 40%, currentColor 40.5%, transparent 40.5%)
            `,
            backgroundSize: '80px 80px',
            color: 'white',
          }}
        />
      </div>
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">
          {/* Left: Typography */}
          <div className="flex-1 max-w-xl">
            {/* Thin gold line above */}
            <div className="w-16 h-[2px] bg-[var(--branch-star)] mb-6" />
            <p className="text-[var(--branch-star)] text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Premium Flower Delivery
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.2] mb-5">
              특별한 순간을 위한
              <br />
              <span className="branch-serif italic text-[var(--branch-star)]">프리미엄</span> 꽃 배달
            </h2>
            {/* Thin gold line below headline */}
            <div className="w-24 h-[1px] bg-[var(--branch-star)]/50 mb-5" />
            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              {branch.description || '엄선된 꽃과 전문 플로리스트의 정성으로, 당신의 마음을 가장 아름답게 전달합니다.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#products"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--branch-star)] text-[var(--branch-green)] text-sm font-bold rounded-sm hover:brightness-110 transition-all"
              >
                상품 보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <Link
                href={`/branch/${slug}/consult`}
                className="inline-flex items-center px-7 py-3.5 border border-white/30 text-white text-sm font-medium rounded-sm hover:bg-white/10 transition-colors"
              >
                전화 상담
              </Link>
            </div>
          </div>

          {/* Right: 2x2 thumbnail grid */}
          {heroThumbs.length >= 2 && (
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs lg:max-w-sm shrink-0">
              {heroThumbs.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => onProductClick(p)}
                  className="group relative aspect-square overflow-hidden rounded-sm bg-white/10"
                >
                  <img
                    src={photoUrl(p.imageUrl!)}
                    alt={p.name || categoryLabel(p.category || '')}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-[var(--branch-star)] text-[var(--branch-green)] text-[10px] font-bold tracking-wider uppercase rounded-sm">
                      Best
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Featured Products (Magazine Editorial) ────────────────────────

function FeaturedSection({
  products,
  onProductClick,
}: {
  products: RecommendedPhoto[];
  onProductClick: (p: RecommendedPhoto) => void;
}) {
  const featured = products.filter((p) => p.imageUrl).slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-[var(--branch-bg)]">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-10 md:mb-14">
          <div className="w-12 h-[2px] bg-[var(--branch-star)]" />
          <div>
            <p className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.2em] uppercase">
              Curated Selection
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--branch-text)] mt-1">
              추천 상품
            </h2>
          </div>
        </div>

        {/* Magazine-style 2-column editorial cards */}
        <div className="space-y-4 md:space-y-6">
          {featured.map((product, idx) => {
            const isReversed = idx % 2 === 1;
            const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');

            return (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="group w-full text-left"
              >
                <div
                  className={`flex flex-col md:flex-row ${
                    isReversed ? 'md:flex-row-reverse' : ''
                  } overflow-hidden rounded-sm border border-[var(--branch-border)] hover:border-[var(--branch-star)]/40 transition-colors duration-300`}
                >
                  {/* Image: 60% */}
                  <div className="md:w-[60%] relative overflow-hidden bg-[var(--branch-bg-alt)]">
                    <div className="aspect-[4/3] md:aspect-auto md:h-full">
                      <img
                        src={photoUrl(product.imageUrl!)}
                        alt={displayName}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    {/* Category badge */}
                    {product.category && (
                      <span className="absolute top-4 left-4 px-3 py-1 bg-[var(--branch-green)] text-white text-xs font-semibold tracking-wider uppercase rounded-sm">
                        {categoryLabel(product.category)}
                      </span>
                    )}
                  </div>
                  {/* Info: 40% */}
                  <div className="md:w-[40%] flex flex-col justify-center p-6 md:p-10 lg:p-14 bg-[var(--branch-bg)]">
                    {product.grade && (
                      <span className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.15em] uppercase mb-3">
                        {gradeLabel(product.grade)}
                      </span>
                    )}
                    <h3 className="text-xl md:text-2xl font-bold text-[var(--branch-text)] mb-3 leading-snug group-hover:text-[var(--branch-green)] transition-colors">
                      {displayName}
                    </h3>
                    <div className="w-8 h-[1px] bg-[var(--branch-star)]/40 mb-4" />
                    {product.sellingPrice != null && (
                      <p className="text-2xl md:text-3xl font-bold text-[var(--branch-green)] mb-4">
                        {formatPrice(product.sellingPrice)}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--branch-text-secondary)] group-hover:text-[var(--branch-star)] transition-colors mt-auto">
                      자세히 보기
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Products Section (List on desktop, Grid on mobile) ────────────

function ProductsSection({
  slug,
  initialData,
  onProductClick,
}: {
  slug: string;
  initialData: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (p: RecommendedPhoto) => void;
}) {
  const [allProducts, setAllProducts] = useState<RecommendedPhoto[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['ALL', ...CATEGORY_ORDER.filter((c) => cats.has(c))];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [allProducts, selectedCategory]);

  const hasMore = allProducts.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    const result = await fetchRecommendedPhotos(slug, { page: nextPage, size: PAGE_SIZE });
    setAllProducts((prev) => [...prev, ...result.data]);
    setTotal(result.total);
    setPage(nextPage);
    setLoading(false);
  }, [slug, page, loading, hasMore]);

  return (
    <section id="products" className="py-16 md:py-24 bg-[var(--branch-bg-alt)]">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <div className="w-12 h-[2px] bg-[var(--branch-star)]" />
          <div>
            <p className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.2em] uppercase">
              All Products
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--branch-text)] mt-1">
              전체 상품
            </h2>
          </div>
        </div>

        {/* Category filter tabs */}
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-8 md:mb-10">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-sm font-medium rounded-sm border transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--branch-green)] text-white border-[var(--branch-green)]'
                      : 'bg-[var(--branch-bg)] text-[var(--branch-text-secondary)] border-[var(--branch-border)] hover:border-[var(--branch-green)] hover:text-[var(--branch-green)]'
                  }`}
                >
                  {cat === 'ALL' ? '전체' : categoryLabel(cat)}
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop: List layout / Mobile: 2-col grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-[var(--branch-text-muted)]">
            <p className="text-lg">해당 카테고리에 상품이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Desktop list */}
            <div className="hidden md:flex flex-col gap-3">
              {filteredProducts.map((product) => {
                const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');
                const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';
                return (
                  <button
                    key={product.id}
                    onClick={() => onProductClick(product)}
                    className="group flex items-center gap-6 p-4 bg-[var(--branch-bg)] border border-[var(--branch-border)] rounded-sm hover:border-[var(--branch-star)]/40 transition-all duration-200 text-left"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden bg-[var(--branch-bg-alt)]">
                      {imgSrc ? (
                        <img src={imgSrc} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-[var(--branch-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Info center */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {product.category && (
                          <span className="inline-flex px-2 py-0.5 bg-[var(--branch-green)]/10 text-[var(--branch-green)] text-[11px] font-semibold tracking-wide uppercase rounded-sm">
                            {categoryLabel(product.category)}
                          </span>
                        )}
                        {product.grade && (
                          <span className="text-[var(--branch-star)] text-[11px] font-medium">
                            {gradeLabel(product.grade)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-[var(--branch-text)] truncate group-hover:text-[var(--branch-green)] transition-colors">
                        {displayName}
                      </h3>
                    </div>
                    {/* Price right */}
                    <div className="shrink-0 text-right">
                      {product.sellingPrice != null && (
                        <span className="text-lg font-bold text-[var(--branch-green)]">
                          {formatPrice(product.sellingPrice)}
                        </span>
                      )}
                    </div>
                    {/* Arrow */}
                    <svg className="w-5 h-5 text-[var(--branch-text-muted)] shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-[var(--branch-star)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Mobile grid */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const displayName = product.name || (product.category ? categoryLabel(product.category) : '상품');
                const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';
                return (
                  <button
                    key={product.id}
                    onClick={() => onProductClick(product)}
                    className="group text-left bg-[var(--branch-bg)] border border-[var(--branch-border)] rounded-sm overflow-hidden hover:border-[var(--branch-star)]/40 transition-colors"
                  >
                    <div className="aspect-square bg-[var(--branch-bg-alt)] overflow-hidden">
                      {imgSrc ? (
                        <img src={imgSrc} alt={displayName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-[var(--branch-text-muted)] opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {product.category && (
                        <span className="text-[10px] font-semibold text-[var(--branch-star)] tracking-wider uppercase">
                          {categoryLabel(product.category)}
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-[var(--branch-text)] mt-0.5 truncate">
                        {displayName}
                      </h3>
                      {product.sellingPrice != null && (
                        <p className="text-sm font-bold text-[var(--branch-green)] mt-1">
                          {formatPrice(product.sellingPrice)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Load more */}
        {hasMore && selectedCategory === 'ALL' && (
          <div className="text-center mt-10">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-[var(--branch-green)] text-[var(--branch-green)] text-sm font-semibold rounded-sm hover:bg-[var(--branch-green)] hover:text-white transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  불러오는 중...
                </>
              ) : (
                '더 보기'
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Trust Steps (Horizontal Timeline) ─────────────────────────────

function TrustStepsSection() {
  return (
    <section className="py-16 md:py-24 bg-[var(--branch-bg)]">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">
            Our Process
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--branch-text)]">
            주문에서 배달까지
          </h2>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-[1px] bg-[var(--branch-border)]" />

          {TRUST_STEPS.map((step, idx) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Number circle */}
              <div className="relative z-10 w-20 h-20 rounded-full border-2 border-[var(--branch-star)] bg-[var(--branch-bg)] flex flex-col items-center justify-center mb-5">
                <span className="text-[var(--branch-star)] text-lg font-bold leading-none">{step.number}</span>
              </div>
              {/* Icon */}
              <div className="text-[var(--branch-green)] mb-3">
                {step.icon}
              </div>
              {/* Text */}
              <h3 className="text-base font-bold text-[var(--branch-text)] mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--branch-text-secondary)] leading-relaxed whitespace-pre-line">
                {step.desc}
              </p>
              {/* Arrow between steps (desktop only) */}
              {idx < TRUST_STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 -right-3 z-20">
                  <svg className="w-6 h-6 text-[var(--branch-star)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6l6 6-6 6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Customer Review (Single Spotlight) ────────────────────────────

function ReviewSection() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const review = REVIEWS[currentIdx];

  const prev = () => setCurrentIdx((i) => (i === 0 ? REVIEWS.length - 1 : i - 1));
  const next = () => setCurrentIdx((i) => (i === REVIEWS.length - 1 ? 0 : i + 1));

  return (
    <section className="py-16 md:py-24 bg-[var(--branch-green)]">
      <div className="max-w-3xl mx-auto px-5 md:px-10 text-center">
        {/* Section header */}
        <p className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.2em] uppercase mb-2">
          Testimonial
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-12">
          고객 후기
        </h2>

        {/* Quote */}
        <div className="relative">
          {/* Large decorative quote mark */}
          <svg
            className="w-12 h-12 mx-auto text-[var(--branch-star)] opacity-40 mb-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
          </svg>

          <blockquote className="text-lg md:text-xl text-white/90 leading-relaxed mb-8 max-w-2xl mx-auto">
            &ldquo;{review.text}&rdquo;
          </blockquote>

          <div className="flex items-center justify-center gap-2 mb-2">
            <StarRating count={review.rating} />
          </div>
          <p className="text-white font-semibold">{review.name}</p>
          <p className="text-white/50 text-sm">{review.date}</p>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={prev}
            className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="이전 후기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Dots */}
          <div className="flex gap-2">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentIdx
                    ? 'bg-[var(--branch-star)] w-6'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`후기 ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="다음 후기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer (Dark Navy + Gold Accents, 4-column) ───────────────────

function NavyFooter({ branch, slug }: { branch: BranchThemeProps['branch']; slug: string }) {
  return (
    <footer className="bg-[var(--branch-footer-bg)] text-white/70">
      {/* Gold accent line */}
      <div className="h-[2px] bg-[var(--branch-star)]" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-white font-bold text-lg mb-3">{branch.name}</h3>
            <p className="text-sm leading-relaxed mb-4">
              {branch.description || '신선한 꽃을 정성스럽게 준비하여 소중한 마음을 전달해 드립니다.'}
            </p>
            <div className="w-10 h-[1px] bg-[var(--branch-star)]/50" />
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4 className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.15em] uppercase mb-4">
              바로가기
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#products" className="hover:text-white transition-colors">전체 상품</a>
              </li>
              <li>
                <Link href={`/branch/${slug}/consult`} className="hover:text-white transition-colors">
                  상담 요청
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h4 className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.15em] uppercase mb-4">
              연락처
            </h4>
            <ul className="space-y-2.5 text-sm">
              {branch.phone && (
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--branch-star)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${branch.phone}`} className="hover:text-white transition-colors">{branch.phone}</a>
                </li>
              )}
              {branch.address && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-[var(--branch-star)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{branch.address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Payment info */}
          <div>
            <h4 className="text-[var(--branch-star)] text-xs font-semibold tracking-[0.15em] uppercase mb-4">
              결제 안내
            </h4>
            {branch.virtualAccountBank && branch.virtualAccountNumber ? (
              <div className="text-sm space-y-1">
                <p className="text-white font-medium">
                  {branch.virtualAccountBank}
                </p>
                <p>{branch.virtualAccountNumber}</p>
              </div>
            ) : (
              <p className="text-sm">
                전화 또는 상담 요청을 통해<br />결제 방법을 안내받으실 수 있습니다.
              </p>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} {branch.name}. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            Powered by 달려라 꽃배달
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ────────────────────────────────────────────────────

export function NavyHomePage({ branch, slug, products, onProductClick }: BranchThemeProps) {
  const [selectedProduct, setSelectedProduct] = useState<RecommendedPhoto | null>(null);

  const handleProductClick = (product: RecommendedPhoto) => {
    setSelectedProduct(product);
    onProductClick(product);
  };

  return (
    <div className="min-h-screen bg-[var(--branch-bg)]">
      <NavyHeader branchName={branch.name} phone={branch.phone} slug={slug} />

      <HeroSection
        branch={branch}
        products={products.data}
        slug={slug}
        onProductClick={handleProductClick}
      />

      {products.data.length > 0 && (
        <FeaturedSection
          products={products.data}
          onProductClick={handleProductClick}
        />
      )}

      {products.data.length > 0 && (
        <ProductsSection
          slug={slug}
          initialData={products}
          onProductClick={handleProductClick}
        />
      )}

      <TrustStepsSection />
      <ReviewSection />
      <NavyFooter branch={branch} slug={slug} />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          slug={slug}
          branch={branch}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
