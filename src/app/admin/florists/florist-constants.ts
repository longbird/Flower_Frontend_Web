import type { PhotoCategory, PhotoGrade } from '@/lib/types/florist';

export const CAPABILITY_OPTIONS = [
  { code: 'CELEBRATION', label: '축하기본' },
  { code: 'CELEBRATION_LARGE', label: '축하(대)' },
  { code: 'CELEB_BASIC', label: '축하기본' },
  { code: 'CELEB_LARGE', label: '축하(대)' },
  { code: 'CONDOLENCE', label: '근조기본' },
  { code: 'CONDOLENCE_LARGE', label: '근조(대)' },
  { code: 'CONDO_BASIC', label: '근조기본' },
  { code: 'CONDO_LARGE', label: '근조(대)' },
  { code: 'CONDO_XLARGE', label: '근조(특대)' },
  { code: 'CONDO_4TIER', label: '근조4단이상' },
  { code: 'LARGE', label: '근조(특대)' },
  { code: 'MULTI_TIER', label: '근조4단이상' },
  { code: 'BASKET', label: '바구니' },
  { code: 'ROUND', label: '원형' },
  { code: 'OBJET', label: '오브제' },
  { code: 'RICE', label: '쌀' },
  { code: 'ORIENTAL_ORCHID', label: '동양란' },
  { code: 'WESTERN_ORCHID', label: '서양란' },
  { code: 'FLOWER', label: '꽃' },
  { code: 'FOLIAGE', label: '관엽' },
  { code: 'FRUITS', label: '과일' },
  { code: 'BONSAI', label: '분재' },
  { code: 'BLACK_RIBBON', label: '검정리본' },
  { code: 'HOLIDAY', label: '휴일가능' },
  { code: 'NIGHT', label: '야간배송' },
  { code: 'HOLIDAY_UNAVAILABLE', label: '휴일불가' },
];

export const GRADE_OPTIONS = [
  { value: 0, label: '없음' },
  { value: 1, label: '브론즈' },
  { value: 2, label: '실버' },
  { value: 3, label: '골드' },
  { value: 4, label: '플래티넘' },
  { value: 5, label: '다이아' },
];

export const CATEGORIES: { code: PhotoCategory | string; name: string }[] = [
  { code: 'CELEBRATION', name: '축하' },
  { code: 'CONDOLENCE', name: '근조' },
  { code: 'OBJET', name: '오브제' },
  { code: 'ORIENTAL', name: '동양란' },
  { code: 'WESTERN', name: '서양란' },
  { code: 'FLOWER', name: '꽃' },
  { code: 'FOLIAGE', name: '관엽' },
  { code: 'RICE', name: '쌀' },
  { code: 'FRUIT', name: '과일' },
  { code: 'OTHER', name: '기타' },
];

export const PHOTO_GRADES: { code: PhotoGrade; name: string; color: string }[] = [
  { code: 'PREMIUM', name: '프리미엄', color: 'bg-amber-700 text-white' },
  { code: 'HIGH', name: '고급형', color: 'bg-blue-600 text-white' },
  { code: 'STANDARD', name: '실속형', color: 'bg-teal-600 text-white' },
];

export const GRADE_MAP: Record<number, string> = {
  1: '브론즈', 2: '실버', 3: '골드', 4: '플래티넘', 5: '다이아',
};

export function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

export function formatCurrency(value: string): string {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString();
}

export function parseCurrency(value: string): number | null {
  const num = parseInt(value.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? null : num;
}
