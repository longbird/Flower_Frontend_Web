'use client';

export type DateRangePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_6_MONTHS' | 'CUSTOM';

const PRESET_OPTIONS: { value: Exclude<DateRangePreset, 'CUSTOM'>; label: string }[] = [
  { value: 'TODAY', label: '당일' },
  { value: 'YESTERDAY', label: '어제' },
  { value: 'LAST_7_DAYS', label: '최근 1주일' },
  { value: 'THIS_MONTH', label: '이번달' },
  { value: 'LAST_MONTH', label: '저번달' },
  { value: 'LAST_6_MONTHS', label: '6개월' },
];

function formatKstDate(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseYmd(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

export function getDateRangeForPreset(preset: Exclude<DateRangePreset, 'CUSTOM'>) {
  const now = new Date();
  const today = formatKstDate(now);
  const { year, month } = parseYmd(today);

  if (preset === 'TODAY') return { from: today, to: today };
  if (preset === 'YESTERDAY') {
    const yesterday = formatKstDate(addDays(now, -1));
    return { from: yesterday, to: yesterday };
  }
  if (preset === 'LAST_7_DAYS') {
    return { from: formatKstDate(addDays(now, -6)), to: today };
  }
  if (preset === 'THIS_MONTH') {
    return { from: ymd(year, month, 1), to: today };
  }
  if (preset === 'LAST_MONTH') {
    const firstOfThisMonth = new Date(`${ymd(year, month, 1)}T00:00:00+09:00`);
    const lastMonthDate = addMonths(firstOfThisMonth, -1);
    const lastMonth = parseYmd(formatKstDate(lastMonthDate));
    const lastDay = new Date(lastMonth.year, lastMonth.month, 0).getDate();
    return { from: ymd(lastMonth.year, lastMonth.month, 1), to: ymd(lastMonth.year, lastMonth.month, lastDay) };
  }
  return { from: formatKstDate(addMonths(now, -6)), to: today };
}

export function DateRangePresetSelect({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (preset: Exclude<DateRangePreset, 'CUSTOM'>) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--branch-text-light)]">
      조회 기간
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Exclude<DateRangePreset, 'CUSTOM'>)}
        className="h-9 rounded-lg border border-[var(--branch-rose-light)] bg-white px-3 text-sm text-[var(--branch-text)]"
      >
        {value === 'CUSTOM' && <option value="CUSTOM">직접 설정</option>}
        {PRESET_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
