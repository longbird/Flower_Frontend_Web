'use client';

import { useState, useCallback, useRef } from 'react';
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
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0">
        {isLoading || !florist ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
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
  const statusColor = florist.status === 'ACTIVE' ? 'bg-emerald-500' : florist.status === 'SUSPENDED' ? 'bg-orange-500' : 'bg-slate-400';

  return (
    <div className="flex flex-col max-h-[92vh]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">{florist.name}</h2>
          <span className={cn('w-2 h-2 rounded-full', statusColor)} />
          <span className="text-sm text-slate-500">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateDetail}
            className="text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1"
            title="상세 페이지로 이동"
          >
            사진관리 &rarr;
          </button>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* 본문: 왼쪽 폼 + 오른쪽 갤러리 */}
      <div className="flex flex-1 min-h-0">
        {/* 왼쪽: 수정 폼 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* 기본 정보 */}
          <Section title="기본 정보">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
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

          {/* 영업 정보 */}
          <Section title="영업 정보">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
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
              <Field label="특이사항" className="col-span-2">
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  rows={2} className="field-input resize-none" />
              </Field>
            </div>
          </Section>

          {/* 역량 */}
          <Section title="역량">
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((opt) => {
                const active = capabilities.includes(opt.code);
                return (
                  <button
                    key={opt.code}
                    onClick={() => toggleCap(opt.code)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      active
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200 hover:text-slate-600'
                    )}
                  >
                    {active && <svg className="inline w-3 h-3 mr-0.5 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 서비스 지역 */}
          <Section title="서비스 지역">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {florist.serviceAreas && florist.serviceAreas.length > 0 ? (
                florist.serviceAreas.map((area) => (
                  <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    {area}
                    <button className="text-teal-400 hover:text-red-500 transition-colors" onClick={() => { if (confirm(`"${area}" 삭제?`)) removeAreaMutation.mutate(area); }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">설정된 지역 없음</span>
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </Section>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-2 pt-2 pb-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 갤러리 미리보기 */}
        <div className="hidden md:flex flex-col w-[200px] border-l border-slate-100 bg-slate-50/30">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">갤러리 ({photos.length})</span>
            <button
              onClick={onNavigateDetail}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              전체보기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {photos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">사진 없음</p>
            ) : (
              photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all group"
                  onClick={onNavigateDetail}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={photoUrl(photo.fileUrl)}
                      alt={photo.memo || ''}
                      fill
                      className="object-cover"
                      sizes="180px"
                      unoptimized
                    />
                    <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1 py-px rounded">
                      {CATEGORIES[photo.category] || photo.category}
                    </span>
                    {photo.isHidden && (
                      <span className="absolute bottom-1 right-1 bg-orange-500/80 text-white text-[8px] px-1 py-px rounded">숨김</span>
                    )}
                    {photo.isRecommended && (
                      <span className="absolute top-1 right-1 bg-amber-500/90 text-white text-[8px] px-1 py-px rounded font-bold">추천</span>
                    )}
                  </div>
                  {photo.memo && (
                    <p className="text-[10px] text-slate-600 px-1.5 py-1 truncate">{photo.memo}</p>
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
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .field-input::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

/* ── 헬퍼 컴포넌트 ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-slate-600 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-blue-500" />
        {title}
      </h3>
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
