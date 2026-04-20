'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import type { BranchThemeProps } from './types';
import { parseServiceAreas } from '@/lib/branch/utils';
import {
  formatPrice,
  photoUrl,
  categoryLabel,
  gradeLabel,
  StarRating,
  CATEGORY_ORDER,
  BusinessInfoFooter,
} from './shared';

// ─── Sticky Header ───────────────────────────────────────────────

function StickyHeader({ branch, slug }: { branch: BranchInfo; slug: string }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[var(--branch-border)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-8">
        <h1 className="branch-serif text-lg md:text-xl font-bold text-[var(--branch-text)] truncate">
          {branch.name}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--branch-text-secondary)] hover:text-[var(--branch-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {branch.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Hero Section ────────────────────────────────────────────────

function HeroSection({ branch, products, slug }: { branch: BranchInfo; products: RecommendedPhoto[]; slug: string }) {
  const heroImage = products.length > 0 && products[0].imageUrl
    ? photoUrl(products[0].imageUrl)
    : '';

  return (
    <section className="mx-4 md:mx-8 mt-4">
      <div className="relative overflow-hidden rounded-2xl bg-[var(--branch-text)]" style={{ minHeight: '400px' }}>
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="relative z-10 flex flex-col justify-end h-full min-h-[400px] md:min-h-[500px] p-8 md:p-12 lg:p-16">
          <span className="inline-flex self-start items-center px-3 py-1 rounded-full bg-[var(--branch-green)] text-white text-xs font-medium mb-4 tracking-wide">
            {branch.name}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3" style={{ whiteSpace: 'pre-line' }}>
            {'특별한 순간,\n꽃으로 마음을 전하세요'}
          </h2>
          <p className="text-white/70 text-sm md:text-base max-w-lg mb-8 leading-relaxed">
            {branch.description || '신선한 꽃을 정성스럽게 준비하여 소중한 마음을 전달해 드립니다.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#products"
              className="inline-flex items-center px-6 py-3 rounded-full bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors"
            >
              지금 쇼핑하기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Best Sellers Section ────────────────────────────────────────

function BestSellersSection({ products, onProductClick }: { products: RecommendedPhoto[]; onProductClick: (p: RecommendedPhoto) => void }) {
  const bestProducts = products.slice(0, 4);
  if (bestProducts.length === 0) return null;

  const main = bestProducts[0];
  const side = bestProducts.slice(1, 3);
  const featured = bestProducts[3];

  return (
    <section className="py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="branch-serif text-3xl md:text-4xl font-bold text-[var(--branch-text)] italic">Best Sellers</h2>
            <p className="text-[var(--branch-text-muted)] text-sm mt-1">가장 인기 있는 상품을 만나보세요</p>
          </div>
          <a href="#products" className="text-[var(--branch-green)] text-sm font-medium hover:underline hidden sm:inline-flex items-center gap-1">
            전체보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>

        {/* 3-card asymmetric grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {/* Main large card */}
          <div
            className="col-span-2 md:col-span-1 md:row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group"
            style={{ minHeight: '360px' }}
            onClick={() => onProductClick(main)}
          >
            <div className="absolute inset-0 bg-[var(--branch-bg-alt)]">
              {main.imageUrl && (
                <img src={photoUrl(main.imageUrl)} alt={main.name || '상품'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[var(--branch-green)] text-white text-xs font-semibold">BEST</span>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {main.name && <p className="text-white font-semibold text-base mb-1 line-clamp-1">{main.name}</p>}
              {main.sellingPrice != null && <p className="text-white/80 text-sm">{formatPrice(main.sellingPrice)}</p>}
            </div>
          </div>

          {/* Two side cards stacked */}
          {side.map((item) => (
            <div
              key={item.id}
              className="relative rounded-2xl overflow-hidden cursor-pointer group"
              style={{ minHeight: '170px' }}
              onClick={() => onProductClick(item)}
            >
              <div className="absolute inset-0 bg-[var(--branch-bg-alt)]">
                {item.imageUrl && (
                  <img src={photoUrl(item.imageUrl)} alt={item.name || '상품'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {item.name && <p className="text-white font-medium text-sm mb-0.5 line-clamp-1">{item.name}</p>}
                {item.sellingPrice != null && <p className="text-white/80 text-xs">{formatPrice(item.sellingPrice)}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Featured wide card */}
        {featured && (
          <div
            className="relative rounded-2xl overflow-hidden cursor-pointer group"
            style={{ height: '200px' }}
            onClick={() => onProductClick(featured)}
          >
            <div className="absolute inset-0 bg-[var(--branch-bg-alt)]">
              {featured.imageUrl && (
                <img src={photoUrl(featured.imageUrl)} alt={featured.name || '상품'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
              <div>
                {featured.name && <p className="text-white font-semibold text-lg mb-1">{featured.name}</p>}
                {featured.sellingPrice != null && <p className="text-white/80 text-sm">{formatPrice(featured.sellingPrice)}</p>}
              </div>
              <div>
                <StarRating count={5} />
              </div>
            </div>
          </div>
        )}
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
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[3/4] bg-[var(--branch-bg-alt)] flex items-center justify-center overflow-hidden relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name || '상품'}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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
          <span className="text-base font-bold text-[var(--branch-green)]">
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
  defaultServiceArea,
}: {
  slug: string;
  initialData: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (product: RecommendedPhoto) => void;
  defaultServiceArea?: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [areaInput, setAreaInput] = useState(defaultServiceArea || '');
  const [activeArea, setActiveArea] = useState(defaultServiceArea || '');
  const [page, setPage] = useState(1);
  const [photosData, setPhotosData] = useState<PaginatedResponse<RecommendedPhoto>>(initialData);
  const [loadingPage, setLoadingPage] = useState(false);
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
    <section id="products" className="py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
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
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[var(--branch-green)] text-white shadow-md'
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
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white text-[var(--branch-text-secondary)] hover:bg-[var(--branch-bg-alt)] border border-[var(--branch-border)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-[var(--branch-text-muted)]">
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

// ─── Premium Delivery Section ────────────────────────────────────

function PremiumDeliverySection() {
  return (
    <section className="py-12 md:py-16 px-4 md:px-8 bg-[var(--branch-bg-alt)]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left content */}
          <div className="flex-1">
            <span className="text-[var(--branch-green)] text-xs font-semibold tracking-[0.2em] uppercase mb-3 block">
              Premium Logistics
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--branch-text)] leading-tight mb-4" style={{ whiteSpace: 'pre-line' }}>
              {'서울 전 지역 3시간 이내\n안전 신선 배송 시스템'}
            </h2>
            <p className="text-[var(--branch-text-secondary)] text-sm leading-relaxed mb-6">
              전문 배송 시스템을 통해 주문하신 꽃을 최상의 상태로 안전하게 배송해 드립니다. 꽃의 신선도를 유지하기 위한 특수 포장과 온도 관리를 제공합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white">
                <span className="w-2 h-2 rounded-full bg-[var(--branch-green)]" />
                <span className="text-sm font-medium text-[var(--branch-text)]">전문 신선 배송 시스템</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white">
                <span className="w-2 h-2 rounded-full bg-[var(--branch-green)]" />
                <span className="text-sm font-medium text-[var(--branch-text)]">실시간 배송 추적</span>
              </div>
            </div>
          </div>

          {/* Right decorative */}
          <div className="flex-1 max-w-sm w-full">
            <div className="aspect-square rounded-2xl bg-white border-2 border-[var(--branch-green-light)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-4 rounded-xl bg-[var(--branch-green-light)] opacity-30" />
              <div className="relative text-center p-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--branch-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <p className="text-[var(--branch-green)] font-bold text-lg">3시간 이내</p>
                <p className="text-[var(--branch-text-muted)] text-sm mt-1">안전 배송 보장</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Customer Reviews Section ────────────────────────────────────

function CustomerReviewsSection() {
  const reviews = [
    { name: '김지민', product: '프리미엄 꽃다발', text: '특별한 날에 주문했는데 정말 아름다운 꽃다발이었어요. 신선하고 향기도 좋았습니다. 배송도 빠르고 정확해서 감동이었어요.' },
    { name: '이준호', product: '축하 화환', text: '개업 축하 화환을 보냈는데 사진보다 실물이 더 예뻤다고 합니다. 다음에도 꼭 여기서 주문할 거에요. 강력 추천합니다!' },
    { name: '박서연', product: '생일 꽃바구니', text: '어머니 생신에 보내드렸는데 너무 좋아하셨어요. 꽃이 싱싱하고 구성도 알차서 만족스러웠습니다. 감사합니다.' },
  ];

  return (
    <section className="py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="branch-serif text-3xl md:text-4xl font-bold text-[var(--branch-text)] italic">Customer Reviews</h2>
          <p className="text-[var(--branch-text-muted)] text-sm mt-2">고객님들의 소중한 후기</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--branch-border)]">
              <StarRating count={5} />
              <p className="text-[var(--branch-text)] text-sm leading-relaxed mt-4 mb-5">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--branch-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--branch-green-light)] flex items-center justify-center text-[var(--branch-green)] text-sm font-bold">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--branch-text)]">{review.name} 님</p>
                  <p className="text-xs text-[var(--branch-text-muted)]">{review.product} 구매</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────

function Footer({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const hasAccount = branch.virtualAccountBank && branch.virtualAccountNumber;

  return (
    <footer className="bg-[var(--branch-footer-bg)] text-white/80">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className={`grid grid-cols-1 ${hasAccount ? 'md:grid-cols-[1fr_auto]' : ''} gap-8 md:gap-12`}>
          {/* 왼쪽: 사업자 정보 */}
          <div>
            <h3 className="branch-serif text-lg font-bold text-white mb-4">{branch.name}</h3>
            <BusinessInfoFooter branch={branch} />
          </div>

          {/* 오른쪽: 입금 계좌 */}
          {hasAccount && (
            <div className="md:text-right">
              <div className="inline-block py-4 px-6 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 tracking-wider mb-1">입금 계좌</p>
                <p className="text-white font-medium text-sm">{branch.virtualAccountBank}{branch.virtualAccountHolder ? ` (${branch.virtualAccountHolder})` : ''}</p>
                <p className="text-white/90 text-base font-semibold tracking-wider mt-0.5">{branch.virtualAccountNumber}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copyright bar */}
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

export function GreenHomePage({ branch, slug, products, onProductClick }: BranchThemeProps) {
  return (
    <>
      <StickyHeader branch={branch} slug={slug} />
      <HeroSection branch={branch} products={products.data} slug={slug} />

      {products.data.length > 0 && (
        <BestSellersSection
          products={products.data}
          onProductClick={onProductClick}
        />
      )}

      {products.data.length > 0 && (
        <ProductsSection
          slug={slug}
          initialData={products}
          onProductClick={onProductClick}
          defaultServiceArea={parseServiceAreas(branch.serviceAreas)[0]}
        />
      )}

      <PremiumDeliverySection />
      <CustomerReviewsSection />
      <Footer branch={branch} slug={slug} />
    </>
  );
}
