'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CatalogProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  basePrice: number;
  isActive?: number | boolean;
  sortOrder: number;
}

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

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

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

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; data: CatalogProduct[] }>('/admin/catalog/products');
      setProducts(res.data);
    } catch {
      // handled by auth
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaved = () => {
    setEditProduct(null);
    loadProducts();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 카탈로그</h1>
        <p className="text-sm text-slate-500 mt-1">
          표준 상품의 이미지, 카테고리, 가격을 관리합니다. 지사 홈페이지에 표시됩니다.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-sm text-slate-400 mt-3">로딩 중...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400">등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditProduct(product)}
            >
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
              </div>
            </div>
          ))}
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
    </div>
  );
}
