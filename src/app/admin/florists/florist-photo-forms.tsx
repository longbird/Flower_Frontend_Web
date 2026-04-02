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
    <div className="flex flex-col md:flex-row gap-5">
      {/* Left: Preview */}
      <div className="md:w-[42%] flex-shrink-0 space-y-3">
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-stone-800/90 border border-stone-200 shadow-sm">
          {previewUrl && (
            <Image src={previewUrl} alt="미리보기" fill className="object-contain" unoptimized />
          )}
          {/* ORIGINAL ASSET badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
            <svg className="w-3 h-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold tracking-widest text-white/90">새 사진</span>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 truncate px-1">{file.name}</p>

        {/* Internal Memo (Admin Only) — 사진 아래 배치 */}
        <div className="rounded-xl bg-[#FEFCE8] border border-[#FDE68A] p-4 space-y-2">
          <Label className="text-stone-700 font-medium text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            내부 메모
            <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">관리자 전용</span>
          </Label>
          <textarea
            value={internalMemo}
            onChange={(e) => setInternalMemo(e.target.value)}
            placeholder="관리자만 볼 수 있는 내부 메모를 입력하세요"
            maxLength={500}
            rows={2}
            className="w-full text-sm rounded-xl border border-amber-200 px-4 py-3 bg-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none placeholder:text-amber-400"
          />
        </div>
      </div>

      {/* Right: Form Fields */}
      <div className="flex-1 space-y-4">
        {/* Category */}
        <div className="space-y-2">
          <Label className="text-stone-700 font-semibold text-sm">카테고리 선택 *</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCategory(c.code)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  category === c.code
                    ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grade + Recommended */}
        <div className="space-y-2">
          <Label className="text-stone-700 font-semibold text-sm">상품 등급</Label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsRecommended(!isRecommended)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                isRecommended
                  ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
              )}
            >
              추천
            </button>
            {PHOTO_GRADES.map((g) => (
              <button
                key={g.code}
                onClick={() => setGrade(grade === g.code ? '' : g.code)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  grade === g.code
                    ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div className="space-y-1.5">
          <Label className="text-stone-700 font-medium text-sm">메모 (제품명 등)</Label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 장미 꽃다발 50송이"
            maxLength={200}
            className="h-11 rounded-xl border-stone-200 bg-white text-base focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D]"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-stone-700 font-medium text-sm">상품 설명</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품에 대한 상세 설명을 입력하세요"
            maxLength={1000}
            rows={4}
            className="w-full text-base rounded-xl border border-stone-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] resize-none"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-stone-700 font-medium text-sm">입금가 (원가)</Label>
            <div className="relative flex items-center h-12 rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#5B7A3D]/20 focus-within:border-[#5B7A3D]">
              <span className="pl-3 text-stone-400 text-sm select-none">₩</span>
              <input
                value={costPrice}
                onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
                placeholder="50,000"
                className="flex-1 h-full px-2 bg-transparent text-lg font-semibold text-stone-800 focus:outline-none placeholder:text-stone-300 placeholder:font-normal placeholder:text-base"
              />
              <span className="pr-3 text-stone-400 text-xs font-medium select-none">원</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-stone-700 font-medium text-sm">판매가</Label>
            <div className="relative flex items-center h-12 rounded-xl border border-[#5B7A3D]/30 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#5B7A3D]/20 focus-within:border-[#5B7A3D]">
              <span className="pl-3 text-stone-400 text-sm select-none">₩</span>
              <input
                value={sellingPrice}
                onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
                placeholder="70,000"
                className="flex-1 h-full px-2 bg-transparent text-lg font-semibold text-stone-800 focus:outline-none placeholder:text-stone-300 placeholder:font-normal placeholder:text-base"
              />
              <span className="pr-3 text-[#5B7A3D] text-xs font-medium select-none">원</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" className="border-stone-200 text-stone-600 hover:bg-stone-50" onClick={onCancel}>
            취소
          </Button>
          <Button
            onClick={() =>
              onUpload({
                category,
                grade,
                isRecommended,
                costPrice: parseCurrency(costPrice),
                sellingPrice: parseCurrency(sellingPrice),
                memo,
                description,
                internalMemo,
              })
            }
            disabled={!category || uploading}
            className="bg-[#5B7A3D] hover:bg-[#4A6830] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-sm"
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

  // Format date for "Last updated" display
  const formattedDate = photo.createdAt
    ? new Date(photo.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-xl font-bold text-stone-800">상품 정보 수정</h2>
        </div>
        {formattedDate && (
          <div className="text-right">
            <p className="text-[10px] font-semibold text-stone-400">최종 수정</p>
            <p className="text-sm font-medium text-stone-600 mt-0.5">{formattedDate}</p>
          </div>
        )}
      </div>

      {/* Body: Two columns */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Left: Image + Info */}
        <div className="md:w-[42%] flex-shrink-0 space-y-3">
          {/* Photo container */}
          <div
            className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-stone-800/90 border border-stone-200 cursor-pointer group shadow-sm"
            onClick={onViewFull}
          >
            <Image
              src={photoUrl(photo.fileUrl)}
              alt="사진"
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            {/* ORIGINAL ASSET badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 whitespace-nowrap">
              <svg className="w-3 h-3 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-semibold text-white/90">원본 사진</span>
            </div>
            {/* View full overlay */}
            <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              크게 보기
            </span>
          </div>

          {/* Florist info card */}
          {floristInfo && (
            <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-1.5">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5 text-[#5B7A3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-[9px] font-bold text-[#5B7A3D]">소속 화원</span>
              </div>
              <p className="text-sm font-bold text-stone-800">{floristInfo.name || '—'}</p>
              {floristInfo.address && (
                <p className="text-xs text-stone-500 line-clamp-2">{floristInfo.address}</p>
              )}
              {floristInfo.phone && (
                <p className="text-xs text-stone-400">{floristInfo.phone}</p>
              )}
            </div>
          )}

          {/* Internal Memo (Admin Only) — 사진 아래 배치 */}
          <div className="rounded-xl bg-[#FEFCE8] border border-[#FDE68A] p-4 space-y-2">
            <Label className="text-stone-700 font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              내부 메모
              <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">관리자 전용</span>
            </Label>
            <textarea
              value={internalMemo}
              onChange={(e) => setInternalMemo(e.target.value)}
              placeholder="관리자만 볼 수 있는 내부 메모를 입력하세요"
              maxLength={500}
              rows={2}
              className="w-full text-sm rounded-xl border border-amber-200 px-4 py-3 bg-white/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none placeholder:text-amber-400"
            />
          </div>

          {/* Photo Replace Section */}
          {onReplace && (
            <div>
              {!replaceOpen ? (
                <button
                  onClick={() => setReplaceOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  사진 교체
                </button>
              ) : (
                <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/50 space-y-2">
                  {!replaceFile ? (
                    <>
                      <p className="text-[11px] text-indigo-700 font-medium">교체할 사진 선택</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-indigo-300 text-indigo-600 text-xs hover:bg-indigo-100/60 transition-colors"
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
                        className="w-full text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-indigo-700 font-medium">교체할 사진</p>
                      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-indigo-200 bg-stone-50">
                        <Image src={replacePreviewUrl} alt="교체할 사진" fill className="object-contain" unoptimized />
                      </div>
                      <p className="text-[10px] text-stone-500 truncate">{replaceFile.name}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReplaceCancel}
                          className="flex-1 px-2 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-xs hover:bg-stone-100 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleReplaceConfirm}
                          disabled={replacing}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
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
        <div className="flex-1 space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#5B7A3D] uppercase">category</span>
              <Label className="text-stone-700 font-semibold text-sm">카테고리 선택</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCategory(c.code)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    category === c.code
                      ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grade + 추천 */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#5B7A3D] uppercase">verified</span>
              <Label className="text-stone-700 font-semibold text-sm">상품 등급</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsRecommended(!isRecommended)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  isRecommended
                    ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
                )}
              >
                추천
              </button>
              {PHOTO_GRADES.map((g) => (
                <button
                  key={g.code}
                  onClick={() => setGrade(grade === g.code ? '' : g.code)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    grade === g.code
                      ? 'bg-[#5B7A3D] text-white border-transparent shadow-sm'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]'
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Memo */}
          <div className="space-y-1.5">
            <Label className="text-stone-700 font-medium text-sm">메모 (제품명 등)</Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 장미 꽃다발 50송이"
              maxLength={200}
              className="h-11 rounded-xl border-stone-200 bg-white text-base focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-stone-700 font-medium text-sm">상품 설명</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상품에 대한 상세 설명을 입력하세요"
              maxLength={1000}
              rows={4}
              className="w-full text-base rounded-xl border border-stone-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#5B7A3D]/20 focus:border-[#5B7A3D] resize-none"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-stone-700 font-medium text-sm">입금가 (원가)</Label>
              <div className="relative flex items-center h-12 rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#5B7A3D]/20 focus-within:border-[#5B7A3D]">
                <span className="pl-3 text-stone-400 text-sm select-none">₩</span>
                <input
                  value={costPrice}
                  onChange={(e) => setCostPrice(formatCurrency(e.target.value))}
                  placeholder="50,000"
                  className="flex-1 h-full px-2 bg-transparent text-lg font-semibold text-stone-800 focus:outline-none placeholder:text-stone-300 placeholder:font-normal placeholder:text-base"
                />
                <span className="pr-3 text-stone-400 text-xs font-medium select-none">원</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-stone-700 font-medium text-sm">판매가</Label>
              <div className="relative flex items-center h-12 rounded-xl border border-[#5B7A3D]/30 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#5B7A3D]/20 focus-within:border-[#5B7A3D]">
                <span className="pl-3 text-stone-400 text-sm select-none">₩</span>
                <input
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(formatCurrency(e.target.value))}
                  placeholder="70,000"
                  className="flex-1 h-full px-2 bg-transparent text-lg font-semibold text-stone-800 focus:outline-none placeholder:text-stone-300 placeholder:font-normal placeholder:text-base"
                />
                <span className="pr-3 text-[#5B7A3D] text-xs font-medium select-none">원</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-stone-400 hover:text-red-500 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
            <Button
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
              className="bg-[#5B7A3D] hover:bg-[#4A6830] text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-sm"
            >
              {saving ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
