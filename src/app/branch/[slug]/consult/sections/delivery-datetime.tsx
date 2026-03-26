'use client';

import type { DeliveryPurpose } from '@/lib/branch/types';
import {
  todayString,
  tomorrowString,
  formatDateWithDay,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  DELIVERY_PURPOSE_OPTIONS,
  selectClass,
  toggleBase,
  toggleSelected,
  toggleUnselected,
  inputClass,
  type DateOption,
} from '../utils';

interface Props {
  dateOption: DateOption;
  setDateOption: (v: DateOption) => void;
  customDate: string;
  setCustomDate: (v: string) => void;
  selectedHour: string;
  setSelectedHour: (v: string) => void;
  selectedMinute: string;
  setSelectedMinute: (v: string) => void;
  deliveryPurpose: DeliveryPurpose;
  setDeliveryPurpose: (v: DeliveryPurpose) => void;
  preEventDate: string;
  setPreEventDate: (v: string) => void;
  preEventHour: string;
  setPreEventHour: (v: string) => void;
  preEventMinute: string;
  setPreEventMinute: (v: string) => void;
}

export function DeliveryDatetime({
  dateOption, setDateOption,
  customDate, setCustomDate,
  selectedHour, setSelectedHour,
  selectedMinute, setSelectedMinute,
  deliveryPurpose, setDeliveryPurpose,
  preEventDate, setPreEventDate,
  preEventHour, setPreEventHour,
  preEventMinute, setPreEventMinute,
}: Props) {
  const resolvedDate =
    dateOption === 'today'
      ? todayString()
      : dateOption === 'tomorrow'
        ? tomorrowString()
        : customDate;

  const showPreEvent = deliveryPurpose !== '까지';

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
        <span className="text-gray-400 text-sm">&#x1F4C5;</span>
        <span>배송일시</span>
      </h3>

      {/* 날짜 선택 */}
      <div className="flex gap-2 mb-3">
        {(['today', 'tomorrow', 'custom'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setDateOption(opt)}
            className={`flex-1 ${toggleBase} ${dateOption === opt ? toggleSelected : toggleUnselected}`}
          >
            {opt === 'today' ? '오늘 배송' : opt === 'tomorrow' ? '내일 배송' : '날짜 선택'}
          </button>
        ))}
      </div>

      {dateOption === 'custom' && (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          min={todayString()}
          className={`mb-3 ${inputClass}`}
        />
      )}

      {/* 날짜 + 요일 표시 */}
      {resolvedDate && (
        <p className="text-sm text-gray-600 mb-3">{formatDateWithDay(resolvedDate)}</p>
      )}

      {/* 시간 + 분 + 용도 */}
      <div className="grid grid-cols-3 gap-2">
        <select
          value={selectedHour}
          onChange={(e) => setSelectedHour(e.target.value)}
          className={selectClass}
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
        <select
          value={selectedMinute}
          onChange={(e) => setSelectedMinute(e.target.value)}
          className={selectClass}
          disabled={!selectedHour}
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}분</option>
          ))}
        </select>
        <select
          value={deliveryPurpose}
          onChange={(e) => setDeliveryPurpose(e.target.value as DeliveryPurpose)}
          className={selectClass}
        >
          {DELIVERY_PURPOSE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* 행사 전 미리 배송 */}
      {showPreEvent && (
        <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-1">행사 전 미리 배송</p>
          <p className="text-xs text-gray-400 mb-3">
            예: 행사는 내일 오전 / 배송은 오늘 오후
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={preEventDate}
              onChange={(e) => setPreEventDate(e.target.value)}
              min={todayString()}
              className={`flex-1 ${inputClass} text-sm`}
            />
            <select
              value={preEventHour}
              onChange={(e) => setPreEventHour(e.target.value)}
              className={`w-20 ${selectClass}`}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
            <select
              value={preEventMinute}
              onChange={(e) => setPreEventMinute(e.target.value)}
              className={`w-20 ${selectClass}`}
              disabled={!preEventHour}
            >
              {MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 flex-shrink-0">까지</span>
          </div>
        </div>
      )}
    </section>
  );
}
