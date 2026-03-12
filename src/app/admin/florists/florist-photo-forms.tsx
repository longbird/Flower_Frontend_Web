'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FloristPhoto } from '@/lib/types/florist';
import { CATEGORIES, PHOTO_GRADES, photoUrl, formatCurrency, parseCurrency } from './florist-constants';

export function PhotoUploadForm({
  file,
  onUpload,
  onCancel,
  uploading,
}: {
  file: File;
  onUpload: (info: { category: string; grade?: string; isRecommended: boolean; costPrice: number | null; sellingPrice: number | null; memo: string }) => void;
  onCancel: () => void;
  uploading: boolean;
}) {
  const [category, setCategory] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [isRecommended, setIsRecommended] = useState(false);
  const [memo, setMemo] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
        {previewUrl && <Image src={previewUrl} alt="미리보기" fill className="object-contain" unoptimized />}
      </div>
      <div className="text-xs text-slate-400 truncate">{file.name}</div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-slate-600">상품 구분 *</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCategory(c.code)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                category === c.code
                  ? 'bg-[#4CAF50] text-white border-transparent shadow-md shadow-slate-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grade + Recommended */}
      <div className="space-y-1.5">
        <Label className="text-slate-600">상품 등급</Label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setIsRecommended(!isRecommended)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              isRecommended ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200'
            )}
          >
            추천
          </button>
          {PHOTO_GRADES.map((g) => (
            <button
              key={g.code}
              onClick={() => setGrade(grade === g.code ? '' : g.code)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                grade === g.code ? `${g.color} border-transparent shadow-sm` : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div className="space-y-1">
        <Label className="text-slate-600">메모 (제품명 등)</Label>
        <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-slate-600">입금가 (원가)</Label>
          <div className="relative">
            <Input
              value={costPrice}
              onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
              placeholder="예: 50,000"
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-600">판매가</Label>
          <div className="relative">
            <Input
              value={sellingPrice}
              onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
              placeholder="예: 70,000"
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className="border-slate-200" onClick={onCancel}>취소</Button>
        <Button
          onClick={() => onUpload({ category, grade, isRecommended, costPrice: parseCurrency(costPrice), sellingPrice: parseCurrency(sellingPrice), memo })}
          disabled={!category || uploading}
          className="bg-[#4CAF50] hover:bg-[#388E3C] shadow-sm"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </Button>
      </div>
    </div>
  );
}

/* --- Edit Form --- */

export function PhotoEditForm({
  photo,
  onSave,
  onDelete,
  onViewFull,
  onCancel,
  saving,
}: {
  photo: FloristPhoto;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onViewFull: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [category, setCategory] = useState<string>(photo.category);
  const [grade, setGrade] = useState<string>(photo.grade || '');
  const [isRecommended, setIsRecommended] = useState(photo.isRecommended || false);
  const [memo, setMemo] = useState(photo.memo || '');
  const [costPrice, setCostPrice] = useState(photo.costPrice ? photo.costPrice.toLocaleString() : '');
  const [sellingPrice, setSellingPrice] = useState(photo.sellingPrice ? photo.sellingPrice.toLocaleString() : '');

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-50 group" onClick={onViewFull}>
        <Image src={photoUrl(photo.fileUrl)} alt="사진" fill className="object-contain group-hover:scale-105 transition-transform duration-300" unoptimized />
        <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          크게 보기
        </span>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-slate-600">상품 구분 *</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCategory(c.code)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                category === c.code
                  ? 'bg-[#4CAF50] text-white border-transparent shadow-md shadow-slate-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grade + 추천 */}
      <div className="space-y-1.5">
        <Label className="text-slate-600">상품 등급</Label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setIsRecommended(!isRecommended)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              isRecommended ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md' : 'bg-white text-slate-600 border-slate-200'
            )}
          >
            추천
          </button>
          {PHOTO_GRADES.map((g) => (
            <button
              key={g.code}
              onClick={() => setGrade(grade === g.code ? '' : g.code)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                grade === g.code ? `${g.color} border-transparent shadow-sm` : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div className="space-y-1">
        <Label className="text-slate-600">메모 (제품명 등)</Label>
        <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-slate-600">입금가 (원가)</Label>
          <div className="relative">
            <Input
              value={costPrice}
              onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
              placeholder="예: 50,000"
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-600">판매가</Label>
          <div className="relative">
            <Input
              value={sellingPrice}
              onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
              placeholder="예: 70,000"
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" className="border-slate-200" onClick={onCancel}>취소</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            삭제
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                category,
                ...(grade ? { grade } : {}),
                isRecommended,
                ...(isRecommended ? { isHidden: false } : {}),
                ...(costPrice ? { costPrice: parseCurrency(costPrice) } : { costPrice: null }),
                ...(sellingPrice ? { sellingPrice: parseCurrency(sellingPrice) } : { sellingPrice: null }),
                ...(memo ? { memo } : { memo: null }),
              })
            }
            disabled={!category || saving}
            className="bg-[#4CAF50] hover:bg-[#388E3C] shadow-sm"
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
