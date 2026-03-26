'use client';

import { inputClass } from '../utils';

interface Props {
  memo: string;
  setMemo: (v: string) => void;
}

export function MemoSection({ memo, setMemo }: Props) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">&#x1F4DD;</span>
        <span>요청사항</span>
      </h3>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={3}
        placeholder="배송 시 요청사항이 있으면 입력해주세요.&#10;(예: 부재 시 경비실에 맡겨주세요)"
        className={`${inputClass} resize-none`}
      />
    </section>
  );
}
