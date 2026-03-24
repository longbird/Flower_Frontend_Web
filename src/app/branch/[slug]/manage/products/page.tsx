'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchBranchProducts,
  updateBranchProduct,
  bulkUpdateBranchSurcharge,
  fetchMyBranchInfo,
  updateMyBranchInfo,
  type BranchProductSetting,
} from '@/lib/branch/branch-api';

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function productImageUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return RAW_API_BASE ? `/api/proxy${url}` : url;
}

const CATEGORY_LABELS: Record<string, string> = {
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
  bouquet: '꽃다발', basket: '꽃바구니', box: '플라워박스',
  wreath: '화환', plant: '관엽식물', event: '이벤트', etc: '기타',
};

// ─── Product Edit Modal (판매가 + 추가금) ──────────────────────────────────

function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: BranchProductSetting;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice ?? product.basePrice);
  const [surcharge, setSurcharge] = useState(product.surcharge || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setError('올바른 금액을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateBranchProduct(product.id, { sellingPrice, surcharge });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const finalPrice = sellingPrice + surcharge;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--branch-white)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--branch-rose-light)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--branch-text)]">상품 가격 설정</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--branch-text-light)] hover:bg-[var(--branch-rose-light)]/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product Info */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-[var(--branch-cream)] border border-[var(--branch-rose-light)]/50">
            {product.imageUrl ? (
              <img src={productImageUrl(product.imageUrl)} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[var(--branch-rose-light)] flex items-center justify-center text-2xl opacity-50">
                🌸
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">{product.name}</h3>
              <p className="text-xs text-[var(--branch-text-light)]">기본가: {formatPrice(product.basePrice)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 판매가 */}
            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">판매가 (원)</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 text-lg font-semibold"
              />
            </div>

            {/* 추가금 */}
            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">추가금 (원)</label>
              <input
                type="number"
                value={surcharge}
                onChange={(e) => setSurcharge(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 text-lg font-semibold"
              />
            </div>

            {/* 최종 표시 가격 */}
            <div className="p-3 rounded-xl bg-[var(--branch-accent)]/5 border border-[var(--branch-accent)]/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--branch-text)]">홈페이지 표시 가격</span>
                <span className="text-lg font-bold text-[var(--branch-accent)]">{formatPrice(finalPrice)}</span>
              </div>
              <p className="text-xs text-[var(--branch-text-light)] mt-1">
                판매가 {formatPrice(sellingPrice)} + 추가금 {formatPrice(surcharge)}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-full border-2 border-[var(--branch-rose-light)] text-[var(--branch-text-light)] font-medium hover:bg-[var(--branch-rose-light)]/30 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-[var(--branch-accent)] text-white font-medium hover:bg-[var(--branch-rose)] transition-colors disabled:opacity-60"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Surcharge Modal ─────────────────────────────────────────────────

function BulkSurchargeModal({
  currentDefault,
  onClose,
  onSaved,
}: {
  currentDefault: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'default' | 'product'>('default');
  const [defaultSurcharge, setDefaultSurcharge] = useState(currentDefault);
  const [productSurcharge, setProductSurcharge] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (mode === 'default') {
        await updateMyBranchInfo({ defaultSurcharge });
      } else {
        await bulkUpdateBranchSurcharge(productSurcharge);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--branch-white)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--branch-rose-light)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--branch-text)]">추가금 일괄 설정</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--branch-text-light)] hover:bg-[var(--branch-rose-light)]/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('default')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === 'default'
                  ? 'bg-[var(--branch-accent)] text-white'
                  : 'bg-[var(--branch-cream)] text-[var(--branch-text-light)] border border-[var(--branch-rose-light)]'
              }`}
            >
              기본 추가금
            </button>
            <button
              onClick={() => setMode('product')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === 'product'
                  ? 'bg-[var(--branch-accent)] text-white'
                  : 'bg-[var(--branch-cream)] text-[var(--branch-text-light)] border border-[var(--branch-rose-light)]'
              }`}
            >
              상품별 일괄 적용
            </button>
          </div>

          {mode === 'default' ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--branch-text-light)]">
                상품별 추가금이 설정되지 않은 상품에 기본 적용되는 추가금입니다.
              </p>
              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">기본 추가금 (원)</label>
                <input
                  type="number"
                  value={defaultSurcharge}
                  onChange={(e) => setDefaultSurcharge(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 text-lg font-semibold"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--branch-text-light)]">
                모든 상품의 개별 추가금을 입력한 금액으로 일괄 변경합니다.
              </p>
              <div>
                <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">추가금 (원)</label>
                <input
                  type="number"
                  value={productSurcharge}
                  onChange={(e) => setProductSurcharge(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 text-lg font-semibold"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full border-2 border-[var(--branch-rose-light)] text-[var(--branch-text-light)] font-medium hover:bg-[var(--branch-rose-light)]/30 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-full bg-[var(--branch-accent)] text-white font-medium hover:bg-[var(--branch-rose)] transition-colors disabled:opacity-60"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BranchManageProductsPage() {
  const [products, setProducts] = useState<BranchProductSetting[]>([]);
  const [defaultSurcharge, setDefaultSurcharge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<BranchProductSetting | null>(null);
  const [showBulkSurcharge, setShowBulkSurcharge] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'' | 'visible' | 'hidden'>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, branchRes] = await Promise.all([
        fetchBranchProducts(),
        fetchMyBranchInfo(),
      ]);
      setProducts(productsRes.data || []);
      setDefaultSurcharge(branchRes.data?.defaultSurcharge || 0);
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleVisibility = async (product: BranchProductSetting) => {
    setTogglingIds((prev) => new Set(prev).add(product.id));
    try {
      await updateBranchProduct(product.id, { isVisible: !product.isVisible });
      loadData();
    } catch {
      // ignore
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleSaved = () => {
    setEditProduct(null);
    setShowBulkSurcharge(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-pulse">🌸</div>
        <p className="text-[var(--branch-text-light)] font-light">로딩 중...</p>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterName && !p.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterVisibility === 'visible' && !p.isVisible) return false;
    if (filterVisibility === 'hidden' && p.isVisible) return false;
    return true;
  });
  const usedCategories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--branch-text)]">상품 관리</h1>
          <p className="text-sm text-[var(--branch-text-light)] mt-1 font-light">
            상품의 노출 여부, 판매가, 추가금을 설정합니다.
          </p>
        </div>
        <button
          onClick={() => setShowBulkSurcharge(true)}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--branch-accent)]/10 text-[var(--branch-accent)] text-sm font-medium hover:bg-[var(--branch-accent)]/20 transition-colors"
        >
          추가금 일괄 설정
        </button>
      </div>

      {/* Default surcharge info */}
      {defaultSurcharge > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          기본 추가금: <span className="font-semibold">+{formatPrice(defaultSurcharge)}</span>
          <span className="text-xs text-amber-600 ml-2">(상품별 추가금 미설정 시 적용)</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]">
          <div className="text-4xl mb-3 opacity-40">🌷</div>
          <p className="text-[var(--branch-text-light)] font-light">등록된 상품이 없습니다.</p>
          <p className="text-xs text-[var(--branch-text-light)] mt-1">본사에서 상품을 등록하면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <>
          {/* Filter */}
          <div className="mb-4 p-3 rounded-2xl bg-[var(--branch-white)] border border-[var(--branch-rose-light)]">
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)]"
              >
                <option value="">전체 카테고리</option>
                {usedCategories.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
                ))}
              </select>
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as '' | 'visible' | 'hidden')}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)]"
              >
                <option value="">전체 상태</option>
                <option value="visible">노출중</option>
                <option value="hidden">숨김</option>
              </select>
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="상품명 검색"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-sm text-[var(--branch-text)] placeholder:text-[var(--branch-text-light)]/60 focus:outline-none focus:border-[var(--branch-accent)]"
              />
              {(filterCategory || filterName || filterVisibility) && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterName(''); setFilterVisibility(''); }}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium text-[var(--branch-text-light)] border border-[var(--branch-rose-light)] hover:bg-[var(--branch-rose-light)]/50"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-[var(--branch-white)] border border-[var(--branch-rose-light)]">
              <p className="text-xs text-[var(--branch-text-light)]">전체 상품</p>
              <p className="text-2xl font-bold text-[var(--branch-text)] mt-1">{products.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--branch-white)] border border-[var(--branch-rose-light)]">
              <p className="text-xs text-[var(--branch-text-light)]">노출 상품</p>
              <p className="text-2xl font-bold text-[var(--branch-accent)] mt-1">
                {products.filter((p) => p.isVisible).length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--branch-white)] border border-[var(--branch-rose-light)]">
              <p className="text-xs text-[var(--branch-text-light)]">추가금 설정</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {products.filter((p) => p.surcharge > 0).length}
              </p>
            </div>
          </div>

          {(filterCategory || filterName || filterVisibility) && (
            <p className="text-xs text-[var(--branch-text-light)] mb-3">
              검색 결과 <span className="font-semibold text-[var(--branch-accent)]">{filtered.length}</span>개
            </p>
          )}

          {/* Product List */}
          <div className="space-y-3">
            {filtered.map((product) => {
              const isToggling = togglingIds.has(product.id);
              const effectiveSurcharge = product.surcharge > 0 ? product.surcharge : defaultSurcharge;
              const displayPrice = (product.sellingPrice ?? product.basePrice) + effectiveSurcharge;
              return (
                <div
                  key={product.id}
                  className={`bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)] overflow-hidden transition-opacity ${
                    !product.isVisible ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Image */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--branch-rose-light)]">
                      {product.imageUrl ? (
                        <img src={productImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">🌸</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">{product.name}</h3>
                        {product.category && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-[var(--branch-rose-light)] text-[var(--branch-text-light)] text-[10px]">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-bold text-[var(--branch-accent)]">
                          {formatPrice(displayPrice)}
                        </span>
                        {effectiveSurcharge > 0 && (
                          <span className="text-xs text-amber-600 font-medium">
                            (+{formatPrice(effectiveSurcharge)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditProduct(product)}
                        className="p-2 rounded-xl text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] hover:bg-[var(--branch-accent)]/10 transition-colors"
                        title="가격 설정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(product)}
                        disabled={isToggling}
                        className="inline-flex items-center justify-center"
                        title={product.isVisible ? '숨기기' : '노출하기'}
                      >
                        <span
                          role="switch"
                          aria-checked={product.isVisible}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            product.isVisible ? 'bg-[var(--branch-accent)]' : 'bg-slate-300'
                          } ${isToggling ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              product.isVisible ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <ProductEditModal product={editProduct} onClose={() => setEditProduct(null)} onSaved={handleSaved} />
      )}

      {/* Bulk Surcharge Modal */}
      {showBulkSurcharge && (
        <BulkSurchargeModal
          currentDefault={defaultSurcharge}
          onClose={() => setShowBulkSurcharge(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
