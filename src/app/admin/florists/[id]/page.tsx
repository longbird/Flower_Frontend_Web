'use client';

import { use, useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  getFlorist,
  updateFlorist,
  getFloristPhotos,
  uploadFloristPhoto,
  updateFloristPhoto,
  deleteFloristPhoto,
  addFloristServiceArea,
  removeFloristServiceArea,
} from '@/lib/api/admin';
import type { FloristPhoto, FloristSummary, PhotoCategory, PhotoGrade } from '@/lib/types/florist';
import { addPhotoLog } from '@/lib/photo-log';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CATEGORIES: { code: PhotoCategory; name: string }[] = [
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

const CAPABILITY_OPTIONS = [
  { code: 'CELEBRATION', label: '축하' },
  { code: 'CONDOLENCE', label: '근조' },
  { code: 'BASKET', label: '바구니' },
  { code: 'LARGE', label: '대형' },
  { code: 'MULTI_TIER', label: '다단' },
  { code: 'ROUND', label: '원형' },
  { code: 'BLACK_RIBBON', label: '검정리본' },
  { code: 'OBJET', label: '오브제' },
  { code: 'ORIENTAL_ORCHID', label: '동양란' },
  { code: 'WESTERN_ORCHID', label: '서양란' },
  { code: 'FLOWER', label: '꽃' },
  { code: 'FOLIAGE', label: '관엽' },
  { code: 'BONSAI', label: '분재' },
  { code: 'FRUITS', label: '과일' },
  { code: 'HOLIDAY', label: '휴일가능' },
  { code: 'NIGHT', label: '야간가능' },
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

export default function FloristDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<FloristPhoto | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<FloristPhoto | null>(null);
  const [uploadDialogFile, setUploadDialogFile] = useState<File | null>(null);
  const [newServiceArea, setNewServiceArea] = useState('');

  const { data: floristRes, isLoading } = useQuery({
    queryKey: ['florist', id],
    queryFn: () => getFlorist(id),
    enabled: !!id,
  });
  const florist = floristRes?.data;

  const { data: photosRes } = useQuery({
    queryKey: ['floristPhotos', id],
    queryFn: () => getFloristPhotos(id, { includeHidden: true }),
    enabled: !!id,
  });
  const photos = photosRes?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateFlorist(id, data),
    onSuccess: () => {
      toast.success('화원 정보가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['florist', id] });
      setEditing(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const addAreaMutation = useMutation({
    mutationFn: ({ area, sido }: { area: string; sido?: string }) =>
      addFloristServiceArea(id, area, sido),
    onSuccess: () => {
      toast.success('서비스 지역이 추가되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['florist', id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '추가 실패'),
  });

  const removeAreaMutation = useMutation({
    mutationFn: (area: string) => removeFloristServiceArea(id, area),
    onSuccess: () => {
      toast.success('서비스 지역이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['florist', id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  const uploadMutation = useMutation({
    mutationFn: (args: { file: File; category: string; grade?: string; isRecommended?: boolean; costPrice?: number; sellingPrice?: number; memo?: string }) =>
      uploadFloristPhoto(id, args.file, {
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
        floristId: id,
        floristName: florist?.name || id,
        photoId: uploaded?.id ?? null,
        before: null,
        after: uploaded,
        userName: useAuthStore.getState().user?.name || '-',
        note: `카테고리: ${uploaded?.category || '?'}`,
      });
      toast.success('사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', id] });
      setUploadDialogFile(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '업로드 실패'),
  });

  const updatePhotoMutation = useMutation({
    mutationFn: ({ photoId, data, beforeSnapshot }: { photoId: number; data: Record<string, unknown>; beforeSnapshot?: FloristPhoto | null }) => {
      // beforeSnapshot은 로그 기록용 - 실제 API에는 전달하지 않음
      return updateFloristPhoto(id, photoId, data).then((res) => ({ res, beforeSnapshot, photoId, data }));
    },
    onSuccess: ({ beforeSnapshot, photoId, data }) => {
      const isToggle = Object.keys(data).length === 1 && 'isHidden' in data;
      addPhotoLog({
        action: isToggle ? 'TOGGLE_VISIBILITY' : 'UPDATE',
        floristId: id,
        floristName: florist?.name || id,
        photoId,
        before: beforeSnapshot ?? null,
        after: { ...beforeSnapshot, ...data } as Partial<FloristPhoto>,
        userName: useAuthStore.getState().user?.name || '-',
        note: isToggle ? `표시상태: ${data.isHidden ? '숨김' : '표시'}` : undefined,
      });
      toast.success('사진 정보가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', id] });
      setSelectedPhoto(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: ({ photoId, beforeSnapshot }: { photoId: number; beforeSnapshot?: FloristPhoto | null }) =>
      deleteFloristPhoto(id, photoId).then(() => ({ photoId, beforeSnapshot })),
    onSuccess: ({ photoId, beforeSnapshot }) => {
      addPhotoLog({
        action: 'DELETE',
        floristId: id,
        floristName: florist?.name || id,
        photoId,
        before: beforeSnapshot ?? null,
        after: null,
        userName: useAuthStore.getState().user?.name || '-',
        note: beforeSnapshot ? `카테고리: ${beforeSnapshot.category}, URL: ${beforeSnapshot.fileUrl}` : undefined,
      });
      toast.success('사진이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['floristPhotos', id] });
      setSelectedPhoto(null);
      setViewerPhoto(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  const startEditing = (f: FloristSummary) => {
    setEditForm({
      name: f.name || '',
      phone: f.phone || '',
      address: f.address || '',
      sido: f.sido || '',
      gugun: f.gugun || '',
      remarks: f.remarks || '',
      grade: f.grade ?? '',
      priority: f.priority ?? '',
      capabilities: f.capabilities ? [...f.capabilities] : [],
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const form = editForm;
    const body: Record<string, unknown> = {
      name: (form.name as string).trim(),
      phone: (form.phone as string).trim() || null,
      address: (form.address as string) || '',
      sido: (form.sido as string) || '',
      gugun: (form.gugun as string) || '',
      remarks: (form.remarks as string).trim() || null,
      capabilities: form.capabilities as string[],
    };
    if (form.grade !== '' && form.grade !== undefined) body.grade = Number(form.grade);
    if (form.priority !== '' && form.priority !== undefined) body.priority = Number(form.priority);
    else body.priority = 0;
    updateMutation.mutate(body);
  };

  const toggleCapability = (code: string) => {
    const caps = (editForm.capabilities as string[]) || [];
    const updated = caps.includes(code) ? caps.filter((c) => c !== code) : [...caps, code];
    setEditForm((prev) => ({ ...prev, capabilities: updated }));
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

  const handleAddServiceArea = () => {
    const area = newServiceArea.trim();
    if (!area) return;
    addAreaMutation.mutate({ area });
    setNewServiceArea('');
  };

  const handleToggleVisibility = useCallback((photo: FloristPhoto) => {
    updatePhotoMutation.mutate({
      photoId: photo.id,
      data: { isHidden: !photo.isHidden },
      beforeSnapshot: photo,
    });
  }, [updatePhotoMutation]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="inline-block w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-2" />
        <p className="text-sm">로딩 중...</p>
      </div>
    );
  }

  if (!florist) {
    return <div className="text-center py-12 text-red-500">화원을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => router.back()}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              목록
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-lg font-bold text-slate-900">{florist.name}</h1>
            <Badge
              variant={florist.status === 'ACTIVE' ? 'default' : 'secondary'}
              className={cn('text-[11px]', florist.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : '')}
            >
              {florist.status === 'ACTIVE' ? '활성' : florist.status === 'SUSPENDED' ? '중지' : '비활성'}
            </Badge>
            {florist.grade != null && florist.grade > 0 && (
              <Badge variant="outline" className="text-[11px] border-amber-300 bg-amber-50 text-amber-700">
                {GRADE_MAP[florist.grade] || `등급${florist.grade}`}
              </Badge>
            )}
            {florist.priority != null && florist.priority > 0 && (
              <Badge variant="outline" className="text-[11px] border-blue-300 bg-blue-50 text-blue-700">
                우선순위 {florist.priority}
              </Badge>
            )}
          </div>
          {!editing && (
            <Button
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              onClick={() => startEditing(florist)}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="bg-slate-100 rounded-lg p-0.5 h-9">
          <TabsTrigger value="info" className="rounded-md text-xs h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">기본 정보</TabsTrigger>
          <TabsTrigger value="photos" className="rounded-md text-xs h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">사진 관리 ({photos.length})</TabsTrigger>
        </TabsList>

        {/* === Info Tab === */}
        <TabsContent value="info">
          {editing ? (
            <FloristEditForm
              editForm={editForm}
              setEditForm={setEditForm}
              toggleCapability={toggleCapability}
              onSave={handleSaveEdit}
              onCancel={() => setEditing(false)}
              saving={updateMutation.isPending}
            />
          ) : (
            <div className="space-y-4">
              {/* 기본 정보 + 영업 정보 통합 */}
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 text-sm">
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">화원명</dt>
                      <dd className="font-semibold text-slate-900">{florist.name}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">전화번호</dt>
                      <dd className="text-slate-700">{florist.phone || '-'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">지역</dt>
                      <dd className="text-emerald-700 font-medium">{florist.sido} {florist.gugun}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">등급</dt>
                      <dd>{florist.grade ? <span className="font-semibold text-slate-900">{GRADE_MAP[florist.grade] || florist.grade}</span> : <span className="text-slate-400">-</span>}</dd>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">주소</dt>
                      <dd className="text-slate-700 text-sm">{florist.address || '-'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-xs font-semibold text-slate-500">배정 우선순위</dt>
                      <dd>{florist.priority ? <span className="font-semibold text-slate-900">{florist.priority}</span> : <span className="text-slate-400">-</span>}</dd>
                    </div>
                  </div>
                  {florist.remarks && (
                    <div className="mt-4 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                      <span className="text-xs font-semibold text-amber-600">특이사항</span>
                      <p className="mt-0.5">{florist.remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 역량 + 서비스 지역 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 역량 */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">역량</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {CAPABILITY_OPTIONS.map((opt) => {
                        const isSelected = florist.capabilities?.includes(opt.code);
                        return (
                          <span
                            key={opt.code}
                            className={cn(
                              'px-2 py-1 rounded-md text-[11px] font-medium border',
                              isSelected
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-300 border-transparent'
                            )}
                          >
                            {isSelected && (
                              <svg className="inline w-2.5 h-2.5 mr-0.5 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            )}
                            {opt.label}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 서비스 지역 */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">서비스 지역</h3>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="지역명"
                          value={newServiceArea}
                          onChange={(e) => setNewServiceArea(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddServiceArea()}
                          className="h-7 w-24 text-xs border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300" onClick={handleAddServiceArea} disabled={addAreaMutation.isPending}>+</Button>
                      </div>
                    </div>
                    {florist.serviceAreas && florist.serviceAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {florist.serviceAreas.map((area) => (
                          <span key={area} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {area}
                            <button className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors" onClick={() => { if (confirm(`"${area}" 서비스 지역을 삭제하시겠습니까?`)) removeAreaMutation.mutate(area); }}>
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">설정된 서비스 지역 없음</span>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 갤러리 미리보기 (하단) */}
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">갤러리 ({photos.length})</h3>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {photos.slice(0, 12).map((photo) => (
                        <div key={photo.id} className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition" onClick={() => setViewerPhoto(photo)}>
                          <div className="relative aspect-square">
                            <Image src={photoUrl(photo.fileUrl)} alt={photo.memo || ''} fill className="object-cover" sizes="160px" unoptimized />
                            {/* 카테고리 (좌상단) */}
                            <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[9px] font-medium px-1 py-px rounded">
                              {CATEGORIES.find((c) => c.code === photo.category)?.name || photo.category}
                            </span>
                            {/* 추천 (우상단) */}
                            {photo.isRecommended && (
                              <span className="absolute top-0.5 right-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-bold px-1 py-px rounded shadow">추천</span>
                            )}
                            {/* 등급 (좌하단) */}
                            {photo.grade && (
                              <span className={cn('absolute bottom-0.5 left-0.5 text-white text-[9px] font-bold px-1 py-px rounded', PHOTO_GRADES.find((g) => g.code === photo.grade)?.color || 'bg-slate-500')}>
                                {PHOTO_GRADES.find((g) => g.code === photo.grade)?.name}
                              </span>
                            )}
                            {/* 숨김 (우하단) */}
                            {photo.isHidden && (
                              <span className="absolute bottom-0.5 right-0.5 bg-orange-500/80 text-white text-[9px] px-1 py-px rounded">숨김</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-4">
                      <svg className="w-6 h-6 mx-auto mb-1 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      사진 없음
                    </div>
                  )}
                  {photos.length > 12 && (
                    <div className="text-center text-[11px] text-slate-400 mt-1">+{photos.length - 12}장 더보기</div>
                  )}
                </CardContent>
              </Card>

              {/* Admin 전용: ID + 출처 정보 */}
              {isSuperAdmin && (
                <div className="border border-dashed border-slate-300 rounded-lg px-4 py-3 bg-slate-50/50">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">관리자 정보</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 font-mono">
                    <span>ID: {florist.id}</span>
                    <span>출처: {florist.source || '-'}</span>
                    {(florist as any).profileUrl && (
                      <a href={(florist as any).profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        크롤링 원본: {(florist as any).profileUrl}
                      </a>
                    )}
                    {(florist as any).rateMemo && <span>수수료: {(florist as any).rateMemo}</span>}
                    {(florist as any).basePrice != null && <span>기본가: {(florist as any).basePrice.toLocaleString()}원</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* === Photos Tab === */}
        <TabsContent value="photos">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 border-b border-slate-100">
              <div>
                <CardTitle className="text-base text-slate-700">사진 갤러리</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{photos.length}장</p>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {uploadMutation.isPending ? '업로드 중...' : '사진 업로드'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="ALL">
                <TabsList className="flex-wrap bg-slate-100 rounded-lg p-0.5">
                  <TabsTrigger value="ALL" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">전체</TabsTrigger>
                  {CATEGORIES.map((c) => (
                    <TabsTrigger key={c.code} value={c.code} className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">{c.name}</TabsTrigger>
                  ))}
                </TabsList>
                {['ALL', ...CATEGORIES.map((c) => c.code)].map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos
                        .filter((p) => tab === 'ALL' || p.category === tab)
                        .map((photo) => (
                          <div
                            key={photo.id}
                            className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            {/* 이미지 영역 (3:4 비율) */}
                            <div className="relative aspect-[3/4] overflow-hidden">
                              <Image src={photoUrl(photo.fileUrl)} alt={photo.memo || '화원 사진'} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" unoptimized />
                              {/* 카테고리 배지 (좌상단) */}
                              <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                {CATEGORIES.find((c) => c.code === photo.category)?.name}
                              </span>
                              {/* 추천 배지 (상단 중앙) */}
                              {photo.isRecommended && (
                                <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm shadow-red-500/40">♥ 추천</span>
                              )}
                              {/* 등급 배지 (우상단) */}
                              {photo.grade && (
                                <span className={cn('absolute top-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded', PHOTO_GRADES.find((g) => g.code === photo.grade)?.color || 'bg-slate-500', photo.isHidden ? 'right-6' : 'right-1')}>
                                  {PHOTO_GRADES.find((g) => g.code === photo.grade)?.name}
                                </span>
                              )}
                              {/* 숨김 아이콘 (우상단) */}
                              {photo.isHidden && (
                                <svg className="absolute top-1 right-1 w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" /></svg>
                              )}
                              {/* 수정 아이콘 (우하단) */}
                              <span className="absolute bottom-1 right-1 bg-black/50 text-white rounded p-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </span>
                            </div>
                            {/* 하단 가격/메모 정보 */}
                            <div className="px-2 py-1.5 bg-slate-50 text-[11px] space-y-0.5">
                              {photo.costPrice != null && (
                                <p className="text-slate-500 truncate">원가 {photo.costPrice.toLocaleString()}원</p>
                              )}
                              {photo.sellingPrice != null && (
                                <p className="text-green-700 font-semibold truncate">판매 {photo.sellingPrice.toLocaleString()}원</p>
                              )}
                              {photo.memo && (
                                <p className="text-blue-600 truncate">{photo.memo}</p>
                              )}
                              {!photo.costPrice && !photo.sellingPrice && !photo.memo && (
                                <p className="text-slate-400/50">가격 미등록</p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    {photos.filter((p) => tab === 'ALL' || p.category === tab).length === 0 && (
                      <div className="text-center py-12 text-slate-300">
                        <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm text-slate-400">사진이 없습니다.</p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={!!uploadDialogFile} onOpenChange={() => setUploadDialogFile(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800">사진 정보 입력</DialogTitle>
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

      {/* Photo Edit Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">사진 정보 수정</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <PhotoEditForm
              photo={selectedPhoto}
              onSave={(data) => updatePhotoMutation.mutate({ photoId: selectedPhoto.id, data, beforeSnapshot: selectedPhoto })}
              onDelete={() => {
                if (confirm('정말 삭제하시겠습니까?')) deletePhotoMutation.mutate({ photoId: selectedPhoto.id, beforeSnapshot: selectedPhoto });
              }}
              onToggleVisibility={() => handleToggleVisibility(selectedPhoto)}
              onViewFull={() => { setViewerPhoto(selectedPhoto); setSelectedPhoto(null); }}
              onCancel={() => setSelectedPhoto(null)}
              saving={updatePhotoMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen Image Viewer */}
      {viewerPhoto && (
        <ImageViewer
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onToggleVisibility={() => handleToggleVisibility(viewerPhoto)}
          onDelete={() => {
            if (confirm('정말 삭제하시겠습니까?')) deletePhotoMutation.mutate({ photoId: viewerPhoto.id, beforeSnapshot: viewerPhoto });
          }}
        />
      )}
    </div>
  );
}

/* --- Upload Form --- */
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
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
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
        <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
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
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
          className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
  onToggleVisibility,
  onViewFull,
  onCancel,
  saving,
}: {
  photo: FloristPhoto;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
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
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
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
        <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 장미 꽃다발 50송이" maxLength={200} className="border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
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
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              className="pr-8 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" className="border-slate-200" onClick={onCancel}>취소</Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200"
            onClick={onToggleVisibility}
          >
            {photo.isHidden ? (
              <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>공개</>
            ) : (
              <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>숨김</>
            )}
          </Button>
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
                ...(costPrice ? { costPrice: parseCurrency(costPrice) } : { costPrice: null }),
                ...(sellingPrice ? { sellingPrice: parseCurrency(sellingPrice) } : { sellingPrice: null }),
                ...(memo ? { memo } : { memo: null }),
              })
            }
            disabled={!category || saving}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
              <Input value={(editForm.name as string) || ''} onChange={(e) => setField('name', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">전화번호</Label>
              <Input value={(editForm.phone as string) || ''} onChange={(e) => setField('phone', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
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
              <Input value={(editForm.address as string) || ''} onChange={(e) => setField('address', e.target.value)} className="h-9 border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">등급</Label>
              <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition" value={(editForm.grade as string) || ''} onChange={(e) => setField('grade', e.target.value)}>
                <option value="">미지정</option>
                {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{GRADE_MAP[g]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-600 text-xs">배정 우선순위</Label>
              <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition" value={(editForm.priority as string) || ''} onChange={(e) => setField('priority', e.target.value)}>
                <option value="">미지정</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-full space-y-1">
              <Label className="text-slate-600 text-xs">특이사항/메모</Label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[60px] resize-y focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
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
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
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
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={onSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
      </div>
    </div>
  );
}

/* --- Full-screen Image Viewer --- */
function ImageViewer({
  photo,
  onClose,
  onToggleVisibility,
  onDelete,
}: {
  photo: FloristPhoto;
  onClose: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [copying, setCopying] = useState(false);
  const url = photoUrl(photo.fileUrl);

  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);

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

  const categoryName = CATEGORIES.find((c) => c.code === photo.category)?.name;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      {/* Top Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        <ToolbarButton title="닫기" onClick={onClose}>
          <CloseIcon />
        </ToolbarButton>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
        <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }} className="max-w-full max-h-full">
          <Image src={url} alt="전체 화면" width={1200} height={900} className="max-w-[90vw] max-h-[85vh] object-contain" unoptimized />
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 flex flex-col items-center gap-2 min-w-[200px] border border-white/10">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {categoryName && (
              <span className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-md font-medium">{categoryName}</span>
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
            <button className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors" onClick={onToggleVisibility}>
              {photo.isHidden ? '공개' : '비공개'}
            </button>
            <button className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors" onClick={onDelete}>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
