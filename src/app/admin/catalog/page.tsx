'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  basePrice: number;
  isActive?: number | boolean;
  isBranchDefault?: boolean;
  sortOrder: number;
}

interface Branch {
  id: number;
  name: string;
}

interface BranchProduct {
  productId: number;
  productName: string;
  sku: string;
  basePrice: number;
  isVisible: boolean;
  sellingPrice: number;
}

interface Surcharge {
  id: number;
  surchargeType: string;
  name: string;
  amount: number;
  branchId?: number | null;
  branchName?: string | null;
}

type TabKey = 'products' | 'branch-settings' | 'surcharges';

const CATEGORY_OPTIONS = [
  { value: '', label: '(없음)' },
  { value: 'bouquet', label: '꽃다발' },
  { value: 'basket', label: '꽃바구니' },
  { value: 'box', label: '플라워박스' },
  { value: 'wreath', label: '화환' },
  { value: 'plant', label: '관엽식물' },
  { value: 'event', label: '이벤트' },
  { value: 'etc', label: '기타' },
];

const SURCHARGE_TYPE_OPTIONS = [
  { value: 'REGION', label: '지역' },
  { value: 'FUNERAL_HALL', label: '장례식장' },
  { value: 'WEDDING_HALL', label: '결혼식장' },
];

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

// ─── Product Edit Modal ──────────────────────────────────────────────────────

function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: CatalogProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [imageUrl, setImageUrl] = useState(product.imageUrl || '');
  const [category, setCategory] = useState(product.category || '');
  const [basePrice, setBasePrice] = useState(product.basePrice);
  const [sortOrder, setSortOrder] = useState(product.sortOrder);
  const [isBranchDefault, setIsBranchDefault] = useState(product.isBranchDefault ?? true);
  const [isActive, setIsActive] = useState(product.isActive === undefined ? true : Boolean(product.isActive));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api(`/admin/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          imageUrl: imageUrl || null,
          category: category || null,
          basePrice,
          sortOrder,
          isBranchDefault,
          isActive,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">상품 수정</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Image Preview */}
            <div>
              <Label className="text-sm font-medium text-slate-700">이미지 미리보기</Label>
              <div className="mt-2 w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    이미지 없음
                  </div>
                )}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <Label htmlFor="imageUrl" className="text-sm font-medium text-slate-700">
                이미지 URL
              </Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">
                외부 이미지 URL을 입력하세요. 비워두면 기본 아이콘이 표시됩니다.
              </p>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                상품명
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                설명
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-slate-700">
                카테고리
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price + Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice" className="text-sm font-medium text-slate-700">
                  기본 가격
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sortOrder" className="text-sm font-medium text-slate-700">
                  정렬 순서
                </Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* isActive Toggle (카탈로그 표시 여부) */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <Label className="text-sm font-medium text-slate-700">카탈로그 표시</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  비활성화하면 카탈로그에서 숨겨집니다.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Branch Default Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <Label className="text-sm font-medium text-slate-700">전 지사 기본 노출</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  활성화하면 모든 지사에 기본으로 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isBranchDefault}
                onClick={() => setIsBranchDefault(!isBranchDefault)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isBranchDefault ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isBranchDefault ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Create Modal ────────────────────────────────────────────────────

function ProductCreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [sortOrder, setSortOrder] = useState(1000);
  const [isBranchDefault, setIsBranchDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!sku.trim()) { setError('SKU를 입력하세요.'); return; }
    if (!name.trim()) { setError('상품명을 입력하세요.'); return; }
    setSaving(true);
    setError('');
    try {
      await api('/admin/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          description: description || undefined,
          imageUrl: imageUrl || null,
          category: category || null,
          basePrice,
          sortOrder,
          isBranchDefault,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">상품 등록</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* SKU */}
            <div>
              <Label htmlFor="sku" className="text-sm font-medium text-slate-700">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="예: BOUQUET-001"
                className="mt-1"
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="createName" className="text-sm font-medium text-slate-700">
                상품명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="createName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 로맨틱 장미 꽃다발"
                className="mt-1"
              />
            </div>

            {/* Image URL */}
            <div>
              <Label htmlFor="createImageUrl" className="text-sm font-medium text-slate-700">
                이미지 URL
              </Label>
              <Input
                id="createImageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="createDescription" className="text-sm font-medium text-slate-700">
                설명
              </Label>
              <textarea
                id="createDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                placeholder="상품 설명을 입력하세요."
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="createCategory" className="text-sm font-medium text-slate-700">
                카테고리
              </Label>
              <select
                id="createCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price + Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createBasePrice" className="text-sm font-medium text-slate-700">
                  기본 가격
                </Label>
                <Input
                  id="createBasePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="createSortOrder" className="text-sm font-medium text-slate-700">
                  정렬 순서
                </Label>
                <Input
                  id="createSortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Branch Default Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <Label className="text-sm font-medium text-slate-700">전 지사 기본 노출</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  활성화하면 모든 지사에 기본으로 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isBranchDefault}
                onClick={() => setIsBranchDefault(!isBranchDefault)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isBranchDefault ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isBranchDefault ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? '등록 중...' : '등록'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; data: CatalogProduct[] }>('/admin/catalog/products');
      setProducts(res.data ?? []);
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async (product: CatalogProduct, field: 'isActive' | 'isBranchDefault', e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(product.id);
    try {
      const newValue = field === 'isActive' ? !Boolean(product.isActive) : !product.isBranchDefault;
      await api(`/admin/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: newValue }),
      });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, [field]: newValue } : p
      ));
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaved = () => {
    setEditProduct(null);
    setShowCreate(false);
    loadProducts();
  };

  const handleDeactivate = async (product: CatalogProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${product.name}" 상품을 비활성화하시겠습니까?\n(목록에서 숨겨지지만 데이터는 유지됩니다)`)) return;
    setDeletingId(product.id);
    try {
      await api(`/admin/catalog/products/${product.id}`, { method: 'DELETE' });
      loadProducts();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePermanent = async (product: CatalogProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${product.name}" 상품을 영구 삭제하시겠습니까?\n\n⚠ 이 작업은 되돌릴 수 없습니다.`)) return;
    // 2차 확인
    if (!confirm(`정말로 영구 삭제하시겠습니까?`)) return;
    setDeletingId(product.id);
    try {
      await api(`/admin/catalog/products/${product.id}?permanent=true`, { method: 'DELETE' });
      loadProducts();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          전체 {products.length}개 (활성 {products.filter(p => Boolean(p.isActive)).length}개)
        </p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          상품 등록
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">등록된 상품이 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">위 &quot;상품 등록&quot; 버튼을 눌러 상품을 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const branchDefault = product.isBranchDefault ?? true;
            const active = Boolean(product.isActive);
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
                  active ? 'border-slate-200' : 'border-red-200 opacity-60'
                }`}
                onClick={() => setEditProduct(product)}
              >
                {/* Inactive badge */}
                {!active && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-medium">
                    비활성
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  {active && (
                    <button
                      onClick={(e) => handleDeactivate(product, e)}
                      disabled={deletingId === product.id}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm disabled:opacity-50"
                      title="비활성화"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878l4.242 4.242M21 21l-4.879-4.879" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeletePermanent(product, e)}
                    disabled={deletingId === product.id}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                    title="영구 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Image */}
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl opacity-30 mb-1">🌸</div>
                      <p className="text-xs text-slate-400">이미지 없음</p>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {product.sku}
                        {product.category && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {CATEGORY_OPTIONS.find((c) => c.value === product.category)?.label || product.category}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-emerald-700">
                      {formatPrice(product.basePrice)}
                    </span>
                    <span className="text-xs text-slate-400">
                      순서: {product.sortOrder}
                    </span>
                  </div>

                  {/* Inline Toggles */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {}}
                        onClick={(e) => handleToggle(product, 'isActive', e)}
                        disabled={togglingId === product.id}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50"
                      />
                      <span className={`text-xs font-medium ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                        표시
                      </span>
                    </label>
                    <label
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={branchDefault}
                        onChange={() => {}}
                        onClick={(e) => handleToggle(product, 'isBranchDefault', e)}
                        disabled={togglingId === product.id}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50"
                      />
                      <span className={`text-xs font-medium ${branchDefault ? 'text-emerald-700' : 'text-slate-400'}`}>
                        전 지사 기본 노출
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <ProductEditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <ProductCreateModal
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

// ─── Branch Settings Tab ─────────────────────────────────────────────────────

function BranchSettingsTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api<Branch[] | { ok: boolean; data: Branch[] }>('/admin/branches');
      // /admin/branches returns array directly (not wrapped in { ok, data })
      setBranches(Array.isArray(res) ? res : (res.data ?? []));
    } catch {
      // handled by auth
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const loadBranchProducts = useCallback(async (branchId: number) => {
    setLoadingProducts(true);
    setEditedPrices({});
    try {
      const res = await api<{ ok: boolean; data: BranchProduct[] }>(
        `/admin/catalog/branches/${branchId}/products`
      );
      setBranchProducts(res.data ?? []);
    } catch {
      setBranchProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId !== null) {
      loadBranchProducts(selectedBranchId);
    }
  }, [selectedBranchId, loadBranchProducts]);

  const handleToggleVisibility = async (product: BranchProduct) => {
    if (selectedBranchId === null) return;
    setSavingIds((prev) => new Set(prev).add(product.productId));
    try {
      const priceStr = editedPrices[product.productId];
      const sellingPrice = priceStr !== undefined ? Number(priceStr) : product.sellingPrice;
      await api(`/admin/catalog/branches/${selectedBranchId}/products/${product.productId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVisible: !product.isVisible,
          sellingPrice,
        }),
      });
      loadBranchProducts(selectedBranchId);
    } catch {
      // ignore
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.productId);
        return next;
      });
    }
  };

  const handleSavePrice = async (product: BranchProduct) => {
    if (selectedBranchId === null) return;
    const priceStr = editedPrices[product.productId];
    if (priceStr === undefined) return;
    const sellingPrice = Number(priceStr);
    if (isNaN(sellingPrice) || sellingPrice < 0) return;

    setSavingIds((prev) => new Set(prev).add(product.productId));
    try {
      await api(`/admin/catalog/branches/${selectedBranchId}/products/${product.productId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVisible: product.isVisible,
          sellingPrice,
        }),
      });
      loadBranchProducts(selectedBranchId);
    } catch {
      // ignore
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.productId);
        return next;
      });
    }
  };

  if (loadingBranches) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">지사 목록 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <Label htmlFor="branch-select" className="text-sm font-medium text-slate-700">
          지사 선택
        </Label>
        <select
          id="branch-select"
          value={selectedBranchId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedBranchId(val ? Number(val) : null);
          }}
          className="mt-2 w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">지사를 선택하세요</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Branch Products */}
      {selectedBranchId === null ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-slate-400">지사를 선택하면 해당 지사의 상품 설정을 관리할 수 있습니다.</p>
        </div>
      ) : loadingProducts ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-sm text-slate-400 mt-3">상품 목록 로딩 중...</p>
        </div>
      ) : branchProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">이 지사에 대한 상품 설정이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">상품명</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">SKU</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">기본가</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">판매가</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">노출</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">저장</th>
                </tr>
              </thead>
              <tbody>
                {branchProducts.map((bp) => {
                  const isSaving = savingIds.has(bp.productId);
                  const editedPrice = editedPrices[bp.productId];
                  const priceValue = editedPrice !== undefined ? editedPrice : String(bp.sellingPrice);
                  const priceChanged = editedPrice !== undefined && Number(editedPrice) !== bp.sellingPrice;

                  return (
                    <tr key={bp.productId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{bp.productName}</td>
                      <td className="px-4 py-3 text-slate-500">{bp.sku}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatPrice(bp.basePrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          value={priceValue}
                          onChange={(e) =>
                            setEditedPrices((prev) => ({
                              ...prev,
                              [bp.productId]: e.target.value,
                            }))
                          }
                          className="w-28 ml-auto text-right"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleVisibility(bp)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center"
                        >
                          <span
                            role="switch"
                            aria-checked={bp.isVisible}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              bp.isVisible ? 'bg-emerald-600' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                bp.isVisible ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {priceChanged && (
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(bp)}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                          >
                            {isSaving ? '...' : '저장'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Surcharge Edit Modal ────────────────────────────────────────────────────

function SurchargeEditModal({
  surcharge,
  branches,
  onClose,
  onSaved,
}: {
  surcharge: Surcharge | null; // null = create mode
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = surcharge === null;
  const [surchargeType, setSurchargeType] = useState(surcharge?.surchargeType || 'REGION');
  const [name, setName] = useState(surcharge?.name || '');
  const [amount, setAmount] = useState(surcharge?.amount ?? 0);
  const [branchId, setBranchId] = useState<number | null>(surcharge?.branchId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isCreate) {
        await api('/admin/catalog/surcharges', {
          method: 'POST',
          body: JSON.stringify({
            surchargeType,
            name: name.trim(),
            amount,
            branchId: branchId || undefined,
          }),
        });
      } else {
        await api(`/admin/catalog/surcharges/${surcharge.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            surchargeType,
            name: name.trim(),
            amount,
            branchId: branchId || null,
          }),
        });
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {isCreate ? '추가 요금 등록' : '추가 요금 수정'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Surcharge Type */}
            <div>
              <Label htmlFor="surchargeType" className="text-sm font-medium text-slate-700">
                유형
              </Label>
              <select
                id="surchargeType"
                value={surchargeType}
                onChange={(e) => setSurchargeType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {SURCHARGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="surchargeName" className="text-sm font-medium text-slate-700">
                이름
              </Label>
              <Input
                id="surchargeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 서울 강남구"
                className="mt-1"
              />
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="surchargeAmount" className="text-sm font-medium text-slate-700">
                금액 (원)
              </Label>
              <Input
                id="surchargeAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Branch */}
            <div>
              <Label htmlFor="surchargeBranch" className="text-sm font-medium text-slate-700">
                적용 지사
              </Label>
              <select
                id="surchargeBranch"
                value={branchId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setBranchId(val ? Number(val) : null);
                }}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">전체 지사</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                &quot;전체 지사&quot;를 선택하면 모든 지사에 적용됩니다.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? '저장 중...' : isCreate ? '등록' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Surcharges Tab ──────────────────────────────────────────────────────────

function SurchargesTab() {
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSurcharge, setEditSurcharge] = useState<Surcharge | null | 'create'>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [surchargesRes, branchesRes] = await Promise.all([
        api<{ ok: boolean; data: Surcharge[] }>('/admin/catalog/surcharges'),
        api<Branch[] | { ok: boolean; data: Branch[] }>('/admin/branches'),
      ]);
      setSurcharges(surchargesRes.data ?? []);
      // /admin/branches returns array directly (not wrapped in { ok, data })
      setBranches(Array.isArray(branchesRes) ? branchesRes : (branchesRes.data ?? []));
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('이 추가 요금을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await api(`/admin/catalog/surcharges/${id}`, { method: 'DELETE' });
      loadData();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setEditSurcharge(null);
    loadData();
  };

  const getSurchargeTypeLabel = (type: string) =>
    SURCHARGE_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          지역, 장례식장, 결혼식장 등에 대한 추가 요금을 관리합니다.
        </p>
        <Button
          onClick={() => setEditSurcharge('create')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          추가 요금 등록
        </Button>
      </div>

      {surcharges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">등록된 추가 요금이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">이름</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">금액</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">적용 지사</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {surcharges.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.surchargeType === 'REGION'
                            ? 'bg-blue-50 text-blue-700'
                            : s.surchargeType === 'FUNERAL_HALL'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-pink-50 text-pink-700'
                        }`}
                      >
                        {getSurchargeTypeLabel(s.surchargeType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatPrice(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.branchId ? s.branchName || `지사 #${s.branchId}` : '전체'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditSurcharge(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editSurcharge !== null && (
        <SurchargeEditModal
          surcharge={editSurcharge === 'create' ? null : editSurcharge}
          branches={branches}
          onClose={() => setEditSurcharge(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: '상품 관리' },
  { key: 'branch-settings', label: '지사별 설정' },
  { key: 'surcharges', label: '추가 요금' },
];

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('products');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 카탈로그</h1>
        <p className="text-sm text-slate-500 mt-1">
          표준 상품의 이미지, 카테고리, 가격을 관리합니다. 지사 홈페이지에 표시됩니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'branch-settings' && <BranchSettingsTab />}
      {activeTab === 'surcharges' && <SurchargesTab />}
    </div>
  );
}
