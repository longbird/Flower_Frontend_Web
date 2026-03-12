'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createFlorist } from '@/lib/api/admin';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CAPABILITY_OPTIONS } from './florist-constants';

export default function FloristCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (floristId: string) => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sido, setSido] = useState('');
  const [gugun, setGugun] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createFlorist(data),
    onSuccess: (res) => {
      const created = (res as { data?: { id?: string } })?.data;
      toast.success('화원이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['florists'] });
      handleReset();
      onClose();
      if (created?.id) {
        onCreated?.(String(created.id));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '등록 실패'),
  });

  const handleReset = () => {
    setName('');
    setPhone('');
    setSido('');
    setGugun('');
    setAddress('');
    setRemarks('');
    setCapabilities([]);
    setServiceAreas([]);
    setNewArea('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('화원명을 입력해주세요.');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || '',
      sido: sido.trim() || '',
      gugun: gugun.trim() || '',
      remarks: remarks.trim() || null,
      serviceAreas,
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
    if (serviceAreas.includes(area)) {
      toast.error('이미 추가된 지역입니다.');
      return;
    }
    setServiceAreas((prev) => [...prev, area]);
    setNewArea('');
  };

  const handleRemoveArea = (area: string) => {
    setServiceAreas((prev) => prev.filter((a) => a !== area));
  };

  const openDaumPostcode = () => {
    const loadAndOpen = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const daum = (window as any).daum;
      if (!daum?.Postcode) return false;
      new daum.Postcode({
        oncomplete: (data: {
          sido: string;
          sigungu: string;
          roadAddress: string;
          jibunAddress: string;
        }) => {
          setSido(data.sido || '');
          setGugun(data.sigungu || '');
          const fullAddress = data.roadAddress || data.jibunAddress || '';
          setAddress(fullAddress);
        },
      }).open();
      return true;
    };

    if (loadAndOpen()) return;

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => loadAndOpen();
    document.head.appendChild(script);
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] max-w-7xl h-[100dvh] md:h-[92vh] max-h-[100dvh] md:max-h-[92vh] md:rounded-lg rounded-none overflow-hidden p-0 gap-0 border-stone-300/60 shadow-2xl flex flex-col"
      >
        <div className="flex flex-col h-full bg-[#F5F5F5]">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-3.5 bg-[#4CAF50] text-white flex-shrink-0 border-b border-[#388E3C]">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-lg md:text-xl shrink-0">🌸</span>
              <h2 className="text-base md:text-xl font-bold tracking-tight">화원 등록</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-[#388E3C] text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* 왼쪽: 등록 폼 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#F5F5F5]">
              <Section title="기본 정보" accent="bg-[#4CAF50]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <Field label="화원명" required className="col-span-2 sm:col-span-1">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="화원명을 입력하세요"
                      className="field-input"
                    />
                  </Field>
                  <Field label="전화번호">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="예) 02-1234-5678"
                      className="field-input"
                    />
                  </Field>
                  <Field label="시/도">
                    <input
                      value={sido}
                      onChange={(e) => setSido(e.target.value)}
                      placeholder="예) 서울특별시"
                      className="field-input"
                    />
                  </Field>
                  <Field label="구/군">
                    <div className="flex gap-2">
                      <input
                        value={gugun}
                        onChange={(e) => setGugun(e.target.value)}
                        placeholder="예) 강남구"
                        className="field-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={openDaumPostcode}
                        className="px-3 py-2 bg-[#2E7D32] text-white hover:bg-[#1B5E20] transition-colors rounded-lg flex items-center gap-1.5 shrink-0 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        주소 검색
                      </button>
                    </div>
                  </Field>
                  <Field label="상세 주소" className="col-span-2">
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="도로명 또는 지번 주소"
                      className="field-input"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="특이사항" accent="bg-[#4CAF50]">
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="특이사항/메모"
                  className="field-input resize-none"
                />
              </Section>

              <Section title="서비스 지역" accent="bg-[#4CAF50]">
                <div className="flex flex-wrap gap-2 mb-3">
                  {serviceAreas.length > 0 ? (
                    serviceAreas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
                      >
                        {area}
                        <button
                          className="text-[#4CAF50]/60 hover:text-red-600 transition-colors"
                          onClick={() => handleRemoveArea(area)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-400 italic">추가된 지역 없음</span>
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
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    지역 추가
                  </button>
                </div>
              </Section>

              <Section title="역량" accent="bg-[#4CAF50]">
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
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#4CAF50]/30 shadow-sm'
                            : 'bg-white text-stone-500 border-stone-200 hover:border-[#4CAF50]/50 hover:text-[#2E7D32]'
                        )}
                      >
                        {active && (
                          <svg
                            className="inline w-3.5 h-3.5 mr-0.5 -mt-px text-[#4CAF50]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* 오른쪽: 갤러리 자리표시자 (데스크탑만) */}
            <div className="hidden md:flex flex-col w-[280px] border-l border-[#E0E0E0] bg-[#FAFAFA] items-center justify-center gap-3 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#A5D6A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">
                화원 등록 후<br />배송 사진을 확인할 수 있습니다
              </p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-2.5 md:py-3 border-t border-[#E0E0E0] bg-white flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-sm md:text-[15px] font-medium text-stone-500 hover:bg-stone-100 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-5 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-[15px] font-medium bg-[#4CAF50] text-white hover:bg-[#388E3C] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {createMutation.isPending ? '등록 중...' : '등록'}
            </button>
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
            border-color: #4caf50;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15);
          }
          .field-input::placeholder {
            color: #a8a29e;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  accent = 'bg-[#4CAF50]',
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#C8E6C9] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#E8F5E9] border-b border-[#C8E6C9]">
        <span className={cn('w-1 h-5 rounded-full', accent)} />
        <h3 className="text-[15px] font-bold text-[#2E7D32]">{title}</h3>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[13px] font-semibold text-stone-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
