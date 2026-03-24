import { z } from 'zod';

// ─── 상품 카테고리 ──────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  // 축하
  { code: 'CELEBRATION_3', label: '축하 3단', group: 'celebration' },
  { code: 'CELEBRATION_4', label: '축하 4단', group: 'celebration' },
  { code: 'CELEBRATION_5', label: '축하 5단', group: 'celebration' },
  { code: 'CELEBRATION_BUDGET', label: '실속축하', group: 'celebration' },
  // 근조
  { code: 'CONDOLENCE_3', label: '근조 3단', group: 'condolence' },
  { code: 'CONDOLENCE_4', label: '근조 4단', group: 'condolence' },
  { code: 'CONDOLENCE_5', label: '근조 5단', group: 'condolence' },
  { code: 'CONDOLENCE_BUDGET', label: '실속근조', group: 'condolence' },
  // 꽃/오브제
  { code: 'OBJET', label: '오브제', group: 'flower' },
  { code: 'BASKET', label: '꽃바구니', group: 'flower' },
  { code: 'BOUQUET', label: '꽃다발', group: 'flower' },
  { code: 'BOX', label: '꽃상자', group: 'flower' },
  // 란/식물
  { code: 'ORIENTAL_ORCHID', label: '동양란', group: 'plant' },
  { code: 'WESTERN_ORCHID', label: '서양란', group: 'plant' },
  { code: 'FOLIAGE', label: '관엽식물', group: 'plant' },
  // 기타
  { code: 'RICE_WREATH', label: '쌀화환', group: 'etc' },
  { code: 'FRUIT_BASKET', label: '과일바구니', group: 'etc' },
  { code: 'ETC', label: '기타', group: 'etc' },
] as const;

export type ProductCategoryCode = (typeof PRODUCT_CATEGORIES)[number]['code'];
export type ProductGroup = 'celebration' | 'condolence' | 'flower' | 'plant' | 'etc';

// ─── 옵션 상품 ──────────────────────────────────────────
export const OPTION_ITEMS = [
  { code: 'CAKE', label: '케익', defaultPrice: 15000 },
  { code: 'CHAMPAGNE', label: '샴페인', defaultPrice: 20000 },
  { code: 'CANDY', label: '사탕', defaultPrice: 10000 },
  { code: 'CHOCOLATE', label: '초콜렛', defaultPrice: 10000 },
  { code: 'RICE_CAKE', label: '떡케익', defaultPrice: 15000 },
  { code: 'WINE', label: '와인', defaultPrice: 25000 },
  { code: 'PEPERO', label: '빼빼로', defaultPrice: 8000 },
  { code: 'OTHER', label: '기타', defaultPrice: 0 },
] as const;

export type OptionItemCode = (typeof OPTION_ITEMS)[number]['code'];

// ─── 배달 시간 ──────────────────────────────────────────
export const DELIVERY_TIME_OPTIONS = [
  { value: 'NOW', label: '지금 즉시배송' },
  { value: 'EARLY_MORNING', label: '아침 일찍' },
  { value: '08:00', label: '오전 8시' },
  { value: '09:00', label: '오전 9시' },
  { value: '10:00', label: '오전 10시' },
  { value: '11:00', label: '오전 11시' },
  { value: '12:00', label: '낮 12시' },
  { value: '13:00', label: '오후 1시' },
  { value: '14:00', label: '오후 2시' },
  { value: '15:00', label: '오후 3시' },
  { value: '16:00', label: '오후 4시' },
  { value: '17:00', label: '오후 5시' },
  { value: '18:00', label: '오후 6시' },
  { value: '19:00', label: '오후 7시' },
  { value: '20:00', label: '오후 8시' },
  { value: '21:00', label: '오후 9시' },
  { value: '22:00', label: '오후 10시' },
] as const;

// ─── 메시지 유형 ────────────────────────────────────────
export const MESSAGE_TYPES = [
  { value: 'RIBBON', label: '리본만' },
  { value: 'CARD', label: '카드만' },
  { value: 'BOTH', label: '리본 + 카드' },
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number]['value'];

// ─── 경조사어 프리셋 ────────────────────────────────────
export const CONDOLENCE_PRESETS = {
  celebration: [
    '축 결혼', '축 화혼', '축 발전', '축 개업', '축 영전', '축 취임',
    '축 승진', '축 개소식', '축 이전', '축 개원', '축 당선',
    '축 취항', '축 준공', '축하합니다',
    '祝結婚', '祝華婚', '祝發展', '祝開業', '祝榮轉', '祝就任',
    '祝昇進', '祝 開所式',
  ],
  condolence: [
    '근조', '삼가 고인의 명복을 빕니다', '추모', '삼가 故人의 冥福을 빕니다',
    '謹弔', '弔花', '盛花', '追慕',
  ],
  life: [
    '축 생일', '축 생신', '축 수연', '축 회갑', '축 고희', '축 입주',
    '가화만사성', '축 출산', '축 돌', '축 백일',
    '축 입학', '축 졸업', '축 합격', '축 성년',
    '쾌유를 빕니다', '사랑합니다',
    '祝生日', '祝生展', '祝壽筵', '祝回甲', '祝古稀', '祝入住',
    '家和萬事成',
  ],
} as const;

// ─── 카드 메시지 카테고리 ────────────────────────────────
export const CARD_MESSAGE_CATEGORIES = [
  '사랑의 메시지',
  '생일축하',
  '결혼기념일',
  '승진/영전',
  '취임/퇴임',
  '개업/창립',
  '이사축하',
  '전시/모임',
  '수상/우승',
  '선거당선',
  '수연/고희',
  '병문안/위로',
  '조문/애도',
  '크리스마스',
  '어버이/스승의날',
  '연하/명절',
  '돌/백일',
  '어린이날',
  '합격/축하',
  '입학/졸업',
  '성년의날',
  '군입/전역',
  '약혼축하',
  '출산축하',
] as const;

// ─── 옵션 항목 스키마 ────────────────────────────────────
const optionItemSchema = z.object({
  code: z.string(),
  selected: z.boolean(),
  price: z.number().min(0).default(0),
});

// ─── 주문 등록 Zod 스키마 ────────────────────────────────
export const orderRegisterSchema = z.object({
  // ⓪ 수주화원
  floristId: z.number().optional(),
  floristName: z.string().optional(),

  // ① 상품
  productCategory: z.string().min(1, '상품을 선택해주세요'),
  productDetail: z.string().optional(),
  quantity: z.number().min(1).default(1),
  productPhotoUrl: z.string().optional(),

  // ② 주문자 (보내는 분)
  senderName: z.string().optional(),
  senderPhone: z.string().optional(),
  senderMobile: z.string().optional(),

  // ③ 받는 분
  recipientName: z.string().min(1, '받는 분 이름을 입력해주세요'),
  recipientPhone: z.string().min(1, '받는 분 전화번호를 입력해주세요'),
  recipientMobile: z.string().optional(),

  // ④ 배달 정보
  deliveryDate: z.string().min(1, '배달일을 선택해주세요'),
  deliveryTime: z.string().min(1, '배달 시간을 선택해주세요'),
  addressLine1: z.string().min(1, '배달 주소를 입력해주세요'),
  addressLine2: z.string().optional(),
  // 조건부: 장례
  funeralHall: z.string().optional(),
  roomNumber: z.string().optional(),
  deceasedName: z.string().optional(),
  chiefMourner: z.string().optional(),
  // 조건부: 예식
  venue: z.string().optional(),
  hallName: z.string().optional(),

  // ⑤ 리본/카드 메시지
  messageType: z.enum(['RIBBON', 'CARD', 'BOTH']).default('RIBBON'),
  condolencePhrase: z.string().optional(),
  ribbonLeft: z.string().optional(),
  ribbonRight: z.string().optional(),
  cardCategory: z.string().optional(),
  cardMessage: z.string().optional(),

  // ⑥ 금액
  productPrice: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  options: z.array(optionItemSchema).default([]),
  // totalPrice는 자동 계산 (productPrice + deliveryFee + options 합계)

  // ⑦ 추가 정보
  happyCall: z.boolean().default(true),
  photoRequest: z.boolean().default(false),
  photoUrlRequest: z.boolean().default(false),
  photoHidden: z.boolean().default(false),
  memo: z.string().optional(),
});

export type OrderRegisterForm = z.infer<typeof orderRegisterSchema>;

// ─── 헬퍼: 상품 그룹 판단 ────────────────────────────────
export function getProductGroup(code: string): ProductGroup | null {
  const cat = PRODUCT_CATEGORIES.find((c) => c.code === code);
  return cat?.group ?? null;
}

export function isCondolenceProduct(code: string): boolean {
  return getProductGroup(code) === 'condolence';
}

export function isCelebrationProduct(code: string): boolean {
  return getProductGroup(code) === 'celebration';
}

// ─── 헬퍼: 총 금액 계산 ─────────────────────────────────
export function calculateTotalPrice(form: Partial<OrderRegisterForm>): number {
  const productPrice = form.productPrice ?? 0;
  const deliveryFee = form.deliveryFee ?? 0;
  const optionsTotal = (form.options ?? [])
    .filter((o) => o.selected)
    .reduce((sum, o) => sum + (o.price ?? 0), 0);
  return productPrice + deliveryFee + optionsTotal;
}

// ─── 헬퍼: 전화번호 자동 포맷 ────────────────────────────
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.startsWith('02')) {
    // 서울 (02-XXXX-XXXX)
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  // 일반 (010-XXXX-XXXX, 031-XXX-XXXX 등)
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
