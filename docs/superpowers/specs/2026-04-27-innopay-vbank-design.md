# 이노페이 가상계좌 도입 설계 — 충전금 정산 통합

> 작성일: 2026-04-27
> 상태: 승인 대기
> 관련 PG: 인피니소프트 이노페이 (https://web.innopay.co.kr/guide/vbank_api/)
> 사전 자격증명(테스트): testpay01 / ars123!@#

## 1. 개요

지사 홈페이지 결제에 **가상계좌 옵션**을 추가하고, 동시에 **지사 충전금(wallet)** 시스템과 연계하여 본사가 미수금 리스크를 부담하지 않는 **선차감 / 사후 환원** 정산 흐름을 구현한다. 카드 결제(Toss, 지사별 키)는 변경 없음.

### 1.1 도입 동기

- **사고 방지**: 고객 미입금이 발생해도 본사 매출은 이미 충전금에서 확보 → 지사가 리스크 부담
- **수수료 정산 자동화**: 본사 수수료(`orderFee`, 건당 정액)를 결제 완료 시점에 자동 차감
- **지사 충전 자동화**: 현재 본사 admin이 수동으로 `CHARGE` 거래를 등록 → 이노페이 입금통보로 자동 처리

### 1.2 가상계좌 두 종류

| 구분 | ① 지사 충전용 vbank | ② 고객 결제용 vbank |
|------|--------------------|---------------------|
| 발급 단위 | 지사별 1개 (영구) | 주문별 1회용 |
| 발급 시점 | 지사 등록/이노페이 연동 활성화 시 | 고객이 가상계좌 결제 선택 시 |
| 입금 주체 | 지사 운영자 | 주문 고객 |
| 입금 효과 | wallet 충전금 += 입금액 | 주문 결제 완료 + wallet += (주문액 − orderFee) 환원 |
| 만료 | 없음 (영구) | 발급 시점부터 N시간 (이노페이 기본값 기준) |

이노페이 자격증명은 **본사 단일** (지사별 자격증명 X). 지사 식별은 가상계좌 번호(또는 이노페이 측 고유 식별자)로 매핑한다.

---

## 2. 결제·정산 흐름

### 2.1 가상계좌 결제 (신규)

```
[1] 고객이 지사 홈페이지에서 주문 → 결제수단 "가상계좌" 선택
        │
[2] POST /api/proxy/branch/{slug}/payments/vbank
    └─ 백엔드 트랜잭션 (atomic):
        - 충전금 잔액 검사 → 부족 시 400 (안내 문구로 변환)
        - 이노페이 vbank API 호출 → 1회용 가상계좌 발급
        - orders 행 생성 (status: PENDING_PAYMENT)
        - payments 행 생성 (method: VBANK_INNOPAY, status: WAITING_FOR_DEPOSIT)
        - wallet_transactions 추가: VBANK_HOLD (amount: -주문액, refType: PAYMENT, refId: paymentId)
        │
[3] 응답: { paymentId, accountNumber, bankCode, holderName, dueDate, amount }
        │
[4] 프론트: /branch/{slug}/payment/vbank 페이지로 이동
    - 계좌번호·은행·예금주·마감일 표시
    - 2~5초 간격 폴링: GET /api/proxy/branch/payments/{paymentId}
        │
[5] 고객이 해당 계좌로 입금
        │
[6] 이노페이 webhook → POST /api/proxy/admin/payments/innopay/webhook
    └─ 백엔드 단일 트랜잭션 (atomic, 멱등):
        - 서명 검증 실패 → 401 응답, DB 미접근, 본사 알림(텔레그램)
        - 이노페이 거래키 + mode 복합 UNIQUE로 중복 검사 (TEST/REAL 격리)
        - payments.status = DONE, paidAt 기록
        - orders.status = PAYMENT_COMPLETED
        - wallet_transactions 추가: VBANK_SETTLE (amount: +(주문액 − orderFee), refType: PAYMENT, refId: paymentId)
        - webhook_events 테이블에 raw payload + processed=true 기록
    └─ 위 모든 변경이 단일 RDB 트랜잭션으로 commit. 폴링이 status=DONE을 보는 시점에 wallet 환원도 반드시 commit 완료된 상태(중간 상태 노출 X).
        │
[7] 프론트 폴링이 다음 terminal 상태 중 하나 감지 시 종료:
    - DONE      → /branch/{slug}/payment/success 이동
    - EXPIRED   → /branch/{slug}/payment/fail 이동 (만료 안내)
    - CANCELED  → /branch/{slug}/payment/fail 이동 (취소 안내)
    - 마감시각 도달 (클라이언트 타임아웃)도 자동 종료 후 fail로 이동

[만료/미입금 처리 — webhook 경로 / cron 경로 동일]
    - payments.status = EXPIRED, orders.status = CANCELED
    - wallet 차감(VBANK_HOLD) 그대로 유지 (지사 손실 확정)
    - 별도 보상 거래 없음
    - cron 경로(매시간)와 webhook 경로 모두 동일한 처리 함수를 호출 → 분기 코드 발산 방지
```

### 2.2 카드 결제 (변경 없음)

```
[1] 고객이 결제수단 "카드" 선택 → Toss 위젯 (지사별 키)
[2] 카드 승인 성공 → Toss가 지사 정산계좌로 D+N 정산 (본사 개입 없음)
[3] wallet_transactions: ORDER_FEE (amount: -orderFee) — 기존 흐름 그대로
```

### 2.3 지사 충전 자동화 (신규)

```
[기존] 지사가 본사 일반 계좌로 송금 → 본사 admin이 입금 확인 → 수동 CHARGE 등록
        │
[신규] 지사가 자기 충전용 vbank(이노페이)에 입금
       → 이노페이 webhook → POST /api/proxy/admin/payments/innopay/webhook
       └─ 가상계좌 번호로 어느 지사인지 매핑
       └─ wallet_transactions 추가: CHARGE (amount: +입금액, refType: INNOPAY_TOPUP, refId: 이노페이거래키, actorType: SYSTEM)
       → 본사 admin은 자동 처리 결과만 모니터링 (수동 입력 불필요)
```

지사 admin UI에는 자기 충전용 가상계좌 정보(은행/계좌번호/예금주)를 노출 → 지사가 어디로 입금해야 할지 알 수 있게 한다. 기존 수동 CHARGE는 비상시(지사가 일반 계좌로 입금하는 등) 보조 수단으로 유지.

---

## 3. 데이터 모델 변경 (백엔드 — 인터페이스만 명시)

### 3.1 신규/확장 테이블

#### `innopay_credentials` (신규, 본사 단일 행)
```
- id              (PK)
- mode            ENUM('TEST', 'REAL')
- merchant_id     VARCHAR
- merchant_key    VARCHAR (encrypted)
- api_base_url    VARCHAR
- webhook_secret  VARCHAR (서명 검증용)
- updated_by      VARCHAR
- updated_at      TIMESTAMP
```
> 단일 행 보장. 본사 admin만 수정 가능.

#### `branches` 확장 (지사 충전용 vbank)
```
+ topup_vbank_account_number   VARCHAR  UNIQUE (이노페이 발급)
+ topup_vbank_bank_code         VARCHAR
+ topup_vbank_holder_name       VARCHAR
+ topup_vbank_innopay_id        VARCHAR  UNIQUE (이노페이 측 고유 식별자, webhook 매핑용)
+ topup_vbank_issued_at         TIMESTAMP
+ topup_vbank_active            BOOLEAN
```
> `topup_vbank_account_number`와 `topup_vbank_innopay_id` 모두 UNIQUE 제약. 동일 vbank가 두 지사에 매핑되는 사고 차단.

#### `payments` 확장 (고객 결제용 vbank)
```
+ method              ENUM 추가: 'VBANK_INNOPAY'
+ vbank_account_number VARCHAR
+ vbank_bank_code      VARCHAR
+ vbank_holder_name    VARCHAR
+ vbank_due_date       TIMESTAMP
+ innopay_tid          VARCHAR
+ innopay_mode         ENUM('TEST', 'REAL')
+ innopay_status_raw   VARCHAR (원시 상태값)
+ amount               INTEGER (요구 결제액 — 주문 시 확정)
+ paid_amount          INTEGER (실제 입금액 — 입금 시 기록, NULL 가능)
+ UNIQUE (innopay_mode, innopay_tid)  -- TEST/REAL 격리
```
> `amount`(요구액) ≠ `paid_amount`(실입금액)일 경우 v1은 자동 DONE 처리 안 함. webhook 수신·기록만 하고 본사 admin에 알림. 이 경우 `payments.status = REVIEW_REQUIRED`로 유지(추가 ENUM 값).

#### `webhook_events` (신규, 감사 로그)
```
- id              (PK)
- source          VARCHAR  (예: 'INNOPAY')
- event_type      VARCHAR  (DEPOSIT/EXPIRED/CANCEL)
- innopay_tid     VARCHAR
- raw_payload     JSON
- signature       VARCHAR
- signature_valid BOOLEAN
- processed       BOOLEAN
- processing_error VARCHAR (NULL 가능)
- received_at     TIMESTAMP
- processed_at    TIMESTAMP (NULL 가능)
```
> 모든 webhook 수신 시점에 raw payload 기록(서명 검증 실패도 포함). 멱등 처리 후 `processed=true`. 누락/중복 분석용.

#### `wallet_transactions` 타입 확장
```
WalletTxType ENUM:
  CHARGE       (기존, 수동 + INNOPAY_TOPUP 자동 충전 공용)
  REFUND       (기존)
  ORDER_FEE    (기존, 카드 결제용)
  SMS_FEE      (기존)
  ADJUST       (기존)
+ VBANK_HOLD   (신규, 음수, 가상계좌 발급 시 주문액 선차감)
+ VBANK_SETTLE (신규, 양수, 입금통보 시 주문액 − orderFee 환원)
```

`refType`에 `INNOPAY_TOPUP` 추가하여 자동 충전 거래를 식별.

### 3.2 신규 백엔드 API

| Method | Path | 권한 | 용도 |
|--------|------|------|------|
| `POST` | `/branch/{slug}/payments/vbank` | public | 고객 가상계좌 발급(주문+결제+HOLD 트랜잭션) |
| `GET` | `/branch/payments/{paymentId}` | public | 결제 상태 폴링 |
| `POST` | `/admin/payments/innopay/webhook` | 이노페이 IP/서명 | 입금/만료 통보 (멱등) |
| `GET` | `/admin/innopay/credentials` | 본사 admin | 자격증명 조회 |
| `PUT` | `/admin/innopay/credentials` | 본사 admin | 자격증명 변경 |
| `POST` | `/admin/branches/{id}/topup-vbank` | 본사 admin | 지사 충전용 vbank 발급/재발급 |
| `GET` | `/admin/payments/vbank` | 본사 admin | 가상계좌 결제 모니터링(필터: 상태/지사/기간) |
| `GET` | `/branch/{slug}/topup-vbank` | 지사 관리자 | 자기 충전용 가상계좌 정보 조회 |

### 3.3 멱등성 및 보안

- `payments`에 `(innopay_mode, innopay_tid)` 복합 UNIQUE — TEST/REAL 격리, 중복 입금통보 방어
- webhook 중복 수신 시 같은 `(mode, tid)`는 200으로 즉시 응답 (재시도 차단), DB 변경 없음
- 충전 자동 입금도 동일 키 구조(`(mode, innopay_tid)`)로 멱등 처리, 충전 거래에는 `refType='INNOPAY_TOPUP'` + `refId=tid` 저장
- **서명 검증**: 이노페이가 webhook 페이로드와 함께 서명 전달 → 백엔드는 `webhook_secret`으로 검증. 실패 시:
  - HTTP 401 응답
  - DB 변경 없음 (`webhook_events`에는 `signature_valid=false`로 기록)
  - 본사 텔레그램 알림 (`reference_telegram.md`의 봇 채널)
- IP allowlist는 인프라/nginx 단에서 추가 적용 (선택, 이중 방어)

---

## 4. 프론트엔드 변경 (본 레포)

### 4.1 신규/수정 페이지

| 경로 | 신규/수정 | 설명 |
|------|----------|------|
| `/branch/[slug]/payment` | 수정 | 결제수단 선택(카드/가상계좌) 추가. 카드 선택 시 기존 Toss 위젯, 가상계좌 선택 시 vbank 발급 페이지로 이동 |
| `/branch/[slug]/payment/vbank` | 신규 | 발급된 계좌번호·은행·예금주·마감일 안내, 폴링, DONE 시 success 이동 |
| `/branch/[slug]/payment/success` | 수정 | 가상계좌 입금완료도 처리(분기) |
| `/branch/[slug]/payment/fail` | 수정 | 가상계좌 만료/실패 처리 분기 |
| `/admin/innopay-credentials` | 신규 | 본사 자격증명 관리 (MID/Key/모드 TEST·REAL) |
| `/admin/payments/vbank` | 신규 | 가상계좌 모니터링 (입금대기/완료/만료/취소 필터, 지사·기간 필터) |
| `/admin/branches/[id]` | 수정 | 충전용 vbank 발급/재발급/조회 패널 추가 |
| `/admin/branches/[id]/wallet` | 수정 | `VBANK_HOLD`/`VBANK_SETTLE` 거래 라벨·색상 추가 |
| `/branch/[slug]/manage/wallet` (지사 관리자 대시보드 내) | 수정 | 지사가 자기 충전용 가상계좌 정보(은행/계좌번호/예금주) 표시 + 잔고 + 거래내역 |

### 4.2 신규 프론트엔드 타입

`src/lib/payments/types.ts` — 프론트엔드가 호출/소비하는 타입만:
```typescript
export interface InnopayVbankIssueRequest {
  orderId: string
  amount: number
  orderName: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
}

export interface InnopayVbankIssueResponse {
  paymentId: string
  innopayTid: string
  accountNumber: string
  bankCode: string
  bankName: string
  holderName: string
  dueDate: string  // ISO
  amount: number
}

export interface VbankPaymentStatusResponse {
  status: 'WAITING_FOR_DEPOSIT' | 'DONE' | 'EXPIRED' | 'CANCELED' | 'REVIEW_REQUIRED'
  paidAt?: string
  paidAmount?: number
}

export interface BranchTopupVbank {
  branchId: number
  accountNumber: string
  bankCode: string
  bankName: string
  holderName: string
  active: boolean
  issuedAt: string
}
```
> Webhook payload(`InnopayWebhookPayload`)는 백엔드 전용 타입이므로 본 프론트엔드 spec 범위 외.

### 4.3 신규 클라이언트 함수

`src/lib/branch/api.ts`:
```typescript
export async function issueInnopayVbank(slug: string, payload: InnopayVbankIssueRequest): Promise<InnopayVbankIssueResponse>
export async function pollPaymentStatus(paymentId: string): Promise<{ status: PaymentStatus; paidAt?: string }>
export async function getBranchTopupVbank(slug: string): Promise<BranchTopupVbank | null>
```

`src/lib/api/admin.ts`:
```typescript
export async function getInnopayCredentials(): Promise<InnopayCredentials>
export async function updateInnopayCredentials(payload: UpdateInnopayCredentialsRequest): Promise<InnopayCredentials>
export async function issueBranchTopupVbank(branchId: number): Promise<BranchTopupVbank>
export async function listVbankPayments(filters: VbankPaymentFilters): Promise<PageResult<VbankPaymentRow>>
```

### 4.4 상태 관리

- `usePaymentStore` (`src/lib/branch/payment-store.ts`) 확장:
  - 결제수단 선택 상태(`paymentMethod: 'CARD' | 'VBANK_INNOPAY'`)
  - 발급 결과(`vbankInfo: InnopayVbankIssueResponse | null`)
  - 폴링 상태(`pollingActive: boolean`)
- 폴링은 `useEffect` + `setInterval` (3초 간격, 마감시각 도달 시 자동 종료, 페이지 이탈 시 cleanup)

---

## 5. 결정사항 및 기본값

다음은 본 spec에서 합리적 기본값으로 확정한 항목. 추후 결정 필요 시 별도 이슈로 처리.

| 항목 | 결정 | 비고 |
|------|------|------|
| 본사 수수료 단가 | 기존 `orderFee`(default 500원, 지사별 override) 통합 사용 | 카드/가상계좌 동일 단가. 별도 vbank 단가 불필요 |
| 자격증명 보관 | DB `innopay_credentials` 단일 행, 본사 admin UI 관리 | env var 사용 안 함 |
| 충전금 부족 처리 | 가상계좌 발급 시점 사전 검사 → 거부, 사용자에게 "현재 가상계좌 결제를 사용할 수 없습니다" 안내. 카드 결제는 정상 진행 가능 | 본사 텔레그램 봇 채널(`reference_telegram.md`)로 알림 |
| 부분/초과 입금 | v1 범위 외. 전액 일치만 자동 DONE. 그 외엔 webhook 기록 + 본사 admin 알림 | v2에서 자동처리 검토 |
| 환불 | 본사가 별도 송금 + `ADJUST` 수동 등록 | 자동 환불 API v1 범위 외 |
| Toss 가상계좌 옵션 | Toss 위젯에서 가상계좌 옵션 비노출 | 가상계좌는 이노페이로만 |
| 충전용 vbank 발급 시점 | 본사 admin이 지사 상세 페이지에서 "이노페이 vbank 발급" 버튼으로 발급. 자동 발급 X | 영구 계좌라 신중 발급 |
| 충전용 vbank 재발급 | 가능 (이전 계좌는 비활성화). 재발급 시 지사 운영자에게 알림 | 분실/계좌 오류 시 |
| 만료 정책 | 이노페이 기본값(보통 24시간) 그대로. 별도 커스텀 X | 이노페이 정책 따름 |
| webhook 보안 | 이노페이 측 IP allowlist + 서명(`secret`) 검증 | 백엔드 작업 |

---

## 6. 작업 단계

본 spec은 세 개의 하위 시스템(자격증명·고객 vbank 결제·지사 충전 자동화)을 하나로 묶었지만, 인프라(webhook·자격증명·매핑)를 공유하므로 단일 plan으로 진행한다. 단계별 독립 배포 가능 여부를 명시한다.

1. **이노페이 API 가이드 정독** + 백엔드 API 사양 확정 (별도 작업, 본 레포 외)
2. **본 레포 프런트 단계**:
   1. 타입 정의(`src/lib/payments/types.ts`) + 클라이언트 함수 — _독립 배포 가능_
   2. 본사 admin 자격증명 페이지(`/admin/innopay-credentials`) — _독립 배포 가능_ (백엔드 mock 응답으로 먼저)
   3. 본사 admin: 지사 상세 페이지 충전용 vbank 발급 패널 — _독립 배포 가능_
   4. 지사 결제 페이지: 결제수단 선택 + 가상계좌 발급/안내 페이지 — 백엔드 vbank API + webhook 필요
   5. 본사 admin 모니터링 페이지(`/admin/payments/vbank`) — 백엔드 vbank 데이터 필요
   6. 지사 admin: 자기 충전용 vbank 정보 표시 + wallet 거래내역 신규 라벨 — _독립 배포 가능_ (mock 또는 점진 노출)
3. **백엔드 연동 후 e2e 테스트** (테스트 키 testpay01 / 모드 TEST)
4. **운영 키 발급** + `innopay_credentials.mode` REAL로 전환 + 프로덕션 배포 (zero-downtime, 기존 `deploy-zerodt.sh`)
5. **롤아웃**: 한 지사부터 시범 운영(충전용 vbank 발급 + 가상계좌 결제 일부 시간대), 1~2주 모니터링 후 전 지사 확대

---

## 7. 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| 이노페이 webhook 누락/지연 | 결제 완료 안 보임, 충전금 환원 누락 | 폴링 보완(고객 화면), 본사 admin 수동 정산 페이지(거래키로 강제 SETTLE) 제공 |
| 충전금 차감 후 vbank 발급 실패 | 충전금만 차감되고 결제 미진행 | 백엔드에서 단일 트랜잭션으로 묶어 발급 성공 후에만 HOLD 거래 commit |
| 멱등 키 충돌 | 같은 입금이 두 번 SETTLE → 충전금 과다 환원 | `(innopay_mode, innopay_tid)` 복합 UNIQUE + webhook 트랜잭션 SELECT FOR UPDATE |
| 만료 webhook 미수신 | 차감 그대로 남고 주문 상태도 PENDING | 백엔드 cron(매 시간) — 이노페이 조회 API로 만료 검증, 주문 EXPIRED 처리 |
| 충전용 vbank 분실/오발급 | 지사가 입금했는데 충전금 미반영 | 본사 admin 수동 매칭 페이지 (이노페이 입금 내역에서 거래키로 찾아 지사 매핑) |
| TEST 키 → REAL 키 전환 시 누락 | 테스트 결제가 운영 환경에 섞임 | `innopay_credentials.mode`로 명확히 구분, `payments.innopay_mode` 컬럼 + UNIQUE `(mode, tid)` 복합 제약, 프로덕션 환경 배포 시 REAL만 허용하는 가드 |
| 부분/초과 입금 (paid_amount ≠ amount) | 자동 정산 시 잘못된 금액으로 환원 | v1: `payments.status = REVIEW_REQUIRED`로 두고 자동 SETTLE 안 함, 본사 텔레그램 알림 → 본사 admin이 수동으로 처리 결정 |
| 폴링과 webhook 처리 시점 race | 클라이언트가 DONE 보지만 wallet 환원 미완 | webhook 처리 전체를 단일 RDB 트랜잭션으로 commit, 폴링은 commit 후 상태만 조회 (READ COMMITTED 격리에서도 안전) |

---

## 8. v1 범위 외 (후속 작업 후보)

- 부분/초과 입금 자동 처리
- 자동 환불 API (현재는 수동 송금 + ADJUST)
- 가상계좌 결제 통계 대시보드 (월별 매출/수수료)
- 지사 가상계좌 잔고를 지사 운영자가 출금하는 기능 (현재는 본사가 환불 형태로 처리)
- 카드 결제도 본사 통합 PG로 전환 (지금은 Toss per-branch 유지)
