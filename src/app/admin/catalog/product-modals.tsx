'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type CatalogProduct, CATEGORY_OPTIONS, photoUrl } from './types';

// ─── Product Edit Modal ──────────────────────────────────────────────────────

export function ProductEditModal({
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
  const [showFullImage, setShowFullImage] = useState(false);

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
              <div className="mt-2 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {imageUrl ? (
                  <img
                    src={photoUrl(imageUrl)}
                    alt={name}
                    className="w-full max-h-72 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-slate-400 text-sm">
                    이미지 없음
                  </div>
                )}
              </div>
            </div>

            {/* Full Image Overlay */}
            {showFullImage && imageUrl && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
                onClick={() => setShowFullImage(false)}
              >
                <img
                  src={photoUrl(imageUrl)}
                  alt={name}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}

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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] resize-none"
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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D]"
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

            {/* isActive Toggle */}
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
                  isActive ? 'bg-[#5B7A3D]' : 'bg-slate-300'
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
                  isBranchDefault ? 'bg-[#5B7A3D]' : 'bg-slate-300'
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
                className="flex-1 bg-[#5B7A3D] hover:bg-[#4A6830] text-white"
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

export function ProductCreateModal({
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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] resize-none"
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
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D]"
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
                  isBranchDefault ? 'bg-[#5B7A3D]' : 'bg-slate-300'
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
                className="flex-1 bg-[#5B7A3D] hover:bg-[#4A6830] text-white"
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
