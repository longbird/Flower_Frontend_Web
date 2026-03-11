'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  getFlorist,
  updateFlorist,
  getFloristPhotos,
  addFloristServiceArea,
  removeFloristServiceArea,
} from '@/lib/api/admin';
import type { FloristSummary } from '@/lib/types/florist';
import type { FloristPhoto } from '@/lib/types/florist';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/* ── 상수 ── */
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

const GRADE_OPTIONS = [
  { value: 0, label: '없음' },
  { value: 1, label: '브론즈' },
  { value: 2, label: '실버' },
  { value: 3, label: '골드' },
  { value: 4, label: '플래티넘' },
  { value: 5, label: '다이아' },
];

const CATEGORIES: Record<string, string> = {
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
};

function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

/* ── 메인 컴포넌트 ── */
export default function FloristDetailDialog({
  floristId,
  open,
  onClose,
  onNavigateDetail,
}: {
  floristId: string;
  open: boolean;
  onClose: () => void;
  onNavigateDetail: () => void;
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
      <DialogContent className="w-[95vw] max-w-7xl max-h-[92vh] overflow-hidden p-0 gap-0 border-stone-300/60 shadow-2xl">
        {isLoading || !florist ? (
          <div className="flex items-center justify-center py-20 bg-stone-50">
            <div className="w-7 h-7 border-[2.5px] border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          </div>
        ) : (
          <FloristEditPanel
            florist={florist}
            photos={photos}
            floristId={floristId}
            queryClient={queryClient}
            onClose={onClose}
            onNavigateDetail={onNavigateDetail}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── 수정 패널 ── */
function FloristEditPanel({
  florist,
  photos,
  floristId,
  queryClient,
  onClose,
  onNavigateDetail,
}: {
  florist: FloristSummary;
  photos: FloristPhoto[];
  floristId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
  onNavigateDetail: () => void;
}) {
  // 폼 state
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

  const statusLabel = florist.status === 'ACTIVE' ? '활성' : florist.status === 'SUSPENDED' ? '중지' : '비활성';
  const statusColor = florist.status === 'ACTIVE' ? 'bg-emerald-600' : florist.status === 'SUSPENDED' ? 'bg-amber-600' : 'bg-stone-400';

  return (
    <div className="flex flex-col max-h-[92vh]">
      {/* ── 헤더: 다크 ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-stone-800 text-stone-100">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">{florist.name}</h2>
          <span className={cn('w-2 h-2 rounded-full ring-2 ring-stone-600', statusColor)} />
          <span className="text-sm text-stone-400">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateDetail}
            className="text-sm text-stone-400 hover:text-white transition-colors px-2.5 py-1 rounded hover:bg-stone-700"
          >
            사진관리 &rarr;
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* ── 본문: 왼쪽 폼 + 오른쪽 갤러리 ── */}
      <div className="flex flex-1 min-h-0">

        {/* 왼쪽: 수정 폼 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-stone-50">

          {/* 1. 기본 정보 */}
          <Section title="기본 정보" accent="bg-stone-500">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <Field label="화원명" className="col-span-2 sm:col-span-1">
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="field-input" />
              </Field>
              <Field label="전화번호">
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="field-input" />
              </Field>
              <Field label="시/도">
                <input value={sido} onChange={(e) => setSido(e.target.value)}
                  className="field-input" />
              </Field>
              <Field label="구/군">
                <input value={gugun} onChange={(e) => setGugun(e.target.value)}
                  className="field-input" />
              </Field>
              <Field label="주소" className="col-span-2">
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  className="field-input" />
              </Field>
            </div>
          </Section>

          {/* 2. 특이사항 */}
          <Section title="특이사항" accent="bg-amber-700">
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
              rows={3} placeholder="화원 관련 특이사항을 입력하세요"
              className="field-input resize-none" />
          </Section>

          {/* 3. 서비스 지역 */}
          <Section title="서비스 지역" accent="bg-teal-700">
            <div className="flex flex-wrap gap-2 mb-3">
              {florist.serviceAreas && florist.serviceAreas.length > 0 ? (
                florist.serviceAreas.map((area) => (
                  <span key={area} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-800/10 text-teal-800 border border-teal-700/20">
                    {area}
                    <button className="text-teal-600/50 hover:text-red-600 transition-colors" onClick={() => { if (confirm(`"${area}" 삭제?`)) removeAreaMutation.mutate(area); }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-sm text-stone-400 italic">설정된 지역 없음</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="지역명 입력"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                className="field-input flex-1"
              />
              <button
                onClick={handleAddArea}
                disabled={addAreaMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </Section>

          {/* 4. 역량 */}
          <Section title="역량" accent="bg-indigo-700">
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((opt) => {
                const active = capabilities.includes(opt.code);
                return (
                  <button
                    key={opt.code}
                    onClick={() => toggleCap(opt.code)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      active
                        ? 'bg-indigo-800/10 text-indigo-800 border-indigo-700/25 shadow-sm'
                        : 'bg-white text-stone-400 border-stone-200 hover:border-stone-300 hover:text-stone-500'
                    )}
                  >
                    {active && <svg className="inline w-3.5 h-3.5 mr-0.5 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 5. 영업 정보 */}
          <Section title="영업 정보" accent="bg-stone-500">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <Field label="등급">
                <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}
                  className="field-input">
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="배정 우선순위">
                <input type="number" min={0} max={99} value={priority || ''}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                  className="field-input" />
              </Field>
            </div>
          </Section>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3 pt-3 pb-1">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-base font-medium text-stone-500 hover:bg-stone-200/60 transition-colors">
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 rounded-lg text-base font-medium bg-stone-700 text-white hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* ── 오른쪽: 갤러리 미리보기 ── */}
        <div className="hidden md:flex flex-col w-[280px] border-l border-stone-200 bg-stone-100/60">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-500">갤러리 ({photos.length})</span>
            <button
              onClick={onNavigateDetail}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium transition-colors"
            >
              전체보기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {photos.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8 italic">사진 없음</p>
            ) : (
              photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-lg overflow-hidden border border-stone-200/80 cursor-pointer hover:ring-2 hover:ring-stone-400/40 transition-all"
                  onClick={onNavigateDetail}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photoUrl(photo.fileUrl)}
                      alt={photo.memo || ''}
                      fill
                      className="object-cover"
                      sizes="260px"
                      unoptimized
                    />
                    <span className="absolute top-1 left-1 bg-black/55 text-white/90 text-[11px] px-1.5 py-0.5 rounded">
                      {CATEGORIES[photo.category] || photo.category}
                    </span>
                    {photo.isHidden && (
                      <span className="absolute bottom-1 right-1 bg-amber-700/80 text-white text-[10px] px-1.5 py-0.5 rounded">숨김</span>
                    )}
                    {photo.isRecommended && (
                      <span className="absolute top-1 right-1 bg-amber-600/85 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">추천</span>
                    )}
                  </div>
                  {photo.memo && (
                    <p className="text-xs text-stone-500 px-2 py-1 truncate bg-stone-50">{photo.memo}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
          border-color: #78716c;
          box-shadow: 0 0 0 2px rgba(120, 113, 108, 0.12);
        }
        .field-input::placeholder {
          color: #a8a29e;
        }
      `}</style>
    </div>
  );
}

/* ── 헬퍼 컴포넌트 ── */
function Section({ title, accent = 'bg-stone-500', children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-100/50 border-b border-stone-200/60">
        <span className={cn('w-1 h-5 rounded-full', accent)} />
        <h3 className="text-[15px] font-bold text-stone-700">{title}</h3>
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
