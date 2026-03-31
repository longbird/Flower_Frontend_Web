'use client';

import { formatPhone, openDaumPostcode, inputClass } from '../utils';

interface Props {
  recipientName: string;
  setRecipientName: (v: string) => void;
  recipientPhone: string;
  setRecipientPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
}

export function RecipientInfo({
  recipientName, setRecipientName,
  recipientPhone, setRecipientPhone,
  address, setAddress,
}: Props) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">&#x1F381;</span>
        <span>받는분 정보</span>
        <span className="text-red-500 text-xs font-normal ml-1">* 필수</span>
      </h3>
      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="이름을 입력해주세요 *"
            className={inputClass}
            required
          />
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(formatPhone(e.target.value))}
            placeholder="연락처를 입력해주세요 *"
            className={`flex-1 ${inputClass}`}
            required
          />
          <button
            type="button"
            onClick={() => openDaumPostcode(setAddress)}
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors whitespace-nowrap"
          >
            주소검색 *
          </button>
        </div>
      </div>
    </section>
  );
}
