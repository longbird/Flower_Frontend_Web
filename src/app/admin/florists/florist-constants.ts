import type { PhotoCategory, PhotoGrade } from '@/lib/types/florist';

export const CAPABILITY_OPTIONS: { label: string; codes: string[] }[] = [
  { label: '축하기본', codes: ['CELEBRATION', 'CELEB_BASIC'] },
  { label: '축하(대)', codes: ['CELEBRATION_LARGE', 'CELEB_LARGE'] },
  { label: '근조기본', codes: ['CONDOLENCE', 'CONDO_BASIC'] },
  { label: '근조(대)', codes: ['CONDOLENCE_LARGE', 'CONDO_LARGE'] },
  { label: '근조(특대)', codes: ['CONDO_XLARGE', 'LARGE'] },
  { label: '근조4단이상', codes: ['CONDO_4TIER', 'MULTI_TIER'] },
  { label: '오브제', codes: ['OBJET'] },
  { label: '쌀', codes: ['RICE'] },
  { label: '동양란', codes: ['ORIENTAL_ORCHID'] },
  { label: '서양란', codes: ['WESTERN_ORCHID'] },
  { label: '꽃', codes: ['FLOWER'] },
  { label: '관엽', codes: ['FOLIAGE'] },
  { label: '휴일불가', codes: ['HOLIDAY_UNAVAILABLE'] },
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
