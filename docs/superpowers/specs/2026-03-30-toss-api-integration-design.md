# Toss Payments API 개별 연동 설계

> 작성일: 2026-03-30
> 상태: 승인 대기
> 리뷰: v2 (스펙 리뷰 반영)

## 1. 개요

기존 Toss Payments 위젯 연동(`@tosspayments/tosspayments-sdk`)을 **API 개별 연동** 방식으로 전면 교체한다.

### 목표

1. Branch 홈페이지: **결제창**(카드/간편결제) + **가상계좌** 발급
2. Admin: **Key-in** 수동결제 (전화주문 대리결제 + 기존 주문 후처리)
3. Admin: 결제 관리 (전체 지사 통합 조회/취소/환불)
4. Webhook: 가상계좌 입금 자동 확인

### 결제 방식별 역할 분담

| 방식 | 영역 | 카드정보 경유 | PCI 범위 | 설명 |
|------|------|:---:|:---:|------|
| **결제창** (Payment Window) | Branch | Toss 페이지 | 없음 | 고객이 Toss 결제 페이지에서 카드 입력 |
| **가상계좌** API | Branch + Admin | N/A | 없음 | 서버에서 Toss API로 가상계좌 발급 |
| **Key-in** API | Admin 전용 | 우리 서버 | 제한적 | 관리자가 카드번호 직접 입력 (내부 운영) |

> **PCI-DSS 결정**: Branch 고객 카드결제는 Toss 결제창(리다이렉트)을 사용하여 PCI 범위를 회피한다. Key-in은 Admin 내부 운영용으로만 사용하여 PCI 영향을 최소화한다.

### 대상 영역

- `/branch/*` — 고객 결제 UI (결제창 + 가상계좌)
- `/admin/payments/*` — 관리자 결제 관리 (Key-in + 조회/취소)
- `/api/payments/*` — Next.js API Routes (Toss API 연동)

---

## 2. 아키텍처

### 전체 구조

```
[Branch 고객 카드결제 - 결제창 방식]
Browser → Next.js 결제 페이지 → Toss 결제 페이지 (리다이렉트)
  → 결제 완료 후 successUrl로 리다이렉트
  → POST /api/payments/confirm → Toss 결제 승인 API
  → 백엔드 API로 주문+결제 저장

[Branch 가상계좌]
Browser → POST /api/payments/virtual-account → Toss 가상계좌 API
  → 계좌정보 반환 + secret 백엔드 DB 저장
  → Webhook으로 입금 확인

[Admin Key-in]
Browser → POST /api/payments/key-in → Toss Key-in API
  → 즉시 결제 결과 반환 + 백엔드 DB 저장

[Admin 결제 관리]
Browser → GET/POST /api/payments/* → Toss 조회/취소 API
```

- **Next.js API Routes**: Toss API 호출 + 결제 로직 처리
- **Backend (8080)**: 주문 + 결제 데이터 DB 저장
- **Toss API**: 결제 승인, 조회, 취소 등 실제 결제 처리
- 결제 조회: Toss API 실시간 조회 + 백엔드 DB 병행

### 인증

- Toss API: Basic Auth (`Base64("{TOSS_SECRET_KEY}:")`)
- 환경변수:
  - `TOSS_SECRET_KEY` (서버 전용) — 유지
  - `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 유지 (결제창 리다이렉트 시 클라이언트에서 필요)
- Admin API Routes: 기존 `useAuthStore` Bearer 토큰 검증 (기존 `api()` 클라이언트 프록시 패턴 사용)

---

## 3. Toss API 클라이언트 모듈

### 파일: `src/lib/payments/toss-client.ts`

공통 Toss API 호출 클라이언트.

```typescript
interface TossClientConfig {
  secretKey: string
  baseUrl: string  // https://api.tosspayments.com
}

// 제공 메서드
confirmPayment(request: ConfirmRequest): Promise<TossPayment>       // 결제창 승인
keyInPayment(request: KeyInRequest): Promise<TossPayment>            // 카드 키인
createVirtualAccount(request: VirtualAccountRequest): Promise<TossPayment>  // 가상계좌
getPayment(paymentKey: string): Promise<TossPayment>                 // 결제 조회
getPaymentByOrderId(orderId: string): Promise<TossPayment>           // 주문번호로 조회
cancelPayment(paymentKey: string, request: CancelRequest, idempotencyKey: string): Promise<TossPayment>
getTransactions(startDate: string, endDate: string, options?: TransactionOptions): Promise<TossTransaction[]>
```

기능:
- Basic Auth 헤더 자동 생성
- 에러 응답 파싱 (`TossApiError` 타입)
- 멱등키(Idempotency-Key) 헤더 지원 (취소 시 `{paymentKey}-cancel-{timestamp}` 형식)
- 재시도 없음 (결제 특성상 단일 요청)

### 기존 코드 마이그레이션

- `src/lib/branch/payment-utils.ts` → **삭제**
  - `generateOrderId()` → `src/lib/payments/constants.ts`로 이동
  - `TOSS_CLIENT_KEY` → 환경변수 직접 참조로 대체
- `src/lib/branch/payment-store.ts` → **수정** (결제창 리다이렉트 플로우에 맞게)

---

## 4. 타입 정의

### 파일: `src/lib/payments/types.ts`

```typescript
// 결제 상태
type PaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'  // 가상계좌 입금 대기
  | 'DONE'                 // 결제 완료
  | 'CANCELED'             // 전액 취소
  | 'PARTIAL_CANCELED'     // 부분 취소
  | 'ABORTED'              // 승인 실패
  | 'EXPIRED'              // 만료

// 결제 수단
type PaymentMethod = '카드' | '가상계좌' | '계좌이체' | '휴대폰'

// Toss 결제 객체 (핵심 필드)
interface TossPayment {
  paymentKey: string
  orderId: string
  orderName: string
  status: PaymentStatus
  method: PaymentMethod
  totalAmount: number
  balanceAmount: number
  requestedAt: string
  approvedAt: string | null
  card?: TossCardInfo
  virtualAccount?: TossVirtualAccountInfo
  cancels?: TossCancelRecord[]
  receipt?: { url: string }
  secret?: string  // 가상계좌 웹훅 검증용
}

// 결제창 승인 요청
interface ConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
}

// Key-in 요청 (Admin 전용)
interface KeyInRequest {
  amount: number
  orderId: string
  orderName: string
  cardNumber: string
  cardExpirationYear: string
  cardExpirationMonth: string
  customerIdentityNumber: string  // 생년월일 YYMMDD 또는 사업자번호
  cardPassword?: string           // 앞 2자리
  cardInstallmentPlan?: number    // 할부 개월 (0=일시불)
  customerName?: string
  customerEmail?: string
}

// 가상계좌 요청
interface VirtualAccountRequest {
  amount: number
  orderId: string
  orderName: string
  customerName: string
  bank: BankCode
  validHours?: number      // 기본 24시간
  customerMobilePhone?: string
  cashReceipt?: CashReceiptInfo
}

// 취소 요청
interface CancelRequest {
  cancelReason: string
  cancelAmount?: number   // 미지정 시 전액 취소
  refundReceiveAccount?: {  // 가상계좌 환불 시 필수
    bank: BankCode
    accountNumber: string
    holderName: string
  }
}

// 웹훅 페이로드
interface WebhookPayload {
  createdAt: string
  secret: string
  orderId: string
  status: PaymentStatus
  transactionKey: string
}
```

### 파일: `src/lib/payments/constants.ts`

```typescript
// 지원 은행 목록 (가상계좌)
const VIRTUAL_ACCOUNT_BANKS = [
  { code: '경남', name: '경남은행' },
  { code: '광주', name: '광주은행' },
  { code: '국민', name: 'KB국민은행' },
  { code: '기업', name: 'IBK기업은행' },
  { code: '농협', name: 'NH농협은행' },
  { code: '대구', name: 'iM뱅크(대구)' },
  { code: '부산', name: '부산은행' },
  { code: '새마을', name: '새마을금고' },
  { code: '수협', name: '수협은행' },
  { code: '신한', name: '신한은행' },
  { code: '우리', name: '우리은행' },
  { code: '우체국', name: '우체국' },
  { code: '전북', name: '전북은행' },
  { code: '하나', name: '하나은행' },
] as const

// 결제 상태 한글 매핑
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  READY: '준비',
  IN_PROGRESS: '진행중',
  WAITING_FOR_DEPOSIT: '입금대기',
  DONE: '완료',
  CANCELED: '취소',
  PARTIAL_CANCELED: '부분취소',
  ABORTED: '승인실패',
  EXPIRED: '만료',
}

// 할부 옵션
const INSTALLMENT_OPTIONS = [
  { value: 0, label: '일시불' },
  { value: 2, label: '2개월' },
  { value: 3, label: '3개월' },
  { value: 4, label: '4개월' },
  { value: 5, label: '5개월' },
  { value: 6, label: '6개월' },
  { value: 7, label: '7개월' },
  { value: 8, label: '8개월' },
  { value: 9, label: '9개월' },
  { value: 10, label: '10개월' },
  { value: 11, label: '11개월' },
  { value: 12, label: '12개월' },
]

// 주문 ID 생성
function generateOrderId(slug: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `RF-${slug}-${timestamp}-${random}`
}
```

---

## 5. API Routes

### 5.1 결제 승인 (결제창) — `POST /api/payments/confirm` (기존 수정)

기존 confirm 라우트를 TossClient 모듈 사용으로 리팩토링.

```
요청: ConfirmRequest { paymentKey, orderId, amount }
처리:
  1. 입력값 검증 (zod)
  2. TossClient.confirmPayment() 호출
  3. 성공 시: 백엔드 API로 결제정보 전달
  4. 결과 반환
실패 복구:
  - 결제 승인 성공 but 백엔드 저장 실패 시: 최대 2회 재시도
  - 재시도 실패 시: 결제 정보를 응답에 포함하여 success 페이지에서 재시도 가능하게 함
응답: TossPayment 객체
```

### 5.2 Key-in 결제 — `POST /api/payments/key-in` (Admin 전용)

```
요청: KeyInRequest (카드번호, 유효기간, 생년월일, 금액, 주문정보)
인증: Admin Bearer 토큰 필수 (미인증 시 401)
처리:
  1. Admin 토큰 검증
  2. 입력값 검증 (zod)
  3. orderId 생성 (RF-{slug}-{timestamp}-{random})
  4. TossClient.keyInPayment() 호출
  5. 성공 시: 백엔드 API로 결제정보 전달 (주문 연결)
  6. 결과 반환
보안:
  - 카드번호는 요청 처리 후 즉시 메모리에서 제거 (변수 null 할당)
  - 카드번호 로깅 절대 금지
  - 요청당 1건만 처리 (배치 불가)
응답: TossPayment 객체
```

### 5.3 가상계좌 발급 — `POST /api/payments/virtual-account`

```
요청: VirtualAccountRequest (입금자명, 은행, 금액, 주문정보)
처리:
  1. 입력값 검증
  2. orderId 생성
  3. TossClient.createVirtualAccount() 호출
  4. 백엔드 API로 주문 생성 (status: WAITING_FOR_DEPOSIT)
     → secret 값을 함께 전달하여 백엔드 DB에 저장 (웹훅 검증용)
  5. 계좌정보 반환
응답: TossPayment (virtualAccount 포함, secret 제외)
```

### 5.4 결제 조회 — `GET /api/payments/[paymentKey]`

```
요청: paymentKey (URL 파라미터)
인증: Admin Bearer 토큰 필수
처리: TossClient.getPayment(paymentKey)
응답: TossPayment 객체
```

### 5.5 거래 목록 — `GET /api/payments/list`

```
요청: ?startDate=...&endDate=...&limit=100&startingAfter=...
인증: Admin Bearer 토큰 필수
처리: TossClient.getTransactions()
제약: Toss API는 요청당 최대 7일 범위 조회 가능.
  → 7일 초과 시 프론트에서 자동 분할 요청 (7일 단위)
  → 또는 백엔드 DB에서 조회 (DB에 결제 데이터 저장되어 있으므로)
응답: TossTransaction[]
```

### 5.6 결제 취소 — `POST /api/payments/[paymentKey]/cancel`

```
요청: CancelRequest (사유, 금액, 환불계좌)
인증: Admin Bearer 토큰 필수
처리:
  1. 입력값 검증
  2. 멱등키 생성: `{paymentKey}-cancel-{timestamp}`
  3. TossClient.cancelPayment() 호출
  4. 백엔드 API로 주문 상태 변경
  5. 결과 반환
응답: TossPayment (cancels 포함)
```

### 5.7 Webhook — `POST /api/payments/webhook`

```
요청: WebhookPayload (Toss에서 POST)
처리:
  1. secret 검증: 백엔드 DB에 저장된 값과 비교
  2. transactionKey 중복 체크: 이미 처리된 transactionKey면 200 OK만 반환 (재처리 방지)
  3. createdAt 검증: 10분 이상 오래된 이벤트 거부 (리플레이 공격 방지)
  4. orderId로 TossClient.getPaymentByOrderId() 조회
  5. status 확인:
     - DONE: 백엔드 API로 주문 상태 '입금완료' 변경
     - CANCELED: 백엔드 API로 주문 상태 '결제취소' 변경
  6. 200 OK 반환
보안:
  - secret 검증 (백엔드 DB 저장값과 비교)
  - transactionKey 중복 처리 방지
  - 타임스탬프 검증 (리플레이 공격 방지)
  - 프로덕션: nginx에서 Toss IP 화이트리스트 설정 필요
재시도: Toss가 실패 시 최대 7회 재시도
```

---

## 6. Branch 결제 페이지

### 6.1 결제 방법 선택 (page.tsx 재작성)

기존 Toss SDK 위젯을 제거하고 결제 방법 선택 UI로 교체.

**플로우**:

```
1. 결제 방법 선택
   ┌──────────────┐  ┌──────────────┐
   │ 카드/간편결제  │  │   가상계좌    │
   └──────────────┘  └──────────────┘

2-A. 카드/간편결제 선택 시 (결제창 방식):
   → 주문 정보 확인 화면 표시
   → [결제하기] 클릭
   → Toss 결제 페이지로 리다이렉트 (loadTossPayments SDK 사용)
   → 고객이 Toss 페이지에서 카드 입력/간편결제 선택
   → 결제 완료 후 successUrl로 리다이렉트
   → POST /api/payments/confirm → 결제 승인
   → 주문 접수 완료

2-B. 가상계좌 선택 시 (API 직접 호출):
   ┌─────────────────────────────┐
   │ 입금자명:  [홍길동]              │
   │ 은행선택:  [신한은행 ▼]          │
   │ 입금기한:  24시간                 │
   │                                  │
   │ 주문정보: 꽃다발 외 1건  50,000원 │
   │        [가상계좌 발급]            │
   └─────────────────────────────┘
   → POST /api/payments/virtual-account
   → 계좌번호 안내 페이지 표시
   → Webhook으로 입금 확인 후 주문 자동 처리
```

**결제창 리다이렉트 방식**:
- `@tosspayments/tosspayments-sdk`의 `loadTossPayments()` + `requestPayment()` 사용
- 단, 위젯(결제수단 선택/약관 UI)은 사용하지 않고 결제 요청만 수행
- SDK는 클라이언트에서 결제창 URL 생성용으로만 사용 (카드 정보는 서버 경유 안 함)
- `@tosspayments/tosspayments-sdk` 패키지는 유지하되, 위젯 관련 코드만 제거

### 6.2 payment-store 수정

기존 `usePaymentStore`는 리다이렉트 전후로 주문 데이터를 유지하는 용도로 계속 사용.
가상계좌 선택 시에도 동일하게 주문 데이터를 스토어에 저장 후 API 호출.

추가 필드:
```typescript
interface OrderPaymentData {
  // ... 기존 필드 유지
  paymentMethod: 'card' | 'virtual-account'  // 결제 방법 추가
}
```

### 6.3 결제 성공 페이지 수정 (success/page.tsx)

- **카드결제 (결제창)**: 기존과 동일한 흐름 유지
  - paymentKey, orderId, amount 수신 → confirm API 호출 → 주문 접수
  - 결제 승인 성공 but 주문 등록 실패 시: 최대 2회 재시도 후 에러 표시 + 관리자 문의 안내
- **가상계좌**: "입금 대기" 상태 표시
  - 은행명, 계좌번호, 입금기한 표시
  - "계좌번호 복사" 버튼
  - 안내: "입금 확인 후 주문이 자동 접수됩니다"

### 6.4 실패 페이지 (fail/page.tsx)

기존 유지. 에러 코드/메시지 표시 + 재시도/홈 버튼.

---

## 7. Admin 결제 관리

### 7.1 결제 목록 페이지 (`/admin/payments/`)

- 날짜 범위 필터 (기본: 최근 7일, 최대 90일)
  - 7일 초과 시 백엔드 DB 조회 (Toss API는 7일 단위 제한)
- 지사 필터 (전체 지사 통합 조회)
- 상태 필터 (전체/완료/입금대기/취소)
- 결제수단 필터 (전체/카드/가상계좌)
- 테이블: 상태, 주문번호, 고객명, 결제금액, 수단, 일시, 액션
- 페이지네이션 (cursor 기반, Toss API `startingAfter` 활용)

### 7.2 결제 상세 모달

- paymentKey로 Toss API 실시간 조회
- 카드 정보 (카드사, 승인번호, 할부) 또는 가상계좌 정보 (은행, 계좌번호, 입금상태)
- 취소/환불 이력
- 영수증 링크

### 7.3 Key-in 수동결제 페이지 (`/admin/payments/key-in/`)

탭 2개:
- **기존 주문 연결**: 주문번호 검색 → 주문정보 확인 → 카드정보 입력 → 결제
- **신규 전화주문**: 지사 선택 + 고객정보 + 상품정보 입력 → 카드정보 입력 → 결제

카드 입력 폼 (CardInputForm):
- 카드번호 (16자리, 4자리씩 자동 분할)
- 유효기간 (MM/YY)
- 생년월일 6자리 또는 사업자번호 10자리
- 카드 비밀번호 앞 2자리 (선택)
- 할부 선택 (일시불~12개월)
- react-hook-form + zod 검증
- 내부 form state 관리 (부모는 onSubmit 콜백만 받음)

### 7.4 취소/환불 모달

- 전액 취소 / 부분 환불 선택
- 취소 사유 입력 (필수)
- 가상계좌 환불 시: 환불 계좌 정보 입력 (은행, 계좌번호, 예금주)
- 실행 전 확인 다이얼로그
- 멱등키로 중복 취소 방지

---

## 8. 파일 구조

```
src/
├── lib/payments/
│   ├── toss-client.ts              ← Toss API 클라이언트 (NEW)
│   ├── types.ts                    ← 결제 타입 정의 (NEW)
│   └── constants.ts                ← 은행 목록, 상태 레이블, generateOrderId (NEW)
├── lib/branch/
│   ├── payment-store.ts            ← 수정 (paymentMethod 필드 추가)
│   └── payment-utils.ts            ← 삭제 (toss-client/constants로 이동)
├── app/api/payments/
│   ├── confirm/route.ts            ← 수정 (TossClient 사용으로 리팩토링)
│   ├── key-in/route.ts             ← NEW: Admin 카드 키인 결제
│   ├── virtual-account/route.ts    ← NEW: 가상계좌 발급
│   ├── webhook/route.ts            ← NEW: 입금 확인 웹훅
│   ├── list/route.ts               ← NEW: 거래 내역 조회
│   └── [paymentKey]/
│       ├── route.ts                ← NEW: 결제 상세 조회
│       └── cancel/route.ts         ← NEW: 결제 취소/환불
├── app/branch/[slug]/payment/
│   ├── page.tsx                    ← 재작성 (결제 방법 선택 + 가상계좌 폼)
│   ├── success/page.tsx            ← 수정 (가상계좌 대기 상태 추가)
│   └── fail/page.tsx               ← 유지
├── app/admin/payments/
│   ├── page.tsx                    ← NEW: 결제 관리 목록
│   ├── key-in/page.tsx             ← NEW: 수동 결제
│   └── components/
│       ├── PaymentTable.tsx        ← NEW: 결제 목록 테이블
│       ├── PaymentDetailModal.tsx  ← NEW: 결제 상세 모달
│       ├── CancelPaymentModal.tsx  ← NEW: 취소/환불 모달
│       └── CardInputForm.tsx       ← NEW: 카드 입력 폼 (Admin 전용)
```

> Note: CardInputForm은 Admin 전용. Branch는 결제창(Toss 페이지)을 사용하므로 카드 입력 폼 불필요.

---

## 9. 에러 처리

### Toss API 에러

```typescript
interface TossApiError {
  code: string      // e.g., 'INVALID_CARD_NUMBER', 'INSUFFICIENT_BALANCE'
  message: string   // 한글 에러 메시지
}
```

- 카드 관련: 카드번호 오류, 한도 초과, 분실카드, 유효기간 만료
- 가상계좌: 은행 점검 중, 발급 한도 초과
- 취소: 이미 취소됨, 잔액 부족

모든 에러는 한글 메시지로 사용자에게 표시.

### 결제 성공 but 주문 등록 실패 복구

```
1. 결제 승인 성공 → 백엔드 주문 등록 시도
2. 실패 시: 최대 2회 재시도 (1초 간격)
3. 재시도 실패 시:
   - 사용자에게 "결제는 완료되었으나 주문 등록에 문제가 발생했습니다" 표시
   - paymentKey, orderId를 화면에 표시
   - "관리자에게 문의하세요" 안내
   - (향후) 관리자에게 알림 발송 기능 추가 가능
```

### 입력 검증 (zod)

- 카드번호: 15~16자리 숫자
- 유효기간: MM(01-12) / YY(현재년도 이상)
- 생년월일: 6자리 숫자 (YYMMDD)
- 사업자번호: 10자리 숫자
- 결제금액: 양의 정수, 최소 100원

---

## 10. 보안

### 카드 데이터 보호

- Branch 고객: 카드 데이터가 우리 서버를 경유하지 않음 (결제창 리다이렉트)
- Admin Key-in: 카드 데이터가 서버 경유 (내부 운영용)
  - 요청 처리 후 즉시 메모리에서 제거
  - 카드번호 로깅 절대 금지
  - Admin 인증 필수 (미인증 시 401)

### API 보안

- `TOSS_SECRET_KEY`는 서버 환경변수에만 존재 (클라이언트 노출 불가)
- Admin API Routes: Bearer 토큰 검증 (기존 `api()` 클라이언트 패턴)
- Webhook: secret 검증 + transactionKey 중복 방지 + 타임스탬프 검증

### Webhook 인프라

- 프로덕션 nginx에서 Toss IP 화이트리스트 설정 필요
- Webhook URL: `https://seoulflower.co.kr/api/payments/webhook`
- Toss 개발자 센터에서 Webhook URL 등록 필요

---

## 11. 제약 사항

1. **Key-in 결제**: Toss와 별도 계약(심사) 필요. 테스트 키로는 동작하나 실운영 시 사전 신청 필수.
2. **가상계좌 Webhook**: 프로덕션에서 nginx Toss IP 화이트리스트 설정 + Toss 개발자센터에 Webhook URL 등록 필요.
3. **`@tosspayments/tosspayments-sdk`**: 위젯 코드만 제거, 패키지는 유지 (결제창 리다이렉트용).
4. **Toss 거래 조회 API**: 요청당 최대 7일 범위. 7일 초과 조회는 백엔드 DB 활용.
5. **PCI-DSS**: Branch는 결제창 방식으로 PCI 범위 회피. Admin Key-in은 내부 운영용으로 제한적 사용.

---

## 12. 테스트

- API Route 단위 테스트: Toss API 모킹 + 요청/응답 검증
  - confirm, key-in, virtual-account, cancel, webhook 각각
- CardInputForm 컴포넌트 테스트: 입력 검증, 카드번호 포맷팅
- Webhook 처리 테스트: secret 검증, 중복 transactionKey 처리, 상태 변경
- 결제 페이지 테스트: 결제 방법 선택, 가상계좌 폼 검증
- Admin 페이지 테스트: 결제 목록 조회, 취소 모달
