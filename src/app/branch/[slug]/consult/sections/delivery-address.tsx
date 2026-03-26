'use client';

import { inputClass } from '../utils';

interface Props {
  address: string;
  addressDetail: string;
  setAddressDetail: (v: string) => void;
}

export function DeliveryAddress({ address, addressDetail, setAddressDetail }: Props) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">&#x1F4CD;</span>
        <span>배송장소</span>
      </h3>
      <div className="space-y-3">
        {address && (
          <p className="text-sm text-gray-700 px-1">{address}</p>
        )}
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="상세주소를 입력해주세요"
          className={inputClass}
        />
      </div>
    </section>
  );
}
