'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchBranchProducts,
  updateBranchProduct,
  fetchBranchSurcharges,
  type BranchProductSetting,
  type BranchSurcharge,
} from '@/lib/branch/branch-api';

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

const CATEGORY_LABELS: Record<string, string> = {
  bouquet: '꽃다발',
  basket: '꽃바구니',
  box: '플라워박스',
  wreath: '화환',
  plant: '관엽식물',
  event: '이벤트',
  etc: '기타',
};

const SURCHARGE_TYPE_LABELS: Record<string, string> = {
  REGION: '지역',
  BRANCH: '지사',
  FUNERAL_HALL: '장례식장',
  WEDDING_HALL: '결혼식장',
};

// ─── Product Price Edit Modal ────────────────────────────────────────────────

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
      await updateBranchProduct(product.id, { sellingPrice });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const diff = sellingPrice - product.basePrice;
  const diffText =
    diff > 0
      ? `+${formatPrice(diff)}`
      : diff < 0
      ? `-${formatPrice(Math.abs(diff))}`
      : '기본가 동일';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--branch-white)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--branch-rose-light)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--branch-text)]">판매가 설정</h2>
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
              <img src={product.imageUrl} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-[var(--branch-rose-light)] flex items-center justify-center text-2xl opacity-50">
                🌸
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">{product.name}</h3>
              <p className="text-xs text-[var(--branch-text-light)]">
                기본가: {formatPrice(product.basePrice)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--branch-text)] mb-2 font-medium">
                판매가 (원)
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-[var(--branch-rose-light)] bg-[var(--branch-cream)] text-[var(--branch-text)] focus:outline-none focus:border-[var(--branch-accent)] focus:ring-2 focus:ring-[var(--branch-accent)]/20 transition-colors text-lg font-semibold"
              />
              <p className="text-xs text-[var(--branch-text-light)] mt-1">
                기본가 대비: <span className={diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : ''}>{diffText}</span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BranchManageProductsPage() {
  const [products, setProducts] = useState<BranchProductSetting[]>([]);
  const [surcharges, setSurcharges] = useState<BranchSurcharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<BranchProductSetting | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'products' | 'surcharges'>('products');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, surchargesRes] = await Promise.all([
        fetchBranchProducts(),
        fetchBranchSurcharges(),
      ]);
      setProducts(productsRes.data || []);
      setSurcharges(surchargesRes.data || []);
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
      await updateBranchProduct(product.id, {
        isVisible: !product.isVisible,
      });
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--branch-text)]">상품 관리</h1>
        <p className="text-sm text-[var(--branch-text-light)] mt-1 font-light">
          홈페이지에 표시할 상품의 노출 여부와 판매가를 설정합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-[var(--branch-rose-light)]">
        <div className="flex gap-0 -mb-px">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-[var(--branch-accent)] text-[var(--branch-accent)]'
                : 'border-transparent text-[var(--branch-text-light)] hover:text-[var(--branch-text)]'
            }`}
          >
            상품 설정
          </button>
          <button
            onClick={() => setActiveTab('surcharges')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'surcharges'
                ? 'border-[var(--branch-accent)] text-[var(--branch-accent)]'
                : 'border-transparent text-[var(--branch-text-light)] hover:text-[var(--branch-text)]'
            }`}
          >
            추가 요금
            {surcharges.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--branch-accent)]/10 text-[var(--branch-accent)] text-xs">
                {surcharges.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]">
              <div className="text-4xl mb-3 opacity-40">🌷</div>
              <p className="text-[var(--branch-text-light)] font-light">
                등록된 상품이 없습니다.
              </p>
              <p className="text-xs text-[var(--branch-text-light)] mt-1">
                본사에서 상품을 등록하면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
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
              </div>

              {/* Product List */}
              <div className="space-y-3">
                {products.map((product) => {
                  const isToggling = togglingIds.has(product.id);
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
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">
                              🌸
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[var(--branch-text)] truncate">
                              {product.name}
                            </h3>
                            {product.category && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-[var(--branch-rose-light)] text-[var(--branch-text-light)] text-[10px]">
                                {CATEGORY_LABELS[product.category] || product.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-bold text-[var(--branch-accent)]">
                              {formatPrice(product.sellingPrice ?? product.basePrice)}
                            </span>
                            {product.sellingPrice !== null && product.sellingPrice !== product.basePrice && (
                              <span className="text-xs text-[var(--branch-text-light)] line-through">
                                {formatPrice(product.basePrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Price Edit */}
                          <button
                            onClick={() => setEditProduct(product)}
                            className="p-2 rounded-xl text-[var(--branch-text-light)] hover:text-[var(--branch-accent)] hover:bg-[var(--branch-accent)]/10 transition-colors"
                            title="판매가 설정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Visibility Toggle */}
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
        </>
      )}

      {/* Surcharges Tab */}
      {activeTab === 'surcharges' && (
        <>
          {surcharges.length === 0 ? (
            <div className="text-center py-16 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]">
              <div className="text-4xl mb-3 opacity-40">🏷️</div>
              <p className="text-[var(--branch-text-light)] font-light">
                적용 중인 추가 요금이 없습니다.
              </p>
              <p className="text-xs text-[var(--branch-text-light)] mt-1">
                본사에서 설정한 추가 요금이 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {surcharges.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 bg-[var(--branch-white)] rounded-2xl border border-[var(--branch-rose-light)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        s.surchargeType === 'REGION'
                          ? 'bg-blue-50 text-blue-700'
                          : s.surchargeType === 'FUNERAL_HALL'
                          ? 'bg-purple-50 text-purple-700'
                          : s.surchargeType === 'WEDDING_HALL'
                          ? 'bg-pink-50 text-pink-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {SURCHARGE_TYPE_LABELS[s.surchargeType] || s.surchargeType}
                    </span>
                    <span className="text-sm font-medium text-[var(--branch-text)]">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--branch-accent)]">
                    +{formatPrice(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
