'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBranchInfo, fetchBranchProducts, submitConsultRequest } from '@/lib/branch/api';
import type { BranchInfo, BranchProduct, ConsultRequestForm } from '@/lib/branch/types';

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function HeroSection({ branch }: { branch: BranchInfo }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--branch-rose-light)] via-[var(--branch-peach-light)] to-[var(--branch-cream)] py-20 px-4">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[var(--branch-rose)] opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--branch-peach)] opacity-10 rounded-full translate-x-1/3 translate-y-1/3" />
      
      <div className="relative max-w-4xl mx-auto text-center">
        <p className="text-[var(--branch-accent)] text-sm tracking-[0.3em] uppercase mb-4 font-light">
          Flower Delivery Service
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--branch-text)] mb-6 leading-tight">
          {branch.name}
        </h1>
        {branch.description && (
          <p className="text-lg md:text-xl text-[var(--branch-text-light)] mb-8 max-w-2xl mx-auto leading-relaxed font-light">
            {branch.description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            href={`/branch/${branch.code}/consult`}
            className="inline-flex items-center justify-center px-8 py-4 bg-[var(--branch-accent)] text-white rounded-full text-base font-medium hover:bg-[var(--branch-rose)] transition-colors shadow-lg hover:shadow-xl"
          >
            상담 요청하기
          </Link>
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-[var(--branch-accent)] text-[var(--branch-accent)] rounded-full text-base font-medium hover:bg-[var(--branch-accent)] hover:text-white transition-colors"
            >
              전화 문의 {branch.phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoSection({ branch }: { branch: BranchInfo }) {
  const infoItems = [
    branch.phone && { label: '전화번호', value: branch.phone, icon: '📞' },
    branch.address && { label: '주소', value: branch.address, icon: '📍' },
    branch.serviceAreas && { label: '서비스 지역', value: branch.serviceAreas, icon: '🚗' },
    branch.virtualAccountBank && branch.virtualAccountNumber && {
      label: '입금 계좌',
      value: `${branch.virtualAccountBank} ${branch.virtualAccountNumber}`,
      icon: '🏦',
    },
  ].filter(Boolean) as { label: string; value: string; icon: string }[];

  if (infoItems.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-[var(--branch-white)]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl text-center mb-12 text-[var(--branch-text)]">
          안내 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="text-center p-6 rounded-2xl bg-[var(--branch-cream)] border border-[var(--branch-rose-light)]"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-sm text-[var(--branch-text-light)] mb-2 tracking-wider">
                {item.label}
              </h3>
              <p className="text-[var(--branch-text)] font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: BranchProduct;
  onClick: () => void;
}) {
  return (
    <div
      className="group bg-[var(--branch-white)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-[var(--branch-rose-light)]/50 cursor-pointer"
      onClick={onClick}
    >
      {/* Product image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-[var(--branch-rose-light)] to-[var(--branch-peach-light)] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-center p-4">
            <div className="text-5xl mb-2 opacity-60">🌸</div>
            <p className="text-sm text-[var(--branch-text-light)] font-light">
              {product.category || '꽃'}
            </p>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-medium text-[var(--branch-text)] mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-[var(--branch-text-light)] mb-3 line-clamp-2 font-light">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold text-[var(--branch-accent)]">
            {formatPrice(product.price)}
          </span>
          {product.price !== product.basePrice && (
            <span className="text-sm text-[var(--branch-text-light)] line-through">
              {formatPrice(product.basePrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  slug,
  onClose,
}: {
  product: BranchProduct;
  slug: string;
  onClose: () => void;
}) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<ConsultRequestForm>({
    customerName: '',
    customerPhone: '',
    productCode: product.sku,
    productName: product.name,
    desiredDate: '',
    message: '',
  });

  // Get tomorrow as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customerName.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--branch-white)] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--branch-rose-light)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 text-[var(--branch-text-light)] hover:bg-white hover:text-[var(--branch-text)] transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🌸</div>
            <h2 className="text-xl text-[var(--branch-text)] mb-3">
              주문 요청이 완료되었습니다
            </h2>
            <p className="text-[var(--branch-text-light)] font-light mb-6 leading-relaxed">
              <strong>{product.name}</strong> 상품에 대해<br />
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
          /* Order Request Form */
          <div className="p-6">
            {/* Product Summary */}
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-[var(--branch-cream)] border border-[var(--branch-rose-light)]/50">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[var(--branch-rose-light)] flex items-center justify-center text-2xl opacity-50">
                  🌸
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">{product.name}</h3>
                <p className="text-sm font-bold text-[var(--branch-accent)]">{formatPrice(product.price)}</p>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-[var(--branch-text)] mb-4">주문 요청</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">
                  이름 <span className="text-[var(--branch-accent)]">*</span>
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                  placeholder="홍길동"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">
                  연락처 <span className="text-[var(--branch-accent)]">*</span>
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customerPhone: formatPhone(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">
                  희망 배달일
                </label>
                <input
                  type="date"
                  value={form.desiredDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, desiredDate: e.target.value }))}
                  min={minDate}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-1.5 font-medium">
                  요청 사항
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] placeholder-[var(--branch-text-light)]/50 focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors resize-none"
                  placeholder="배달 주소, 카드 문구 등을 자유롭게 적어 주세요."
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
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
          /* Product Detail View */
          <>
            {/* Image */}
            <div className="aspect-[4/3] bg-gradient-to-br from-[var(--branch-rose-light)] to-[var(--branch-peach-light)] flex items-center justify-center overflow-hidden rounded-t-3xl">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <div className="text-7xl mb-2 opacity-60">🌸</div>
                  <p className="text-[var(--branch-text-light)] font-light">
                    {product.category || '꽃'}
                  </p>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[var(--branch-text)] mb-2">
                {product.name}
              </h2>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-[var(--branch-accent)]">
                  {formatPrice(product.price)}
                </span>
                {product.price !== product.basePrice && (
                  <span className="text-base text-[var(--branch-text-light)] line-through">
                    {formatPrice(product.basePrice)}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-[var(--branch-text-light)] font-light leading-relaxed mb-6 whitespace-pre-line">
                  {product.description}
                </p>
              )}

              {/* Order Request Button */}
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
  );
}

function ProductsSection({
  products,
  slug,
  onProductClick,
}: {
  products: BranchProduct[];
  slug: string;
  onProductClick: (product: BranchProduct) => void;
}) {
  if (products.length === 0) return null;

  // Group by category
  const categories = new Map<string, BranchProduct[]>();
  for (const p of products) {
    const cat = p.category || '기타';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(p);
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[var(--branch-accent)] text-sm tracking-[0.3em] uppercase mb-3 font-light">
            Our Products
          </p>
          <h2 className="text-2xl md:text-3xl text-[var(--branch-text)]">
            상품 안내
          </h2>
        </div>

        {Array.from(categories.entries()).map(([category, items]) => (
          <div key={category} className="mb-12">
            {categories.size > 1 && (
              <h3 className="text-xl text-[var(--branch-text-light)] mb-6 text-center font-light tracking-wider">
                {category}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => onProductClick(product)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="text-center mt-12">
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

function Footer({ branch }: { branch: BranchInfo }) {
  return (
    <footer className="bg-[var(--branch-text)] text-white/80 py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-lg font-medium text-white mb-4">{branch.name}</h3>
        <div className="space-y-1 text-sm font-light">
          {branch.address && <p>{branch.address}</p>}
          {branch.phone && <p>전화: {branch.phone}</p>}
        </div>
        <div className="mt-8 pt-6 border-t border-white/20 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {branch.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--branch-cream)]">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🌸</div>
        <p className="text-[var(--branch-text-light)] font-light tracking-wider">
          로딩 중...
        </p>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--branch-cream)]">
      <div className="text-center p-8">
        <div className="text-6xl mb-6 opacity-50">🌷</div>
        <h1 className="text-2xl text-[var(--branch-text)] mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-[var(--branch-text-light)] font-light">
          요청하신 지사 페이지가 존재하지 않거나 현재 서비스 중이 아닙니다.
        </p>
      </div>
    </div>
  );
}

export default function BranchHomePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BranchProduct | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      const [branchData, productsData] = await Promise.all([
        fetchBranchInfo(slug),
        fetchBranchProducts(slug),
      ]);

      if (!branchData) {
        setNotFound(true);
      } else {
        setBranch(branchData);
        setProducts(productsData);
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
      <InfoSection branch={branch} />
      <ProductsSection
        products={products}
        slug={slug}
        onProductClick={(product) => setSelectedProduct(product)}
      />
      <Footer branch={branch} />

      {/* Product Detail Modal */}
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
