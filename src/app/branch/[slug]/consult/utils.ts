// ─── Types ───────────────────────────────────────────────
export type DateOption = 'today' | 'tomorrow' | 'custom';

// ─── Date helpers ────────────────────────────────────────
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** "2026-03-25 (수요일)" 형식 */
export function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const w = WEEKDAYS[d.getDay()];
  return `${dateStr} (${w}요일)`;
}

// ─── Format helpers ──────────────────────────────────────
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export function photoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return RAW ? `/api/proxy${url}` : url;
}

// ─── Daum Postcode ───────────────────────────────────────
export function openDaumPostcode(onComplete: (address: string) => void) {
  const daum = (window as any).daum;
  const run = () => {
    new (window as any).daum.Postcode({
      oncomplete(data: any) {
        onComplete(data.roadAddress || data.jibunAddress || data.address);
      },
    }).open();
  };
  if (daum?.Postcode) {
    run();
    return;
  }
  const script = document.createElement('script');
  script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.onload = run;
  document.head.appendChild(script);
}

// ─── Constants ───────────────────────────────────────────
export const HOUR_OPTIONS = [
  { value: '', label: '시간 선택' },
  { value: '08', label: '8시' },
  { value: '09', label: '9시' },
  { value: '10', label: '10시' },
  { value: '11', label: '11시' },
  { value: '12', label: '12시' },
  { value: '13', label: '13시' },
  { value: '14', label: '14시' },
  { value: '15', label: '15시' },
  { value: '16', label: '16시' },
  { value: '17', label: '17시' },
  { value: '18', label: '18시' },
  { value: '19', label: '19시' },
  { value: '20', label: '20시' },
  { value: '21', label: '21시' },
];

export const MINUTE_OPTIONS = ['00', '10', '20', '30', '40', '50'];

export const DELIVERY_PURPOSE_OPTIONS = [
  { value: '까지', label: '까지' },
  { value: '예식', label: '예식' },
  { value: '장례', label: '장례' },
  { value: '행사', label: '행사' },
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.pdf';

// ─── CSS classes ─────────────────────────────────────────
export const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 focus:outline-none transition-colors text-sm bg-white';

export const selectClass =
  'px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:border-[var(--branch-green)] focus:ring-2 focus:ring-[var(--branch-green)]/20 focus:outline-none transition-colors text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400';

export const toggleBase =
  'px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer';

export const toggleSelected =
  'bg-[var(--branch-green)] text-white border-[var(--branch-green)]';

export const toggleUnselected =
  'bg-white text-gray-600 border-gray-200 hover:border-gray-300';

// ─── File validation ─────────────────────────────────────
export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return '파일 크기는 5MB 이하만 가능합니다.';
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
    return 'jpg, png, pdf 파일만 가능합니다.';
  }
  return null;
}
