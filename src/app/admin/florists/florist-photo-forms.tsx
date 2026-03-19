'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FloristPhoto } from '@/lib/types/florist';
import { CATEGORIES, PHOTO_GRADES, photoUrl, formatCurrency, parseCurrency } from './florist-constants';
import { toast } from 'sonner';

export function PhotoUploadForm({
  file,
  onUpload,
  onCancel,
  uploading,
}: {
  file: File;
  onUpload: (info: { category: string; grade?: string; isRecommended: boolean; costPrice: number | null; sellingPrice: number | null; memo: string; description: string; internalMemo: string }) => void;
  onCancel: () => void;
  uploading: boolean;
}) {
  const [category, setCategory] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [isRecommended, setIsRecommended] = useState(false);
  const [memo, setMemo] = useState('');
  const [description, setDescription] = useState('');
  const [internalMemo, setInternalMemo] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: Preview */}
      <div className="md:w-[45%] flex-shrink-0">
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {previewUrl && <Image src={previewUrl} alt="미리보기" fill className="object-contain" unoptimized />}
        </div>
        <div className="text-xs text-slate-400 truncate mt-2">{file.name}</div>
      </div>

      {/* Right: Form Fields */}
      <div className="flex-1 space-y-3">
        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-slate-600 text-xs">상품 구분 *</Label>
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
          <Label className="text-slate-600 text-xs">상품 등급</Label>
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
          <Label className="text-slate-600 text-xs">메모 (제품명 등)</Label>
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="h-8 text-sm border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-xs">상품 설명</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품에 대한 상세 설명을 입력하세요"
            maxLength={1000}
            rows={3}
            className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 resize-none"
          />
        </div>

        {/* 내부 메모 (관리자 전용) */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-xs flex items-center gap-1.5">
            내부 메모
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">관리자 전용</span>
          </Label>
          <textarea
            value={internalMemo}
            onChange={(e) => setInternalMemo(e.target.value)}
            placeholder="관리자만 볼 수 있는 내부 메모를 입력하세요"
            maxLength={500}
            rows={2}
            className="w-full text-sm rounded-md border border-amber-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none bg-amber-50/30"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-600 text-xs">입금가 (원가)</Label>
            <div className="relative">
              <Input
                value={costPrice}
                onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
                placeholder="예: 50,000"
                className="h-8 text-sm pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-600 text-xs">판매가</Label>
            <div className="relative">
              <Input
                value={sellingPrice}
                onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
                placeholder="예: 70,000"
                className="h-8 text-sm pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="border-slate-200" onClick={onCancel}>취소</Button>
          <Button
            size="sm"
            onClick={() => onUpload({ category, grade, isRecommended, costPrice: parseCurrency(costPrice), sellingPrice: parseCurrency(sellingPrice), memo, description, internalMemo })}
            disabled={!category || uploading}
            className="bg-[#4CAF50] hover:bg-[#388E3C] shadow-sm"
          >
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --- Edit Form --- */

export interface FloristInfoForEdit {
  name?: string;
  phone?: string;
  address?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImageFile(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('JPG, PNG, WebP 형식만 업로드 가능합니다.\nHEIC 파일은 JPG로 변환 후 업로드해주세요.');
    return false;
  }
  return true;
}

export function PhotoEditForm({
  photo,
  floristInfo,
  onSave,
  onDelete,
  onViewFull,
  onCancel,
  saving,
  onReplace,
  replacing,
}: {
  photo: FloristPhoto;
  floristInfo?: FloristInfoForEdit;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onViewFull: () => void;
  onCancel: () => void;
  saving: boolean;
  onReplace?: (file: File) => void;
  replacing?: boolean;
}) {
  const [category, setCategory] = useState<string>(photo.category);
  const [grade, setGrade] = useState<string>(photo.grade || '');
  const [isRecommended, setIsRecommended] = useState(photo.isRecommended || false);
  const [memo, setMemo] = useState(photo.memo || '');
  const [description, setDescription] = useState(photo.description || '');
  const [internalMemo, setInternalMemo] = useState(photo.internalMemo || '');
  const [costPrice, setCostPrice] = useState(photo.costPrice ? photo.costPrice.toLocaleString() : '');
  const [sellingPrice, setSellingPrice] = useState(photo.sellingPrice ? photo.sellingPrice.toLocaleString() : '');

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreviewUrl, setReplacePreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!replaceFile) {
      setReplacePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(replaceFile);
    setReplacePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [replaceFile]);

  useEffect(() => {
    if (!replaceOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file && validateImageFile(file)) {
            setReplaceFile(file);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [replaceOpen]);

  function handleReplaceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (validateImageFile(file)) {
      setReplaceFile(file);
    }
    e.target.value = '';
  }

  function handleReplaceConfirm() {
    if (!replaceFile || !onReplace) return;
    onReplace(replaceFile);
    setReplaceOpen(false);
    setReplaceFile(null);
  }

  function handleReplaceCancel() {
    setReplaceOpen(false);
    setReplaceFile(null);
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: Image */}
      <div className="md:w-[45%] flex-shrink-0">
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-50 group" onClick={onViewFull}>
          <Image src={photoUrl(photo.fileUrl)} alt="사진" fill className="object-contain group-hover:scale-105 transition-transform duration-300" unoptimized />
          <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            크게 보기
          </span>
        </div>

        {/* Florist Info */}
        {floristInfo && (
          <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">소속 화원</p>
            <p className="text-sm font-medium text-slate-800">{floristInfo.name || '—'}</p>
            {floristInfo.phone && <p className="text-xs text-slate-500 mt-0.5">{floristInfo.phone}</p>}
            {floristInfo.address && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{floristInfo.address}</p>}
          </div>
        )}

        {/* Photo Replace Section */}
        {onReplace && (
          <div className="mt-3">
            {!replaceOpen ? (
              <button
                onClick={() => setReplaceOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                사진 교체
              </button>
            ) : (
              <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/50 space-y-2">
                {!replaceFile ? (
                  <>
                    <p className="text-[11px] text-indigo-700 font-medium">교체할 사진 선택</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-indigo-300 text-indigo-600 text-xs hover:bg-indigo-100/60 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      파일 선택
                    </button>
                    <p className="text-[10px] text-indigo-400 text-center">또는 Ctrl+V로 붙여넣기</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleReplaceFileChange}
                    />
                    <button
                      onClick={handleReplaceCancel}
                      className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-indigo-700 font-medium">교체할 사진</p>
                    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-indigo-200 bg-slate-50">
                      <Image src={replacePreviewUrl} alt="교체할 사진" fill className="object-contain" unoptimized />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{replaceFile.name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReplaceCancel}
                        className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 text-slate-500 text-xs hover:bg-slate-100 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleReplaceConfirm}
                        disabled={replacing}
                        className="flex-1 px-2 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                      >
                        {replacing ? '교체 중...' : '교체'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Form Fields */}
      <div className="flex-1 space-y-3">
        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-slate-600 text-xs">상품 구분 *</Label>
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
          <Label className="text-slate-600 text-xs">상품 등급</Label>
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
          <Label className="text-slate-600 text-xs">메모 (제품명 등)</Label>
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="h-8 text-sm border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-xs">상품 설명</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품에 대한 상세 설명을 입력하세요"
            maxLength={1000}
            rows={3}
            className="w-full text-sm rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 resize-none"
          />
        </div>

        {/* 내부 메모 (관리자 전용) */}
        <div className="space-y-1">
          <Label className="text-slate-600 text-xs flex items-center gap-1.5">
            내부 메모
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">관리자 전용</span>
          </Label>
          <textarea
            value={internalMemo}
            onChange={(e) => setInternalMemo(e.target.value)}
            placeholder="관리자만 볼 수 있는 내부 메모를 입력하세요"
            maxLength={500}
            rows={2}
            className="w-full text-sm rounded-md border border-amber-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none bg-amber-50/30"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-600 text-xs">입금가 (원가)</Label>
            <div className="relative">
              <Input
                value={costPrice}
                onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
                placeholder="예: 50,000"
                className="h-8 text-sm pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-600 text-xs">판매가</Label>
            <div className="relative">
              <Input
                value={sellingPrice}
                onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
                placeholder="예: 70,000"
                className="h-8 text-sm pr-8 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            삭제
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-200" onClick={onCancel}>취소</Button>
            <Button
              size="sm"
              onClick={() =>
                onSave({
                  category,
                  grade: grade || null,
                  isRecommended,
                  ...(isRecommended ? { isHidden: false } : {}),
                  ...(costPrice ? { costPrice: parseCurrency(costPrice) } : { costPrice: null }),
                  ...(sellingPrice ? { sellingPrice: parseCurrency(sellingPrice) } : { sellingPrice: null }),
                  ...(memo ? { memo } : { memo: null }),
                  ...(description ? { description } : { description: null }),
                  ...(internalMemo ? { internalMemo } : { internalMemo: null }),
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
    </div>
  );
}
