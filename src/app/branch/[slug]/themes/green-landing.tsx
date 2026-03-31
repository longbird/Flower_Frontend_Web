'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import type { BranchThemeProps } from './types';
import {
  formatPrice,
  photoUrl,
  categoryLabel,
  gradeLabel,
  CATEGORY_ORDER,
  BusinessInfoFooter,
} from './shared';

// ─── Sticky Header ───────────────────────────────────────────────

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
      className="sticky top-0 z-40 border-b transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        boxShadow: scrolled ? '0 1px 8px rgba(0,0,0,0.06)' : 'none',
        borderColor: scrolled ? 'var(--branch-border)' : 'transparent',
        transitionTimingFunction: 'var(--ease-out-quart)',
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-8">
        <h1 className="branch-serif text-lg md:text-xl font-bold text-[var(--branch-text)] truncate">
          {branch.name}
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[var(--branch-text-secondary)] hover:text-[var(--branch-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {branch.phone}
            </a>
          )}
          <Link
            href={`/branch/${slug}/consult`}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors"
          >
            주문/상담
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero Section (Landing) ─────────────────────────────────────

function HeroSection({ branch, products, slug }: { branch: BranchInfo; products: RecommendedPhoto[]; slug: string }) {
  const heroImage = products.length > 0 && products[0].imageUrl
    ? photoUrl(products[0].imageUrl)
    : '';

  return (
    <section className="relative overflow-hidden bg-[var(--branch-text)]" style={{ minHeight: '50vh' }}>
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-45"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/20" />

      <div className="relative z-10 flex flex-col justify-center items-center text-center min-h-[50vh] px-6 py-16 md:py-24">
        {/* Decorative line */}
        <div className="w-10 h-[2px] bg-[var(--branch-green-light)] mb-6 branch-animate-fade-up" />

        <h2
          className="font-bold text-white leading-tight mb-4 branch-animate-fade-up branch-stagger-1"
          style={{ fontSize: 'var(--type-hero)' }}
        >
          소중한 마음을,{' '}
          <span className="branch-serif">꽃</span>으로 전합니다
        </h2>

        <p className="text-white/70 text-sm md:text-base max-w-md mb-8 leading-relaxed branch-animate-fade-up branch-stagger-2">
          {branch.description || '신선한 꽃을 정성스럽게 준비하여 소중한 마음을 전달해 드립니다.'}
        </p>

        <div className="flex flex-wrap justify-center gap-3 branch-animate-fade-up branch-stagger-3">
          <Link
            href={`/branch/${slug}/consult`}
            className="inline-flex items-center px-7 py-3 rounded-full bg-[var(--branch-green)] text-white text-sm font-semibold hover:bg-[var(--branch-green-hover)] transition-colors duration-300"
          >
            주문 / 상담 신청
          </Link>
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors duration-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              전화 주문
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Trust Badges Section ────────────────────────────────────────

function TrustBadgesSection() {
  const badges = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: '3시간 이내 배송',
      desc: '서울 전 지역 신속 배달',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: '실물 사진 제공',
      desc: '제작 완료 후 실물 사진 전송',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: '리본 문구 무료',
      desc: '축하/근조 리본 무료 작성',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      title: '전국 배달 가능',
      desc: '전국 어디든 안전하게 배송',
    },
  ];

  return (
    <section className="py-10 md:py-14 px-4 md:px-8 bg-[var(--branch-bg-alt)]">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`flex flex-col items-center text-center branch-animate-fade-up branch-stagger-${i + 1}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[var(--branch-green)] mb-3 shadow-sm">
                {badge.icon}
              </div>
              <h3 className="text-sm font-semibold text-[var(--branch-text)] mb-1">{badge.title}</h3>
              <p className="text-xs text-[var(--branch-text-muted)] leading-relaxed">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Product Card ─────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
  index,
}: {
  product: RecommendedPhoto;
  onClick: () => void;
  index?: number;
}) {
  const imgSrc = product.imageUrl ? photoUrl(product.imageUrl) : '';
  const staggerClass = index != null && index < 8 ? `branch-stagger-${index + 1}` : '';

  return (
    <div
      className={`group bg-white rounded-2xl overflow-hidden border border-transparent hover:border-[var(--branch-green-light)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer branch-animate-fade-up ${staggerClass}`}
      style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="aspect-[3/4] bg-[var(--branch-bg-alt)] flex items-center justify-center overflow-hidden relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name || '상품'}
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
            style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
          />
        ) : (
          <div className="text-center p-4">
            <svg className="w-12 h-12 mx-auto text-[var(--branch-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-[var(--branch-text-muted)] mt-2">
              {product.category ? categoryLabel(product.category) : '꽃'}
            </p>
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[var(--branch-green-light)] text-[var(--branch-green)] text-xs font-medium">
            {categoryLabel(product.category)}
          </span>
        )}
        {product.grade && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white/90 text-[var(--branch-green)] text-xs font-medium backdrop-blur-sm">
            {gradeLabel(product.grade)}
          </span>
        )}
      </div>
      <div className="p-3 md:p-4">
        {product.name && (
          <h3 className="text-sm font-medium text-[var(--branch-text)] mb-1 line-clamp-2">{product.name}</h3>
        )}
        {product.sellingPrice != null && (
          <span className="text-base font-bold text-[var(--branch-green)] branch-price">
            {formatPrice(product.sellingPrice)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Products Section ─────────────────────────────────────────────

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
  const [fadeKey, setFadeKey] = useState(0);
  const [categoryList, setCategoryList] = useState<string[]>(['전체']);

  useEffect(() => {
    async function loadCategories() {
      const result = await fetchRecommendedPhotos(slug, { page: 1, size: 200 });
      const cats = new Set<string>();
      for (const p of result.data) {
        if (p.category) cats.add(p.category);
      }
      if (cats.size > 0) {
        const sorted = CATEGORY_ORDER.filter((c) => cats.has(c));
        const rest = Array.from(cats).filter((c) => !CATEGORY_ORDER.includes(c));
        setCategoryList(['전체', ...sorted, ...rest]);
      }
    }
    loadCategories();
  }, [slug]);

  useEffect(() => {
    const category = selectedCategory === '전체' ? undefined : selectedCategory;
    const serviceArea = activeArea || undefined;

    async function loadPage() {
      setLoadingPage(true);
      const result = await fetchRecommendedPhotos(slug, { page, size: 40, category, serviceArea });
      setPhotosData(result);
      setFadeKey((k) => k + 1);
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
    <section id="products" className="py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2
            className="font-bold text-[var(--branch-text)]"
            style={{ fontSize: 'var(--type-section)' }}
          >
            상품 둘러보기
          </h2>
          <p className="text-[var(--branch-text-muted)] text-sm mt-1">원하시는 상품을 선택하고 주문해 보세요</p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            {categoryList.length > 2 && (
              <>
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
                <div className="hidden sm:flex flex-wrap justify-center gap-2">
                  {categoryList.map((cat) => {
                    const isActive = cat === selectedCategory;
                    const label = cat === '전체' ? '전체' : categoryLabel(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-[var(--branch-green)] text-white shadow-md ring-2 ring-[var(--branch-green)]/20'
                            : 'bg-white text-[var(--branch-text-secondary)] hover:bg-[var(--branch-bg-alt)] border border-[var(--branch-border)]'
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
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--branch-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
                  placeholder="배달 지역 검색 (예: 강남, 서초)"
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
                  &quot;{activeArea}&quot; 지역 검색 결과: {filteredProducts.length}건
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

        {photosData.total > 0 && (
          <p className="text-sm text-[var(--branch-text-muted)] text-center mb-4">
            총 {photosData.total}개 상품
          </p>
        )}

        {loadingPage ? (
          <div className="text-center py-12 text-[var(--branch-text-muted)]">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[var(--branch-text-muted)]">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">해당 조건에 맞는 상품이 없습니다.</p>
          </div>
        ) : (
          <div key={fadeKey} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product)}
                index={idx}
              />
            ))}
          </div>
        )}

        {photosData.total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white text-[var(--branch-text-secondary)] hover:bg-[var(--branch-bg-alt)] border border-[var(--branch-border)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-[var(--branch-text-muted)] branch-price">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white text-[var(--branch-text-secondary)] hover:bg-[var(--branch-bg-alt)] border border-[var(--branch-border)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────

function Footer({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const hasAccount = branch.virtualAccountBank && branch.virtualAccountNumber;

  return (
    <footer className="bg-[var(--branch-footer-bg)] text-white/80">
      {/* Brand accent line */}
      <div className="h-[3px] bg-[var(--branch-green)]" />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-16">
        <div className={`grid grid-cols-1 ${hasAccount ? 'md:grid-cols-[1fr_auto]' : ''} gap-8 md:gap-12`}>
          <div>
            <h3 className="branch-serif text-lg font-bold text-white mb-4">{branch.name}</h3>
            <BusinessInfoFooter branch={branch} />
          </div>

          {hasAccount && (
            <div className="md:text-right">
              <div className="inline-block py-4 px-6 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 tracking-wider mb-1">입금 계좌</p>
                <p className="text-white font-medium text-sm">{branch.virtualAccountBank}{branch.virtualAccountHolder ? ` (${branch.virtualAccountHolder})` : ''}</p>
                <p className="text-white/90 text-base font-semibold tracking-wider mt-0.5 branch-price">{branch.virtualAccountNumber}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <p className="text-xs text-white/30 text-center">
            &copy; {new Date().getFullYear()} {branch.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Green Theme Main Component ──────────────────────────────────

export function GreenLandingHomePage({ branch, slug, products, onProductClick }: BranchThemeProps) {
  return (
    <>
      <StickyHeader branch={branch} slug={slug} />
      <HeroSection branch={branch} products={products.data} slug={slug} />
      <TrustBadgesSection />

      {products.data.length > 0 && (
        <ProductsSection
          slug={slug}
          initialData={products}
          onProductClick={onProductClick}
        />
      )}

      <Footer branch={branch} slug={slug} />
    </>
  );
}
