import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────

// Mock the branch API module (used by OrdererInfo)
vi.mock('@/lib/branch/api', () => ({
  sendPhoneVerification: vi.fn(),
  verifyPhoneCode: vi.fn(),
}));

// Mock consult/utils — keep real implementations, only override browser-only helpers
vi.mock('@/app/branch/[slug]/consult/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    openDaumPostcode: vi.fn(),
    photoUrl: (url: string) => url || '',
  };
});

import { sendPhoneVerification, verifyPhoneCode } from '@/lib/branch/api';
import { openDaumPostcode } from '@/app/branch/[slug]/consult/utils';

import { ProductCard } from '@/app/branch/[slug]/consult/sections/product-card';
import { MemoSection } from '@/app/branch/[slug]/consult/sections/memo-section';
import { PrivacyConsent } from '@/app/branch/[slug]/consult/sections/privacy-consent';
import { DeliveryAddress } from '@/app/branch/[slug]/consult/sections/delivery-address';
import { RecipientInfo } from '@/app/branch/[slug]/consult/sections/recipient-info';
import { OrdererInfo } from '@/app/branch/[slug]/consult/sections/orderer-info';
import { DeliveryDatetime } from '@/app/branch/[slug]/consult/sections/delivery-datetime';
import { RibbonText } from '@/app/branch/[slug]/consult/sections/ribbon-text';
import { InvoiceSelection } from '@/app/branch/[slug]/consult/sections/invoice-selection';

// ─── 1. ProductCard ─────────────────────────────────────────

describe('ProductCard', () => {
  it('should show loading skeleton when loading=true', () => {
    const { container } = render(<ProductCard product={null} loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show fallback message when product is null and not loading', () => {
    render(<ProductCard product={null} loading={false} />);
    expect(screen.getByText('상품 정보를 불러올 수 없습니다.')).toBeInTheDocument();
  });

  it('should render product name', () => {
    const product = { id: 1, name: '축하 꽃바구니', sellingPrice: 50000, imageUrl: '' };
    render(<ProductCard product={product} loading={false} />);
    expect(screen.getByText('축하 꽃바구니')).toBeInTheDocument();
  });

  it('should render formatted price when sellingPrice > 0', () => {
    const product = { id: 2, name: '근조 화환', sellingPrice: 80000, imageUrl: '' };
    render(<ProductCard product={product} loading={false} />);
    expect(screen.getByText('80,000원')).toBeInTheDocument();
  });

  it('should NOT render price when sellingPrice is 0', () => {
    const product = { id: 3, name: '테스트', sellingPrice: 0, imageUrl: '' };
    render(<ProductCard product={product} loading={false} />);
    expect(screen.queryByText('0원')).not.toBeInTheDocument();
  });

  it('should render product image when imageUrl is provided', () => {
    const product = { id: 4, name: '사진 상품', sellingPrice: 30000, imageUrl: '/uploads/test.jpg' };
    render(<ProductCard product={product} loading={false} />);
    const img = screen.getByAltText('사진 상품');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/uploads/test.jpg');
  });

  it('should render badges', () => {
    const product = { id: 5, name: '상품', sellingPrice: 10000, imageUrl: '' };
    render(<ProductCard product={product} loading={false} />);
    expect(screen.getByText('당일배송 가능')).toBeInTheDocument();
    expect(screen.getByText('리본 무료작성')).toBeInTheDocument();
    expect(screen.getByText('실물사진 제공')).toBeInTheDocument();
  });

  it('should use default name "상품" when name is empty', () => {
    const product = { id: 6, name: '', sellingPrice: 10000, imageUrl: '' };
    render(<ProductCard product={product} loading={false} />);
    // The heading shows the default name
    expect(screen.getByText('상품')).toBeInTheDocument();
  });
});

// ─── 2. MemoSection ─────────────────────────────────────────

describe('MemoSection', () => {
  it('should render heading', () => {
    render(<MemoSection memo="" setMemo={vi.fn()} />);
    expect(screen.getByText('요청사항')).toBeInTheDocument();
  });

  it('should render textarea with current memo value', () => {
    render(<MemoSection memo="경비실에 맡겨주세요" setMemo={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('경비실에 맡겨주세요');
  });

  it('should call setMemo on input change', () => {
    const setMemo = vi.fn();
    render(<MemoSection memo="" setMemo={setMemo} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '빠른 배송 부탁' } });
    expect(setMemo).toHaveBeenCalledWith('빠른 배송 부탁');
  });

  it('should show placeholder text', () => {
    render(<MemoSection memo="" setMemo={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('배송 시 요청사항'));
  });
});

// ─── 3. PrivacyConsent ──────────────────────────────────────

describe('PrivacyConsent', () => {
  it('should render consent text', () => {
    render(<PrivacyConsent checked={false} setChecked={vi.fn()} />);
    expect(screen.getByText(/개인정보.*수집 및 이용/)).toBeInTheDocument();
  });

  it('should render checkbox unchecked by default', () => {
    render(<PrivacyConsent checked={false} setChecked={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render checkbox checked when checked=true', () => {
    render(<PrivacyConsent checked={true} setChecked={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call setChecked when checkbox is toggled', () => {
    const setChecked = vi.fn();
    render(<PrivacyConsent checked={false} setChecked={setChecked} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(setChecked).toHaveBeenCalledWith(true);
  });

  it('should have label linked to checkbox via htmlFor', () => {
    render(<PrivacyConsent checked={false} setChecked={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText(/개인정보.*수집 및 이용/);
    expect(label).toHaveAttribute('for', checkbox.id);
  });
});

// ─── 4. DeliveryAddress ─────────────────────────────────────

describe('DeliveryAddress', () => {
  it('should render heading', () => {
    render(<DeliveryAddress address="" addressDetail="" setAddressDetail={vi.fn()} />);
    expect(screen.getByText('배송장소')).toBeInTheDocument();
  });

  it('should display address when provided', () => {
    render(
      <DeliveryAddress address="서울시 강남구 역삼동" addressDetail="" setAddressDetail={vi.fn()} />
    );
    expect(screen.getByText('서울시 강남구 역삼동')).toBeInTheDocument();
  });

  it('should NOT display address paragraph when address is empty', () => {
    const { container } = render(
      <DeliveryAddress address="" addressDetail="" setAddressDetail={vi.fn()} />
    );
    // No <p> with address text
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('should render detail input with current value', () => {
    render(
      <DeliveryAddress address="서울시" addressDetail="101호" setAddressDetail={vi.fn()} />
    );
    const input = screen.getByPlaceholderText('상세주소를 입력해주세요');
    expect(input).toHaveValue('101호');
  });

  it('should call setAddressDetail on input change', () => {
    const setAddressDetail = vi.fn();
    render(
      <DeliveryAddress address="" addressDetail="" setAddressDetail={setAddressDetail} />
    );
    const input = screen.getByPlaceholderText('상세주소를 입력해주세요');
    fireEvent.change(input, { target: { value: '301동 502호' } });
    expect(setAddressDetail).toHaveBeenCalledWith('301동 502호');
  });
});

// ─── 5. RecipientInfo ───────────────────────────────────────

describe('RecipientInfo', () => {
  const defaultProps = {
    recipientName: '',
    setRecipientName: vi.fn(),
    recipientPhone: '',
    setRecipientPhone: vi.fn(),
    address: '',
    setAddress: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render heading', () => {
    render(<RecipientInfo {...defaultProps} />);
    expect(screen.getByText('받는분 정보')).toBeInTheDocument();
  });

  it('should render name input', () => {
    render(<RecipientInfo {...defaultProps} recipientName="김철수" />);
    const input = screen.getByPlaceholderText('이름을 입력해주세요');
    expect(input).toHaveValue('김철수');
  });

  it('should call setRecipientName on name input change', () => {
    const setRecipientName = vi.fn();
    render(<RecipientInfo {...defaultProps} setRecipientName={setRecipientName} />);
    const input = screen.getByPlaceholderText('이름을 입력해주세요');
    fireEvent.change(input, { target: { value: '이영희' } });
    expect(setRecipientName).toHaveBeenCalledWith('이영희');
  });

  it('should render phone input', () => {
    render(<RecipientInfo {...defaultProps} recipientPhone="010-1234-5678" />);
    const input = screen.getByPlaceholderText('연락처를 입력해주세요');
    expect(input).toHaveValue('010-1234-5678');
  });

  it('should call setRecipientPhone with formatted value on phone change', () => {
    const setRecipientPhone = vi.fn();
    render(<RecipientInfo {...defaultProps} setRecipientPhone={setRecipientPhone} />);
    const input = screen.getByPlaceholderText('연락처를 입력해주세요');
    fireEvent.change(input, { target: { value: '01098765432' } });
    // formatPhone('01098765432') => '010-9876-5432'
    expect(setRecipientPhone).toHaveBeenCalledWith('010-9876-5432');
  });

  it('should render address search button', () => {
    render(<RecipientInfo {...defaultProps} />);
    expect(screen.getByText('주소검색')).toBeInTheDocument();
  });

  it('should call openDaumPostcode when address search button is clicked', () => {
    const setAddress = vi.fn();
    render(<RecipientInfo {...defaultProps} setAddress={setAddress} />);
    fireEvent.click(screen.getByText('주소검색'));
    expect(openDaumPostcode).toHaveBeenCalledWith(setAddress);
  });
});

// ─── 6. OrdererInfo ─────────────────────────────────────────

describe('OrdererInfo', () => {
  const defaultProps = {
    slug: 'test-branch',
    needsPhoneVerification: false,
    senderName: '',
    setSenderName: vi.fn(),
    senderPhone: '',
    setSenderPhone: vi.fn(),
    phoneVerified: false,
    setPhoneVerified: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render heading', () => {
    render(<OrdererInfo {...defaultProps} />);
    expect(screen.getByText('주문자 정보')).toBeInTheDocument();
  });

  it('should render name label and input', () => {
    render(<OrdererInfo {...defaultProps} senderName="홍길동" />);
    expect(screen.getByText('이름')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('홍길동');
    expect(input).toHaveValue('홍길동');
  });

  it('should call setSenderName on name change', () => {
    const setSenderName = vi.fn();
    render(<OrdererInfo {...defaultProps} setSenderName={setSenderName} />);
    const input = screen.getByPlaceholderText('홍길동');
    fireEvent.change(input, { target: { value: '박영희' } });
    expect(setSenderName).toHaveBeenCalledWith('박영희');
  });

  it('should render phone label and input', () => {
    render(<OrdererInfo {...defaultProps} senderPhone="010-1111-2222" />);
    expect(screen.getByText('연락처')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('010-1234-5678');
    expect(input).toHaveValue('010-1111-2222');
  });

  it('should NOT render verification button when needsPhoneVerification=false', () => {
    render(<OrdererInfo {...defaultProps} needsPhoneVerification={false} />);
    expect(screen.queryByText('인증번호 발송')).not.toBeInTheDocument();
  });

  it('should render verification button when needsPhoneVerification=true and not verified', () => {
    render(<OrdererInfo {...defaultProps} needsPhoneVerification={true} phoneVerified={false} />);
    expect(screen.getByText('인증번호 발송')).toBeInTheDocument();
  });

  it('should show "인증완료" text when phone is verified', () => {
    render(<OrdererInfo {...defaultProps} needsPhoneVerification={true} phoneVerified={true} />);
    expect(screen.getByText('인증완료')).toBeInTheDocument();
    expect(screen.queryByText('인증번호 발송')).not.toBeInTheDocument();
  });

  it('should show error when sending verification with short phone number', async () => {
    render(
      <OrdererInfo {...defaultProps} needsPhoneVerification={true} senderPhone="010-12" />
    );
    fireEvent.click(screen.getByText('인증번호 발송'));
    await waitFor(() => {
      expect(screen.getByText('올바른 연락처를 입력해 주세요.')).toBeInTheDocument();
    });
  });

  it('should call sendPhoneVerification API on valid phone and show code input', async () => {
    vi.mocked(sendPhoneVerification).mockResolvedValue({ ok: true });
    render(
      <OrdererInfo {...defaultProps} needsPhoneVerification={true} senderPhone="010-1234-5678" />
    );
    fireEvent.click(screen.getByText('인증번호 발송'));
    await waitFor(() => {
      expect(sendPhoneVerification).toHaveBeenCalledWith('test-branch', '01012345678');
    });
    // After successful send, code input and confirm button should appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('6자리 인증번호')).toBeInTheDocument();
      expect(screen.getByText('인증확인')).toBeInTheDocument();
    });
  });

  it('should show error when verification send fails', async () => {
    vi.mocked(sendPhoneVerification).mockResolvedValue({ ok: false, message: '서버 오류' });
    render(
      <OrdererInfo {...defaultProps} needsPhoneVerification={true} senderPhone="010-9999-8888" />
    );
    fireEvent.click(screen.getByText('인증번호 발송'));
    await waitFor(() => {
      expect(screen.getByText('서버 오류')).toBeInTheDocument();
    });
  });

  it('should call verifyPhoneCode API and set verified on success', async () => {
    const setPhoneVerified = vi.fn();
    vi.mocked(sendPhoneVerification).mockResolvedValue({ ok: true });
    vi.mocked(verifyPhoneCode).mockResolvedValue({ ok: true });

    render(
      <OrdererInfo
        {...defaultProps}
        needsPhoneVerification={true}
        senderPhone="010-1234-5678"
        setPhoneVerified={setPhoneVerified}
      />
    );

    // Step 1: send verification
    fireEvent.click(screen.getByText('인증번호 발송'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('6자리 인증번호')).toBeInTheDocument();
    });

    // Step 2: enter code and verify
    fireEvent.change(screen.getByPlaceholderText('6자리 인증번호'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('인증확인'));

    await waitFor(() => {
      expect(verifyPhoneCode).toHaveBeenCalledWith('test-branch', '01012345678', '123456');
      expect(setPhoneVerified).toHaveBeenCalledWith(true);
    });
  });
});

// ─── 7. DeliveryDatetime ────────────────────────────────────

describe('DeliveryDatetime', () => {
  const defaultProps = {
    dateOption: 'today' as const,
    setDateOption: vi.fn(),
    customDate: '',
    setCustomDate: vi.fn(),
    selectedHour: '',
    setSelectedHour: vi.fn(),
    selectedMinute: '00',
    setSelectedMinute: vi.fn(),
    deliveryPurpose: '까지' as const,
    setDeliveryPurpose: vi.fn(),
    preEventDate: '',
    setPreEventDate: vi.fn(),
    preEventHour: '',
    setPreEventHour: vi.fn(),
    preEventMinute: '00',
    setPreEventMinute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render heading', () => {
    render(<DeliveryDatetime {...defaultProps} />);
    expect(screen.getByText('배송일시')).toBeInTheDocument();
  });

  it('should render date option buttons', () => {
    render(<DeliveryDatetime {...defaultProps} />);
    expect(screen.getByText('오늘 배송')).toBeInTheDocument();
    expect(screen.getByText('내일 배송')).toBeInTheDocument();
  });

  it('should call setDateOption("today") when "오늘 배송" clicked', () => {
    const setDateOption = vi.fn();
    render(<DeliveryDatetime {...defaultProps} setDateOption={setDateOption} />);
    fireEvent.click(screen.getByText('오늘 배송'));
    expect(setDateOption).toHaveBeenCalledWith('today');
  });

  it('should call setDateOption("tomorrow") when "내일 배송" clicked', () => {
    const setDateOption = vi.fn();
    render(<DeliveryDatetime {...defaultProps} setDateOption={setDateOption} />);
    fireEvent.click(screen.getByText('내일 배송'));
    expect(setDateOption).toHaveBeenCalledWith('tomorrow');
  });

  it('should render hour select with time options', () => {
    render(<DeliveryDatetime {...defaultProps} />);
    const hourSelect = screen.getAllByRole('combobox')[0];
    expect(hourSelect).toBeInTheDocument();
    // Check that "시간 선택" option exists
    expect(screen.getByText('시간 선택')).toBeInTheDocument();
  });

  it('should call setSelectedHour on hour change', () => {
    const setSelectedHour = vi.fn();
    render(<DeliveryDatetime {...defaultProps} setSelectedHour={setSelectedHour} />);
    const hourSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(hourSelect, { target: { value: '10' } });
    expect(setSelectedHour).toHaveBeenCalledWith('10');
  });

  it('should render delivery purpose select', () => {
    render(<DeliveryDatetime {...defaultProps} />);
    expect(screen.getByText('까지')).toBeInTheDocument();
  });

  it('should NOT show pre-event section when deliveryPurpose is "까지"', () => {
    render(<DeliveryDatetime {...defaultProps} deliveryPurpose="까지" />);
    expect(screen.queryByText('행사 전 미리 배송')).not.toBeInTheDocument();
  });

  it('should show pre-event section when deliveryPurpose is "예식"', () => {
    render(<DeliveryDatetime {...defaultProps} deliveryPurpose="예식" />);
    expect(screen.getByText('행사 전 미리 배송')).toBeInTheDocument();
  });

  it('should show pre-event section when deliveryPurpose is "장례"', () => {
    render(<DeliveryDatetime {...defaultProps} deliveryPurpose="장례" />);
    expect(screen.getByText('행사 전 미리 배송')).toBeInTheDocument();
  });
});

// ─── 8. RibbonText ──────────────────────────────────────────

describe('RibbonText', () => {
  const defaultProps = {
    ribbonLeft: '',
    setRibbonLeft: vi.fn(),
    ribbonRight: '',
    setRibbonRight: vi.fn(),
    ribbonImage: null as File | null,
    setRibbonImage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render left and right ribbon text labels', () => {
    render(<RibbonText {...defaultProps} />);
    expect(screen.getByText('왼쪽 문구')).toBeInTheDocument();
    expect(screen.getByText('오른쪽 문구')).toBeInTheDocument();
  });

  it('should render left input with current value', () => {
    render(<RibbonText {...defaultProps} ribbonLeft="주식회사 ABC" />);
    const input = screen.getByPlaceholderText(/주식회사 에이비씨/);
    expect(input).toHaveValue('주식회사 ABC');
  });

  it('should call setRibbonLeft on left input change', () => {
    const setRibbonLeft = vi.fn();
    render(<RibbonText {...defaultProps} setRibbonLeft={setRibbonLeft} />);
    const input = screen.getByPlaceholderText(/주식회사 에이비씨/);
    fireEvent.change(input, { target: { value: '대표이사 홍길동' } });
    expect(setRibbonLeft).toHaveBeenCalledWith('대표이사 홍길동');
  });

  it('should render right input with current value', () => {
    render(<RibbonText {...defaultProps} ribbonRight="축하합니다" />);
    const input = screen.getByPlaceholderText(/고인의 명복/);
    expect(input).toHaveValue('축하합니다');
  });

  it('should call setRibbonRight on right input change', () => {
    const setRibbonRight = vi.fn();
    render(<RibbonText {...defaultProps} setRibbonRight={setRibbonRight} />);
    const input = screen.getByPlaceholderText(/고인의 명복/);
    fireEvent.change(input, { target: { value: '근조' } });
    expect(setRibbonRight).toHaveBeenCalledWith('근조');
  });

  it('should render "리본 이미지" upload button', () => {
    render(<RibbonText {...defaultProps} />);
    expect(screen.getByText('리본 이미지')).toBeInTheDocument();
  });

  it('should render sample preset toggle button', () => {
    render(<RibbonText {...defaultProps} />);
    expect(screen.getByText(/샘플 문구 보기/)).toBeInTheDocument();
  });

  it('should show presets panel when toggle is clicked', () => {
    render(<RibbonText {...defaultProps} />);
    fireEvent.click(screen.getByText(/샘플 문구 보기/));
    // Preset tabs should appear
    expect(screen.getByText('축하')).toBeInTheDocument();
    expect(screen.getByText('근조')).toBeInTheDocument();
    expect(screen.getByText('생활')).toBeInTheDocument();
  });

  it('should show celebration presets by default', () => {
    render(<RibbonText {...defaultProps} />);
    fireEvent.click(screen.getByText(/샘플 문구 보기/));
    // Celebration presets visible
    expect(screen.getByText('축 결혼')).toBeInTheDocument();
    expect(screen.getByText('축 개업')).toBeInTheDocument();
  });

  it('should switch to condolence presets when tab clicked', () => {
    render(<RibbonText {...defaultProps} />);
    fireEvent.click(screen.getByText(/샘플 문구 보기/));
    fireEvent.click(screen.getByText('근조'));
    expect(screen.getByText('삼가 고인의 명복을 빕니다')).toBeInTheDocument();
  });

  it('should call setRibbonRight when a preset is clicked', () => {
    const setRibbonRight = vi.fn();
    render(<RibbonText {...defaultProps} setRibbonRight={setRibbonRight} />);
    fireEvent.click(screen.getByText(/샘플 문구 보기/));
    fireEvent.click(screen.getByText('축 결혼'));
    expect(setRibbonRight).toHaveBeenCalledWith('축 결혼');
  });

  it('should show ribbon image preview when ribbonImage is set', () => {
    // Create a mock File with image type
    const file = new File(['dummy'], 'ribbon.png', { type: 'image/png' });
    // Mock URL.createObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');

    render(<RibbonText {...defaultProps} ribbonImage={file} />);
    expect(screen.getByText('ribbon.png')).toBeInTheDocument();
    expect(screen.getByAltText('리본 이미지')).toBeInTheDocument();

    URL.createObjectURL = originalCreateObjectURL;
  });
});

// ─── 9. InvoiceSelection ────────────────────────────────────

describe('InvoiceSelection', () => {
  const defaultProps = {
    invoiceType: 'NONE' as const,
    setInvoiceType: vi.fn(),
    businessRegFile: null as File | null,
    setBusinessRegFile: vi.fn(),
    senderPhone: '010-1234-5678',
    cashReceiptPhone: '',
    setCashReceiptPhone: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render heading', () => {
    render(<InvoiceSelection {...defaultProps} />);
    expect(screen.getByText('증빙 서류')).toBeInTheDocument();
  });

  it('should render three radio options', () => {
    render(<InvoiceSelection {...defaultProps} />);
    expect(screen.getByText('없음')).toBeInTheDocument();
    expect(screen.getByText('계산서 발행')).toBeInTheDocument();
    expect(screen.getByText('현금영수증 발행')).toBeInTheDocument();
  });

  it('should have NONE checked by default', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="NONE" />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked(); // NONE
    expect(radios[1]).not.toBeChecked(); // INVOICE
    expect(radios[2]).not.toBeChecked(); // CASH_RECEIPT
  });

  it('should call setInvoiceType when a radio is clicked', () => {
    const setInvoiceType = vi.fn();
    render(<InvoiceSelection {...defaultProps} setInvoiceType={setInvoiceType} />);
    fireEvent.click(screen.getByText('계산서 발행'));
    expect(setInvoiceType).toHaveBeenCalledWith('INVOICE');
  });

  it('should NOT show file upload section when invoiceType is NONE', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="NONE" />);
    expect(screen.queryByText('사업자등록증 첨부 (계산서 발행용)')).not.toBeInTheDocument();
  });

  it('should show file upload section when invoiceType is INVOICE', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="INVOICE" />);
    expect(screen.getByText('사업자등록증 첨부 (계산서 발행용)')).toBeInTheDocument();
    expect(screen.getByText('파일 선택')).toBeInTheDocument();
    expect(screen.getByText('선택된 파일 없음')).toBeInTheDocument();
  });

  it('should show file name when businessRegFile is provided', () => {
    const file = new File(['content'], 'business.pdf', { type: 'application/pdf' });
    render(<InvoiceSelection {...defaultProps} invoiceType="INVOICE" businessRegFile={file} />);
    expect(screen.getByText('business.pdf')).toBeInTheDocument();
  });

  it('should NOT show cash receipt section when invoiceType is NONE', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="NONE" />);
    expect(screen.queryByText('현금영수증 발행 전화번호')).not.toBeInTheDocument();
  });

  it('should show cash receipt phone input when invoiceType is CASH_RECEIPT', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="CASH_RECEIPT" />);
    expect(screen.getByText('현금영수증 발행 전화번호')).toBeInTheDocument();
    const phoneInput = screen.getByPlaceholderText('010-0000-0000');
    expect(phoneInput).toBeInTheDocument();
  });

  it('should call setCashReceiptPhone on phone input change', () => {
    const setCashReceiptPhone = vi.fn();
    render(
      <InvoiceSelection
        {...defaultProps}
        invoiceType="CASH_RECEIPT"
        setCashReceiptPhone={setCashReceiptPhone}
      />
    );
    const phoneInput = screen.getByPlaceholderText('010-0000-0000');
    fireEvent.change(phoneInput, { target: { value: '010-5555-6666' } });
    expect(setCashReceiptPhone).toHaveBeenCalledWith('010-5555-6666');
  });

  it('should show helper text for cash receipt', () => {
    render(<InvoiceSelection {...defaultProps} invoiceType="CASH_RECEIPT" />);
    expect(screen.getByText(/주문자 번호가 기본 입력됩니다/)).toBeInTheDocument();
  });
});
