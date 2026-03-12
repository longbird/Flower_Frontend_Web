// ─── Catalog Shared Types & Constants ─────────────────────────────────────────

export interface CatalogProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  basePrice: number;
  isActive?: number | boolean;
  isBranchDefault?: boolean;
  sortOrder: number;
}

export interface Branch {
  id: number;
  name: string;
}

export interface BranchProduct {
  id: number;
  name: string;
  sku: string;
  basePrice: number;
  isVisible: boolean;
  sellingPrice: number | null;
  customName?: string | null;
  imageUrl?: string;
  category?: string;
}

export interface Surcharge {
  id: number;
  surchargeType: string;
  name: string;
  amount: number;
  branchId?: number | null;
  branchName?: string | null;
}

export type TabKey = 'products' | 'branch-settings' | 'surcharges';

export const CATEGORY_OPTIONS = [
  { value: '', label: '(없음)' },
  { value: 'bouquet', label: '꽃다발' },
  { value: 'basket', label: '꽃바구니' },
  { value: 'box', label: '플라워박스' },
  { value: 'wreath', label: '화환' },
  { value: 'plant', label: '관엽식물' },
  { value: 'event', label: '이벤트' },
  { value: 'etc', label: '기타' },
];

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  bouquet: '꽃다발', basket: '꽃바구니', box: '플라워박스', wreath: '화환',
  plant: '관엽식물', event: '이벤트', etc: '기타',
  CELEBRATION: '축하', CONDOLENCE: '근조', OBJET: '오브제',
  ORIENTAL: '동양란', WESTERN: '서양란', FLOWER: '꽃',
  FOLIAGE: '관엽', RICE: '쌀', FRUIT: '과일', OTHER: '기타',
};

export const GRADE_LABEL_MAP: Record<string, string> = {
  PREMIUM: '프리미엄',
  HIGH: '고급형',
  STANDARD: '실속형',
};

export const CATEGORY_COLORS: Record<string, string> = {
  CELEBRATION: 'bg-pink-500 text-white', CONDOLENCE: 'bg-slate-700 text-white',
  OBJET: 'bg-purple-500 text-white', ORIENTAL: 'bg-teal-500 text-white',
  WESTERN: 'bg-indigo-500 text-white', FLOWER: 'bg-rose-500 text-white',
  FOLIAGE: 'bg-emerald-500 text-white', RICE: 'bg-amber-600 text-white',
  FRUIT: 'bg-orange-500 text-white', OTHER: 'bg-slate-500 text-white',
  bouquet: 'bg-rose-500 text-white', basket: 'bg-pink-500 text-white',
  box: 'bg-purple-500 text-white', wreath: 'bg-slate-700 text-white',
  plant: 'bg-emerald-500 text-white', event: 'bg-amber-500 text-white',
  etc: 'bg-slate-500 text-white',
};

export const SURCHARGE_TYPE_OPTIONS = [
  { value: 'REGION', label: '지역' },
  { value: 'FUNERAL_HALL', label: '장례식장' },
  { value: 'WEDDING_HALL', label: '결혼식장' },
];

export function categoryLabel(code: string) {
  return CATEGORY_LABEL_MAP[code] || code;
}

export function photoUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `/api/proxy${url}`;
}

export function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}
