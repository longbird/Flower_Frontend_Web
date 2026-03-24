'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createOrder } from '@/lib/api/admin';
import {
  PRODUCT_CATEGORIES,
  DELIVERY_TIME_OPTIONS,
  MESSAGE_TYPES,
  CONDOLENCE_PRESETS,
  orderRegisterSchema,
  calculateTotalPrice,
  formatPhoneNumber,
  type OrderRegisterForm,
} from '@/lib/types/order-register';
import { FloristSearchDialog } from './florist-search';

// ─── 퀵 금액 버튼 ────────────────────────────────────────
const PRICE_QUICK_BUTTONS = [
  { label: '1만', value: 10000 },
  { label: '3만', value: 30000 },
  { label: '5만', value: 50000 },
  { label: '6만', value: 60000 },
  { label: '7만', value: 70000 },
  { label: '8만', value: 80000 },
  { label: '10만', value: 100000 },
];

// ─── 해피콜 옵션 ─────────────────────────────────────────
const HAPPYCALL_OPTIONS = [
  { value: 'request', label: '해피콜 요청' },
  { value: 'photo', label: '배송사진URL 추가' },
  { value: 'none', label: '해피콜 요청안함' },
];

// ─── 경조사어 그룹 라벨 ──────────────────────────────────
const PHRASE_GROUPS = [
  { key: 'celebration' as const, label: '축하' },
  { key: 'condolence' as const, label: '근조' },
  { key: 'life' as const, label: '생활' },
];

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrderForm() {
  const router = useRouter();

  // ─── 수주화원 ──────────────────────────────────────
  const [floristDialogOpen, setFloristDialogOpen] = useState(false);
  const [floristId, setFloristId] = useState<number | undefined>();
  const [floristName, setFloristName] = useState('');

  // ─── 상품 ──────────────────────────────────────────
  const [productCategory, setProductCategory] = useState('');
  const [productDetail, setProductDetail] = useState('');
  const [quantity, setQuantity] = useState(1);

  // ─── 금액 ──────────────────────────────────────────
  const [productPrice, setProductPrice] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  // ─── 주문자 ────────────────────────────────────────
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderMobile, setSenderMobile] = useState('');

  // ─── 받는 분 ───────────────────────────────────────
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');

  // ─── 배달 ──────────────────────────────────────────
  const [deliveryDate, setDeliveryDate] = useState(todayString());
  const [deliveryTime, setDeliveryTime] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  // ─── 메시지 ────────────────────────────────────────
  const [messageType, setMessageType] = useState<'RIBBON' | 'CARD' | 'BOTH'>('RIBBON');
  const [condolencePhrase, setCondolencePhrase] = useState('');
  const [senderLabel, setSenderLabel] = useState('');
  const [cardMessage, setCardMessage] = useState('');

  // ─── 추가 정보 ─────────────────────────────────────
  const [happyCallMode, setHappyCallMode] = useState('request');
  const [photoRequest, setPhotoRequest] = useState(false);
  const [memo, setMemo] = useState('');

  // ─── 경조사어 그룹 탭 ──────────────────────────────
  const [phraseGroup, setPhraseGroup] = useState<'celebration' | 'condolence' | 'life'>('celebration');

  // ─── 총 금액 계산 ─────────────────────────────────
  const totalPrice = calculateTotalPrice({ productPrice, deliveryFee, options: [] });

  // ─── 제출 ──────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createOrder(data),
    onSuccess: () => {
      toast.success('주문이 등록되었습니다.');
      router.push('/admin/orders');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '주문 등록 실패'),
  });

  const handleSubmit = () => {
    const formData: Partial<OrderRegisterForm> = {
      floristId,
      floristName: floristName || undefined,
      productCategory,
      productDetail: productDetail || undefined,
      quantity,
      senderName: senderName || undefined,
      senderPhone: senderPhone || undefined,
      senderMobile: senderMobile || undefined,
      recipientName,
      recipientPhone,
      recipientMobile: recipientMobile || undefined,
      deliveryDate,
      deliveryTime,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      messageType,
      condolencePhrase: condolencePhrase || undefined,
      ribbonLeft: senderLabel || undefined,
      cardMessage: cardMessage || undefined,
      productPrice,
      deliveryFee,
      options: [],
      happyCall: happyCallMode === 'request',
      photoRequest,
      photoUrlRequest: happyCallMode === 'photo',
      photoHidden: false,
      memo: memo || undefined,
    };

    const result = orderRegisterSchema.safeParse(formData);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      toast.error(firstIssue?.message || '입력값을 확인해주세요.');
      return;
    }

    submitMutation.mutate(result.data as unknown as Record<string, unknown>);
  };

  const handleReset = () => {
    setFloristId(undefined);
    setFloristName('');
    setProductCategory('');
    setProductDetail('');
    setQuantity(1);
    setProductPrice(0);
    setDeliveryFee(0);
    setSenderName('');
    setSenderPhone('');
    setSenderMobile('');
    setRecipientName('');
    setRecipientPhone('');
    setRecipientMobile('');
    setDeliveryDate(todayString());
    setDeliveryTime('');
    setAddressLine1('');
    setAddressLine2('');
    setMessageType('RIBBON');
    setCondolencePhrase('');
    setSenderLabel('');
    setCardMessage('');
    setHappyCallMode('request');
    setPhotoRequest(false);
    setMemo('');
  };

  // ─── 다음 우편번호 검색 ──────────────────────────────
  const openDaumPostcode = () => {
    const loadAndOpen = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const daum = (window as any).daum;
      if (!daum?.Postcode) return false;
      new daum.Postcode({
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => {
          setAddressLine1(data.roadAddress || data.jibunAddress || '');
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
    <div className="space-y-5 max-w-4xl pb-24">
      {/* ⓪ 수주화원 */}
      <Section title="수주화원">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            {floristName ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#E8F0E0] text-[#5B7A3D] border border-[#D1E0C4]">
                  {floristName}
                  <button
                    onClick={() => { setFloristId(undefined); setFloristName(''); }}
                    className="text-[#5B7A3D]/60 hover:text-red-600 transition-colors ml-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            ) : (
              <span className="text-sm text-stone-400">화원을 선택해주세요</span>
            )}
          </div>
          <button
            onClick={() => setFloristDialogOpen(true)}
            className="px-3 py-2 bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors rounded-lg flex items-center gap-1.5 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            화원검색
          </button>
        </div>
      </Section>

      {/* ① 상품 정보 */}
      <Section title="상품명">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.code}
                onClick={() => setProductCategory(cat.code)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  productCategory === cat.code
                    ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]/50 hover:text-[#5B7A3D]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-3">
            <Field label="상세상품명">
              <input
                value={productDetail}
                onChange={(e) => setProductDetail(e.target.value)}
                placeholder="상세 상품명 입력"
                className="field-input"
              />
            </Field>
            <Field label="수량">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="field-input text-center"
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* ② 금액 */}
      <Section title="금액">
        <div className="space-y-3">
          <Field label="원청액 (옵션제외)" required>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1000}
                value={productPrice || ''}
                onChange={(e) => setProductPrice(Number(e.target.value) || 0)}
                placeholder="0"
                className="field-input flex-1"
              />
              <span className="text-sm text-stone-500 shrink-0">원</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRICE_QUICK_BUTTONS.map((btn) => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => setProductPrice(btn.value)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                    productPrice === btn.value
                      ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  )}
                >
                  {btn.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setProductPrice(0)}
                className="px-2.5 py-1 rounded text-xs font-medium bg-stone-50 text-stone-400 border border-stone-200 hover:bg-stone-100"
              >
                초기화
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="추가배송비">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={deliveryFee || ''}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="field-input flex-1"
                />
                <span className="text-sm text-stone-500 shrink-0">원</span>
              </div>
            </Field>
            <Field label="결제액 (옵션포함)">
              <div className="flex items-center h-[38px] px-3 rounded-lg bg-[#E8F0E0] border border-[#D1E0C4]">
                <span className="text-[15px] font-bold text-[#5B7A3D]">
                  {totalPrice.toLocaleString('ko-KR')}원
                </span>
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* ③ 주문자 정보 */}
      <Section title="주문고객 (보내는 분)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="주문고객명">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="주문자 이름"
              className="field-input"
            />
          </Field>
          <Field label="주문고객전화">
            <input
              value={senderPhone}
              onChange={(e) => setSenderPhone(formatPhoneNumber(e.target.value))}
              placeholder="02-1234-5678"
              className="field-input"
            />
          </Field>
          <Field label="주문고객핸드폰">
            <input
              value={senderMobile}
              onChange={(e) => setSenderMobile(formatPhoneNumber(e.target.value))}
              placeholder="010-1234-5678"
              className="field-input"
            />
          </Field>
        </div>
      </Section>

      {/* ④ 받는 분 정보 */}
      <Section title="받는고객">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="받는고객명" required>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="받는 분 이름"
              className="field-input"
            />
          </Field>
          <Field label="받는고객전화" required>
            <input
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(formatPhoneNumber(e.target.value))}
              placeholder="02-1234-5678"
              className="field-input"
            />
          </Field>
          <Field label="받는고객핸드폰">
            <input
              value={recipientMobile}
              onChange={(e) => setRecipientMobile(formatPhoneNumber(e.target.value))}
              placeholder="010-1234-5678"
              className="field-input"
            />
          </Field>
        </div>
      </Section>

      {/* ⑤ 배달 정보 */}
      <Section title="배달정보">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="배달일시" required>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="field-input flex-1"
                />
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="field-input flex-1"
                >
                  <option value="">배달시간 선택</option>
                  {DELIVERY_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
          <Field label="배달장소" required>
            <div className="flex gap-2 mb-2">
              <input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="주소를 검색하세요"
                className="field-input flex-1"
                readOnly
              />
              <button
                type="button"
                onClick={openDaumPostcode}
                className="px-3 py-2 bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors rounded-lg flex items-center gap-1.5 shrink-0 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                주소검색
              </button>
            </div>
            <input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="상세주소 입력"
              className="field-input"
            />
          </Field>
        </div>
      </Section>

      {/* ⑥ 메시지 */}
      <Section title="메시지">
        <div className="space-y-4">
          {/* 메시지 종류 */}
          <Field label="메시지종류">
            <div className="flex gap-1.5">
              {MESSAGE_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => setMessageType(mt.value as 'RIBBON' | 'CARD' | 'BOTH')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    messageType === mt.value
                      ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]/50'
                  )}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* 경조사어 */}
          <Field label="경조사어">
            <div className="space-y-2">
              {/* 그룹 탭 */}
              <div className="flex gap-1">
                {PHRASE_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setPhraseGroup(g.key)}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      phraseGroup === g.key
                        ? 'bg-[#5B7A3D] text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {/* 프리셋 버튼 */}
              <div className="flex flex-wrap gap-1.5">
                {CONDOLENCE_PRESETS[phraseGroup].map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => setCondolencePhrase(phrase)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                      condolencePhrase === phrase
                        ? 'bg-[#E8F0E0] text-[#5B7A3D] border-[#5B7A3D]/30'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]/50'
                    )}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
              {/* 직접 입력 */}
              <input
                value={condolencePhrase}
                onChange={(e) => setCondolencePhrase(e.target.value)}
                placeholder="경조사어 직접 입력 또는 위에서 선택"
                className="field-input"
              />
            </div>
          </Field>

          {/* 보내는분 */}
          <Field label="보내는분">
            <input
              value={senderLabel}
              onChange={(e) => setSenderLabel(e.target.value)}
              placeholder="리본/카드에 표시될 보내는 분"
              className="field-input"
            />
          </Field>

          {/* 카드 메시지 (카드/BOTH일 때만) */}
          {(messageType === 'CARD' || messageType === 'BOTH') && (
            <Field label="카드 메시지">
              <textarea
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                rows={3}
                placeholder="카드에 들어갈 메시지를 입력하세요"
                className="field-input resize-none"
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ⑦ 추가 정보 */}
      <Section title="추가정보">
        <div className="space-y-3">
          <Field label="해피콜">
            <div className="flex gap-1.5">
              {HAPPYCALL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHappyCallMode(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    happyCallMode === opt.value
                      ? 'bg-[#5B7A3D] text-white border-[#5B7A3D]'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-[#5B7A3D]/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="현장사진요청">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={photoRequest}
                onChange={(e) => setPhotoRequest(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-[#5B7A3D] focus:ring-[#5B7A3D]"
              />
              <span className="text-sm text-stone-600">배송 현장 사진을 요청합니다</span>
            </label>
          </Field>
          <Field label="요구사항">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="배송 시 요구사항을 입력하세요"
              className="field-input resize-none"
            />
          </Field>
        </div>
      </Section>

      {/* 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-40">
        <div className="text-sm text-stone-500">
          결제액: <span className="text-lg font-bold text-[#5B7A3D]">{totalPrice.toLocaleString('ko-KR')}원</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
          >
            초기화
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-[#5B7A3D] text-white hover:bg-[#4A6830] transition-colors shadow-sm disabled:opacity-50"
          >
            {submitMutation.isPending ? '발주 중...' : '발주하기'}
          </button>
        </div>
      </div>

      {/* 화원 검색 다이얼로그 */}
      <FloristSearchDialog
        open={floristDialogOpen}
        onClose={() => setFloristDialogOpen(false)}
        onSelect={(f) => {
          setFloristId(f.id);
          setFloristName(f.name);
        }}
      />

      <style jsx>{`
        .field-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #c8c3bc;
          background: #fffffe;
          font-size: 14px;
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

// ─── Section / Field 헬퍼 ────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#D1E0C4] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#E8F0E0] border-b border-[#D1E0C4]">
        <span className="w-1 h-5 rounded-full bg-[#5B7A3D]" />
        <h3 className="text-[15px] font-bold text-[#5B7A3D]">{title}</h3>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-stone-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
