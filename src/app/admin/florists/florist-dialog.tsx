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
} from '@/lib/api/admin';
import { ServiceAreaSelector } from '@/components/admin/service-area-selector';
import type { FloristSummary, FloristPhoto } from '@/lib/types/florist';
import { addPhotoLog } from '@/lib/photo-log';
import { useAuthStore } from '@/lib/auth/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CAPABILITY_OPTIONS, GRADE_OPTIONS, CATEGORIES, PHOTO_GRADES, photoUrl, formatCurrency } from './florist-constants';
import { PhotoUploadForm, PhotoEditForm } from './florist-photo-forms';
import { ImageViewer } from './florist-image-viewer';

export default function FloristDetailDialog({
  floristId,
  open,
  onClose,
  initialEditPhotoId,
}: {
  floristId: string;
  open: boolean;
  onClose: () => void;
  initialEditPhotoId?: number;
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
  const photos = [...(photosRes?.data ?? [])].sort((a, b) => (b.isRepresentative ? 1 : 0) - (a.isRepresentative ? 1 : 0));

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent showCloseButton={false} className="w-[95vw] max-w-7xl h-[100dvh] md:h-[92vh] max-h-[100dvh] md:max-h-[92vh] md:rounded-lg rounded-none overflow-hidden p-0 gap-0 border-stone-300/60 shadow-2xl flex flex-col">
        {isLoading || !florist ? (
          <div className="flex items-center justify-center flex-1 bg-gray-100">
            <div className="w-7 h-7 border-[2.5px] border-[#D1E0C4] border-t-[#5B7A3D] rounded-full animate-spin" />
          </div>
        ) : (
          <FloristEditPanel
            florist={florist}
            photos={photos}
            floristId={floristId}
            queryClient={queryClient}
            onClose={onClose}
            initialEditPhotoId={initialEditPhotoId}
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
  initialEditPhotoId,
}: {
  florist: FloristSummary;
  photos: FloristPhoto[];
  floristId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
  initialEditPhotoId?: number;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'photos'>('info');
  const [selectedPhoto, setSelectedPhoto] = useState<FloristPhoto | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<FloristPhoto | null>(null);
  const [uploadDialogFile, setUploadDialogFile] = useState<File | null>(null);
  const [photoCacheBuster, setPhotoCacheBuster] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEditPhotoId && photos.length > 0) {
      const target = photos.find(p => p.id === initialEditPhotoId);
      if (target) {
        setActiveTab('photos');
        setSelectedPhoto(target);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditPhotoId, photos.length]);

  // 클립보드 이미지 붙여넣기 핸들러
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setUploadDialogFile(file);
            // 사진 관리 탭으로 자동 전환
            setActiveTab('photos');
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const [name, setName] = useState(florist.name || '');
  const [phone, setPhone] = useState(florist.phone || '');
  const [address, setAddress] = useState(florist.address || '');
  const [sido, setSido] = useState(florist.sido || '');
  const [gugun, setGugun] = useState(florist.gugun || '');
  const [remarks, setRemarks] = useState(florist.remarks || '');
  const [grade, setGrade] = useState(florist.grade ?? 0);
  const [priority, setPriority] = useState(florist.priority ?? 0);
  const [capabilities, setCapabilities] = useState<string[]>(florist.capabilities || []);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<string | null>(null);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<'selected' | 'viewer' | null>(null);

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
    mutationFn: ({ area, gugunId }: { area: string; gugunId: number }) =>
      addFloristServiceArea(floristId, area, gugunId || undefined),
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
    mutationFn: (args: { file: File; category: string; grade?: string; isRecommended?: boolean; costPrice?: number; sellingPrice?: number; memo?: string; description?: string; internalMemo?: string }) =>
      uploadFloristPhoto(floristId, args.file, {
        category: args.category,
        grade: args.grade,
        isRecommended: args.isRecommended,
        costPrice: args.costPrice,
        sellingPrice: args.sellingPrice,
        memo: args.memo,
        description: args.description,
        internalMemo: args.internalMemo,
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
      const isRepSet = Object.keys(data).length === 1 && 'isRepresentative' in data;
      addPhotoLog({
        action: isToggle ? 'TOGGLE_VISIBILITY' : 'UPDATE',
        floristId: floristId,
        floristName: florist?.name || floristId,
        photoId,
        before: beforeSnapshot ?? null,
        after: { ...beforeSnapshot, ...data } as Partial<FloristPhoto>,
        userName: useAuthStore.getState().user?.name || '-',
        note: isToggle ? `표시상태: ${data.isHidden ? '숨김' : '표시'}` : isRepSet ? '대표 사진 설정' : undefined,
      });
      toast.success(isRepSet ? '대표 사진으로 설정되었습니다.' : '사진 정보가 수정되었습니다.');
      queryClient.refetchQueries({ queryKey: ['floristPhotos', floristId] });
      queryClient.refetchQueries({ queryKey: ['floristThumb', floristId] });
      if (isRepSet) {
        setSelectedPhoto({ ...beforeSnapshot!, ...data } as FloristPhoto);
      } else {
        setSelectedPhoto(null);
      }
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

  const replacePhotoMutation = useMutation({
    mutationFn: async ({ oldPhoto, newFile }: { oldPhoto: FloristPhoto; newFile: File }) => {
      // 1. Upload new photo with basic metadata (FormData doesn't support integer prices)
      const uploadRes = await uploadFloristPhoto(floristId, newFile, {
        category: oldPhoto.category,
        grade: oldPhoto.grade || undefined,
        isRecommended: oldPhoto.isRecommended,
        memo: oldPhoto.memo || undefined,
        description: oldPhoto.description || undefined,
        internalMemo: oldPhoto.internalMemo || undefined,
      });
      const newPhoto = (uploadRes as { data?: FloristPhoto })?.data;
      // 2. If prices exist, update via PATCH (JSON body handles integers correctly)
      if (newPhoto && (oldPhoto.costPrice != null || oldPhoto.sellingPrice != null)) {
        await updateFloristPhoto(floristId, newPhoto.id, {
          ...(oldPhoto.costPrice != null ? { costPrice: Math.round(oldPhoto.costPrice) } : {}),
          ...(oldPhoto.sellingPrice != null ? { sellingPrice: Math.round(oldPhoto.sellingPrice) } : {}),
        });
      }
      // 3. Delete old photo
      await deleteFloristPhoto(floristId, oldPhoto.id);
      return { uploadRes, oldPhoto };
    },
    onSuccess: ({ uploadRes, oldPhoto }) => {
      const newPhoto = (uploadRes as { data?: FloristPhoto })?.data ?? null;
      // Log the replacement
      addPhotoLog({
        action: 'UPLOAD',
        floristId: floristId,
        floristName: florist?.name || floristId,
        photoId: newPhoto?.id ?? null,
        before: oldPhoto,
        after: newPhoto,
        userName: useAuthStore.getState().user?.name || '-',
        note: `사진 교체 (이전 ID: ${oldPhoto.id})`,
      });
      toast.success('사진이 교체되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', floristId] });
      setSelectedPhoto(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '사진 교체 실패'),
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
    <div className="flex flex-col h-full bg-gray-100">
      {/* 헤더 */}
      <div className="flex flex-col bg-[#5B7A3D] text-white flex-shrink-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-3.5 border-b border-[#4A6830]">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <span className="text-lg md:text-xl shrink-0">🌸</span>
            <h2 className="text-base md:text-xl font-bold tracking-tight truncate">{florist.name}</h2>
            <span className={cn('w-2 h-2 rounded-full ring-2 ring-[#4A6830] shrink-0', statusColor)} />
            <span className="text-xs md:text-sm text-white/70 shrink-0">{statusLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              title="사진 업로드"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="hidden sm:inline">업로드</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const items = await navigator.clipboard.read();
                  for (const item of items) {
                    const imageType = item.types.find(t => t.startsWith('image/'));
                    if (imageType) {
                      const blob = await item.getType(imageType);
                      const ext = imageType.split('/')[1] || 'png';
                      const file = new File([blob], `paste_${Date.now()}.${ext}`, { type: imageType });
                      setUploadDialogFile(file);
                      setActiveTab('photos');
                      return;
                    }
                  }
                  toast.info('클립보드에 이미지가 없습니다.');
                } catch {
                  toast.error('클립보드 접근 권한이 필요합니다.\nCtrl+V로 붙여넣기를 시도해주세요.');
                }
              }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              title="클립보드에서 이미지 붙여넣기 (Ctrl+V)"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span className="hidden sm:inline">붙여넣기</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#4A6830] text-white/70 hover:text-white transition-colors ml-1">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-100">
              <Section title="기본 정보" accent="bg-[#5B7A3D]">
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
                      <button type="button" onClick={() => toast.info('주소 검색 기능은 준비 중입니다')} className="px-3 py-2 bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                    </div>
                  </Field>
                  <Field label="주소" className="col-span-2">
                    <input value={address} onChange={(e) => setAddress(e.target.value)} className="field-input" />
                  </Field>
                </div>
              </Section>

              <Section title="특이사항" accent="bg-[#5B7A3D]">
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="화원 관련 특이사항을 입력하세요" className="field-input resize-none" />
              </Section>

              <Section title="서비스 지역" accent="bg-[#5B7A3D]">
                <div className="flex flex-wrap gap-2 mb-3">
                  {florist.serviceAreas && florist.serviceAreas.length > 0 ? (
                    florist.serviceAreas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#E8F0E0] text-[#5B7A3D] border border-[#D1E0C4]">
                        {area}
                        <button className="text-[#5B7A3D]/60 hover:text-red-600 transition-colors" onClick={() => setDeleteAreaTarget(area)}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-400 italic">설정된 지역 없음</span>
                  )}
                </div>
                <ServiceAreaSelector
                  onAdd={(params) => addAreaMutation.mutate(params)}
                  disabled={addAreaMutation.isPending}
                  existingAreas={florist.serviceAreas || []}
                />
              </Section>

              <Section title="역량" accent="bg-[#5B7A3D]">
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_OPTIONS.map((opt) => {
                    const active = capabilities.includes(opt.code);
                    return (
                      <button key={opt.label} onClick={() => {
                        setCapabilities((prev) =>
                          prev.includes(opt.code)
                            ? prev.filter((c) => c !== opt.code)
                            : [...prev, opt.code]
                        );
                      }} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all', active ? 'bg-[#E8F0E0] text-[#5B7A3D] border-[#5B7A3D]/30 shadow-sm' : 'bg-white text-stone-500 border-stone-200 hover:border-[#5B7A3D]/50 hover:text-[#5B7A3D]')}>
                        {active && <svg className="inline w-3.5 h-3.5 mr-0.5 -mt-px text-[#5B7A3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="영업 정보" accent="bg-[#5B7A3D]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <Field label="등급">
                    <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="field-input">
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="배정 우선순위">
                    <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="field-input">
                      {Array.from({ length: 11 }, (_, i) => (
                        <option key={i} value={i}>{i === 0 ? '없음' : `${i}`}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>
            </div>

            {/* 오른쪽: 갤러리 미리보기 */}
            <div className="hidden md:flex flex-col w-[280px] border-l border-gray-200 bg-[#FAFAFA]">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#5B7A3D] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  갤러리 ({photos.length})
                </span>
                <button onClick={() => setActiveTab('photos')} className="text-xs text-[#5B7A3D] hover:text-[#4A6830] font-medium transition-colors">전체보기</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {photos.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8 italic">사진 없음</p>
                ) : (
                  photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden border border-stone-200/80 cursor-pointer hover:ring-2 hover:ring-[#5B7A3D]/40 transition-all" onClick={() => setSelectedPhoto(photo)}>
                      <div className="relative aspect-square">
                        <Image src={photoUrl(photo.fileUrl)} alt={photo.memo || ''} fill className="object-cover" sizes="260px" unoptimized />
                        <span className="absolute top-1 left-1 bg-black/55 text-white/90 text-[11px] px-1.5 py-0.5 rounded">
                          {CATEGORIES.find(c => c.code === photo.category)?.name || photo.category}
                        </span>
                        {photo.isHidden && <span className="absolute bottom-1 right-1 bg-amber-700/80 text-white text-[10px] px-1.5 py-0.5 rounded">숨김</span>}
                        {photo.isRecommended && <span className="absolute top-1 right-1 bg-amber-600/85 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">추천</span>}
                        {photo.isRepresentative && <span className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500 z-10" />}
                      </div>
                      <div className="flex flex-col gap-0.5 px-2 py-1.5 bg-white border-t border-stone-100">
                        {photo.sellingPrice != null && <p className="text-[12px] text-[#5B7A3D] font-semibold truncate">판매 {photo.sellingPrice.toLocaleString()}원</p>}
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
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <button onClick={() => setCategoryFilter('ALL')} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border", categoryFilter === 'ALL' ? "bg-[#5B7A3D] text-white border-[#5B7A3D]" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200")}>
                전체
              </button>
              {CATEGORIES.map(c => (
                <button key={c.code} onClick={() => setCategoryFilter(c.code as string)} className={cn("px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border", categoryFilter === c.code ? "bg-[#5B7A3D] text-white border-[#5B7A3D]" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200")}>
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
                    {photo.isRepresentative && <span className="absolute top-0 bottom-0 left-0 w-1.5 bg-amber-500 z-10 rounded-l" />}
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

      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <button onClick={() => toast.error('화원 삭제 기능은 준비 중입니다')} className="hidden md:flex px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors items-center gap-1.5 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          화원 삭제
        </button>
        <div className="flex items-center gap-3 ml-auto">
          <button onClick={onClose} className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-sm md:text-[15px] font-medium text-stone-500 hover:bg-stone-100 transition-colors">닫기</button>
          <button onClick={handleSave} disabled={updateMutation.isPending} className="px-5 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-[15px] font-medium bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 사진 정보 수정 다이얼로그 — 탭 독립 */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-stone-800">사진 정보 수정</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <PhotoEditForm
              photo={selectedPhoto}
              floristInfo={florist ? { name: florist.name, phone: florist.phone, address: florist.address } : undefined}
              onSave={(data) => updatePhotoMutation.mutate({ photoId: selectedPhoto.id, data, beforeSnapshot: selectedPhoto })}
              onDelete={() => setDeletePhotoConfirm('selected')}
              onViewFull={() => { const p = selectedPhoto; setSelectedPhoto(null); setTimeout(() => setViewerPhoto(p), 100); }}
              onCancel={() => setSelectedPhoto(null)}
              saving={updatePhotoMutation.isPending}
              onReplace={(file) => replacePhotoMutation.mutate({ oldPhoto: selectedPhoto, newFile: file })}
              replacing={replacePhotoMutation.isPending}
              onSetRepresentative={() => updatePhotoMutation.mutate({ photoId: selectedPhoto.id, data: { isRepresentative: true }, beforeSnapshot: selectedPhoto })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadDialogFile} onOpenChange={() => setUploadDialogFile(null)}>
        <DialogContent className="max-w-4xl border-stone-200">
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
                  description: info.description || undefined,
                  internalMemo: info.internalMemo || undefined,
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
          onDelete={() => setDeletePhotoConfirm('viewer')}
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

      <AlertDialog open={!!deleteAreaTarget} onOpenChange={(open) => { if (!open) setDeleteAreaTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>서비스 지역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteAreaTarget}&rdquo; 지역을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteAreaTarget) removeAreaMutation.mutate(deleteAreaTarget);
                setDeleteAreaTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePhotoConfirm} onOpenChange={(open) => { if (!open) setDeletePhotoConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사진 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 사진을 정말 삭제하시겠습니까? 삭제된 사진은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deletePhotoConfirm === 'selected' && selectedPhoto) {
                  deletePhotoMutation.mutate({ photoId: selectedPhoto.id, beforeSnapshot: selectedPhoto });
                } else if (deletePhotoConfirm === 'viewer' && viewerPhoto) {
                  deletePhotoMutation.mutate({ photoId: viewerPhoto.id, beforeSnapshot: viewerPhoto });
                }
                setDeletePhotoConfirm(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          border-color: #5B7A3D;
          box-shadow: 0 0 0 2px rgba(91, 122, 61, 0.15);
        }
        .field-input::placeholder {
          color: #a8a29e;
        }
      `}</style>
    </div>
  );
}

function Section({ title, accent = 'bg-[#5B7A3D]', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#D1E0C4] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#E8F0E0] border-b border-[#D1E0C4]">
        <span className={cn('w-1 h-5 rounded-full', accent)} />
        <h3 className="text-[15px] font-bold text-[#5B7A3D]">{title}</h3>
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
