import { describe, it, expect } from 'vitest';
import {
  PRODUCT_CATEGORIES,
  OPTION_ITEMS,
  DELIVERY_TIME_OPTIONS,
  MESSAGE_TYPES,
  CONDOLENCE_PRESETS,
  CARD_MESSAGE_CATEGORIES,
  getProductGroup,
  isCondolenceProduct,
  isCelebrationProduct,
  calculateTotalPrice,
  formatPhoneNumber,
  orderRegisterSchema,
} from '@/lib/types/order-register';

// ─── Constants ──────────────────────────────────────────

describe('Constants', () => {
  it('PRODUCT_CATEGORIES should have entries', () => {
    expect(PRODUCT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('PRODUCT_CATEGORIES should have all required groups', () => {
    const groups = new Set(PRODUCT_CATEGORIES.map((c) => c.group));
    expect(groups).toContain('celebration');
    expect(groups).toContain('condolence');
    expect(groups).toContain('flower');
    expect(groups).toContain('plant');
    expect(groups).toContain('etc');
  });

  it('PRODUCT_CATEGORIES entries should have code, label, and group', () => {
    for (const cat of PRODUCT_CATEGORIES) {
      expect(cat.code).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.group).toBeTruthy();
    }
  });

  it('OPTION_ITEMS should have entries with code, label, and defaultPrice', () => {
    expect(OPTION_ITEMS.length).toBeGreaterThan(0);
    for (const item of OPTION_ITEMS) {
      expect(item.code).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(typeof item.defaultPrice).toBe('number');
    }
  });

  it('DELIVERY_TIME_OPTIONS should have entries', () => {
    expect(DELIVERY_TIME_OPTIONS.length).toBeGreaterThan(0);
  });

  it('MESSAGE_TYPES should have RIBBON, CARD, BOTH', () => {
    const values = MESSAGE_TYPES.map((m) => m.value);
    expect(values).toContain('RIBBON');
    expect(values).toContain('CARD');
    expect(values).toContain('BOTH');
  });

  it('CONDOLENCE_PRESETS should have celebration, condolence, life arrays', () => {
    expect(CONDOLENCE_PRESETS.celebration.length).toBeGreaterThan(0);
    expect(CONDOLENCE_PRESETS.condolence.length).toBeGreaterThan(0);
    expect(CONDOLENCE_PRESETS.life.length).toBeGreaterThan(0);
  });

  it('CARD_MESSAGE_CATEGORIES should have entries', () => {
    expect(CARD_MESSAGE_CATEGORIES.length).toBeGreaterThan(0);
  });
});

// ─── getProductGroup ────────────────────────────────────

describe('getProductGroup', () => {
  it('should return "celebration" for celebration product codes', () => {
    expect(getProductGroup('CELEBRATION_3')).toBe('celebration');
    expect(getProductGroup('CELEBRATION_4')).toBe('celebration');
    expect(getProductGroup('CELEBRATION_5')).toBe('celebration');
    expect(getProductGroup('CELEBRATION_BUDGET')).toBe('celebration');
  });

  it('should return "condolence" for condolence product codes', () => {
    expect(getProductGroup('CONDOLENCE_3')).toBe('condolence');
    expect(getProductGroup('CONDOLENCE_4')).toBe('condolence');
    expect(getProductGroup('CONDOLENCE_5')).toBe('condolence');
    expect(getProductGroup('CONDOLENCE_BUDGET')).toBe('condolence');
  });

  it('should return "flower" for flower product codes', () => {
    expect(getProductGroup('OBJET')).toBe('flower');
    expect(getProductGroup('BASKET')).toBe('flower');
    expect(getProductGroup('BOUQUET')).toBe('flower');
    expect(getProductGroup('BOX')).toBe('flower');
  });

  it('should return "plant" for plant product codes', () => {
    expect(getProductGroup('ORIENTAL_ORCHID')).toBe('plant');
    expect(getProductGroup('WESTERN_ORCHID')).toBe('plant');
    expect(getProductGroup('FOLIAGE')).toBe('plant');
  });

  it('should return "etc" for etc product codes', () => {
    expect(getProductGroup('RICE_WREATH')).toBe('etc');
    expect(getProductGroup('FRUIT_BASKET')).toBe('etc');
    expect(getProductGroup('ETC')).toBe('etc');
  });

  it('should return null for unknown codes', () => {
    expect(getProductGroup('UNKNOWN')).toBeNull();
    expect(getProductGroup('')).toBeNull();
    expect(getProductGroup('celebration_3')).toBeNull(); // case-sensitive
  });
});

// ─── isCondolenceProduct ────────────────────────────────

describe('isCondolenceProduct', () => {
  it('should return true for condolence codes', () => {
    expect(isCondolenceProduct('CONDOLENCE_3')).toBe(true);
    expect(isCondolenceProduct('CONDOLENCE_BUDGET')).toBe(true);
  });

  it('should return false for non-condolence codes', () => {
    expect(isCondolenceProduct('CELEBRATION_3')).toBe(false);
    expect(isCondolenceProduct('BASKET')).toBe(false);
    expect(isCondolenceProduct('UNKNOWN')).toBe(false);
  });
});

// ─── isCelebrationProduct ───────────────────────────────

describe('isCelebrationProduct', () => {
  it('should return true for celebration codes', () => {
    expect(isCelebrationProduct('CELEBRATION_3')).toBe(true);
    expect(isCelebrationProduct('CELEBRATION_BUDGET')).toBe(true);
  });

  it('should return false for non-celebration codes', () => {
    expect(isCelebrationProduct('CONDOLENCE_3')).toBe(false);
    expect(isCelebrationProduct('BOUQUET')).toBe(false);
    expect(isCelebrationProduct('UNKNOWN')).toBe(false);
  });
});

// ─── calculateTotalPrice ────────────────────────────────

describe('calculateTotalPrice', () => {
  it('should return 0 for empty form', () => {
    expect(calculateTotalPrice({})).toBe(0);
  });

  it('should return product price only when no other values', () => {
    expect(calculateTotalPrice({ productPrice: 50000 })).toBe(50000);
  });

  it('should sum product price and delivery fee', () => {
    expect(calculateTotalPrice({ productPrice: 50000, deliveryFee: 5000 })).toBe(55000);
  });

  it('should include only selected options in total', () => {
    const form = {
      productPrice: 50000,
      deliveryFee: 5000,
      options: [
        { code: 'CAKE', selected: true, price: 15000 },
        { code: 'WINE', selected: false, price: 25000 },
        { code: 'CANDY', selected: true, price: 10000 },
      ],
    };
    // 50000 + 5000 + 15000 + 10000 = 80000
    expect(calculateTotalPrice(form)).toBe(80000);
  });

  it('should ignore unselected options', () => {
    const form = {
      productPrice: 30000,
      options: [
        { code: 'CAKE', selected: false, price: 15000 },
        { code: 'WINE', selected: false, price: 25000 },
      ],
    };
    expect(calculateTotalPrice(form)).toBe(30000);
  });

  it('should handle options with zero price', () => {
    const form = {
      productPrice: 40000,
      options: [{ code: 'OTHER', selected: true, price: 0 }],
    };
    expect(calculateTotalPrice(form)).toBe(40000);
  });

  it('should handle missing optional fields gracefully', () => {
    expect(calculateTotalPrice({ deliveryFee: 3000 })).toBe(3000);
    expect(calculateTotalPrice({ options: [] })).toBe(0);
  });
});

// ─── formatPhoneNumber ──────────────────────────────────

describe('formatPhoneNumber', () => {
  describe('Seoul numbers (02-)', () => {
    it('should format short Seoul numbers', () => {
      expect(formatPhoneNumber('02')).toBe('02');
      expect(formatPhoneNumber('021')).toBe('021'); // 3 digits returns as-is
      expect(formatPhoneNumber('0212')).toBe('02-12');
      expect(formatPhoneNumber('02123')).toBe('02-123');
    });

    it('should format medium Seoul numbers (02-XXX-XXXX)', () => {
      expect(formatPhoneNumber('021234')).toBe('02-123-4');
      expect(formatPhoneNumber('0212345')).toBe('02-123-45');
      expect(formatPhoneNumber('02123456')).toBe('02-123-456');
      expect(formatPhoneNumber('021234567')).toBe('02-123-4567');
    });

    it('should format full Seoul numbers (02-XXXX-XXXX)', () => {
      expect(formatPhoneNumber('0212345678')).toBe('02-1234-5678');
    });

    it('should handle pre-formatted Seoul numbers', () => {
      expect(formatPhoneNumber('02-1234-5678')).toBe('02-1234-5678');
    });
  });

  describe('Mobile numbers (010-)', () => {
    it('should format short mobile numbers', () => {
      expect(formatPhoneNumber('010')).toBe('010');
      expect(formatPhoneNumber('0101')).toBe('010-1');
      expect(formatPhoneNumber('01012')).toBe('010-12');
      expect(formatPhoneNumber('010123')).toBe('010-123');
    });

    it('should format medium mobile numbers (010-XXX-XXXX)', () => {
      expect(formatPhoneNumber('0101234')).toBe('010-123-4');
      expect(formatPhoneNumber('01012345')).toBe('010-123-45');
      expect(formatPhoneNumber('010123456')).toBe('010-123-456');
      expect(formatPhoneNumber('0101234567')).toBe('010-123-4567');
    });

    it('should format full mobile numbers (010-XXXX-XXXX)', () => {
      expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
    });

    it('should handle pre-formatted mobile numbers', () => {
      expect(formatPhoneNumber('010-1234-5678')).toBe('010-1234-5678');
    });
  });

  describe('Regional numbers (031-, 051-, etc.)', () => {
    it('should format regional numbers', () => {
      expect(formatPhoneNumber('0311234567')).toBe('031-123-4567');
      expect(formatPhoneNumber('05112345678')).toBe('051-1234-5678');
    });
  });

  describe('Edge cases', () => {
    it('should return digits as-is for 3 or fewer digits', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('0')).toBe('0');
      expect(formatPhoneNumber('01')).toBe('01');
      expect(formatPhoneNumber('010')).toBe('010');
    });

    it('should strip non-digit characters before formatting', () => {
      // '010-abcd-5678' → digits '0105678' (7 digits) → '010-567-8'
      expect(formatPhoneNumber('010-abcd-5678')).toBe('010-567-8');
      expect(formatPhoneNumber('(02) 1234 5678')).toBe('02-1234-5678');
    });
  });
});

// ─── orderRegisterSchema ────────────────────────────────

describe('orderRegisterSchema', () => {
  const validForm = {
    productCategory: 'CELEBRATION_3',
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    deliveryDate: '2026-04-01',
    deliveryTime: '10:00',
    addressLine1: '서울시 강남구 테헤란로 1',
  };

  it('should pass with all required fields', () => {
    const result = orderRegisterSchema.safeParse(validForm);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for missing optional fields', () => {
    const result = orderRegisterSchema.safeParse(validForm);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.productPrice).toBe(0);
      expect(result.data.deliveryFee).toBe(0);
      expect(result.data.options).toEqual([]);
      expect(result.data.messageType).toBe('RIBBON');
      expect(result.data.happyCall).toBe(true);
      expect(result.data.photoRequest).toBe(false);
      expect(result.data.photoUrlRequest).toBe(false);
      expect(result.data.photoHidden).toBe(false);
    }
  });

  it('should fail when productCategory is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, productCategory: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when recipientName is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, recipientName: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when recipientPhone is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, recipientPhone: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when deliveryDate is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, deliveryDate: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when deliveryTime is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, deliveryTime: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when addressLine1 is empty', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, addressLine1: '' });
    expect(result.success).toBe(false);
  });

  it('should accept valid messageType values', () => {
    for (const type of ['RIBBON', 'CARD', 'BOTH'] as const) {
      const result = orderRegisterSchema.safeParse({ ...validForm, messageType: type });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid messageType values', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, messageType: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should reject negative productPrice', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, productPrice: -1000 });
    expect(result.success).toBe(false);
  });

  it('should reject negative deliveryFee', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, deliveryFee: -500 });
    expect(result.success).toBe(false);
  });

  it('should reject quantity less than 1', () => {
    const result = orderRegisterSchema.safeParse({ ...validForm, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields when provided', () => {
    const fullForm = {
      ...validForm,
      floristId: 42,
      floristName: '테스트화원',
      senderName: '김철수',
      senderPhone: '02-1234-5678',
      senderMobile: '010-9876-5432',
      recipientMobile: '010-1111-2222',
      addressLine2: '301호',
      funeralHall: '삼성서울병원',
      roomNumber: '1호실',
      deceasedName: '故 김OO',
      chiefMourner: '김OO',
      venue: '서울 웨딩홀',
      hallName: 'A홀',
      condolencePhrase: '축 결혼',
      ribbonLeft: '보내는이',
      ribbonRight: '받는이',
      cardCategory: '결혼기념일',
      cardMessage: '축하합니다',
      productDetail: '빨간 장미',
      productPhotoUrl: 'https://example.com/photo.jpg',
      memo: '문 앞에 놓아주세요',
    };
    const result = orderRegisterSchema.safeParse(fullForm);
    expect(result.success).toBe(true);
  });

  it('should validate options array schema', () => {
    const formWithOptions = {
      ...validForm,
      options: [
        { code: 'CAKE', selected: true, price: 15000 },
        { code: 'WINE', selected: false, price: 25000 },
      ],
    };
    const result = orderRegisterSchema.safeParse(formWithOptions);
    expect(result.success).toBe(true);
  });

  it('should reject option with negative price', () => {
    const formWithBadOption = {
      ...validForm,
      options: [{ code: 'CAKE', selected: true, price: -1000 }],
    };
    const result = orderRegisterSchema.safeParse(formWithBadOption);
    expect(result.success).toBe(false);
  });
});

// ─── orderRegisterSchema - edge cases ───────────────────

describe('orderRegisterSchema - edge cases', () => {
  const minimalValid = {
    productCategory: 'CELEBRATION_3',
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    deliveryDate: '2026-04-01',
    deliveryTime: '10:00',
    addressLine1: '서울시 강남구 테헤란로 1',
  };

  // ── 1. Default values ─────────────────────────────────

  describe('default values', () => {
    it('should apply all defaults when parsing minimal valid input', () => {
      const result = orderRegisterSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
      if (!result.success) return;

      // Numeric defaults
      expect(result.data.quantity).toBe(1);
      expect(result.data.productPrice).toBe(0);
      expect(result.data.deliveryFee).toBe(0);

      // Array default
      expect(result.data.options).toEqual([]);

      // Enum default
      expect(result.data.messageType).toBe('RIBBON');

      // Boolean defaults
      expect(result.data.happyCall).toBe(true);
      expect(result.data.photoRequest).toBe(false);
      expect(result.data.photoUrlRequest).toBe(false);
      expect(result.data.photoHidden).toBe(false);
    });

    it('should allow overriding every default value', () => {
      const overridden = {
        ...minimalValid,
        quantity: 5,
        productPrice: 100000,
        deliveryFee: 10000,
        options: [{ code: 'CAKE', selected: true, price: 15000 }],
        messageType: 'BOTH' as const,
        happyCall: false,
        photoRequest: true,
        photoUrlRequest: true,
        photoHidden: true,
      };
      const result = orderRegisterSchema.safeParse(overridden);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.quantity).toBe(5);
      expect(result.data.productPrice).toBe(100000);
      expect(result.data.deliveryFee).toBe(10000);
      expect(result.data.options).toHaveLength(1);
      expect(result.data.messageType).toBe('BOTH');
      expect(result.data.happyCall).toBe(false);
      expect(result.data.photoRequest).toBe(true);
      expect(result.data.photoUrlRequest).toBe(true);
      expect(result.data.photoHidden).toBe(true);
    });

    it('should apply option price default of 0 when price is omitted', () => {
      const form = {
        ...minimalValid,
        options: [{ code: 'OTHER', selected: true }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options[0].price).toBe(0);
    });
  });

  // ── 2. String field constraints ───────────────────────

  describe('string field constraints', () => {
    it('should reject empty productCategory', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, productCategory: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('productCategory'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('상품을 선택해주세요');
    });

    it('should reject empty recipientName', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, recipientName: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('recipientName'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('받는 분 이름을 입력해주세요');
    });

    it('should reject empty recipientPhone', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, recipientPhone: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('recipientPhone'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('받는 분 전화번호를 입력해주세요');
    });

    it('should reject empty deliveryDate', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, deliveryDate: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('deliveryDate'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('배달일을 선택해주세요');
    });

    it('should reject empty deliveryTime', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, deliveryTime: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('deliveryTime'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('배달 시간을 선택해주세요');
    });

    it('should reject empty addressLine1', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, addressLine1: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const issue = result.error.issues.find((i) => i.path.includes('addressLine1'));
      expect(issue).toBeDefined();
      expect(issue!.message).toBe('배달 주소를 입력해주세요');
    });

    it('should accept optional string fields as undefined', () => {
      const result = orderRegisterSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.senderName).toBeUndefined();
      expect(result.data.senderPhone).toBeUndefined();
      expect(result.data.senderMobile).toBeUndefined();
      expect(result.data.recipientMobile).toBeUndefined();
      expect(result.data.addressLine2).toBeUndefined();
      expect(result.data.funeralHall).toBeUndefined();
      expect(result.data.roomNumber).toBeUndefined();
      expect(result.data.deceasedName).toBeUndefined();
      expect(result.data.chiefMourner).toBeUndefined();
      expect(result.data.venue).toBeUndefined();
      expect(result.data.hallName).toBeUndefined();
      expect(result.data.productDetail).toBeUndefined();
      expect(result.data.productPhotoUrl).toBeUndefined();
      expect(result.data.memo).toBeUndefined();
      expect(result.data.condolencePhrase).toBeUndefined();
      expect(result.data.ribbonLeft).toBeUndefined();
      expect(result.data.ribbonRight).toBeUndefined();
      expect(result.data.cardCategory).toBeUndefined();
      expect(result.data.cardMessage).toBeUndefined();
    });

    it('should accept optional string fields as empty strings', () => {
      const form = {
        ...minimalValid,
        senderName: '',
        senderPhone: '',
        addressLine2: '',
        memo: '',
        condolencePhrase: '',
        ribbonLeft: '',
        ribbonRight: '',
        cardCategory: '',
        cardMessage: '',
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
    });
  });

  // ── 3. Number boundaries ──────────────────────────────

  describe('number boundaries', () => {
    it('should accept productPrice=0', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, productPrice: 0 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.productPrice).toBe(0);
    });

    it('should reject productPrice=-1', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, productPrice: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept a large productPrice', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, productPrice: 9999999 });
      expect(result.success).toBe(true);
    });

    it('should accept deliveryFee=0', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, deliveryFee: 0 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.deliveryFee).toBe(0);
    });

    it('should reject deliveryFee=-1', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, deliveryFee: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept quantity=1 (minimum)', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, quantity: 1 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.quantity).toBe(1);
    });

    it('should reject quantity=0', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, quantity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject quantity=-1', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, quantity: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept quantity=100', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, quantity: 100 });
      expect(result.success).toBe(true);
    });

    it('should reject non-number types for numeric fields', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, productPrice: 'free' });
      expect(result.success).toBe(false);
    });

    it('should accept floristId as a number', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, floristId: 42 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.floristId).toBe(42);
    });

    it('should accept floristId as undefined', () => {
      const result = orderRegisterSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.floristId).toBeUndefined();
    });
  });

  // ── 4. Options array validation ───────────────────────

  describe('options array validation', () => {
    it('should accept an empty options array', () => {
      const result = orderRegisterSchema.safeParse({ ...minimalValid, options: [] });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options).toEqual([]);
    });

    it('should accept valid options with all fields', () => {
      const form = {
        ...minimalValid,
        options: [
          { code: 'CAKE', selected: true, price: 15000 },
          { code: 'WINE', selected: false, price: 25000 },
          { code: 'OTHER', selected: true, price: 0 },
        ],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options).toHaveLength(3);
    });

    it('should reject option missing code field', () => {
      const form = {
        ...minimalValid,
        options: [{ selected: true, price: 15000 }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(false);
    });

    it('should reject option missing selected field', () => {
      const form = {
        ...minimalValid,
        options: [{ code: 'CAKE', price: 15000 }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(false);
    });

    it('should apply default price=0 when price is omitted', () => {
      const form = {
        ...minimalValid,
        options: [{ code: 'OTHER', selected: false }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options[0].price).toBe(0);
    });

    it('should reject option with negative price', () => {
      const form = {
        ...minimalValid,
        options: [{ code: 'CAKE', selected: true, price: -500 }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(false);
    });

    it('should accept option with price=0', () => {
      const form = {
        ...minimalValid,
        options: [{ code: 'OTHER', selected: true, price: 0 }],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options[0].price).toBe(0);
    });

    it('should accept multiple options with various states', () => {
      const form = {
        ...minimalValid,
        options: [
          { code: 'CAKE', selected: true, price: 15000 },
          { code: 'CHAMPAGNE', selected: true, price: 20000 },
          { code: 'CANDY', selected: false, price: 10000 },
          { code: 'CHOCOLATE', selected: false, price: 10000 },
          { code: 'RICE_CAKE', selected: true, price: 15000 },
          { code: 'WINE', selected: false, price: 25000 },
          { code: 'PEPERO', selected: true, price: 8000 },
          { code: 'OTHER', selected: false, price: 0 },
        ],
      };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.options).toHaveLength(8);
    });

    it('should reject non-array value for options', () => {
      const form = { ...minimalValid, options: 'not-an-array' };
      const result = orderRegisterSchema.safeParse(form);
      expect(result.success).toBe(false);
    });
  });

  // ── 5. MessageType enum ───────────────────────────────

  describe('MessageType enum', () => {
    it.each(['RIBBON', 'CARD', 'BOTH'] as const)(
      'should accept valid messageType: %s',
      (type) => {
        const result = orderRegisterSchema.safeParse({ ...minimalValid, messageType: type });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.messageType).toBe(type);
      },
    );

    it.each(['ribbon', 'card', 'both', 'NONE', 'TEXT', '', 'INVALID', 123, null])(
      'should reject invalid messageType: %s',
      (type) => {
        const result = orderRegisterSchema.safeParse({ ...minimalValid, messageType: type });
        expect(result.success).toBe(false);
      },
    );

    it('should default to RIBBON when messageType is not provided', () => {
      const result = orderRegisterSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.messageType).toBe('RIBBON');
    });
  });

  // ── 6. Full realistic form ────────────────────────────

  describe('full realistic form', () => {
    it('should validate a complete celebration order', () => {
      const celebrationOrder = {
        floristId: 157,
        floristName: '서울꽃배달',
        productCategory: 'CELEBRATION_3',
        productDetail: '축하 3단 장미 화환',
        quantity: 1,
        productPhotoUrl: 'https://cdn.example.com/flower/celebration3.jpg',
        senderName: '김영수',
        senderPhone: '02-555-1234',
        senderMobile: '010-9876-5432',
        recipientName: '이미연',
        recipientPhone: '010-1234-5678',
        recipientMobile: '010-1234-5679',
        deliveryDate: '2026-05-15',
        deliveryTime: '10:00',
        addressLine1: '서울시 서초구 반포대로 222',
        addressLine2: '신세계백화점 1층',
        venue: '신세계 웨딩홀',
        hallName: '그랜드볼룸',
        messageType: 'BOTH' as const,
        condolencePhrase: '축 결혼',
        ribbonLeft: '김영수 드림',
        ribbonRight: '이미연 님께',
        cardCategory: '결혼기념일',
        cardMessage: '두 분의 아름다운 출발을 진심으로 축하합니다.',
        productPrice: 150000,
        deliveryFee: 15000,
        options: [
          { code: 'CAKE', selected: true, price: 15000 },
          { code: 'CHAMPAGNE', selected: true, price: 20000 },
        ],
        happyCall: true,
        photoRequest: true,
        photoUrlRequest: false,
        photoHidden: false,
        memo: '오전 10시 정시 배달 부탁드립니다. 현관 앞에 놓아주세요.',
      };

      const result = orderRegisterSchema.safeParse(celebrationOrder);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.floristId).toBe(157);
      expect(result.data.productCategory).toBe('CELEBRATION_3');
      expect(result.data.recipientName).toBe('이미연');
      expect(result.data.messageType).toBe('BOTH');
      expect(result.data.productPrice).toBe(150000);
      expect(result.data.deliveryFee).toBe(15000);
      expect(result.data.options).toHaveLength(2);
      expect(result.data.happyCall).toBe(true);
      expect(result.data.memo).toBe('오전 10시 정시 배달 부탁드립니다. 현관 앞에 놓아주세요.');
    });

    it('should validate a complete condolence order', () => {
      const condolenceOrder = {
        floristId: 42,
        floristName: '강남꽃집',
        productCategory: 'CONDOLENCE_3',
        productDetail: '근조 3단 국화',
        quantity: 2,
        senderName: '박철수',
        senderPhone: '031-777-8888',
        senderMobile: '010-5555-6666',
        recipientName: '김OO 상주',
        recipientPhone: '010-3333-4444',
        deliveryDate: '2026-04-10',
        deliveryTime: 'NOW',
        addressLine1: '서울시 송파구 올림픽로 43길 88',
        addressLine2: '삼성서울병원 장례식장',
        funeralHall: '삼성서울병원',
        roomNumber: '2호실',
        deceasedName: '故 김대호',
        chiefMourner: '김OO',
        messageType: 'RIBBON' as const,
        condolencePhrase: '삼가 고인의 명복을 빕니다',
        ribbonLeft: '(주)테크노 임직원 일동',
        ribbonRight: '故 김대호 님 영전에',
        productPrice: 200000,
        deliveryFee: 0,
        options: [],
        happyCall: false,
        photoRequest: false,
        photoUrlRequest: false,
        photoHidden: true,
        memo: '장례식장 2호실 앞에 놓아주세요',
      };

      const result = orderRegisterSchema.safeParse(condolenceOrder);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.productCategory).toBe('CONDOLENCE_3');
      expect(result.data.quantity).toBe(2);
      expect(result.data.funeralHall).toBe('삼성서울병원');
      expect(result.data.roomNumber).toBe('2호실');
      expect(result.data.deceasedName).toBe('故 김대호');
      expect(result.data.chiefMourner).toBe('김OO');
      expect(result.data.happyCall).toBe(false);
      expect(result.data.photoHidden).toBe(true);
    });
  });

  // ── 7. Partial optional fields ────────────────────────

  describe('partial optional fields', () => {
    it('should accept only sender name without sender phone', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        senderName: '김철수',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.senderName).toBe('김철수');
      expect(result.data.senderPhone).toBeUndefined();
    });

    it('should accept only funeral fields without condolence fields', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        funeralHall: '삼성서울병원',
        roomNumber: '1호실',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.funeralHall).toBe('삼성서울병원');
      expect(result.data.roomNumber).toBe('1호실');
      expect(result.data.deceasedName).toBeUndefined();
      expect(result.data.chiefMourner).toBeUndefined();
    });

    it('should accept only venue without hallName', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        venue: '서울 웨딩홀',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.venue).toBe('서울 웨딩홀');
      expect(result.data.hallName).toBeUndefined();
    });

    it('should accept ribbon fields without card fields', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        messageType: 'RIBBON' as const,
        condolencePhrase: '축 결혼',
        ribbonLeft: '보내는이',
        ribbonRight: '받는이',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.ribbonLeft).toBe('보내는이');
      expect(result.data.ribbonRight).toBe('받는이');
      expect(result.data.cardCategory).toBeUndefined();
      expect(result.data.cardMessage).toBeUndefined();
    });

    it('should accept card fields without ribbon fields', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        messageType: 'CARD' as const,
        cardCategory: '사랑의 메시지',
        cardMessage: '항상 사랑합니다',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.cardCategory).toBe('사랑의 메시지');
      expect(result.data.cardMessage).toBe('항상 사랑합니다');
      expect(result.data.ribbonLeft).toBeUndefined();
      expect(result.data.ribbonRight).toBeUndefined();
    });

    it('should accept partial boolean overrides (only some flags)', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        photoRequest: true,
        // happyCall, photoUrlRequest, photoHidden use defaults
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.photoRequest).toBe(true);
      expect(result.data.happyCall).toBe(true); // default
      expect(result.data.photoUrlRequest).toBe(false); // default
      expect(result.data.photoHidden).toBe(false); // default
    });

    it('should accept floristName without floristId', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        floristName: '테스트화원',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.floristName).toBe('테스트화원');
      expect(result.data.floristId).toBeUndefined();
    });

    it('should accept floristId without floristName', () => {
      const result = orderRegisterSchema.safeParse({
        ...minimalValid,
        floristId: 99,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.floristId).toBe(99);
      expect(result.data.floristName).toBeUndefined();
    });
  });
});
