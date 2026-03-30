'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import type { BranchThemeProps } from './types';
import {
  formatPrice,
  photoUrl,
  categoryLabel,
  gradeLabel,
  StarRating,
  CATEGORY_ORDER,
  BusinessInfoFooter,
} from './shared';

// ─── Ornamental Divider ─────────────────────────────────────────

function OrnamentalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="block h-px w-12 bg-[var(--branch-border)]" />
      <svg
        className="w-5 h-5 text-[var(--branch-green)] opacity-60"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C10.2 5.5 7 7 4 7c0 5 2.5 9 8 13 5.5-4 8-8 8-13-3 0-6.2-1.5-8-5z" />
      </svg>
      <span className="block h-px w-12 bg-[var(--branch-border)]" />
    </div>
  );
}

// ─── Sticky Header (Centered, ornamental) ───────────────────────

function StickyHeader({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--branch-bg)]/95 backdrop-blur-md shadow-sm'
          : 'bg-[var(--branch-bg)]'
      }`}
    >
      {/* Top row: phone + center brand + CTA */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Left: phone */}
          <div className="flex-1 flex justify-start">
            {branch.phone && (
              <a
                href={`tel:${branch.phone}`}
                className="inline-flex items-center gap-1.5 text-xs md:text-sm text-[var(--branch-text-secondary)] hover:text-[var(--branch-green)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="hidden sm:inline">{branch.phone}</span>
              </a>
            )}
          </div>

          {/* Center: brand name with decorative lines */}
          <div className="flex items-center gap-3">
            <span className="hidden md:block h-px w-8 bg-[var(--branch-border)]" />
            <h1 className="branch-serif text-lg md:text-xl font-semibold text-[var(--branch-text)] tracking-wide text-center whitespace-nowrap">
              {branch.name}
            </h1>
            <span className="hidden md:block h-px w-8 bg-[var(--branch-border)]" />
          </div>

          <div className="flex-1" />
        </div>
      </div>

      {/* Bottom nav bar */}
      <div className="border-t border-b border-[var(--branch-border)]">
        <nav className="max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-center gap-6 md:gap-10 h-10 text-xs md:text-sm text-[var(--branch-text-secondary)] tracking-wider">
          <a href="#featured" className="hover:text-[var(--branch-green)] transition-colors">
            추천 상품
          </a>
          <a href="#products" className="hover:text-[var(--branch-green)] transition-colors">
            전체 상품
          </a>
          <a href="#promise" className="hover:text-[var(--branch-green)] transition-colors">
            서비스
          </a>
          <a href="#reviews" className="hover:text-[var(--branch-green)] transition-colors">
            고객 후기
          </a>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero Section (Split layout, light) ─────────────────────────

function HeroSection({
  branch,
  products,
  slug,
}: {
  branch: BranchInfo;
  products: RecommendedPhoto[];
  slug: string;
}) {
  const heroProduct = products.length > 0 ? products[0] : null;
  const heroImage = heroProduct?.imageUrl ? photoUrl(heroProduct.imageUrl) : '';

  return (
    <section className="bg-[var(--branch-bg)]">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: text content with botanical decoration */}
          <div className="order-2 md:order-1 text-center md:text-left">
            <OrnamentalDivider className="mb-6 md:hidden" />

            <p className="text-[var(--branch-green)] text-xs font-medium tracking-[0.25em] uppercase mb-4">
              Flower Delivery
            </p>

            <h2
              className="branch-serif text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-[var(--branch-text)] leading-snug mb-5"
              style={{ letterSpacing: '-0.01em' }}
            >
              마음을 전하는
              <br />
              <span className="text-[var(--branch-green)]">가장 아름다운</span> 방법
            </h2>

            <p className="text-[var(--branch-text-secondary)] text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
              {branch.description ||
                '한 송이 한 송이, 정성을 담아 준비합니다. 소중한 분께 꽃으로 마음을 전해 보세요.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="#products"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors"
              >
                상품 둘러보기
              </a>
            </div>

            {/* Decorative botanical SVG below buttons */}
            <div className="mt-10 hidden md:block">
              <svg
                className="w-40 h-20 text-[var(--branch-green)] opacity-[0.08]"
                viewBox="0 0 200 80"
                fill="currentColor"
              >
                <path d="M20 70C20 70 30 40 60 35C40 50 35 65 20 70Z" />
                <path d="M60 35C60 35 50 15 70 5C65 25 60 35 60 35Z" />
                <path d="M60 35C60 35 80 20 100 25C80 35 60 35 60 35Z" />
                <path d="M100 25C100 25 120 10 140 20C120 30 100 25 100 25Z" />
                <path d="M100 25C100 25 105 45 90 60C95 40 100 25 100 25Z" />
                <path d="M140 20C140 20 160 15 175 30C155 25 140 20 140 20Z" />
                <path d="M140 20C140 20 145 40 135 55C140 35 140 20 140 20Z" />
              </svg>
            </div>
          </div>

          {/* Right: hero image in elegant frame */}
          <div className="order-1 md:order-2">
            <div className="relative max-w-sm mx-auto md:max-w-none">
              {/* Decorative offset border */}
              <div className="absolute -top-3 -right-3 w-full h-full rounded-2xl border border-[var(--branch-green)] opacity-20" />
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--branch-bg-alt)]">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={heroProduct?.name || '추천 상품'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-20 h-20 text-[var(--branch-text-muted)] opacity-30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Featured Products Carousel (Horizontal scroll) ─────────────

function FeaturedCarousel({
  products,
  onProductClick,
}: {
  products: RecommendedPhoto[];
  onProductClick: (p: RecommendedPhoto) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const featured = products.slice(0, 8);
  if (featured.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.7;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section id="featured" className="py-12 md:py-16 bg-[var(--branch-bg-alt)]">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-8">
          <p className="text-[var(--branch-green)] text-xs font-medium tracking-[0.25em] uppercase mb-2">
            Recommendation
          </p>
          <h2 className="branch-serif text-2xl md:text-3xl font-semibold text-[var(--branch-text)]">
            추천 상품
          </h2>
        </div>

        <div className="relative">
          {/* Scroll buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--branch-border)] flex items-center justify-center text-[var(--branch-text-secondary)] hover:text-[var(--branch-green)] hover:border-[var(--branch-green)] transition-colors hidden md:flex"
            aria-label="이전"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-[var(--branch-border)] flex items-center justify-center text-[var(--branch-text-secondary)] hover:text-[var(--branch-green)] hover:border-[var(--branch-green)] transition-colors hidden md:flex"
            aria-label="다음"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {featured.map((product) => {
              const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';
              return (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[200px] md:w-[220px] snap-start cursor-pointer group"
                  onClick={() => onProductClick(product)}
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border border-[var(--branch-border)] mb-3 relative">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={product.name || '상품'}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-10 h-10 text-[var(--branch-text-muted)] opacity-30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {product.grade && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/90 text-[var(--branch-green)] backdrop-blur-sm border border-[var(--branch-border)]">
                        {gradeLabel(product.grade)}
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    {product.category && (
                      <p className="text-[10px] text-[var(--branch-text-muted)] tracking-wider uppercase mb-1">
                        {categoryLabel(product.category)}
                      </p>
                    )}
                    {product.name && (
                      <p className="text-sm font-medium text-[var(--branch-text)] mb-1 line-clamp-1">
                        {product.name}
                      </p>
                    )}
                    {product.sellingPrice != null && (
                      <p className="text-sm font-semibold text-[var(--branch-green)]">
                        {formatPrice(product.sellingPrice)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Masonry Product Card ───────────────────────────────────────

function MasonryProductCard({
  product,
  onClick,
  tall,
}: {
  product: RecommendedPhoto;
  onClick: () => void;
  tall: boolean;
}) {
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';

  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden bg-white border border-[var(--branch-border)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      onClick={onClick}
    >
      <div
        className={`${tall ? 'aspect-[3/5]' : 'aspect-[3/4]'} bg-[var(--branch-bg-alt)] flex items-center justify-center overflow-hidden relative`}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name || '상품'}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="text-center p-4">
            <svg
              className="w-10 h-10 mx-auto text-[var(--branch-text-muted)] opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {product.category && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 text-[var(--branch-green)] text-[10px] font-medium backdrop-blur-sm border border-[var(--branch-border)]">
            {categoryLabel(product.category)}
          </span>
        )}
        {product.grade && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[var(--branch-green)] text-white text-[10px] font-medium">
            {gradeLabel(product.grade)}
          </span>
        )}
      </div>
      <div className="p-3.5">
        {product.name && (
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-1.5 line-clamp-2 leading-snug">
            {product.name}
          </h3>
        )}
        {product.sellingPrice != null && (
          <p className="branch-serif text-base font-semibold text-[var(--branch-green)]">
            {formatPrice(product.sellingPrice)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Products Section (Masonry grid with filters + pagination) ──

function ProductsSection({
  slug,
  initialData,
  onProductClick,
}: {
  slug: string;
  initialData: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (product: RecommendedPhoto) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [areaInput, setAreaInput] = useState('');
  const [activeArea, setActiveArea] = useState('');
  const [page, setPage] = useState(1);
  const [photosData, setPhotosData] = useState<PaginatedResponse<RecommendedPhoto>>(initialData);
  const [loadingPage, setLoadingPage] = useState(false);

  const categoryList = useMemo(() => {
    const cats = new Set<string>();
    for (const p of initialData.data) {
      if (p.category) cats.add(p.category);
    }
    const sorted = CATEGORY_ORDER.filter((c) => cats.has(c));
    const rest = Array.from(cats).filter((c) => !CATEGORY_ORDER.includes(c));
    return ['전체', ...sorted, ...rest];
  }, [initialData]);

  useEffect(() => {
    const category = selectedCategory === '전체' ? undefined : selectedCategory;
    const serviceArea = activeArea || undefined;

    async function loadPage() {
      setLoadingPage(true);
      const result = await fetchRecommendedPhotos(slug, {
        page,
        size: 40,
        category,
        serviceArea,
      });
      setPhotosData(result);
      setLoadingPage(false);
    }
    loadPage();
  }, [slug, page, selectedCategory, activeArea]);

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
    <section id="products" className="py-12 md:py-16 px-4 md:px-8 bg-[var(--branch-bg)]">
      <div className="max-w-5xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-8">
          <OrnamentalDivider className="mb-5" />
          <h2 className="branch-serif text-2xl md:text-3xl font-semibold text-[var(--branch-text)]">
            전체 상품
          </h2>
          <p className="text-[var(--branch-text-muted)] text-sm mt-2">
            원하시는 상품을 선택하시면 주문 상담을 요청하실 수 있습니다
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Category filter */}
          {categoryList.length > 2 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {/* Mobile: dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="sm:hidden w-full max-w-xs px-4 py-2.5 rounded-full border border-[var(--branch-border)] bg-white text-[var(--branch-text)] text-sm focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center]"
              >
                {categoryList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === '전체' ? '전체 상품' : categoryLabel(cat)}
                  </option>
                ))}
              </select>

              {/* Desktop: pill buttons with underline style */}
              <div className="hidden sm:flex flex-wrap justify-center gap-1">
                {categoryList.map((cat) => {
                  const isActive = cat === selectedCategory;
                  const label = cat === '전체' ? '전체' : categoryLabel(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        isActive
                          ? 'text-[var(--branch-green)]'
                          : 'text-[var(--branch-text-muted)] hover:text-[var(--branch-text-secondary)]'
                      }`}
                    >
                      {label}
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[var(--branch-green)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Area search */}
          <div className="max-w-sm mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--branch-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
                  placeholder="배달 지역 (예: 강남, 서초)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--branch-border)] bg-white text-[var(--branch-text)] placeholder-[var(--branch-text-muted)] focus:outline-none focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 transition-colors text-sm"
                />
              </div>
              <button
                onClick={handleAreaSearch}
                className="px-4 py-2.5 rounded-full bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors shrink-0"
              >
                검색
              </button>
            </div>
            {activeArea && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-[var(--branch-text-secondary)]">
                  &quot;{activeArea}&quot; 검색 결과: {filteredProducts.length}건
                </span>
                <button
                  onClick={handleAreaClear}
                  className="text-xs text-[var(--branch-green)] hover:underline"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Total count */}
        {photosData.total > 0 && (
          <p className="text-xs text-[var(--branch-text-muted)] text-center mb-6 tracking-wider">
            총 {photosData.total}개
          </p>
        )}

        {/* Product grid */}
        {loadingPage ? (
          <div className="text-center py-16 text-[var(--branch-text-muted)]">
            <div className="w-7 h-7 mx-auto mb-3 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-[var(--branch-text-muted)]">
            <svg
              className="w-10 h-10 mx-auto mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm">해당 조건에 맞는 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredProducts.map((product, idx) => (
              <div key={product.id} className="break-inside-avoid">
                <MasonryProductCard
                  product={product}
                  onClick={() => onProductClick(product)}
                  tall={idx % 5 === 0 || idx % 5 === 3}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {photosData.total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="px-5 py-2 rounded-full text-sm font-medium transition-colors border border-[var(--branch-border)] text-[var(--branch-text-secondary)] hover:border-[var(--branch-green)] hover:text-[var(--branch-green)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-[var(--branch-text-muted)] branch-serif">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-5 py-2 rounded-full text-sm font-medium transition-colors border border-[var(--branch-border)] text-[var(--branch-text-secondary)] hover:border-[var(--branch-green)] hover:text-[var(--branch-green)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}

      </div>
    </section>
  );
}

// ─── Service Promise (Elegant text-based) ───────────────────────

function ServicePromise() {
  const promises = [
    {
      title: '당일 배송',
      desc: '오후 2시 이전 주문은 당일 배송해 드립니다. 급한 선물도 안심하세요.',
    },
    {
      title: '신선 보장',
      desc: '산지에서 직송한 꽃만 사용합니다. 수령 후 3일간 신선도를 보장합니다.',
    },
    {
      title: '맞춤 제작',
      desc: '고객님의 요청에 맞춰 디자인합니다. 특별한 날엔 특별한 꽃을 드립니다.',
    },
  ];

  return (
    <section id="promise" className="py-14 md:py-20 px-4 md:px-8 bg-[var(--branch-bg-alt)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <OrnamentalDivider className="mb-5" />
          <p className="text-[var(--branch-green)] text-xs font-medium tracking-[0.25em] uppercase mb-2">
            Our Promise
          </p>
          <h2 className="branch-serif text-2xl md:text-3xl font-semibold text-[var(--branch-text)]">
            고객님께 드리는 약속
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {promises.map((item, i) => (
            <div key={i} className="text-center">
              {/* Decorative number */}
              <span className="branch-serif text-4xl font-light text-[var(--branch-green)] opacity-30 block mb-3">
                0{i + 1}
              </span>
              <h3 className="branch-serif text-lg font-semibold text-[var(--branch-text)] mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--branch-text-secondary)] leading-relaxed max-w-xs mx-auto">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Customer Reviews (Editorial quote style) ───────────────────

function CustomerReviews() {
  const reviews = [
    {
      name: '김지민',
      product: '프리미엄 꽃다발',
      text: '특별한 날에 주문했는데 정말 아름다운 꽃다발이었어요. 신선하고 향기도 좋았습니다. 배송도 빠르고 정확해서 감동이었어요.',
    },
    {
      name: '이준호',
      product: '축하 화환',
      text: '개업 축하 화환을 보냈는데 사진보다 실물이 더 예뻤다고 합니다. 다음에도 꼭 여기서 주문할 거에요. 강력 추천합니다!',
    },
    {
      name: '박서연',
      product: '생일 꽃바구니',
      text: '어머니 생신에 보내드렸는데 너무 좋아하셨어요. 꽃이 싱싱하고 구성도 알차서 만족스러웠습니다. 감사합니다.',
    },
  ];

  return (
    <section id="reviews" className="py-14 md:py-20 px-4 md:px-8 bg-[var(--branch-bg)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[var(--branch-green)] text-xs font-medium tracking-[0.25em] uppercase mb-2">
            Reviews
          </p>
          <h2 className="branch-serif text-2xl md:text-3xl font-semibold text-[var(--branch-text)]">
            고객 후기
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {reviews.map((review, i) => (
            <div
              key={i}
              className="relative bg-white rounded-xl p-6 md:p-8 border border-[var(--branch-border)]"
            >
              {/* Large decorative quote mark */}
              <svg
                className="absolute top-4 left-5 w-8 h-8 text-[var(--branch-green)] opacity-15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>

              <div className="pt-6">
                <StarRating count={5} />

                <p className="text-[var(--branch-text)] text-sm leading-relaxed mt-4 mb-6 branch-serif italic">
                  {review.text}
                </p>

                {/* Thin divider */}
                <div className="h-px bg-[var(--branch-border)] mb-4" />

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center text-[var(--branch-green)] text-xs font-bold">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--branch-text)]">
                      {review.name} 님
                    </p>
                    <p className="text-xs text-[var(--branch-text-muted)]">
                      {review.product}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer (Centered, elegant) ─────────────────────────────────

function RoseFooter({ branch, slug }: { branch: BranchInfo; slug: string }) {
  return (
    <footer className="bg-[var(--branch-footer-bg)] text-white/80">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-14">
        {/* Centered brand */}
        <div className="text-center mb-8">
          <h3 className="branch-serif text-xl font-semibold text-white tracking-wide mb-2">
            {branch.name}
          </h3>
          <p className="text-white/40 text-sm">
            마음을 전하는 가장 아름다운 방법
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="block h-px w-10 bg-white/20" />
          <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C10.2 5.5 7 7 4 7c0 5 2.5 9 8 13 5.5-4 8-8 8-13-3 0-6.2-1.5-8-5z" />
          </svg>
          <span className="block h-px w-10 bg-white/20" />
        </div>

        {/* Info */}
        <div className="text-center space-y-2 text-sm text-white/50 mb-8">
          {branch.address && <p>{branch.address}</p>}
          {branch.phone && (
            <p>
              <a href={`tel:${branch.phone}`} className="hover:text-white transition-colors">
                {branch.phone}
              </a>
            </p>
          )}
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-6 text-sm text-white/40 mb-8">
          <a href="#products" className="hover:text-white transition-colors">
            상품 보기
          </a>
        </div>

        {/* Account info */}
        {branch.virtualAccountBank && branch.virtualAccountNumber && (
          <div className="text-center mb-8">
            <div className="inline-block px-6 py-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/30 tracking-wider uppercase mb-1">입금 계좌</p>
              <p className="text-white/80 text-sm font-medium">
                {branch.virtualAccountBank} {branch.virtualAccountNumber}{branch.virtualAccountHolder ? ` (${branch.virtualAccountHolder})` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 사업자 정보 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <BusinessInfoFooter branch={branch} />
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 mt-6">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
          <p className="text-[11px] text-white/25 text-center tracking-wider">
            &copy; {new Date().getFullYear()} {branch.name}
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page Component ────────────────────────────────────────

export function RoseHomePage({ branch, slug, products, onProductClick }: BranchThemeProps) {
  return (
    <>
      <StickyHeader branch={branch} slug={slug} />

      <HeroSection branch={branch} products={products.data} slug={slug} />

      {products.data.length > 0 && (
        <FeaturedCarousel products={products.data} onProductClick={onProductClick} />
      )}

      {products.data.length > 0 && (
        <ProductsSection
          slug={slug}
          initialData={products}
          onProductClick={onProductClick}
        />
      )}

      <ServicePromise />
      <CustomerReviews />
      <RoseFooter branch={branch} slug={slug} />
    </>
  );
}
