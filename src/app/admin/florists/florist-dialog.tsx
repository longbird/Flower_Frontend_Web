'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  getFlorist,
  updateFlorist,
  getFloristPhotos,
  addFloristServiceArea,
  removeFloristServiceArea,
  uploadFloristPhoto,
  updateFloristPhoto,
  deleteFloristPhoto,
  rotateFloristPhoto,
  removeFloristPhotoText,
} from '@/lib/api/admin';
import type { FloristSummary, FloristPhoto, PhotoCategory, PhotoGrade } from '@/lib/types/florist';
import { addPhotoLog } from '@/lib/photo-log';
import { useAuthStore } from '@/lib/auth/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const CAPABILITY_OPTIONS = [
  { code: 'CELEBRATION', label: '축하기본' },
  { code: 'CELEBRATION_LARGE', label: '축하(대)' },
  { code: 'CONDOLENCE', label: '근조기본' },
  { code: 'CONDOLENCE_LARGE', label: '근조(대)' },
  { code: 'LARGE', label: '근조(특대)' },
  { code: 'MULTI_TIER', label: '근조4단이상' },
  { code: 'OBJET', label: '오브제' },
  { code: 'RICE', label: '쌀' },
  { code: 'ORIENTAL_ORCHID', label: '동양란' },
  { code: 'WESTERN_ORCHID', label: '서양란' },
  { code: 'FLOWER', label: '꽃' },
  { code: 'FOLIAGE', label: '관엽' },
  { code: 'HOLIDAY_UNAVAILABLE', label: '휴일불가' },
];

const GRADE_OPTIONS = [
  { value: 0, label: '없음' },
  { value: 1, label: '브론즈' },
  { value: 2, label: '실버' },
  { value: 3, label: '골드' },
  { value: 4, label: '플래티넘' },
  { value: 5, label: '다이아' },
];

const CATEGORIES: { code: PhotoCategory | string; name: string }[] = [
  { code: 'CELEBRATION', name: '축하' },
  { code: 'CONDOLENCE', name: '근조' },
  { code: 'OBJET', name: '오브제' },
  { code: 'ORIENTAL', name: '동양란' },
  { code: 'WESTERN', name: '서양란' },
  { code: 'FLOWER', name: '꽃' },
  { code: 'FOLIAGE', name: '관엽' },
  { code: 'RICE', name: '쌀' },
  { code: 'FRUIT', name: '과일' },
  { code: 'OTHER', name: '기타' },
];

const PHOTO_GRADES: { code: PhotoGrade; name: string; color: string }[] = [
  { code: 'PREMIUM', name: '프리미엄', color: 'bg-amber-700 text-white' },
  { code: 'HIGH', name: '고급형', color: 'bg-blue-600 text-white' },
  { code: 'STANDARD', name: '실속형', color: 'bg-teal-600 text-white' },
];

const GRADE_MAP: Record<number, string> = {
  1: '브론즈', 2: '실버', 3: '골드', 4: '플래티넘', 5: '다이아',
};

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

function formatCurrency(value: string): string {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString();
}

function parseCurrency(value: string): number | null {
  const num = parseInt(value.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? null : num;
}

export default function FloristDetailDialog({
  floristId,
  open,
  onClose,
}: {
  floristId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: floristRes, isLoading } = useQuery({
    queryKey: ['florist', floristId],
    queryFn: () => getFlorist(floristId),
    enabled: open && !!floristId,
  });
  const florist = floristRes?.data;

  const { data: photosRes } = useQuery({
    queryKey: ['floristPhotos', floristId],
    queryFn: () => getFloristPhotos(floristId, { includeHidden: true }),
    enabled: open && !!floristId,
  });
  const photos = photosRes?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] max-w-7xl h-[92vh] max-h-[92vh] overflow-hidden p-0 gap-0 border-stone-300/60 shadow-2xl flex flex-col">
        {isLoading || !florist ? (
          <div className="flex items-center justify-center flex-1 bg-[#F5F5F5]">
            <div className="w-7 h-7 border-[2.5px] border-[#C8E6C9] border-t-[#4CAF50] rounded-full animate-spin" />
          </div>
        ) : (
          <FloristEditPanel
            florist={florist}
            photos={photos}
            floristId={floristId}
            queryClient={queryClient}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FloristEditPanel({
  florist,
  photos,
  floristId,
  queryClient,
  onClose,
}: {
  florist: FloristSummary;
  photos: FloristPhoto[];
  floristId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'photos'>('info');
  const [selectedPhoto, setSelectedPhoto] = useState<FloristPhoto | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<FloristPhoto | null>(null);
  const [uploadDialogFile, setUploadDialogFile] = useState<File | null>(null);
  const [photoCacheBuster, setPhotoCacheBuster] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(florist.name || '');
  const [phone, setPhone] = useState(florist.phone || '');
  const [address, setAddress] = useState(florist.address || '');
  const [sido, setSido] = useState(florist.sido || '');
  const [gugun, setGugun] = useState(florist.gugun || '');
  const [remarks, setRemarks] = useState(florist.remarks || '');
  const [grade, setGrade] = useState(florist.grade ?? 0);
  const [priority, setPriority] = useState(florist.priority ?? 0);
  const [capabilities, setCapabilities] = useState<string[]>(florist.capabilities || []);
  const [newArea, setNewArea] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateFlorist(floristId, data),
    onSuccess: () => {
      toast.success('화원 정보가 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['florist', floristId] });
      queryClient.invalidateQueries({ queryKey: ['florists'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const addAreaMutation = useMutation({
    mutationFn: ({ area, sido: s }: { area: string; sido?: string }) =>
      addFloristServiceArea(floristId, area, s),
    onSuccess: () => {
      toast.success('서비스 지역 추가');
      queryClient.invalidateQueries({ queryKey: ['florist', floristId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '추가 실패'),
  });

  const removeAreaMutation = useMutation({
    mutationFn: (area: string) => removeFloristServiceArea(floristId, area),
    onSuccess: () => {
      toast.success('서비스 지역 삭제');
      queryClient.invalidateQueries({ queryKey: ['florist', floristId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  const uploadMutation = useMutation({
    mutationFn: (args: { file: File; category: string; grade?: string; isRecommended?: boolean; costPrice?: number; sellingPrice?: number; memo?: string }) =>
      uploadFloristPhoto(floristId, args.file, {
        category: args.category,
        grade: args.grade,
        isRecommended: args.isRecommended,
        costPrice: args.costPrice,
        sellingPrice: args.sellingPrice,
        memo: args.memo,
      }),
    onSuccess: (res) => {
      const uploaded = (res as { data?: FloristPhoto })?.data ?? null;
      addPhotoLog({
        action: 'UPLOAD',
        floristId: floristId,
        floristName: florist?.name || floristId,
        photoId: uploaded?.id ?? null,
        before: null,
        after: uploaded,
        userName: useAuthStore.getState().user?.name || '-',
        note: `카테고리: ${uploaded?.category || '?'}`,
      });
      toast.success('사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
      setUploadDialogFile(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '업로드 실패'),
  });

  const updatePhotoMutation = useMutation({
    mutationFn: ({ photoId, data, beforeSnapshot }: { photoId: number; data: Record<string, unknown>; beforeSnapshot?: FloristPhoto | null }) => {
      return updateFloristPhoto(floristId, photoId, data).then((res) => ({ res, beforeSnapshot, photoId, data }));
    },
    onSuccess: ({ beforeSnapshot, photoId, data }) => {
      const isToggle = Object.keys(data).length === 1 && 'isHidden' in data;
      addPhotoLog({
        action: isToggle ? 'TOGGLE_VISIBILITY' : 'UPDATE',
        floristId: floristId,
        floristName: florist?.name || floristId,
        photoId,
        before: beforeSnapshot ?? null,
        after: { ...beforeSnapshot, ...data } as Partial<FloristPhoto>,
        userName: useAuthStore.getState().user?.name || '-',
        note: isToggle ? `표시상태: ${data.isHidden ? '숨김' : '표시'}` : undefined,
      });
      toast.success('사진 정보가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
      setSelectedPhoto(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const rotatePhotoMutation = useMutation({
    mutationFn: ({ photoId, angle }: { photoId: number; angle: number }) =>
      rotateFloristPhoto(floristId, photoId, angle),
    onSuccess: (result, { photoId }) => {
      toast.success('사진이 회전 저장되었습니다.');
      const res = result as { fileUrl?: string };
      if (res.fileUrl) {
        setViewerPhoto(prev => prev && prev.id === photoId ? { ...prev, fileUrl: res.fileUrl! } : prev);
      }
      setPhotoCacheBuster(Date.now());
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '회전 저장 실패'),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: ({ photoId, beforeSnapshot }: { photoId: number; beforeSnapshot?: FloristPhoto | null }) =>
      deleteFloristPhoto(floristId, photoId).then(() => ({ photoId, beforeSnapshot })),
    onSuccess: ({ photoId, beforeSnapshot }) => {
      addPhotoLog({
        action: 'DELETE',
        floristId: floristId,
        floristName: florist?.name || floristId,
        photoId,
        before: beforeSnapshot ?? null,
        after: null,
        userName: useAuthStore.getState().user?.name || '-',
        note: beforeSnapshot ? `카테고리: ${beforeSnapshot.category}, URL: ${beforeSnapshot.fileUrl}` : undefined,
      });
      toast.success('사진이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
      setSelectedPhoto(null);
      setViewerPhoto(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address || '',
      sido: sido || '',
      gugun: gugun || '',
      remarks: remarks.trim() || null,
      grade: grade || 0,
      priority: priority || 0,
      capabilities,
    });
  };

  const toggleCap = (code: string) => {
    setCapabilities((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleAddArea = () => {
    const area = newArea.trim();
    if (!area) return;
    addAreaMutation.mutate({ area });
    setNewArea('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      toast.error('JPG, PNG, WebP 형식만 업로드 가능합니다.\nHEIC 파일은 JPG로 변환 후 업로드해주세요.');
      e.target.value = '';
      return;
    }
    setUploadDialogFile(file);
    e.target.value = '';
  };

  const handleToggleVisibility = useCallback((photo: FloristPhoto) => {
    updatePhotoMutation.mutate({
      photoId: photo.id,
      data: { isHidden: !photo.isHidden },
      beforeSnapshot: photo,
    });
  }, [updatePhotoMutation]);

  const statusLabel = florist.status === 'ACTIVE' ? '활성' : florist.status === 'SUSPENDED' ? '중지' : '비활성';
  const statusColor = florist.status === 'ACTIVE' ? 'bg-green-600' : florist.status === 'SUSPENDED' ? 'bg-amber-600' : 'bg-stone-400';

  const filteredPhotos = photos.filter(p => categoryFilter === 'ALL' || p.category === categoryFilter);

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* 헤더 */}
      <div className="flex flex-col bg-[#4CAF50] text-white flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#388E3C]">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌸</span>
            <h2 className="text-xl font-bold tracking-tight">{florist.name}</h2>
            <span className={cn('w-2 h-2 rounded-full ring-2 ring-[#388E3C]', statusColor)} />
            <span className="text-sm text-white/70">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#388E3C] text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="flex px-6 gap-6 pt-2">
          <button onClick={() => setActiveTab('info')} className={cn("pb-2 text-[15px] font-medium transition-colors border-b-2", activeTab === 'info' ? "text-white border-white" : "text-white/60 border-transparent hover:text-white/80")}>
            기본 정보
          </button>
          <button onClick={() => setActiveTab('photos')} className={cn("pb-2 text-[15px] font-medium transition-colors border-b-2 flex items-center gap-2", activeTab === 'photos' ? "text-white border-white" : "text-white/60 border-transparent hover:text-white/80")}>
            사진 관리
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">{photos.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative min-h-0">
        {activeTab === 'info' ? (
          <div className="flex h-full min-h-0">
            {/* 왼쪽: 수정 폼 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F5F5F5]">
              <Section title="기본 정보" accent="bg-[#4CAF50]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <Field label="화원명" className="col-span-2 sm:col-span-1">
                    <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
                  </Field>
                  <Field label="전화번호">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input" />
                  </Field>
                  <Field label="시/도">
                    <input value={sido} onChange={(e) => setSido(e.target.value)} className="field-input" />
                  </Field>
                  <Field label="구/군">
                    <div className="flex gap-2">
                      <input value={gugun} onChange={(e) => setGugun(e.target.value)} className="field-input flex-1" />
                      <button type="button" onClick={() => toast.info('주소 검색 기능은 준비 중입니다')} className="px-3 py-2 bg-[#2E7D32] text-white hover:bg-[#1B5E20] transition-colors rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                    </div>
                  </Field>
                  <Field label="주소" className="col-span-2">
                    <input value={address} onChange={(e) => setAddress(e.target.value)} className="field-input" />
                  </Field>
                </div>
              </Section>

              <Section title="특이사항" accent="bg-[#4CAF50]">
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="화원 관련 특이사항을 입력하세요" className="field-input resize-none" />
              </Section>

              <Section title="서비스 지역" accent="bg-[#4CAF50]">
                <div className="flex flex-wrap gap-2 mb-3">
                  {florist.serviceAreas && florist.serviceAreas.length > 0 ? (
                    florist.serviceAreas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                        {area}
                        <button className="text-[#4CAF50]/60 hover:text-red-600 transition-colors" onClick={() => { if (confirm(`"${area}" 삭제?`)) removeAreaMutation.mutate(area); }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-400 italic">설정된 지역 없음</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input placeholder="지역명 입력" value={newArea} onChange={(e) => setNewArea(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddArea()} className="field-input flex-1" />
                  <button onClick={handleAddArea} disabled={addAreaMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors disabled:opacity-50">
                    추가
                  </button>
                </div>
              </Section>

              <Section title="역량" accent="bg-[#4CAF50]">
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_OPTIONS.map((opt) => {
                    const active = capabilities.includes(opt.code);
                    return (
                      <button key={opt.code} onClick={() => toggleCap(opt.code)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all', active ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#4CAF50]/30 shadow-sm' : 'bg-white text-stone-500 border-stone-200 hover:border-[#4CAF50]/50 hover:text-[#2E7D32]')}>
                        {active && <svg className="inline w-3.5 h-3.5 mr-0.5 -mt-px text-[#4CAF50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="영업 정보" accent="bg-[#4CAF50]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <Field label="등급">
                    <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="field-input">
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="배정 우선순위">
                    <input type="number" min={0} max={99} value={priority || ''} onChange={(e) => setPriority(Number(e.target.value) || 0)} className="field-input" />
                  </Field>
                </div>
              </Section>
            </div>

            {/* 오른쪽: 갤러리 미리보기 */}
            <div className="hidden md:flex flex-col w-[280px] border-l border-[#E0E0E0] bg-[#FAFAFA]">
              <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#2E7D32] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  갤러리 ({photos.length})
                </span>
                <button onClick={() => setActiveTab('photos')} className="text-xs text-[#4CAF50] hover:text-[#388E3C] font-medium transition-colors">전체보기</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {photos.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8 italic">사진 없음</p>
                ) : (
                  photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden border border-stone-200/80 cursor-pointer hover:ring-2 hover:ring-[#4CAF50]/40 transition-all" onClick={() => setSelectedPhoto(photo)}>
                      <div className="relative aspect-square">
                        <Image src={photoUrl(photo.fileUrl)} alt={photo.memo || ''} fill className="object-cover" sizes="260px" unoptimized />
                        <span className="absolute top-1 left-1 bg-black/55 text-white/90 text-[11px] px-1.5 py-0.5 rounded">
                          {CATEGORIES.find(c => c.code === photo.category)?.name || photo.category}
                        </span>
                        {photo.isHidden && <span className="absolute bottom-1 right-1 bg-amber-700/80 text-white text-[10px] px-1.5 py-0.5 rounded">숨김</span>}
                        {photo.isRecommended && <span className="absolute top-1 right-1 bg-amber-600/85 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">추천</span>}
                      </div>
                      <div className="flex flex-col gap-0.5 px-2 py-1.5 bg-white border-t border-stone-100">
                        {photo.sellingPrice != null && <p className="text-[12px] text-[#4CAF50] font-semibold truncate">판매 {photo.sellingPrice.toLocaleString()}원</p>}
                        {photo.memo && <p className="text-xs text-stone-500 truncate">{photo.memo}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">사진 갤러리 ({photos.length}장)</h3>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {uploadMutation.isPending ? '업로드 중...' : '사진 업로드'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-6">
              <button onClick={() => setCategoryFilter('ALL')} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border", categoryFilter === 'ALL' ? "bg-[#4CAF50] text-white border-[#4CAF50]" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200")}>
                전체
              </button>
              {CATEGORIES.map(c => (
                <button key={c.code} onClick={() => setCategoryFilter(c.code as string)} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border", categoryFilter === c.code ? "bg-[#4CAF50] text-white border-[#4CAF50]" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200")}>
                  {c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="rounded-xl overflow-hidden border border-stone-200 cursor-pointer hover:ring-2 hover:ring-stone-400 transition-all bg-white shadow-sm flex flex-col h-full" onClick={() => setSelectedPhoto(photo)}>
                  <div className="relative aspect-[3/4] w-full overflow-hidden shrink-0">
                    <Image src={photoUrl(photo.fileUrl) + (photoCacheBuster ? `?t=${photoCacheBuster}` : '')} alt={photo.memo || '화원 사진'} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw" unoptimized />
                    <span className="absolute top-1.5 left-1.5 bg-black/55 text-white text-[11px] px-2 py-0.5 rounded">
                      {CATEGORIES.find((c) => c.code === photo.category)?.name || photo.category}
                    </span>
                    {photo.isRecommended && <span className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">추천</span>}
                    {photo.grade && <span className={cn('absolute top-1.5 text-white text-[11px] font-bold px-2 py-0.5 rounded', PHOTO_GRADES.find((g) => g.code === photo.grade)?.color || 'bg-stone-500', photo.isHidden ? 'right-8' : 'right-1.5')}>{PHOTO_GRADES.find((g) => g.code === photo.grade)?.name}</span>}
                    {photo.isHidden && <svg className="absolute top-1.5 right-1.5 w-5 h-5 text-amber-600 bg-white/80 rounded-full p-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" /></svg>}
                    <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white rounded p-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </span>
                  </div>
                  <div className="px-3 py-2 text-[12px] space-y-1 flex-1 flex flex-col justify-end bg-stone-50 border-t border-stone-100">
                    {photo.costPrice != null && <p className="text-stone-500 truncate">원가 {photo.costPrice.toLocaleString()}원</p>}
                    {photo.sellingPrice != null && <p className="text-stone-800 font-semibold truncate">판매 {photo.sellingPrice.toLocaleString()}원</p>}
                    {photo.memo && <p className="text-stone-600 truncate">{photo.memo}</p>}
                    {!photo.costPrice && !photo.sellingPrice && !photo.memo && <p className="text-stone-400 italic">추가 정보 없음</p>}
                  </div>
                </div>
              ))}
            </div>
            {filteredPhotos.length === 0 && <div className="text-center text-stone-400 py-12">사진이 없습니다.</div>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-[#E0E0E0] bg-white flex-shrink-0">
        <button onClick={() => toast.error('화원 삭제 기능은 준비 중입니다')} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          화원 삭제
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[15px] font-medium text-stone-500 hover:bg-stone-100 transition-colors">닫기</button>
          <button onClick={handleSave} disabled={updateMutation.isPending} className="px-6 py-2.5 rounded-lg text-[15px] font-medium bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 사진 정보 수정 다이얼로그 — 탭 독립 */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-stone-800">사진 정보 수정</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <PhotoEditForm
              photo={selectedPhoto}
              onSave={(data) => updatePhotoMutation.mutate({ photoId: selectedPhoto.id, data, beforeSnapshot: selectedPhoto })}
              onDelete={() => { if(confirm('이 사진을 정말 삭제하시겠습니까?')) deletePhotoMutation.mutate({ photoId: selectedPhoto.id, beforeSnapshot: selectedPhoto }) }}
              onViewFull={() => { const p = selectedPhoto; setSelectedPhoto(null); setTimeout(() => setViewerPhoto(p), 100); }}
              onCancel={() => setSelectedPhoto(null)}
              saving={updatePhotoMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadDialogFile} onOpenChange={() => setUploadDialogFile(null)}>
        <DialogContent className="max-w-sm border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-stone-800">사진 정보 입력</DialogTitle>
          </DialogHeader>
          {uploadDialogFile && (
            <PhotoUploadForm
              file={uploadDialogFile}
              onUpload={(info) => {
                uploadMutation.mutate({
                  file: uploadDialogFile,
                  category: info.category,
                  grade: info.grade || undefined,
                  isRecommended: info.isRecommended,
                  costPrice: info.costPrice ?? undefined,
                  sellingPrice: info.sellingPrice ?? undefined,
                  memo: info.memo || undefined,
                });
              }}
              onCancel={() => setUploadDialogFile(null)}
              uploading={uploadMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {viewerPhoto && (
        <ImageViewer
          photo={viewerPhoto}
          floristId={floristId}
          onClose={() => setViewerPhoto(null)}
          onToggleVisibility={() => handleToggleVisibility(viewerPhoto)}
          onDelete={() => {
            if (confirm('정말 삭제하시겠습니까?')) deletePhotoMutation.mutate({ photoId: viewerPhoto.id, beforeSnapshot: viewerPhoto });
          }}
          onRotateSave={async (angle) => {
            await rotatePhotoMutation.mutateAsync({ photoId: viewerPhoto.id, angle });
          }}
          isRotating={rotatePhotoMutation.isPending}
          onTextRemoved={() => {
            setPhotoCacheBuster(Date.now());
            queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
          }}
        />
      )}

      <style jsx>{`
        .field-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #c8c3bc;
          background: #fffffe;
          font-size: 16px;
          color: #292524;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15);
        }
        .field-input::placeholder {
          color: #a8a29e;
        }
      `}</style>
    </div>
  );
}

function Section({ title, accent = 'bg-[#4CAF50]', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#C8E6C9] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#E8F5E9] border-b border-[#C8E6C9]">
        <span className={cn('w-1 h-5 rounded-full', accent)} />
        <h3 className="text-[15px] font-bold text-[#2E7D32]">{title}</h3>
      </div>
      <div className="px-4 py-3.5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-semibold text-stone-500 mb-1">{label}</label>
      {children}
    </div>
  );
}


function PhotoUploadForm({
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
  const previewUrl = URL.createObjectURL(file);

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
        <Image src={previewUrl} alt="미리보기" fill className="object-contain" unoptimized />
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


function PhotoEditForm({
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

/* --- Florist Edit Form --- */
function FloristEditForm({
  editForm,
  setEditForm,
  toggleCapability,
  onSave,
  onCancel,
  saving,
}: {
  editForm: Record<string, unknown>;
  setEditForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  toggleCapability: (code: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const setField = (field: string, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">기본 정보</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">화원명 *</Label>
              <Input value={(editForm.name as string) || ''} onChange={(e) => setField('name', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">전화번호</Label>
              <Input value={(editForm.phone as string) || ''} onChange={(e) => setField('phone', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">시/도</Label>
              <Input value={(editForm.sido as string) || ''} onChange={(e) => setField('sido', e.target.value)} className="h-9 bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">구/군</Label>
              <Input value={(editForm.gugun as string) || ''} onChange={(e) => setField('gugun', e.target.value)} className="h-9 bg-slate-50 border-slate-200" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-slate-600 text-xs">주소</Label>
              <Input value={(editForm.address as string) || ''} onChange={(e) => setField('address', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">등급</Label>
              <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 outline-none transition" value={(editForm.grade as string) || ''} onChange={(e) => setField('grade', e.target.value)}>
                <option value="">미지정</option>
                {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{GRADE_MAP[g]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">배정 우선순위</Label>
              <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 outline-none transition" value={(editForm.priority as string) || ''} onChange={(e) => setField('priority', e.target.value)}>
                <option value="">미지정</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-full space-y-1">
              <Label className="text-slate-600 text-xs">특이사항/메모</Label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[60px] resize-y focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 outline-none transition"
                value={(editForm.remarks as string) || ''}
                onChange={(e) => setField('remarks', e.target.value)}
                placeholder="특이사항이나 메모를 입력하세요"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">역량</h3>
          <div className="flex flex-wrap gap-1.5">
            {CAPABILITY_OPTIONS.map((cap) => {
              const selected = ((editForm.capabilities as string[]) || []).includes(cap.code);
              return (
                <button
                  key={cap.code}
                  onClick={() => toggleCapability(cap.code)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all',
                    selected
                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  )}
                >
                  {selected && (
                    <svg className="inline w-2.5 h-2.5 mr-0.5 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {cap.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="border-slate-200" onClick={onCancel}>취소</Button>
        <Button size="sm" className="bg-[#546E7A] hover:bg-[#455A64] shadow-sm" onClick={onSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
      </div>
    </div>
  );
}

/* --- Full-screen Image Viewer --- */


function ImageViewer({
  photo,
  floristId,
  onClose,
  onToggleVisibility,
  onDelete,
  onRotateSave,
  isRotating,
  onTextRemoved,
}: {
  photo: FloristPhoto;
  floristId: string;
  onClose: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onRotateSave?: (angle: number) => Promise<void> | void;
  isRotating?: boolean;
  onTextRemoved?: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(0);
  // 문구 삭제 모드
  const [brushMode, setBrushMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [isPainting, setIsPainting] = useState(false);
  const [inpaintLoading, setInpaintLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedMaskBlob, setSavedMaskBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const baseUrl = photoUrl(photo.fileUrl);
  const url = cacheBuster ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${cacheBuster}` : baseUrl;

  // 이미지 로드 시 canvas 크기 동기화
  useEffect(() => {
    if (brushMode && imgLoaded && canvasRef.current && imgRef.current) {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [brushMode, imgLoaded]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const paintAt = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // 원본 이미지 기준 브러시 크기 계산
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const r = brushSize * scale;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePaintStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!brushMode) return;
    e.preventDefault();
    setIsPainting(true);
    const { x, y } = getCanvasPos(e);
    paintAt(x, y);
  };

  const handlePaintMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || !brushMode) return;
    e.preventDefault();
    const { x, y } = getCanvasPos(e);
    paintAt(x, y);
  };

  const handlePaintEnd = () => {
    setIsPainting(false);
  };

  const handleClearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getMaskBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      // 마스크 생성: 칠한 영역을 흰색, 나머지는 검정
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      const imageData = ctx.getImageData(0, 0, w, h);
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const maskCtx = maskCanvas.getContext('2d')!;
      const maskData = maskCtx.createImageData(w, h);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // 빨간색(alpha > 0)이면 흰색, 아니면 검정
        const painted = imageData.data[i + 3] > 0;
        maskData.data[i] = painted ? 255 : 0;
        maskData.data[i + 1] = painted ? 255 : 0;
        maskData.data[i + 2] = painted ? 255 : 0;
        maskData.data[i + 3] = 255;
      }
      maskCtx.putImageData(maskData, 0, 0);
      maskCanvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleInpaintPreview = async () => {
    const maskBlob = await getMaskBlob();
    if (!maskBlob) { toast.error('마스크를 먼저 칠해주세요'); return; }
    setSavedMaskBlob(maskBlob);
    setInpaintLoading(true);
    try {
      const res = await removeFloristPhotoText(floristId, photo.id, maskBlob, 'preview');
      console.log('[inpaint preview]', res);
      if (res.ok && res.previewUrl) {
        const previewWithCache = `${photoUrl(res.previewUrl)}${res.previewUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setPreviewUrl(previewWithCache);
      } else {
        toast.error(res.message || '미리보기 생성 실패');
      }
    } catch (err) {
      console.error('[inpaint preview error]', err);
      toast.error(err instanceof Error ? err.message : '문구 제거 실패');
    } finally {
      setInpaintLoading(false);
    }
  };

  const handleInpaintApply = async () => {
    // 미리보기 모드에서는 canvas가 없으므로 저장된 마스크 사용
    const maskBlob = savedMaskBlob || await getMaskBlob();
    if (!maskBlob) {
      toast.error('마스크 데이터가 없습니다. 다시 칠해주세요.');
      return;
    }
    setInpaintLoading(true);
    try {
      const res = await removeFloristPhotoText(floristId, photo.id, maskBlob, 'apply');
      console.log('[inpaint apply]', res);
      if (res.ok) {
        toast.success('문구가 제거되었습니다');
        setPreviewUrl(null);
        setSavedMaskBlob(null);
        setBrushMode(false);
        setCacheBuster(Date.now());
        onTextRemoved?.();
      } else {
        toast.error(res.message || '적용 실패');
      }
    } catch (err) {
      console.error('[inpaint apply error]', err);
      toast.error(err instanceof Error ? err.message : '적용 실패');
    } finally {
      setInpaintLoading(false);
    }
  };

  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);

  const handleRotateSave = async () => {
    if (!onRotateSave || rotation === 0) return;
    const normalized = ((rotation % 360) + 360) % 360;
    if (normalized === 0) return;
    try {
      await onRotateSave(normalized);
      setRotation(0);
      setCacheBuster(Date.now());
    } catch {
      // error handled by parent mutation
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('이미지 URL이 클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = photo.fileUrl.split('/').pop() || 'image.jpg';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('이미지 다운로드를 시작합니다');
    } catch {
      toast.error('다운로드에 실패했습니다');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('이미지를 가져올 수 없습니다');
      const blob = await res.blob();
      const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/webp' ? '.webp' : '.jpg';
      const filename = (photo.memo || '상품사진') + ext;
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: photo.memo || '상품 사진',
        });
        toast.success('공유 완료');
      } else {
        await navigator.clipboard.writeText(window.location.origin + url);
        toast.info('이 브라우저에서는 파일 공유가 지원되지 않아 URL을 복사했습니다');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('공유에 실패했습니다');
      }
    } finally {
      setSharing(false);
    }
  };

  const categoryName = CATEGORIES.find((c) => c.code === photo.category)?.name;

  // 미리보기 모드
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 text-white text-sm font-medium px-4 py-2 rounded-xl">
          문구 제거 미리보기
        </div>
        <div className="absolute top-4 right-4 z-10">
          <ToolbarButton title="닫기" onClick={() => { setPreviewUrl(null); setSavedMaskBlob(null); }}>
            <CloseIcon />
          </ToolbarButton>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="미리보기" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          <button
            className="bg-white/10 backdrop-blur-md text-white px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/20 transition text-sm font-medium"
            onClick={() => { setPreviewUrl(null); setSavedMaskBlob(null); }}
          >
            다시 칠하기
          </button>
          <button
            className="bg-[#546E7A] text-white px-5 py-2.5 rounded-xl hover:bg-[#455A64] transition text-sm font-medium shadow-lg disabled:opacity-50"
            onClick={handleInpaintApply}
            disabled={inpaintLoading}
          >
            {inpaintLoading ? '적용 중...' : '원본에 적용'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={brushMode ? undefined : onClose}>
      {/* Top Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {!brushMode && (
          <>
            <ToolbarButton title="왼쪽 회전" onClick={handleRotateLeft}>
              <RotateLeftIcon />
            </ToolbarButton>
            <ToolbarButton title="오른쪽 회전" onClick={handleRotateRight}>
              <RotateRightIcon />
            </ToolbarButton>
            <ToolbarButton title="클립보드에 복사" onClick={handleCopy} disabled={copying}>
              {copying ? <span className="animate-spin text-sm">...</span> : <CopyIcon />}
            </ToolbarButton>
            <ToolbarButton title="이미지 다운로드" onClick={handleDownload}>
              <DownloadIcon />
            </ToolbarButton>
            <ToolbarButton title="카카오톡 공유" onClick={handleShare} disabled={sharing}>
              {sharing ? <span className="animate-spin text-sm">...</span> : <ShareIcon />}
            </ToolbarButton>
          </>
        )}
        <ToolbarButton title="닫기" onClick={brushMode ? () => { setBrushMode(false); handleClearMask(); } : onClose}>
          <CloseIcon />
        </ToolbarButton>
      </div>

      {/* Brush mode toolbar (top-left) */}
      {brushMode && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-amber-400 text-sm font-medium bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-400/30">
            리본 문구 영역을 칠하세요
          </span>
          <div className="flex gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
            {[{ size: 10, label: '소' }, { size: 20, label: '중' }, { size: 35, label: '대' }].map((b) => (
              <button
                key={b.size}
                onClick={() => setBrushSize(b.size)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  brushSize === b.size ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleClearMask}
            className="text-white/60 hover:text-white text-xs bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 transition"
          >
            초기화
          </button>
        </div>
      )}

      {/* Image + Canvas overlay */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative" style={{ transform: brushMode ? 'none' : `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt="전체 화면"
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
          />
          {brushMode && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ cursor: 'crosshair', touchAction: 'none' }}
              onMouseDown={handlePaintStart}
              onMouseMove={handlePaintMove}
              onMouseUp={handlePaintEnd}
              onMouseLeave={handlePaintEnd}
              onTouchStart={handlePaintStart}
              onTouchMove={handlePaintMove}
              onTouchEnd={handlePaintEnd}
            />
          )}
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10" onClick={(e) => e.stopPropagation()}>
        {brushMode ? (
          <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 flex items-center gap-3 border border-white/10">
            <button
              className="text-white/60 hover:text-white text-sm transition-colors"
              onClick={() => { setBrushMode(false); handleClearMask(); }}
            >
              취소
            </button>
            <button
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition disabled:opacity-50"
              onClick={handleInpaintPreview}
              disabled={inpaintLoading}
            >
              {inpaintLoading ? '처리 중...' : '문구 삭제 실행'}
            </button>
          </div>
        ) : (
          <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 flex flex-col items-center gap-2 min-w-[200px] border border-white/10">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {categoryName && (
                <span className="bg-[#546E7A] text-white text-xs px-2.5 py-0.5 rounded-md font-medium">{categoryName}</span>
              )}
              {photo.memo && <span className="text-white text-sm">{photo.memo}</span>}
              {photo.isHidden && (
                <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                  비공개
                </span>
              )}
            </div>
            {rotation !== 0 && <span className="text-white/60 text-[13px]">{rotation}°</span>}
            <div className="flex gap-4">
              {rotation !== 0 && onRotateSave && (
                <button
                  className="text-sky-400 hover:text-sky-300 text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={handleRotateSave}
                  disabled={isRotating}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {isRotating ? '저장 중...' : '회전 저장'}
                </button>
              )}
              <button className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors" onClick={onToggleVisibility}>
                {photo.isHidden ? '공개' : '비공개'}
              </button>
              <button className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors" onClick={onDelete}>
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EraserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l4 4" />
    </svg>
  );
}

function ToolbarButton({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function RotateLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
    </svg>
  );
}

function RotateRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}