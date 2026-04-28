# Innopay 가상계좌 — Phase 2: 고객 결제용 vbank + HOLD/SETTLE Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지사 홈페이지 고객이 가상계좌로 결제할 수 있게 하고, 발급 시점에 충전금에서 주문액을 선차감(HOLD), 입금 통보 시 (주문액 − orderFee)를 환원(SETTLE)하는 흐름을 end-to-end 구현.

**Architecture:** 기존 `payments` 테이블에 vbank/innopay 컬럼을 추가하고, Phase 1에서 만든 `InnopayClient.issueOneTimeVbank()` + webhook 인프라를 재사용한다. webhook은 vacctNo로 충전용(organizations) vs 결제용(payments) 라우팅 분기를 수행하고, 결제용은 단일 트랜잭션 내에서 payments 상태/wallet HOLD/SETTLE을 일관 commit한다. 프론트는 `/branch/[slug]/payment`에 결제수단 선택을 추가하고, vbank 선택 시 새 페이지에서 폴링한다.

**Tech Stack:** NestJS 10 (TypeScript) + MariaDB / Next.js 16 + React 19 + TanStack Query / vitest + jest

**Spec:** `docs/superpowers/specs/2026-04-27-innopay-vbank-design.md` (§ 2.1, 3.1 payments 확장, 4)

**Phase 1 베이스라인 (이미 운영 중)**:
- `innopay_credentials` (license_key_encrypted) — 자격증명
- `organizations.topup_vbank_*` 6컬럼 — 지사별 영구 vbank
- `webhook_events` — 감사 로그
- `innopay_topup_ledger` — 충전 멱등 ledger (PRIMARY KEY = transSeq)
- `InnopayClient.issueOneTimeVbank()` 메서드 (`apps/api/src/payments/providers/innopay/innopay.client.ts:41`) — Phase 2가 호출
- `InnopayWebhookService.handle()` (`...innopay-webhook.service.ts`) — 현재 모든 deposit을 `topupSvc.handleDeposit`로 라우팅. Phase 2에서 분기 추가.
- 4단 방어: nginx IP allowlist + mid 매칭 + transSeq 멱등 + amount > 0 (서명/HMAC 없음)

**Phase 1 spec과 다른 점 (실제 구현 베이스라인)**:
- 자격증명 컬럼은 `merchant_key`가 아니라 `license_key_encrypted`. 본 plan도 그 이름을 따른다.
- `webhook_secret` 컬럼/필드는 존재하지 않음. 본 plan에서 서명 검증 코드를 추가하지 않음.
- 멱등 키는 `(innopay_mode, innopay_tid)` 복합 UNIQUE가 아니라 `innopay_topup_ledger.innopay_tid` PK 단일. Phase 2 payments에는 별도 UNIQUE를 사용한다(아래 Chunk 2 참조).

**배포 정책**: Phase 2 plan/구현은 즉시 진행하되, **운영 배포는 Phase 1 시범 검증(1~2주, REAL 자격증명 전환 + 시범 지사 충전 입금 1회 이상 성공) 완료 후**에만 수행. 그전까지는 테스트 서버까지만 배포.

---

## Repos

| Repo | 경로 | 역할 |
|------|------|------|
| Backend | `D:\Work\AI_Projects\RunFlower\src\run_flower_backend_final_repo` | NestJS API |
| Frontend | `D:\Work\AI_Projects\RunFlower\src\Flower_Frontend_Web` | Next.js admin/branch web |

각 task 헤더에 `[Backend]` / `[Frontend]`로 대상 repo를 표시. `Files:` 섹션은 해당 repo 기준 상대경로.

---

## File Structure

### Backend (`run_flower_backend_final_repo/`)

```
migrations/
  042_payments_vbank_innopay.sql                  [new] payments 확장 (vbank_*, innopay_*, paid_amount)
  042_payments_vbank_innopay_rollback.sql         [new]
  043_payments_status_review_required.sql         [new] status ENUM에 REVIEW_REQUIRED 추가
  043_payments_status_review_required_rollback.sql [new]

apps/api/src/payments/
  payment.types.ts                                [extend] PaymentStatus 확장 + VbankIssueRequest/Response
  payment.db.ts                                   [extend] createVbankPayment, getById, setStatusToExpired, etc.
  payment.module.ts                               [extend] PaymentsVbankController/Service 등록

apps/api/src/payments/vbank/                      [new dir]
  payments-vbank.controller.ts                    POST /branch/:slug/payments/vbank, GET /branch/payments/:id
  payments-vbank.controller.spec.ts
  payments-vbank.service.ts                       발급 + HOLD 단일 트랜잭션
  payments-vbank.service.spec.ts
  payments-settle.service.ts                      webhook ORDER 입금 처리 (SETTLE) + 만료/취소 (EXPIRED/CANCELED)
  payments-settle.service.spec.ts
  payments-vbank.types.ts                         내부 타입
  dto/
    issue-vbank-request.dto.ts
    issue-vbank-response.dto.ts
    poll-status-response.dto.ts

apps/api/src/payments/providers/innopay/
  innopay-webhook.service.ts                      [extend] vacctNo 라우팅 분기 (TOPUP vs ORDER)
  innopay-webhook.service.spec.ts                 [extend] 분기 시나리오 추가
  innopay-order.service.ts                        [new] webhook ORDER 입금/취소 → payments-settle.service 호출 어댑터
  innopay-order.service.spec.ts                   [new]
  innopay.module.ts                               [extend] InnopayOrderService 등록

apps/api/src/payments/jobs/                       [extend dir]
  vbank-expiration.job.ts                         [new] 매시간 PENDING+만료 sweep
  vbank-expiration.job.spec.ts                    [new]

apps/api/src/admin/payments/                      [new dir]
  admin-payments-vbank.controller.ts              GET /admin/payments/vbank (필터/페이지)
  admin-payments-vbank.controller.spec.ts
  admin-payments-vbank.service.ts
  admin-payments-vbank.service.spec.ts
  admin-payments-vbank.module.ts

apps/api/src/wallets/
  wallet.constants.ts                             [extend] VBANK_HOLD/VBANK_SETTLE tx type, refType=PAYMENT
  wallet.service.ts                               [extend] applyVbankHold(branchId, paymentId, amount), applyVbankSettle(branchId, paymentId, netAmount, tid)
  wallet.service.spec.ts                          [extend]
```

### Frontend (`Flower_Frontend_Web/`)

```
src/lib/payments/
  vbank-payment-types.ts                          [new] InnopayVbankIssueRequest/Response, VbankPaymentStatus
  innopay-types.ts                                [extend] BranchTopupVbank 외 추가 타입 export

src/lib/branch/
  branch-payment-api.ts                           [extend] issueInnopayVbank, pollVbankPayment
  payment-store.ts                                [extend] paymentMethod 선택, vbankInfo, pollingActive

src/lib/api/
  admin-payments-vbank.ts                         [new] listVbankPayments

src/app/branch/[slug]/payment/
  page.tsx                                        [extend] 결제수단 선택 UI (CARD | VBANK)
  vbank/                                          [new dir]
    page.tsx                                      가상계좌 안내 + 폴링
    vbank-info-card.tsx                           계좌/은행/예금주/마감 표시
    use-vbank-poll.ts                             폴링 훅 (3초 간격, terminal status 시 종료, 마감 시각 도달 시 자동 종료)
  success/page.tsx                                [extend] vbank 분기 (paymentId 쿼리)
  fail/page.tsx                                   [extend] vbank 만료/취소 분기

src/app/admin/payments/vbank/                     [new dir]
  page.tsx                                        본사 모니터링 (필터 + 테이블)
  vbank-payments-table.tsx
  vbank-status-badge.tsx
  vbank-payments-filters.tsx

src/app/admin/branches/[id]/wallet/
  page.tsx                                        [extend] VBANK_HOLD/VBANK_SETTLE 라벨·색상

src/__tests__/
  vbank-payment-store.test.ts                     [new]
  use-vbank-poll.test.ts                          [new]
  vbank-payments-table.test.ts                    [new]
```

---

## Phase 2 결제·정산 흐름 (실제 구현 기준)

### 2.1 가상계좌 발급 (고객)

```
[1] 고객이 /branch/{slug}/payment 진입
    └─ 결제수단 선택: 카드(기존 Toss) | 가상계좌(신규)
    └─ "가상계좌" 선택 시 → POST /api/proxy/branch/{slug}/payments/vbank

[2] 백엔드: payments-vbank.service.issue() — 단일 트랜잭션
    a. 지사 충전금 잔액 ≥ 주문액 검증 (불충분 시 400 INSUFFICIENT_BALANCE)
    b. orders.id 조회 (paymentStore.orderData.orderId 그대로 사용 — 기존 흐름과 동일)
    c. InnopayClient.issueOneTimeVbank({ orderId: `vbnk-${orderId}-${ts}`, amount, ... })
       └─ 실패 시 트랜잭션 ROLLBACK, 예외 throw (충전금 미차감)
    d. payments INSERT:
       - provider='innopay'
       - method='VBANK_INNOPAY'
       - status='PENDING'
       - amount_total=주문액
       - vbank_account_number, vbank_bank_code, vbank_holder_name, vbank_due_date
       - innopay_tid (vbankApi 응답 tid), innopay_mode (cred.mode)
       - pg_order_id = `vbnk-${orderId}-${ts}` (== Innopay moid)
    e. branch_wallet_transactions INSERT:
       - type='VBANK_HOLD'
       - amount=-주문액
       - ref_type='PAYMENT'
       - ref_id=payments.id
       - actor_type='SYSTEM'
    f. 트랜잭션 commit

[3] 응답: { paymentId, accountNumber, bankCode, bankName, holderName, dueDate, amount }
    프론트: /branch/{slug}/payment/vbank?paymentId={paymentId} 로 이동
```

### 2.2 폴링 (고객)

```
[A] 프론트 useVbankPoll: 3초 간격 GET /api/proxy/branch/payments/{paymentId}
    └─ 응답: { status, paidAt?, paidAmount? }
    └─ terminal 상태(PAID|EXPIRED|CANCELED|REVIEW_REQUIRED) 시 폴링 종료
[B] 마감 시각 도달 시 자동 종료 → /branch/{slug}/payment/fail (만료 안내)
```

### 2.3 입금 통보 (webhook)

```
[1] 이노페이 → POST /api/proxy/admin/payments/innopay/webhook (Phase 1 endpoint 재사용)
[2] InnopayWebhookService.handle() — Phase 1 멱등/mid/amount 검증 후 dispatch:
    a. payload.vacctNo로 분기:
       - organizations.topup_vbank_account_number 매칭 → topupSvc.handleDeposit (Phase 1 그대로)
       - payments.vbank_account_number 매칭 → orderSvc.handleDeposit (신규)
       - 둘 다 미매칭 → webhook_events.processing_error="vbank not matched", 200 응답 (재시도 차단)
    b. 매칭이 둘 다 hit한 경우(이론적 불가, 운영 안전망): error log + ORDER 우선 처리
[3] InnopayOrderService.handleDeposit(payload, eventId) — 단일 트랜잭션
    a. payments 조회 (vbank_account_number=vacctNo AND status='PENDING')
       └─ 없으면 webhook_events.processing_error="payment not pending", 200 응답
    b. paid_amount = goodsAmt
    c. amount_total == paid_amount: 정상 케이스 → SETTLE 분기
       amount_total != paid_amount: REVIEW_REQUIRED 분기 (자동 SETTLE 안 함)
    d. SETTLE 분기:
       - payments.status='PAID', paid_at=now, amount_paid=goodsAmt
       - orders.status: 기존 결제 완료 흐름 재사용 (payment_success_hook.service.ts 호출 또는 동일 로직)
       - branch_wallet_transactions INSERT:
         - type='VBANK_SETTLE'
         - amount=+(amount_total − orderFee)
         - ref_type='PAYMENT', ref_id=paymentId
         - actor_type='WEBHOOK'
       - branch_wallet_transactions INSERT (orderFee 차감):
         - type='ORDER_FEE'
         - amount=-orderFee
         - ref_type='ORDER', ref_id=orderId
         - actor_type='WEBHOOK'
       - 단, 이 두 거래를 합쳐서 net VBANK_SETTLE 한 줄로 처리하는 옵션도 검토. **결정: 두 줄 분리** (회계 추적성 우선, 기존 카드결제 흐름과 동일하게 ORDER_FEE 별도 행을 유지)
       └─ 트랜잭션 commit. 폴링이 status=PAID를 보는 시점에 SETTLE/ORDER_FEE 모두 commit 완료.
    e. REVIEW_REQUIRED 분기:
       - payments.status='REVIEW_REQUIRED', paid_amount=goodsAmt
       - 본사 텔레그램 알림 (기존 channel)
       - HOLD 유지, SETTLE 안 함, ORDER_FEE 안 함
       - 본사 admin이 수동 처리 (Phase 2 v1 범위 외, 모니터링 페이지에서 관찰만)

[4] 취소 통보 (status=85):
    - payments.status='CANCELED', canceled_at=now
    - HOLD 그대로 유지 (지사 손실 확정 — 발급 후 취소는 비정상 케이스이며 본사 admin 수동 검토 대상)
    - 알림 텔레그램
```

### 2.4 만료 (cron)

```
매시간 정각:
  vbank-expiration.job.run()
    SELECT id, order_id FROM payments
    WHERE method='VBANK_INNOPAY' AND status='PENDING' AND vbank_due_date < NOW()
  for each:
    payments.status='CANCELED', fail_reason='VBANK_EXPIRED'
    HOLD 유지 (지사 손실 확정)
    payment_events INSERT (action='EXPIRED', payload=null)
    (orders 별도 처리: 별도 cancel job 또는 향후 정책 — 본 v1은 payments만 처리하고 orders는 그대로 둠)
```

> **결정: orders 상태는 이번 plan에서 변경하지 않음.** 카드결제 실패 흐름이 orders.status를 별도로 바꾸지 않는다는 기존 패턴을 유지. 필요 시 별도 follow-up.

---

## Decisions (Phase 2 한정)

| 항목 | 결정 | 비고 |
|------|------|------|
| payments 테이블 분리 vs 확장 | 기존 `payments` 확장 | 카드/vbank 통합 모니터링, 기존 created_at/updated_at 인프라 재사용 |
| `payments.status` ENUM 변경 | `REVIEW_REQUIRED` 추가 (`PENDING`은 Phase 1에서 이미 사용 중) | DDL: ALTER TABLE MODIFY COLUMN |
| 멱등 키 | `payments(vbank_account_number, status='PENDING')` 단일 행 + webhook side에서 `webhook_events`의 prior processed 검사 | 별도 (mode, tid) UNIQUE 추가하지 않음 — Phase 1 ledger와 일관 |
| HOLD/SETTLE/ORDER_FEE 회계 | 발급 시 HOLD(-amount), 입금 시 SETTLE(+amount) + ORDER_FEE(-fee) 별도 행 | 기존 카드결제 ORDER_FEE 흐름과 일관 |
| 부분/초과 입금 | `amount_total != paid_amount` 면 REVIEW_REQUIRED, 자동 SETTLE 안 함 | spec § 5와 일치 |
| 만료 시 HOLD 처리 | 그대로 유지 (지사 손실 확정) | spec § 2.1 |
| 충전금 부족 | 발급 시점에 거부, 카드 결제 안내 | 텔레그램 알림 1회 (지사명 + 잔액) |
| Toss 가상계좌 옵션 | Toss 위젯 가상계좌 비노출 (기존 코드 그대로 — 카드만) | 변경 없음 |
| webhook 라우팅 우선순위 | organizations.topup_vbank → payments.vbank → 미매칭 200 응답 | 둘 다 매칭 시 ORDER 우선 + error log |

---

## Cross-cutting Notes

- **트랜잭션 격리**: 모든 webhook 처리는 단일 RDB 트랜잭션, 격리 수준 READ COMMITTED. payments + branch_wallet_transactions를 한 트랜잭션 안에서 commit하므로 폴링 응답이 status='PAID'를 보는 순간 SETTLE도 가시화됨.
- **재고 없음**: 본 plan에는 재고 차감/되돌림 로직이 없다. 주문은 발급 시점에 이미 생성된 상태이며, 만료 시 orders는 변경하지 않는다(위 결정 참조).
- **브랜치 식별**: `payments` 행에 `branch_id`가 직접 없으면 `orders.branch_id` 또는 `orders.organization_id`를 join해서 사용. payments-vbank.service에서는 `meta_json.branchId`에 미리 박아두는 옵션도 있음. **결정: 신규 컬럼 추가하지 않고 orders join 사용** (기존 카드결제와 동일 패턴, 추가 컬럼/마이그레이션 절약).
- **테스트 격리**: `innopay_mode` 컬럼은 TEST/REAL 격리 표식이며, REAL 환경에서 TEST 거래를 settle하지 않도록 settle 시 cred.mode == payment.innopay_mode 일치를 검증.

---

## Chunk 1: Backend DB Migrations

> 본 chunk는 백엔드 repo만 수정. 두 마이그레이션은 멱등(IF NOT EXISTS / IDEMPOTENT 패턴) 작성, rollback 동봉.

### Task 1.1 [Backend]: Migration 042 — payments 확장

**Files:**
- Create: `migrations/042_payments_vbank_innopay.sql`
- Create: `migrations/042_payments_vbank_innopay_rollback.sql`

- [ ] **Step 1: Migration 042 작성**

`migrations/042_payments_vbank_innopay.sql`:

```sql
-- Migration: 042_payments_vbank_innopay
-- Description: 이노페이 가상계좌 도입 Phase 2 — payments 확장 (고객 결제용 vbank)
-- Date: 2026-04-28
-- Related spec: Flower_Frontend_Web/docs/superpowers/specs/2026-04-27-innopay-vbank-design.md
-- Related plan: Flower_Frontend_Web/docs/superpowers/plans/2026-04-28-innopay-vbank-phase2.md
-- Rollback:     migrations/042_payments_vbank_innopay_rollback.sql

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS vbank_account_number VARCHAR(50) NULL
    COMMENT '이노페이 발급 1회용 가상계좌 번호',
  ADD COLUMN IF NOT EXISTS vbank_bank_code VARCHAR(10) NULL
    COMMENT '가상계좌 은행코드',
  ADD COLUMN IF NOT EXISTS vbank_bank_name VARCHAR(50) NULL
    COMMENT '가상계좌 은행명',
  ADD COLUMN IF NOT EXISTS vbank_holder_name VARCHAR(100) NULL
    COMMENT '예금주명',
  ADD COLUMN IF NOT EXISTS vbank_due_date DATETIME NULL
    COMMENT '입금 마감 시각',
  ADD COLUMN IF NOT EXISTS innopay_tid VARCHAR(100) NULL
    COMMENT '이노페이 transSeq (vbankApi 응답 tid)',
  ADD COLUMN IF NOT EXISTS innopay_mode VARCHAR(10) NULL
    COMMENT 'TEST | REAL — credential mode와 페어링',
  ADD COLUMN IF NOT EXISTS paid_amount INT NULL
    COMMENT '실제 입금액 (webhook 시점 기록). amount_total과 다르면 REVIEW_REQUIRED';

-- 가상계좌 매칭용 INDEX. 활성 PENDING 행은 한 vbank에 1개여야 정상.
CREATE INDEX IF NOT EXISTS ix_payments_vbank_acct ON payments (vbank_account_number);

-- (innopay_mode, innopay_tid) 복합 INDEX (UNIQUE 아님 — 멱등은 webhook_events 측에서 처리, 여기서는 조회 효율만)
CREATE INDEX IF NOT EXISTS ix_payments_innopay_tid ON payments (innopay_mode, innopay_tid);
```

`migrations/042_payments_vbank_innopay_rollback.sql`:

```sql
-- Rollback for 042_payments_vbank_innopay
-- 주의: 이 컬럼들에 데이터가 들어간 뒤 롤백하면 데이터 영구 손실
ALTER TABLE payments
  DROP INDEX IF EXISTS ix_payments_vbank_acct,
  DROP INDEX IF EXISTS ix_payments_innopay_tid,
  DROP COLUMN IF EXISTS vbank_account_number,
  DROP COLUMN IF EXISTS vbank_bank_code,
  DROP COLUMN IF EXISTS vbank_bank_name,
  DROP COLUMN IF EXISTS vbank_holder_name,
  DROP COLUMN IF EXISTS vbank_due_date,
  DROP COLUMN IF EXISTS innopay_tid,
  DROP COLUMN IF EXISTS innopay_mode,
  DROP COLUMN IF EXISTS paid_amount;
```

- [ ] **Step 2: 로컬 검증 (테스트 DB)**

```bash
# 백엔드 repo에서
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/042_payments_vbank_innopay.sql
mysql -h 127.0.0.1 -u root -p<PW> run_flower -e "DESCRIBE payments" | grep -E "vbank|innopay|paid_amount"
```

Expected: 8개 컬럼 출력 (vbank_account_number, vbank_bank_code, vbank_bank_name, vbank_holder_name, vbank_due_date, innopay_tid, innopay_mode, paid_amount).

- [ ] **Step 3: Rollback 검증 + 재적용**

```bash
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/042_payments_vbank_innopay_rollback.sql
mysql -h 127.0.0.1 -u root -p<PW> run_flower -e "DESCRIBE payments" | grep -E "vbank|innopay|paid_amount" | wc -l
```

Expected: 0 (모두 제거됨)

```bash
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/042_payments_vbank_innopay.sql
```

Expected: 정상 재적용.

- [ ] **Step 4: Commit**

```bash
git add migrations/042_payments_vbank_innopay.sql migrations/042_payments_vbank_innopay_rollback.sql
git commit -m "feat(payments): add vbank/innopay columns to payments table (Phase 2 migration 042)"
```

---

### Task 1.2 [Backend]: Migration 043 — payments.status에 REVIEW_REQUIRED 추가

**Files:**
- Create: `migrations/043_payments_status_review_required.sql`
- Create: `migrations/043_payments_status_review_required_rollback.sql`

> **참고**: payments.status는 ENUM. ENUM 값 추가는 MariaDB에서 ALTER TABLE MODIFY COLUMN으로 수행하며, 기존 데이터는 보존된다 (값을 추가만 하므로).

- [ ] **Step 1: Migration 043 작성**

`migrations/043_payments_status_review_required.sql`:

```sql
-- Migration: 043_payments_status_review_required
-- Description: 이노페이 가상계좌 Phase 2 — payments.status에 REVIEW_REQUIRED 추가
-- Date: 2026-04-28
-- Rollback: migrations/043_payments_status_review_required_rollback.sql

ALTER TABLE payments
  MODIFY COLUMN status ENUM(
    'CREATED',
    'PENDING',
    'PAID',
    'FAILED',
    'CANCELED',
    'REFUNDED',
    'REVIEW_REQUIRED'
  ) NOT NULL DEFAULT 'CREATED'
  COMMENT 'REVIEW_REQUIRED: 부분/초과 입금 — 자동 SETTLE 보류, 본사 admin 수동 처리';
```

`migrations/043_payments_status_review_required_rollback.sql`:

```sql
-- Rollback for 043_payments_status_review_required
-- 주의: REVIEW_REQUIRED 상태인 행이 있으면 ALTER 실패. 사전에 모두 다른 상태로 변경 필요.
ALTER TABLE payments
  MODIFY COLUMN status ENUM(
    'CREATED',
    'PENDING',
    'PAID',
    'FAILED',
    'CANCELED',
    'REFUNDED'
  ) NOT NULL DEFAULT 'CREATED';
```

- [ ] **Step 2: 로컬 검증**

```bash
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/043_payments_status_review_required.sql
mysql -h 127.0.0.1 -u root -p<PW> run_flower -e "SHOW COLUMNS FROM payments LIKE 'status'"
```

Expected: ENUM에 REVIEW_REQUIRED 포함됨.

- [ ] **Step 3: Rollback 검증**

```bash
# 빈 DB에서:
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/043_payments_status_review_required_rollback.sql
mysql -h 127.0.0.1 -u root -p<PW> run_flower -e "SHOW COLUMNS FROM payments LIKE 'status'"
```

Expected: REVIEW_REQUIRED 미포함.

```bash
mysql -h 127.0.0.1 -u root -p<PW> run_flower < migrations/043_payments_status_review_required.sql
```

Expected: 재적용 정상.

- [ ] **Step 4: Commit**

```bash
git add migrations/043_payments_status_review_required.sql migrations/043_payments_status_review_required_rollback.sql
git commit -m "feat(payments): add REVIEW_REQUIRED status for vbank partial-deposit (Phase 2 migration 043)"
```

---

### Task 1.3 [Backend]: Wallet constants 확장 — VBANK_HOLD/SETTLE + refType=PAYMENT

**Files:**
- Modify: `apps/api/src/wallets/wallet.constants.ts`
- Test: `apps/api/src/wallets/wallet.constants.spec.ts` (없으면 신규)

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/wallets/wallet.constants.spec.ts`:

```typescript
import { WALLET_REF_TYPE, WalletTxType } from './wallet.constants';

describe('wallet.constants', () => {
  it('exposes VBANK_HOLD/VBANK_SETTLE tx types', () => {
    const types: WalletTxType[] = [
      'CHARGE',
      'REFUND',
      'ORDER_FEE',
      'SMS_FEE',
      'ADJUST',
      'VBANK_HOLD',
      'VBANK_SETTLE',
    ];
    types.forEach((t) => expect(typeof t).toBe('string'));
  });

  it('exposes PAYMENT refType', () => {
    expect(WALLET_REF_TYPE.PAYMENT).toBe('PAYMENT');
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- wallet.constants.spec.ts
```

Expected: FAIL — `WALLET_REF_TYPE.PAYMENT is undefined` 또는 type error.

- [ ] **Step 3: `wallet.constants.ts` 확장**

```typescript
export type WalletTxType =
  | 'CHARGE'
  | 'REFUND'
  | 'ORDER_FEE'
  | 'SMS_FEE'
  | 'ADJUST'
  | 'VBANK_HOLD'   // Phase 2: 가상계좌 발급 시 주문액 선차감 (음수)
  | 'VBANK_SETTLE'; // Phase 2: 입금 통보 시 환원 (양수, 일반적으로 = 주문액)
```

기존 `WALLET_REF_TYPE` 객체에 추가:

```typescript
export const WALLET_REF_TYPE = {
  ORDER: 'ORDER',
  SMS: 'SMS',
  MANUAL: 'MANUAL',
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  INNOPAY_TOPUP: 'INNOPAY_TOPUP',
  /** 이노페이 고객 결제용 가상계좌 거래. ref_id = payments.id (string) */
  PAYMENT: 'PAYMENT',
} as const;
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- wallet.constants.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/wallets/wallet.constants.ts apps/api/src/wallets/wallet.constants.spec.ts
git commit -m "feat(wallets): add VBANK_HOLD/VBANK_SETTLE tx types and PAYMENT refType (Phase 2)"
```

---

## Chunk 2: Backend — Wallet Service Extensions + Payment DAO Extensions

> 본 chunk는 service 단위에 `applyVbankHold` / `applyVbankSettle`, payment DAO에 vbank 전용 메서드 추가. 모든 메서드는 단일 트랜잭션 내에서 wallet + payments + ledger 갱신을 함께 처리.

### Task 2.1 [Backend]: WalletService.applyVbankHold (음수 차감, 잔액 부족 거부)

**Files:**
- Modify: `apps/api/src/wallets/wallet.service.ts`
- Modify: `apps/api/src/wallets/wallet.service.spec.ts`

> **호출 컨텍스트**: 가상계좌 발급 직후 호출. 기존 `debit()`과 비슷하지만 type='VBANK_HOLD', refType='PAYMENT', actorType='SYSTEM'으로 고정. 외부에서 트랜잭션 conn을 주입받을 수 있어야 함 (payments INSERT와 동일 트랜잭션).

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/wallets/wallet.service.spec.ts`에 추가:

```typescript
describe('applyVbankHold', () => {
  it('debits wallet by amount with type=VBANK_HOLD, refType=PAYMENT, actorType=SYSTEM', async () => {
    // setup: branch with balance 100_000
    const result = await svc.applyVbankHold(
      { branchId: BRANCH_ID, paymentId: 999, amount: 50_000 },
      // 외부 트랜잭션 미사용 시 자동 처리
    );
    expect(result.ok).toBe(true);
    expect(result.balanceAfter).toBe(50_000);

    const tx = await fetchLatestTx(BRANCH_ID);
    expect(tx.type).toBe('VBANK_HOLD');
    expect(tx.amount).toBe(-50_000);
    expect(tx.ref_type).toBe('PAYMENT');
    expect(tx.ref_id).toBe('999');
    expect(tx.actor_type).toBe('SYSTEM');
  });

  it('returns INSUFFICIENT_BALANCE when balance < amount', async () => {
    // setup: branch with balance 10_000
    const result = await svc.applyVbankHold({
      branchId: BRANCH_ID,
      paymentId: 999,
      amount: 50_000,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_BALANCE');
    expect(result.balanceAfter).toBe(10_000); // 변동 없음
  });

  it('rejects amount <= 0', async () => {
    await expect(
      svc.applyVbankHold({ branchId: BRANCH_ID, paymentId: 999, amount: 0 }),
    ).rejects.toThrow();
    await expect(
      svc.applyVbankHold({ branchId: BRANCH_ID, paymentId: 999, amount: -1 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- wallet.service.spec.ts
```

Expected: FAIL — `svc.applyVbankHold is not a function`.

- [ ] **Step 3: WalletService에 applyVbankHold 구현**

`apps/api/src/wallets/wallet.service.ts`에 추가:

```typescript
export interface VbankHoldInput {
  branchId: number;
  paymentId: number;
  amount: number; // 양수 — 내부에서 음수로 변환
}

export interface VbankHoldResult {
  ok: boolean;
  reason?: 'INSUFFICIENT_BALANCE';
  balanceAfter: number;
}

async applyVbankHold(input: VbankHoldInput): Promise<VbankHoldResult> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new BadRequestException('VBANK_HOLD amount must be positive integer');
  }
  // 기존 debit() 와 동일한 트랜잭션 패턴 — type/refType만 고정
  return this.debit({
    branchId: input.branchId,
    amount: input.amount,
    type: 'VBANK_HOLD' as WalletTxType,
    refType: 'PAYMENT',
    refId: String(input.paymentId),
    memo: null,
    actorType: 'SYSTEM',
    actorId: null,
    allowNegative: false,
  });
}
```

> **주의**: 기존 `debit()`이 `type` 인자를 받지 않으면 (즉 type='SMS_FEE' 같은 식으로 호출자가 결정 안 하는 구조라면) `debit` 시그니처를 확장. 실제 코드 보고 결정. **Step 3 작업자는 `wallet.service.ts:280` 부근의 `debit()` 시그니처를 먼저 확인하고, type을 받지 않는 구조면 `applyVbankHold` 내부에서 직접 conn 트랜잭션을 작성**.

직접 트랜잭션 패턴 (debit이 type 인자를 안 받을 때):

```typescript
async applyVbankHold(input: VbankHoldInput): Promise<VbankHoldResult> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new BadRequestException('VBANK_HOLD amount must be positive integer');
  }
  const conn = await this.pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`INSERT IGNORE INTO branch_wallets (branch_id, balance) VALUES (?, 0)`, [input.branchId]);
    const [lockRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT balance FROM branch_wallets WHERE branch_id = ? FOR UPDATE`,
      [input.branchId],
    );
    const before = Number(lockRows?.[0]?.balance ?? 0);
    if (before < input.amount) {
      await conn.rollback();
      return { ok: false, reason: 'INSUFFICIENT_BALANCE', balanceAfter: before };
    }
    const after = before - input.amount;
    await conn.query(`UPDATE branch_wallets SET balance = ? WHERE branch_id = ?`, [after, input.branchId]);
    await conn.query(
      `INSERT INTO branch_wallet_transactions
         (branch_id, type, amount, balance_after, ref_type, ref_id, memo, actor_type, actor_id)
       VALUES (?, 'VBANK_HOLD', ?, ?, 'PAYMENT', ?, NULL, 'SYSTEM', NULL)`,
      [input.branchId, -input.amount, after, String(input.paymentId)],
    );
    await conn.commit();
    return { ok: true, balanceAfter: after };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- wallet.service.spec.ts
```

Expected: PASS — 3개 테스트 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/wallets/wallet.service.ts apps/api/src/wallets/wallet.service.spec.ts
git commit -m "feat(wallets): add applyVbankHold with insufficient-balance guard (Phase 2)"
```

---

### Task 2.2 [Backend]: WalletService.applyVbankSettle (양수 환원 + ORDER_FEE 별도 행)

**Files:**
- Modify: `apps/api/src/wallets/wallet.service.ts`
- Modify: `apps/api/src/wallets/wallet.service.spec.ts`

> **호출 컨텍스트**: webhook ORDER 입금 통보 시 호출. amount_total과 paid_amount가 일치하는 경우만. 동일 트랜잭션 내에서 VBANK_SETTLE(+amount_total) 1행 + ORDER_FEE(-orderFee) 1행을 INSERT. 잔액 변화는 net = amount_total − orderFee.

- [ ] **Step 1: 실패하는 테스트 작성**

`wallet.service.spec.ts`에 추가:

```typescript
describe('applyVbankSettle', () => {
  it('inserts VBANK_SETTLE + ORDER_FEE rows in single transaction (net = amount - orderFee)', async () => {
    // setup: branch balance after HOLD = 50_000 (이미 50_000 차감됨)
    const before = await fetchBalance(BRANCH_ID);
    expect(before).toBe(50_000);

    const result = await svc.applyVbankSettle({
      branchId: BRANCH_ID,
      paymentId: 999,
      orderId: 1234,
      amount: 50_000, // = amount_total
      orderFee: 500,
    });

    expect(result.ok).toBe(true);
    expect(result.balanceAfter).toBe(50_000 + 50_000 - 500); // 99_500

    const txs = await fetchRecentTxs(BRANCH_ID, 2);
    // 가장 최근이 ORDER_FEE, 그 전이 VBANK_SETTLE
    expect(txs[1].type).toBe('VBANK_SETTLE');
    expect(txs[1].amount).toBe(50_000);
    expect(txs[1].ref_type).toBe('PAYMENT');
    expect(txs[1].ref_id).toBe('999');
    expect(txs[1].actor_type).toBe('WEBHOOK');

    expect(txs[0].type).toBe('ORDER_FEE');
    expect(txs[0].amount).toBe(-500);
    expect(txs[0].ref_type).toBe('ORDER');
    expect(txs[0].ref_id).toBe('1234');
  });

  it('rejects amount <= 0', async () => {
    await expect(
      svc.applyVbankSettle({
        branchId: BRANCH_ID, paymentId: 999, orderId: 1234, amount: 0, orderFee: 500,
      }),
    ).rejects.toThrow();
  });

  it('rejects orderFee < 0', async () => {
    await expect(
      svc.applyVbankSettle({
        branchId: BRANCH_ID, paymentId: 999, orderId: 1234, amount: 50_000, orderFee: -1,
      }),
    ).rejects.toThrow();
  });

  it('handles orderFee=0 (지사 수수료 면제 케이스)', async () => {
    const result = await svc.applyVbankSettle({
      branchId: BRANCH_ID, paymentId: 999, orderId: 1234, amount: 50_000, orderFee: 0,
    });
    expect(result.ok).toBe(true);
    // ORDER_FEE 행은 amount=0으로 INSERT되지 않고 skip됨
    const txs = await fetchRecentTxs(BRANCH_ID, 2);
    expect(txs[0].type).toBe('VBANK_SETTLE'); // 가장 최근이 SETTLE 1줄뿐
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- wallet.service.spec.ts
```

Expected: FAIL — `svc.applyVbankSettle is not a function`.

- [ ] **Step 3: applyVbankSettle 구현**

`wallet.service.ts`에 추가:

```typescript
export interface VbankSettleInput {
  branchId: number;
  paymentId: number;
  orderId: number;
  amount: number;     // amount_total — 양수
  orderFee: number;   // 0 이상
}

export interface VbankSettleResult {
  ok: boolean;
  balanceAfter: number;
}

async applyVbankSettle(input: VbankSettleInput): Promise<VbankSettleResult> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new BadRequestException('VBANK_SETTLE amount must be positive integer');
  }
  if (!Number.isInteger(input.orderFee) || input.orderFee < 0) {
    throw new BadRequestException('orderFee must be non-negative integer');
  }
  const conn = await this.pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`INSERT IGNORE INTO branch_wallets (branch_id, balance) VALUES (?, 0)`, [input.branchId]);
    const [lockRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT balance FROM branch_wallets WHERE branch_id = ? FOR UPDATE`,
      [input.branchId],
    );
    const before = Number(lockRows?.[0]?.balance ?? 0);

    // 1) SETTLE +amount_total
    const afterSettle = before + input.amount;
    await conn.query(`UPDATE branch_wallets SET balance = ?, low_alert_sent_at = NULL WHERE branch_id = ?`, [afterSettle, input.branchId]);
    await conn.query(
      `INSERT INTO branch_wallet_transactions
         (branch_id, type, amount, balance_after, ref_type, ref_id, memo, actor_type, actor_id)
       VALUES (?, 'VBANK_SETTLE', ?, ?, 'PAYMENT', ?, NULL, 'WEBHOOK', NULL)`,
      [input.branchId, input.amount, afterSettle, String(input.paymentId)],
    );

    // 2) ORDER_FEE −orderFee (orderFee=0이면 skip)
    let finalBalance = afterSettle;
    if (input.orderFee > 0) {
      finalBalance = afterSettle - input.orderFee;
      await conn.query(`UPDATE branch_wallets SET balance = ? WHERE branch_id = ?`, [finalBalance, input.branchId]);
      await conn.query(
        `INSERT INTO branch_wallet_transactions
           (branch_id, type, amount, balance_after, ref_type, ref_id, memo, actor_type, actor_id)
         VALUES (?, 'ORDER_FEE', ?, ?, 'ORDER', ?, NULL, 'WEBHOOK', NULL)`,
        [input.branchId, -input.orderFee, finalBalance, String(input.orderId)],
      );
    }
    await conn.commit();
    return { ok: true, balanceAfter: finalBalance };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- wallet.service.spec.ts
```

Expected: PASS — 4개 신규 테스트 모두 통과 + 기존 테스트 영향 없음.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/wallets/wallet.service.ts apps/api/src/wallets/wallet.service.spec.ts
git commit -m "feat(wallets): add applyVbankSettle with paired ORDER_FEE row (Phase 2)"
```

---

### Task 2.3 [Backend]: PaymentDb 확장 — vbank 전용 CRUD

**Files:**
- Modify: `apps/api/src/payments/payment.db.ts`
- Modify: `apps/api/src/payments/payment.db.spec.ts` (없으면 신규 생성)

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/payments/payment.db.spec.ts`:

```typescript
import { PaymentDb } from './payment.db';
import { Pool } from 'mysql2/promise';

describe('PaymentDb (vbank extensions)', () => {
  let db: PaymentDb;
  let pool: Pool;
  // setup pool fixture (DI from test module 또는 in-memory mariadb)

  it('createVbankPayment inserts row with provider=innopay, method=VBANK_INNOPAY, status=PENDING', async () => {
    const id = await db.createVbankPayment({
      orderId: 1,
      amountTotal: 50_000,
      vbankAccountNumber: '1234567890',
      vbankBankCode: '004',
      vbankBankName: '국민',
      vbankHolderName: '홍길동',
      vbankDueDate: new Date('2026-04-29T23:59:59Z'),
      innopayTid: 'tid-abc',
      innopayMode: 'TEST',
      pgOrderId: 'vbnk-1-1714291200',
    });
    expect(id).toBeGreaterThan(0);

    const row = await db.findById(id);
    expect(row.provider).toBe('innopay');
    expect(row.method).toBe('VBANK_INNOPAY');
    expect(row.status).toBe('PENDING');
    expect(row.amount_total).toBe(50_000);
    expect(row.vbank_account_number).toBe('1234567890');
    expect(row.innopay_tid).toBe('tid-abc');
    expect(row.innopay_mode).toBe('TEST');
  });

  it('findPendingVbankByAccount returns row only when status=PENDING', async () => {
    const id = await db.createVbankPayment({ /* ... */ vbankAccountNumber: '9999' });
    const found = await db.findPendingVbankByAccount('9999');
    expect(found?.id).toBe(id);

    await db.markPaid(id, { paidAt: new Date(), paidAmount: 50_000 });
    const notFound = await db.findPendingVbankByAccount('9999');
    expect(notFound).toBeNull();
  });

  it('markPaid sets status=PAID, paid_at, amount_paid, paid_amount', async () => {
    const id = await db.createVbankPayment({ /* ... */ amountTotal: 50_000 });
    const paidAt = new Date();
    await db.markPaid(id, { paidAt, paidAmount: 50_000 });
    const row = await db.findById(id);
    expect(row.status).toBe('PAID');
    expect(row.amount_paid).toBe(50_000);
    expect(row.paid_amount).toBe(50_000);
    expect(new Date(row.paid_at).getTime()).toBeCloseTo(paidAt.getTime(), -2);
  });

  it('markReviewRequired sets status=REVIEW_REQUIRED + paid_amount', async () => {
    const id = await db.createVbankPayment({ /* ... */ amountTotal: 50_000 });
    await db.markReviewRequired(id, { paidAmount: 49_000 });
    const row = await db.findById(id);
    expect(row.status).toBe('REVIEW_REQUIRED');
    expect(row.paid_amount).toBe(49_000);
  });

  it('markCanceled sets status=CANCELED, canceled_at, fail_reason', async () => {
    const id = await db.createVbankPayment({ /* ... */ });
    await db.markCanceled(id, { canceledAt: new Date(), reason: 'VBANK_EXPIRED' });
    const row = await db.findById(id);
    expect(row.status).toBe('CANCELED');
    expect(row.fail_reason).toBe('VBANK_EXPIRED');
  });

  it('listPendingExpired returns rows with method=VBANK_INNOPAY AND status=PENDING AND vbank_due_date < now', async () => {
    // 만료된 1건 + 미만료 1건 fixture
    const rows = await db.listPendingExpired(new Date());
    expect(rows.map((r) => r.id)).toContain(expiredId);
    expect(rows.map((r) => r.id)).not.toContain(activeId);
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- payment.db.spec.ts
```

Expected: FAIL — `db.createVbankPayment is not a function` 등.

- [ ] **Step 3: PaymentDb 메서드 추가**

`payment.db.ts`에 추가:

```typescript
export interface CreateVbankPaymentInput {
  orderId: number;
  amountTotal: number;
  vbankAccountNumber: string;
  vbankBankCode: string;
  vbankBankName: string | null;
  vbankHolderName: string;
  vbankDueDate: Date;
  innopayTid: string;
  innopayMode: 'TEST' | 'REAL';
  pgOrderId: string; // Innopay moid
}

async createVbankPayment(p: CreateVbankPaymentInput): Promise<number> {
  const [res] = await this.pool.query<any>(
    `INSERT INTO payments (
       order_id, provider, method, status, amount_total,
       vbank_account_number, vbank_bank_code, vbank_bank_name,
       vbank_holder_name, vbank_due_date,
       innopay_tid, innopay_mode, pg_order_id, requested_at
     ) VALUES (?, 'innopay', 'VBANK_INNOPAY', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      p.orderId, p.amountTotal,
      p.vbankAccountNumber, p.vbankBankCode, p.vbankBankName,
      p.vbankHolderName, p.vbankDueDate,
      p.innopayTid, p.innopayMode, p.pgOrderId,
    ],
  );
  return Number(res.insertId);
}

async findById(id: number) {
  const [rows] = await this.pool.query<any[]>(`SELECT * FROM payments WHERE id = ? LIMIT 1`, [id]);
  return rows?.[0] ?? null;
}

async findPendingVbankByAccount(accountNumber: string) {
  const [rows] = await this.pool.query<any[]>(
    `SELECT * FROM payments
     WHERE vbank_account_number = ? AND method = 'VBANK_INNOPAY' AND status = 'PENDING'
     ORDER BY id DESC LIMIT 1`,
    [accountNumber],
  );
  return rows?.[0] ?? null;
}

async markPaid(paymentId: number, fields: { paidAt: Date; paidAmount: number }): Promise<void> {
  await this.pool.query(
    `UPDATE payments
     SET status = 'PAID', paid_at = ?, amount_paid = ?, paid_amount = ?
     WHERE id = ?`,
    [fields.paidAt, fields.paidAmount, fields.paidAmount, paymentId],
  );
}

async markReviewRequired(paymentId: number, fields: { paidAmount: number }): Promise<void> {
  await this.pool.query(
    `UPDATE payments SET status = 'REVIEW_REQUIRED', paid_amount = ? WHERE id = ?`,
    [fields.paidAmount, paymentId],
  );
}

async markCanceled(paymentId: number, fields: { canceledAt: Date; reason: string }): Promise<void> {
  await this.pool.query(
    `UPDATE payments SET status = 'CANCELED', canceled_at = ?, fail_reason = ? WHERE id = ?`,
    [fields.canceledAt, fields.reason, paymentId],
  );
}

async listPendingExpired(now: Date) {
  const [rows] = await this.pool.query<any[]>(
    `SELECT id, order_id, vbank_account_number, amount_total
     FROM payments
     WHERE method = 'VBANK_INNOPAY' AND status = 'PENDING' AND vbank_due_date < ?
     ORDER BY id ASC LIMIT 500`,
    [now],
  );
  return rows ?? [];
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- payment.db.spec.ts
```

Expected: PASS — 6개 테스트 모두 통과.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/payment.db.ts apps/api/src/payments/payment.db.spec.ts
git commit -m "feat(payments): add vbank-specific DAO methods to PaymentDb (Phase 2)"
```

---

## Chunk 3: Backend — Issue Vbank Service + Controller (POST + Polling)

> 본 chunk는 고객 가상계좌 발급 + 폴링 endpoint 구현. **트랜잭션 일관성**(Innopay 호출 → payments INSERT → wallet HOLD를 단일 흐름으로 처리)이 핵심.

### Task 3.1 [Backend]: payments-vbank.service — issue() 메서드

**Files:**
- Create: `apps/api/src/payments/vbank/payments-vbank.service.ts`
- Create: `apps/api/src/payments/vbank/payments-vbank.service.spec.ts`
- Create: `apps/api/src/payments/vbank/dto/issue-vbank-request.dto.ts`
- Create: `apps/api/src/payments/vbank/dto/issue-vbank-response.dto.ts`
- Create: `apps/api/src/payments/vbank/payments-vbank.types.ts`

> **흐름**: orderId로 orders 조회 → branch_id 추출 → 충전금 사전 검사 → InnopayClient.issueOneTimeVbank → payments INSERT → applyVbankHold → 응답. 발급 후 HOLD 실패 시 발급된 vbank는 그대로 두고 payments 행은 INSERT 안 됨(트랜잭션 ROLLBACK). 영구 부작용은 Innopay 측 vbank만 남으나 사용 불가(payments 행 없음 → webhook 매칭 안 됨).

- [ ] **Step 1: 실패하는 테스트 작성**

`payments-vbank.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PaymentsVbankService } from './payments-vbank.service';
import { InnopayClient } from '../providers/innopay/innopay.client';
import { InnopayCredentialsService } from '../providers/innopay/innopay-credentials.service';
import { PaymentDb } from '../payment.db';
import { WalletService } from '../../wallets/wallet.service';
import { OrdersService } from '../../orders/orders.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

describe('PaymentsVbankService.issue', () => {
  let svc: PaymentsVbankService;
  let innopay: jest.Mocked<InnopayClient>;
  let credSvc: jest.Mocked<InnopayCredentialsService>;
  let paymentDb: jest.Mocked<PaymentDb>;
  let walletSvc: jest.Mocked<WalletService>;
  let ordersSvc: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    innopay = { issueOneTimeVbank: jest.fn() } as any;
    credSvc = { getDecrypted: jest.fn() } as any;
    paymentDb = { createVbankPayment: jest.fn(), findById: jest.fn() } as any;
    walletSvc = { applyVbankHold: jest.fn() } as any;
    ordersSvc = { getById: jest.fn() } as any;

    const module = await Test.createTestingModule({
      providers: [
        PaymentsVbankService,
        { provide: InnopayClient, useValue: innopay },
        { provide: InnopayCredentialsService, useValue: credSvc },
        { provide: PaymentDb, useValue: paymentDb },
        { provide: WalletService, useValue: walletSvc },
        { provide: OrdersService, useValue: ordersSvc },
      ],
    }).compile();
    svc = module.get(PaymentsVbankService);
  });

  it('issues vbank and creates payment + HOLD on happy path', async () => {
    ordersSvc.getById.mockResolvedValue({
      id: 1, organization_id: 10, total_price: 50_000, customer_name: '홍길동', customer_phone: '01012345678',
    } as any);
    credSvc.getDecrypted.mockResolvedValue({ mode: 'TEST', merchantId: 'm', licenseKey: 'k', apiBaseUrl: 'https://api.innopay.co.kr' });
    walletSvc.applyVbankHold.mockResolvedValue({ ok: true, balanceAfter: 950_000 });
    innopay.issueOneTimeVbank.mockResolvedValue({
      innopayTid: 'tid-1', accountNumber: '1234567890', bankCode: '004', bankName: '국민', holderName: '홍길동', dueDate: '20260429',
    });
    paymentDb.createVbankPayment.mockResolvedValue(999);

    const result = await svc.issue({ orderId: 1, orderName: '꽃다발' });

    expect(result.paymentId).toBe(999);
    expect(result.accountNumber).toBe('1234567890');
    expect(result.bankCode).toBe('004');
    expect(result.bankName).toBe('국민');
    expect(result.amount).toBe(50_000);

    expect(walletSvc.applyVbankHold).toHaveBeenCalledWith({
      branchId: 10, paymentId: 999, amount: 50_000,
    });
  });

  it('throws BadRequestException when balance is insufficient (검사 실패 시 Innopay 미호출)', async () => {
    ordersSvc.getById.mockResolvedValue({ id: 1, organization_id: 10, total_price: 50_000, customer_name: '홍' } as any);
    credSvc.getDecrypted.mockResolvedValue({ mode: 'TEST', merchantId: 'm', licenseKey: 'k', apiBaseUrl: 'x' });
    walletSvc.applyVbankHold = jest.fn(); // 미호출 검증용
    // pre-check 단계에서 잔액 조회 stub 필요
    (svc as any).walletReader = { getBalance: jest.fn().mockResolvedValue(10_000) };

    await expect(svc.issue({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(BadRequestException);
    expect(innopay.issueOneTimeVbank).not.toHaveBeenCalled();
    expect(walletSvc.applyVbankHold).not.toHaveBeenCalled();
  });

  it('rolls back when applyVbankHold returns INSUFFICIENT_BALANCE (race condition)', async () => {
    ordersSvc.getById.mockResolvedValue({ id: 1, organization_id: 10, total_price: 50_000, customer_name: '홍' } as any);
    credSvc.getDecrypted.mockResolvedValue({ mode: 'TEST', merchantId: 'm', licenseKey: 'k', apiBaseUrl: 'x' });
    innopay.issueOneTimeVbank.mockResolvedValue({
      innopayTid: 'tid-1', accountNumber: '1234567890', bankCode: '004', holderName: '홍', dueDate: '20260429',
    });
    paymentDb.createVbankPayment.mockResolvedValue(999);
    walletSvc.applyVbankHold.mockResolvedValue({ ok: false, reason: 'INSUFFICIENT_BALANCE', balanceAfter: 10_000 });

    await expect(svc.issue({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(BadRequestException);
    // payment 행은 INSERT 됐지만 race로 거부 — 다음 단계에서 cleanup or REVIEW로 마킹
    // **결정**: race 발생 시 payments 행은 INSERT되지만 HOLD 실패 → status를 'FAILED'로 직접 마킹하고 throw.
  });

  it('throws ServiceUnavailable when Innopay credentials missing', async () => {
    ordersSvc.getById.mockResolvedValue({ id: 1, organization_id: 10, total_price: 50_000, customer_name: '홍' } as any);
    credSvc.getDecrypted.mockResolvedValue(null);

    await expect(svc.issue({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('throws when Innopay client rejects (network/PG error)', async () => {
    ordersSvc.getById.mockResolvedValue({ id: 1, organization_id: 10, total_price: 50_000, customer_name: '홍' } as any);
    credSvc.getDecrypted.mockResolvedValue({ mode: 'TEST', merchantId: 'm', licenseKey: 'k', apiBaseUrl: 'x' });
    innopay.issueOneTimeVbank.mockRejectedValue(new ServiceUnavailableException('PG fail'));

    await expect(svc.issue({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(ServiceUnavailableException);
    expect(paymentDb.createVbankPayment).not.toHaveBeenCalled();
    expect(walletSvc.applyVbankHold).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- payments-vbank.service.spec.ts
```

Expected: FAIL — 모듈/클래스 없음.

- [ ] **Step 3: types/dto 작성**

`apps/api/src/payments/vbank/payments-vbank.types.ts`:

```typescript
export interface IssueVbankInput {
  orderId: number;
  orderName: string;        // 발급 시 PG에 전달할 상품명
  customerName?: string;    // orders 행에서 fallback
  customerPhone?: string;
}

export interface IssueVbankOutput {
  paymentId: number;
  innopayTid: string;
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  holderName: string;
  dueDate: string;          // ISO 8601
  amount: number;
}

export type VbankPaymentStatus =
  | 'PENDING'         // 발급됨, 입금 대기
  | 'PAID'            // 입금 완료, SETTLE 완료
  | 'CANCELED'        // 만료/취소
  | 'REVIEW_REQUIRED' // 부분/초과 입금
  | 'FAILED';         // 발급 시점 실패

export interface PollVbankStatusOutput {
  status: VbankPaymentStatus;
  paidAt: string | null;     // ISO 8601
  paidAmount: number | null;
}
```

`apps/api/src/payments/vbank/dto/issue-vbank-request.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class IssueVbankRequestDto {
  @ApiProperty({ description: '주문 ID', example: 1234 })
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty({ description: '상품명 (PG 표시용)', example: '꽃다발 주문' })
  @IsString()
  @MaxLength(100)
  orderName!: string;

  @ApiProperty({ description: '고객명 (orders에서 fallback)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerName?: string;

  @ApiProperty({ description: '고객 휴대폰 (digits-only)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;
}
```

`apps/api/src/payments/vbank/dto/issue-vbank-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class IssueVbankResponseDto {
  @ApiProperty() paymentId!: number;
  @ApiProperty() innopayTid!: string;
  @ApiProperty() accountNumber!: string;
  @ApiProperty() bankCode!: string;
  @ApiProperty({ nullable: true }) bankName!: string | null;
  @ApiProperty() holderName!: string;
  @ApiProperty({ description: '입금 마감 시각 ISO 8601' }) dueDate!: string;
  @ApiProperty() amount!: number;
}
```

- [ ] **Step 4: payments-vbank.service.ts 구현**

```typescript
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InnopayClient } from '../providers/innopay/innopay.client';
import { InnopayCredentialsService } from '../providers/innopay/innopay-credentials.service';
import { PaymentDb } from '../payment.db';
import { WalletService } from '../../wallets/wallet.service';
import { OrdersService } from '../../orders/orders.service';
import { IssueVbankInput, IssueVbankOutput } from './payments-vbank.types';

@Injectable()
export class PaymentsVbankService {
  constructor(
    private readonly innopay: InnopayClient,
    private readonly credSvc: InnopayCredentialsService,
    private readonly paymentDb: PaymentDb,
    private readonly walletSvc: WalletService,
    private readonly ordersSvc: OrdersService,
  ) {}

  async issue(input: IssueVbankInput): Promise<IssueVbankOutput> {
    // 1. order 조회 + 검증
    const order = await this.ordersSvc.getById(input.orderId);
    if (!order) {
      throw new BadRequestException('order not found');
    }
    const branchId = Number(order.organization_id);
    const amount = Number(order.total_price);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('invalid order amount');
    }
    const customerName = input.customerName ?? order.customer_name ?? '고객';

    // 2. cred 확인
    const cred = await this.credSvc.getDecrypted();
    if (!cred) {
      throw new ServiceUnavailableException('Innopay credentials not configured');
    }

    // 3. Innopay 발급 — moid는 vbnk-{orderId}-{ts} (멱등 조회 키)
    const ts = Date.now();
    const moid = `vbnk-${input.orderId}-${ts}`;
    const issued = await this.innopay.issueOneTimeVbank({
      orderId: moid,
      orderName: input.orderName,
      amount,
      customerName,
      customerPhone: input.customerPhone ?? order.customer_phone ?? undefined,
    });

    // 4. payments INSERT
    const dueDate = parseInnopayExpDate(issued.dueDate); // YYYYMMDD → 23:59:59 KST
    const paymentId = await this.paymentDb.createVbankPayment({
      orderId: input.orderId,
      amountTotal: amount,
      vbankAccountNumber: issued.accountNumber,
      vbankBankCode: issued.bankCode,
      vbankBankName: issued.bankName ?? null,
      vbankHolderName: issued.holderName,
      vbankDueDate: dueDate,
      innopayTid: issued.innopayTid,
      innopayMode: cred.mode,
      pgOrderId: moid,
    });

    // 5. HOLD — 실패 시 payments 행을 FAILED로 마킹 후 throw
    const hold = await this.walletSvc.applyVbankHold({ branchId, paymentId, amount });
    if (!hold.ok) {
      await this.paymentDb.markCanceled(paymentId, {
        canceledAt: new Date(),
        reason: 'HOLD_FAILED:' + (hold.reason ?? 'unknown'),
      });
      throw new BadRequestException(
        `INSUFFICIENT_BALANCE — 충전금이 부족하여 가상계좌 결제를 사용할 수 없습니다.`,
      );
    }

    return {
      paymentId,
      innopayTid: issued.innopayTid,
      accountNumber: issued.accountNumber,
      bankCode: issued.bankCode,
      bankName: issued.bankName ?? null,
      holderName: issued.holderName,
      dueDate: dueDate.toISOString(),
      amount,
    };
  }
}

function parseInnopayExpDate(yyyymmdd: string): Date {
  // Innopay 응답: YYYYMMDD (KST 기준 마감일). 23:59:59 KST를 UTC로 변환
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  // KST 23:59:59 = UTC 14:59:59
  return new Date(Date.UTC(y, m - 1, d, 14, 59, 59));
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd apps/api && npm test -- payments-vbank.service.spec.ts
```

Expected: PASS — 5개 테스트 모두 통과. (잔액 사전 검사 테스트는 walletReader 패턴 대신 applyVbankHold race 케이스로 합쳐도 됨 — 단일 검사 지점만 두는 게 단순)

> **결정 (테스트 작성자에게)**: 잔액 사전 검사를 별도 walletReader로 빼지 말고 `applyVbankHold` 결과만 신뢰. Innopay 호출이 항상 일어나는 단점이 있지만, race 안전성과 코드 단순성이 우선. 위 테스트 중 "balance insufficient before issue" 테스트는 삭제하고, "HOLD INSUFFICIENT race" 테스트로 통합.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/payments/vbank/
git commit -m "feat(payments): add PaymentsVbankService.issue with Innopay vbank + HOLD txn (Phase 2)"
```

---

### Task 3.2 [Backend]: payments-vbank.service — getPollStatus()

**Files:**
- Modify: `apps/api/src/payments/vbank/payments-vbank.service.ts`
- Modify: `apps/api/src/payments/vbank/payments-vbank.service.spec.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

추가:

```typescript
describe('getPollStatus', () => {
  it('returns status from payments row', async () => {
    paymentDb.findById.mockResolvedValue({
      id: 999, status: 'PENDING', paid_at: null, paid_amount: null,
    });
    const result = await svc.getPollStatus(999);
    expect(result.status).toBe('PENDING');
    expect(result.paidAt).toBeNull();
    expect(result.paidAmount).toBeNull();
  });

  it('returns paidAt as ISO string when PAID', async () => {
    const paidAt = new Date('2026-04-28T05:00:00Z');
    paymentDb.findById.mockResolvedValue({
      id: 999, status: 'PAID', paid_at: paidAt, paid_amount: 50_000,
    });
    const result = await svc.getPollStatus(999);
    expect(result.status).toBe('PAID');
    expect(result.paidAt).toBe(paidAt.toISOString());
    expect(result.paidAmount).toBe(50_000);
  });

  it('throws NotFound when payment not exists', async () => {
    paymentDb.findById.mockResolvedValue(null);
    await expect(svc.getPollStatus(999)).rejects.toThrow();
  });

  it('returns CANCELED for canceled payment', async () => {
    paymentDb.findById.mockResolvedValue({
      id: 999, status: 'CANCELED', paid_at: null, paid_amount: null,
    });
    const result = await svc.getPollStatus(999);
    expect(result.status).toBe('CANCELED');
  });
});
```

- [ ] **Step 2: 구현**

```typescript
import { NotFoundException } from '@nestjs/common';
import { PollVbankStatusOutput, VbankPaymentStatus } from './payments-vbank.types';

async getPollStatus(paymentId: number): Promise<PollVbankStatusOutput> {
  const row = await this.paymentDb.findById(paymentId);
  if (!row) throw new NotFoundException('payment not found');
  if (row.method !== 'VBANK_INNOPAY') {
    throw new NotFoundException('not a vbank payment');
  }
  return {
    status: mapStatus(row.status),
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    paidAmount: row.paid_amount ?? null,
  };
}

function mapStatus(s: string): VbankPaymentStatus {
  switch (s) {
    case 'PENDING': return 'PENDING';
    case 'PAID': return 'PAID';
    case 'CANCELED': return 'CANCELED';
    case 'REVIEW_REQUIRED': return 'REVIEW_REQUIRED';
    default: return 'FAILED';
  }
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd apps/api && npm test -- payments-vbank.service.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/payments/vbank/
git commit -m "feat(payments): add getPollStatus to PaymentsVbankService (Phase 2)"
```

---

### Task 3.3 [Backend]: PaymentsVbankController — POST/GET endpoints

**Files:**
- Create: `apps/api/src/payments/vbank/payments-vbank.controller.ts`
- Create: `apps/api/src/payments/vbank/payments-vbank.controller.spec.ts`
- Modify: `apps/api/src/payments/payment.module.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`payments-vbank.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PaymentsVbankController } from './payments-vbank.controller';
import { PaymentsVbankService } from './payments-vbank.service';

describe('PaymentsVbankController', () => {
  let controller: PaymentsVbankController;
  let svc: jest.Mocked<PaymentsVbankService>;

  beforeEach(async () => {
    svc = { issue: jest.fn(), getPollStatus: jest.fn() } as any;
    const module = await Test.createTestingModule({
      controllers: [PaymentsVbankController],
      providers: [{ provide: PaymentsVbankService, useValue: svc }],
    }).compile();
    controller = module.get(PaymentsVbankController);
  });

  it('POST /public/payments/vbank → svc.issue', async () => {
    svc.issue.mockResolvedValue({ paymentId: 999 } as any);
    const result = await controller.issueVbank({ orderId: 1, orderName: '꽃' });
    expect(svc.issue).toHaveBeenCalledWith({ orderId: 1, orderName: '꽃' });
    expect(result.paymentId).toBe(999);
  });

  it('GET /public/payments/vbank/:paymentId/status → svc.getPollStatus', async () => {
    svc.getPollStatus.mockResolvedValue({ status: 'PENDING', paidAt: null, paidAmount: null });
    const result = await controller.pollStatus('999');
    expect(svc.getPollStatus).toHaveBeenCalledWith(999);
    expect(result.status).toBe('PENDING');
  });
});
```

- [ ] **Step 2: 컨트롤러 구현**

`payments-vbank.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentsVbankService } from './payments-vbank.service';
import { IssueVbankRequestDto } from './dto/issue-vbank-request.dto';
import { IssueVbankResponseDto } from './dto/issue-vbank-response.dto';

@ApiTags('Public - Payments Vbank')
@Controller('public/payments/vbank')
export class PaymentsVbankController {
  constructor(private readonly svc: PaymentsVbankService) {}

  @Post()
  @ApiOperation({ summary: '가상계좌 발급', description: 'Innopay vbank 발급 + 충전금 HOLD' })
  @ApiResponse({ status: 201, type: IssueVbankResponseDto })
  async issueVbank(@Body() body: IssueVbankRequestDto): Promise<IssueVbankResponseDto> {
    return this.svc.issue({
      orderId: body.orderId,
      orderName: body.orderName,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    });
  }

  @Get(':paymentId/status')
  @ApiOperation({ summary: '가상계좌 결제 상태 폴링' })
  @ApiParam({ name: 'paymentId', type: Number })
  async pollStatus(@Param('paymentId') paymentId: string) {
    return this.svc.getPollStatus(Number(paymentId));
  }
}
```

- [ ] **Step 3: payment.module.ts 등록**

```typescript
import { PaymentsVbankController } from './vbank/payments-vbank.controller';
import { PaymentsVbankService } from './vbank/payments-vbank.service';
// (모듈 imports에 InnopayModule, WalletsModule, OrdersModule 추가 필요)

@Module({
  imports: [..., InnopayModule, WalletsModule, OrdersModule],
  controllers: [..., PaymentsVbankController],
  providers: [..., PaymentsVbankService],
  exports: [...],
})
export class PaymentModule {}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- payments-vbank.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 5: 빌드 + DI 검증 (Phase 1 NestJS DI 버그 학습 적용)**

```bash
cd apps/api && npm run build
```

Expected: 빌드 성공. 만약 `Nest can't resolve dependencies of PaymentsVbankService (?, ...)` 류 에러 발생 시 → DI 토큰 문제. 이 경우 `OrdersService` import 경로/모듈 export 여부 점검.

> **참고 (Phase 1 학습)**: type alias를 `@Inject()` 토큰 없이 받으면 NestJS DI가 metadata에서 해석 못 해 부팅 실패. 모든 의존성은 클래스 또는 명시적 토큰이어야 함.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/payments/vbank/payments-vbank.controller.ts apps/api/src/payments/vbank/payments-vbank.controller.spec.ts apps/api/src/payments/payment.module.ts
git commit -m "feat(payments): add /public/payments/vbank POST + GET status endpoints (Phase 2)"
```

---

## Chunk 4: Backend — Webhook Routing + Settle/Expire

> Phase 1 webhook 서비스를 확장. **vacctNo로 TOPUP vs ORDER 라우팅**. ORDER 분기는 신규 `InnopayOrderService`로 위임. payments-settle.service가 실제 SETTLE/REVIEW/CANCEL 트랜잭션 수행.

### Task 4.1 [Backend]: payments-settle.service — handleDeposit (단일 트랜잭션)

**Files:**
- Create: `apps/api/src/payments/vbank/payments-settle.service.ts`
- Create: `apps/api/src/payments/vbank/payments-settle.service.spec.ts`

> **흐름**: webhook이 들어와 ORDER vbank로 매칭됐을 때 호출. payments 행 잠금 → amount 비교 → SETTLE or REVIEW_REQUIRED → wallet 거래 INSERT (SETTLE 분기만) → commit. 멱등은 Phase 1과 동일하게 webhook_events 측에서 처리되므로 본 서비스는 멱등 가정 안 해도 됨. 그러나 안전망으로 status='PAID'면 즉시 return.

- [ ] **Step 1: 실패 테스트**

```typescript
describe('PaymentsSettleService.handleDeposit', () => {
  it('SETTLE branch: amount_total == paid_amount → markPaid + applyVbankSettle', async () => {
    paymentDb.findById.mockResolvedValue({
      id: 999, status: 'PENDING', amount_total: 50_000, order_id: 1,
      vbank_account_number: '1234', innopay_mode: 'TEST',
    });
    ordersSvc.getById.mockResolvedValue({ id: 1, organization_id: 10 } as any);
    walletConfigSvc.getOrderFee.mockResolvedValue(500);
    walletSvc.applyVbankSettle.mockResolvedValue({ ok: true, balanceAfter: 99_500 });

    await svc.handleDeposit({ paymentId: 999, paidAmount: 50_000, paidAt: new Date(), tid: 'tid-1' });

    expect(paymentDb.markPaid).toHaveBeenCalledWith(999, expect.objectContaining({ paidAmount: 50_000 }));
    expect(walletSvc.applyVbankSettle).toHaveBeenCalledWith({
      branchId: 10, paymentId: 999, orderId: 1, amount: 50_000, orderFee: 500,
    });
  });

  it('REVIEW branch: amount_total != paid_amount → markReviewRequired (no SETTLE)', async () => {
    paymentDb.findById.mockResolvedValue({
      id: 999, status: 'PENDING', amount_total: 50_000, order_id: 1,
      vbank_account_number: '1234', innopay_mode: 'TEST',
    });
    await svc.handleDeposit({ paymentId: 999, paidAmount: 49_000, paidAt: new Date(), tid: 'tid-1' });
    expect(paymentDb.markReviewRequired).toHaveBeenCalledWith(999, { paidAmount: 49_000 });
    expect(walletSvc.applyVbankSettle).not.toHaveBeenCalled();
  });

  it('skips when payment already PAID (멱등 안전망)', async () => {
    paymentDb.findById.mockResolvedValue({ id: 999, status: 'PAID', amount_total: 50_000 });
    await svc.handleDeposit({ paymentId: 999, paidAmount: 50_000, paidAt: new Date(), tid: 'tid-1' });
    expect(paymentDb.markPaid).not.toHaveBeenCalled();
    expect(walletSvc.applyVbankSettle).not.toHaveBeenCalled();
  });

  it('throws when payment not found', async () => {
    paymentDb.findById.mockResolvedValue(null);
    await expect(svc.handleDeposit({ paymentId: 999, paidAmount: 50_000, paidAt: new Date(), tid: 'tid-1' }))
      .rejects.toThrow();
  });

  it('handleCancel: marks CANCELED with reason VBANK_CANCEL (HOLD 그대로 유지)', async () => {
    paymentDb.findById.mockResolvedValue({ id: 999, status: 'PENDING' });
    await svc.handleCancel({ paymentId: 999, tid: 'tid-1' });
    expect(paymentDb.markCanceled).toHaveBeenCalledWith(999, expect.objectContaining({ reason: 'VBANK_CANCEL' }));
    expect(walletSvc.applyVbankHold).not.toHaveBeenCalled();
    expect(walletSvc.applyVbankSettle).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npm test -- payments-settle.service.spec.ts
```

Expected: FAIL — 클래스 없음.

- [ ] **Step 3: payments-settle.service.ts 구현**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentDb } from '../payment.db';
import { WalletService } from '../../wallets/wallet.service';
import { WalletConfigService } from '../../wallets/wallet-config.service'; // orderFee 조회용
import { OrdersService } from '../../orders/orders.service';

export interface SettleDepositInput {
  paymentId: number;
  paidAmount: number;
  paidAt: Date;
  tid: string;
}

export interface SettleCancelInput {
  paymentId: number;
  tid: string;
}

@Injectable()
export class PaymentsSettleService {
  constructor(
    private readonly paymentDb: PaymentDb,
    private readonly walletSvc: WalletService,
    private readonly walletCfgSvc: WalletConfigService,
    private readonly ordersSvc: OrdersService,
  ) {}

  async handleDeposit(input: SettleDepositInput): Promise<void> {
    const payment = await this.paymentDb.findById(input.paymentId);
    if (!payment) throw new NotFoundException(`payment ${input.paymentId} not found`);

    // 멱등 안전망 — 이미 처리된 행이면 skip
    if (payment.status === 'PAID' || payment.status === 'REVIEW_REQUIRED') return;
    if (payment.status !== 'PENDING') {
      // CANCELED / FAILED 등에 다시 들어온 deposit — 로그 후 skip (webhook_events.processing_error에서 감지)
      return;
    }

    // 부분/초과 입금 → REVIEW_REQUIRED
    if (input.paidAmount !== payment.amount_total) {
      await this.paymentDb.markReviewRequired(input.paymentId, { paidAmount: input.paidAmount });
      // (텔레그램 알림은 webhook 컨트롤러 layer에서 일괄 처리)
      return;
    }

    // 정상 SETTLE
    await this.paymentDb.markPaid(input.paymentId, {
      paidAt: input.paidAt,
      paidAmount: input.paidAmount,
    });
    const order = await this.ordersSvc.getById(payment.order_id);
    if (!order) throw new NotFoundException(`order ${payment.order_id} not found`);
    const branchId = Number(order.organization_id);
    const orderFee = await this.walletCfgSvc.getOrderFee(branchId);

    await this.walletSvc.applyVbankSettle({
      branchId,
      paymentId: input.paymentId,
      orderId: payment.order_id,
      amount: payment.amount_total,
      orderFee,
    });
  }

  async handleCancel(input: SettleCancelInput): Promise<void> {
    const payment = await this.paymentDb.findById(input.paymentId);
    if (!payment) return;
    if (payment.status !== 'PENDING') return;
    await this.paymentDb.markCanceled(input.paymentId, {
      canceledAt: new Date(),
      reason: 'VBANK_CANCEL',
    });
    // HOLD 유지 — 본사 admin 수동 처리 대상
  }
}
```

> **WalletConfigService.getOrderFee**: 기존 `branch_wallet_config` 테이블 조회 + `WALLET_DEFAULTS.ORDER_FEE` fallback. 이미 wallet 모듈에 비슷한 메서드가 있을 가능성 → 먼저 grep으로 확인 후 재사용.

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd apps/api && npm test -- payments-settle.service.spec.ts
```

Expected: PASS — 5개 테스트.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/vbank/payments-settle.service.ts apps/api/src/payments/vbank/payments-settle.service.spec.ts
git commit -m "feat(payments): add PaymentsSettleService for vbank deposit/cancel handling (Phase 2)"
```

---

### Task 4.2 [Backend]: InnopayOrderService — webhook 어댑터

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-order.service.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-order.service.spec.ts`

> **역할**: webhook payload(InnopayNotiPayload)를 받아 payments 매칭 후 PaymentsSettleService 호출. Phase 1의 `InnopayTopupService`와 대칭 구조.

- [ ] **Step 1: 실패 테스트**

```typescript
describe('InnopayOrderService', () => {
  it('handleDeposit: finds payment by vacctNo, calls settleSvc.handleDeposit', async () => {
    paymentDb.findPendingVbankByAccount.mockResolvedValue({
      id: 999, amount_total: 50_000,
    });
    await svc.handleDeposit({
      vacctNo: '1234', goodsAmt: 50_000, transSeq: 'tid-1', isCancel: false,
    } as any, /*eventId*/ 1);
    expect(settleSvc.handleDeposit).toHaveBeenCalledWith({
      paymentId: 999, paidAmount: 50_000, paidAt: expect.any(Date), tid: 'tid-1',
    });
  });

  it('returns NOT_MATCHED when no pending payment for vacctNo', async () => {
    paymentDb.findPendingVbankByAccount.mockResolvedValue(null);
    const result = await svc.handleDeposit({
      vacctNo: '9999', goodsAmt: 50_000, transSeq: 'tid-1', isCancel: false,
    } as any, 1);
    expect(result).toEqual({ matched: false });
    expect(settleSvc.handleDeposit).not.toHaveBeenCalled();
  });

  it('handleDeposit with isCancel=true → settleSvc.handleCancel', async () => {
    paymentDb.findPendingVbankByAccount.mockResolvedValue({ id: 999 });
    await svc.handleDeposit({
      vacctNo: '1234', goodsAmt: 0, transSeq: 'tid-1', isCancel: true,
    } as any, 1);
    expect(settleSvc.handleCancel).toHaveBeenCalledWith({ paymentId: 999, tid: 'tid-1' });
  });
});
```

- [ ] **Step 2: 구현**

```typescript
import { Injectable } from '@nestjs/common';
import { PaymentDb } from '../../payment.db';
import { PaymentsSettleService } from '../../vbank/payments-settle.service';

export interface OrderWebhookPayload {
  vacctNo: string;
  goodsAmt: number;
  transSeq: string;
  isCancel: boolean;
  vbankBankCd?: string;
  vbankAcctNm?: string;
}

export interface OrderWebhookResult {
  matched: boolean;
  paymentId?: number;
}

@Injectable()
export class InnopayOrderService {
  constructor(
    private readonly paymentDb: PaymentDb,
    private readonly settleSvc: PaymentsSettleService,
  ) {}

  async handleDeposit(p: OrderWebhookPayload, _eventId: number): Promise<OrderWebhookResult> {
    const payment = await this.paymentDb.findPendingVbankByAccount(p.vacctNo);
    if (!payment) return { matched: false };

    if (p.isCancel) {
      await this.settleSvc.handleCancel({ paymentId: payment.id, tid: p.transSeq });
    } else {
      await this.settleSvc.handleDeposit({
        paymentId: payment.id,
        paidAmount: p.goodsAmt,
        paidAt: new Date(),
        tid: p.transSeq,
      });
    }
    return { matched: true, paymentId: payment.id };
  }
}
```

- [ ] **Step 3: 테스트 통과**

```bash
cd apps/api && npm test -- innopay-order.service.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/payments/providers/innopay/innopay-order.service.ts apps/api/src/payments/providers/innopay/innopay-order.service.spec.ts
git commit -m "feat(innopay): add InnopayOrderService webhook adapter (Phase 2)"
```

---

### Task 4.3 [Backend]: InnopayWebhookService 라우팅 분기 추가

**Files:**
- Modify: `apps/api/src/payments/providers/innopay/innopay-webhook.service.ts`
- Modify: `apps/api/src/payments/providers/innopay/innopay-webhook.service.spec.ts`
- Modify: `apps/api/src/payments/providers/innopay/innopay.module.ts`

> **현재 동작**: 모든 vbank deposit이 `topupSvc.handleDeposit`로 라우팅됨. **변경**: vacctNo 기반으로 ORDER vs TOPUP 결정.

- [ ] **Step 1: 신규 분기 테스트 추가**

```typescript
describe('InnopayWebhookService routing (Phase 2)', () => {
  it('routes to InnopayOrderService when payment.vbank matches', async () => {
    orderSvc.handleDeposit.mockResolvedValue({ matched: true, paymentId: 999 });
    const result = await svc.handle({
      shopCode: cred.merchantId, transSeq: 'tid-1', goodsAmt: '50000',
      payMethod: '08', status: '25', vacctNo: '1234567890', moid: 'vbnk-1-x',
      vbankBankCd: '004', vbankAcctNm: '홍길동',
    } as any);
    expect(orderSvc.handleDeposit).toHaveBeenCalled();
    expect(topupSvc.handleDeposit).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('routes to InnopayTopupService when organizations.topup_vbank matches', async () => {
    orderSvc.handleDeposit.mockResolvedValue({ matched: false });
    topupSvc.handleDeposit.mockResolvedValue(undefined);
    const result = await svc.handle({
      shopCode: cred.merchantId, transSeq: 'tid-2', goodsAmt: '100000',
      payMethod: '08', status: '25', vacctNo: '9999000099', moid: 'topup-x',
      vbankBankCd: '004', vbankAcctNm: '서울지사',
    } as any);
    expect(orderSvc.handleDeposit).toHaveBeenCalled();
    expect(topupSvc.handleDeposit).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('marks event as processed with error when neither matches', async () => {
    orderSvc.handleDeposit.mockResolvedValue({ matched: false });
    // topupSvc도 unmatched면 (Phase 1 코드는 이 케이스에서 throw 안 하고 그냥 처리 못 함)
    // → 본 분기에서는 webhook_events.processing_error="vbank not matched", 200 응답
    // 구체 동작은 구현 단계에서 결정
  });
});
```

- [ ] **Step 2: handle() 메서드의 dispatch 부분 수정**

기존 (`innopay-webhook.service.ts` 76~110행 부근):

```typescript
// 4. dispatch
if (payload.payMethod !== PAYMETHOD_VBANK) { /* skip */ }
if (payload.status !== STATUS_DEPOSIT && payload.status !== STATUS_CANCEL) { /* skip */ }

const dispatchPayload: TopupDepositPayload = { ... };
try {
  await this.topupSvc.handleDeposit(dispatchPayload, eventId);
  ...
}
```

변경:

```typescript
// 4. dispatch — vacctNo로 ORDER vs TOPUP 라우팅
const isCancel = payload.status === STATUS_CANCEL;
const orderResult = await this.orderSvc.handleDeposit(
  {
    vacctNo: payload.vacctNo,
    goodsAmt: amount,
    transSeq: payload.transSeq,
    isCancel,
    vbankBankCd: payload.vbankBankCd,
    vbankAcctNm: payload.vbankAcctNm,
  },
  eventId,
);

if (orderResult.matched) {
  await this.eventsDb.markProcessed(eventId, null);
  return { ok: true };
}

// ORDER 미매칭 → TOPUP 라우팅 (Phase 1 그대로)
const topupPayload: TopupDepositPayload = {
  shopCode: payload.shopCode,
  transSeq: payload.transSeq,
  moid: payload.moid,
  goodsAmt: amount,
  payMethod: payload.payMethod,
  status: payload.status,
  vacctNo: payload.vacctNo,
  vbankBankCd: payload.vbankBankCd,
  vbankAcctNm: payload.vbankAcctNm,
  isCancel,
};

try {
  await this.topupSvc.handleDeposit(topupPayload, eventId);
  await this.eventsDb.markProcessed(eventId, null);
} catch (err: any) {
  // 기존 에러 처리 그대로
}
return { ok: true };
```

- [ ] **Step 3: 생성자에 InnopayOrderService 주입**

```typescript
constructor(
  private readonly credSvc: InnopayCredentialsService,
  private readonly eventsDb: WebhookEventsDb,
  private readonly topupSvc: InnopayTopupService,
  private readonly orderSvc: InnopayOrderService,  // ← 추가
) {}
```

- [ ] **Step 4: innopay.module.ts에 InnopayOrderService 등록**

```typescript
import { InnopayOrderService } from './innopay-order.service';

@Module({
  imports: [DatabaseModule, WebhookEventsModule, WalletsModule, OrganizationsModule, PaymentModule],
  // PaymentModule을 import해야 PaymentDb / PaymentsSettleService에 접근 가능
  // 단, 순환 import 가능성 — InnopayModule → PaymentModule → InnopayModule 발생 시 forwardRef 사용
  providers: [
    ...,
    InnopayOrderService,
  ],
  exports: [..., InnopayOrderService],
})
export class InnopayModule {}
```

> **순환 의존성 주의**: `PaymentModule`이 이미 `InnopayModule`을 import하면 forward 필요. 분리 전략: `PaymentDb`, `PaymentsSettleService`만 별도 모듈(`PaymentsCoreModule`)로 분리하거나, `PaymentDb`를 `DatabaseModule`처럼 글로벌 export. **결정 (구현자)**: 직접 import해 보고 순환 발생 시 `PaymentDb`를 `DatabaseModule`에서 export하도록 변경.

- [ ] **Step 5: 테스트 + 빌드 검증**

```bash
cd apps/api && npm test -- innopay-webhook.service.spec.ts
cd apps/api && npm run build
```

Expected: PASS + 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/payments/providers/innopay/
git commit -m "feat(innopay): route webhook deposits to ORDER vs TOPUP by vacctNo (Phase 2)"
```

---

## Chunk 5: Backend — Expiration Cron + Admin Monitoring API

> 만료 sweep cron + 본사 모니터링 endpoint. 모니터링은 admin 전용 — 기존 `AdminGuard` 재사용.

### Task 5.1 [Backend]: vbank-expiration.job — 매시간 sweep

**Files:**
- Create: `apps/api/src/payments/jobs/vbank-expiration.job.ts`
- Create: `apps/api/src/payments/jobs/vbank-expiration.job.spec.ts`
- Modify: `apps/api/src/payments/payment.module.ts`

> **동작**: `@Cron('0 5 * * * *')` 매시간 5분에 실행 (Innopay 만료 통보 webhook과의 race 회피용 5분 지연). `payment.listPendingExpired(now)` → 각 행을 `markCanceled` with reason='VBANK_EXPIRED' + `payment_events` INSERT. **HOLD는 그대로 유지**. orders는 변경하지 않음.

- [ ] **Step 1: 실패 테스트**

```typescript
describe('VbankExpirationJob.run', () => {
  it('marks pending expired payments as CANCELED with reason VBANK_EXPIRED', async () => {
    paymentDb.listPendingExpired.mockResolvedValue([
      { id: 1, order_id: 100, vbank_account_number: '1234', amount_total: 50_000 },
      { id: 2, order_id: 101, vbank_account_number: '5678', amount_total: 30_000 },
    ]);

    await job.run();

    expect(paymentDb.markCanceled).toHaveBeenCalledTimes(2);
    expect(paymentDb.markCanceled).toHaveBeenCalledWith(1, expect.objectContaining({ reason: 'VBANK_EXPIRED' }));
    expect(paymentDb.markCanceled).toHaveBeenCalledWith(2, expect.objectContaining({ reason: 'VBANK_EXPIRED' }));
    expect(paymentDb.addEvent).toHaveBeenCalledWith(1, 'SYSTEM', 'EXPIRED', null);
    expect(paymentDb.addEvent).toHaveBeenCalledWith(2, 'SYSTEM', 'EXPIRED', null);
  });

  it('no-op when no pending expired', async () => {
    paymentDb.listPendingExpired.mockResolvedValue([]);
    await job.run();
    expect(paymentDb.markCanceled).not.toHaveBeenCalled();
  });

  it('continues with other rows when one fails (best-effort)', async () => {
    paymentDb.listPendingExpired.mockResolvedValue([
      { id: 1, order_id: 100, vbank_account_number: '1234', amount_total: 50_000 },
      { id: 2, order_id: 101, vbank_account_number: '5678', amount_total: 30_000 },
    ]);
    paymentDb.markCanceled.mockRejectedValueOnce(new Error('db error'));
    await job.run();
    expect(paymentDb.markCanceled).toHaveBeenCalledTimes(2); // 둘 다 시도됨
  });
});
```

- [ ] **Step 2: 구현**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentDb } from '../payment.db';

@Injectable()
export class VbankExpirationJob {
  private readonly log = new Logger(VbankExpirationJob.name);

  constructor(private readonly paymentDb: PaymentDb) {}

  // 매 시간 5분에 실행 (Innopay 만료 webhook 도착 후 처리)
  @Cron('0 5 * * * *')
  async run(): Promise<void> {
    const now = new Date();
    const expired = await this.paymentDb.listPendingExpired(now);
    if (expired.length === 0) return;
    this.log.log(`VbankExpirationJob: sweeping ${expired.length} expired vbank payments`);

    for (const row of expired) {
      try {
        await this.paymentDb.markCanceled(row.id, { canceledAt: now, reason: 'VBANK_EXPIRED' });
        await this.paymentDb.addEvent(row.id, 'SYSTEM', 'EXPIRED', null);
      } catch (err: any) {
        this.log.error(`VbankExpirationJob: failed to expire payment ${row.id}: ${err?.message ?? err}`);
        // 다음 행 계속 진행
      }
    }
  }
}
```

- [ ] **Step 3: payment.module.ts 등록 + ScheduleModule 확인**

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { VbankExpirationJob } from './jobs/vbank-expiration.job';

@Module({
  imports: [..., ScheduleModule.forRoot()], // app.module.ts에 이미 있을 수 있음 — 확인
  providers: [..., VbankExpirationJob],
})
export class PaymentModule {}
```

> **확인**: `ScheduleModule.forRoot()`이 app.module.ts에 등록되어 있어야 `@Cron` 데코레이터가 동작. 없으면 추가.

- [ ] **Step 4: 테스트 + 빌드**

```bash
cd apps/api && npm test -- vbank-expiration.job.spec.ts
cd apps/api && npm run build
```

Expected: PASS + 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/jobs/ apps/api/src/payments/payment.module.ts
git commit -m "feat(payments): add hourly cron to mark expired vbank payments as CANCELED (Phase 2)"
```

---

### Task 5.2 [Backend]: AdminPaymentsVbankController — GET /admin/payments/vbank

**Files:**
- Create: `apps/api/src/admin/payments/admin-payments-vbank.controller.ts`
- Create: `apps/api/src/admin/payments/admin-payments-vbank.controller.spec.ts`
- Create: `apps/api/src/admin/payments/admin-payments-vbank.service.ts`
- Create: `apps/api/src/admin/payments/admin-payments-vbank.service.spec.ts`
- Create: `apps/api/src/admin/payments/admin-payments-vbank.module.ts`
- Modify: `apps/api/src/app.module.ts`

> **응답 스키마**: `{ items: [{ paymentId, orderId, branchId, branchName, status, amountTotal, paidAmount, vbankAccountNumber, vbankBankName, vbankHolderName, vbankDueDate, paidAt, canceledAt, createdAt, innopayMode, innopayTid }], total, page, pageSize }`. 필터: `status[]`, `branchId`, `from`(ISO), `to`(ISO), `mode`(TEST|REAL). 페이지: `page`(1-base), `pageSize`(default 20, max 100).

- [ ] **Step 1: 실패 테스트 (controller)**

```typescript
describe('AdminPaymentsVbankController', () => {
  it('GET /admin/payments/vbank with default filters returns paginated rows', async () => {
    svc.list.mockResolvedValue({
      items: [{ paymentId: 1, orderId: 100, branchId: 10, status: 'PENDING' } as any],
      total: 1, page: 1, pageSize: 20,
    });
    const result = await controller.list({ page: 1, pageSize: 20 } as any);
    expect(svc.list).toHaveBeenCalledWith({ page: 1, pageSize: 20, statuses: undefined, branchId: undefined, from: undefined, to: undefined, mode: undefined });
    expect(result.items).toHaveLength(1);
  });

  it('parses status[] from query string', async () => {
    svc.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    await controller.list({ status: ['PENDING', 'PAID'], page: 1, pageSize: 20 } as any);
    expect(svc.list).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['PENDING', 'PAID'] }));
  });
});
```

- [ ] **Step 2: 실패 테스트 (service)**

```typescript
describe('AdminPaymentsVbankService.list', () => {
  it('builds WHERE clause with status[] + branchId + date range + mode', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 1 }]]).mockResolvedValueOnce([[{ id: 1, /* ... */ }]]);
    const result = await svc.list({
      page: 1, pageSize: 20,
      statuses: ['PENDING', 'PAID'],
      branchId: 10,
      from: new Date('2026-04-01'), to: new Date('2026-04-30'),
      mode: 'TEST',
    });
    const [, sqlAndParams] = (pool.query as jest.Mock).mock.calls[0];
    // 쿼리에 status IN, branch_id =, created_at BETWEEN, innopay_mode = 가 포함됐는지 검증
    expect(result.items).toHaveLength(1);
  });

  it('caps pageSize at 100', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([[]]);
    await svc.list({ page: 1, pageSize: 500 });
    const [, params] = (pool.query as jest.Mock).mock.calls[1];
    expect(params).toContain(100); // LIMIT 100
  });
});
```

- [ ] **Step 3: 구현**

`admin-payments-vbank.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { DATABASE_POOL } from '../../infra/database';

export interface ListVbankPaymentsFilters {
  page: number;
  pageSize: number;
  statuses?: string[];
  branchId?: number;
  from?: Date;
  to?: Date;
  mode?: 'TEST' | 'REAL';
}

export interface VbankPaymentRow {
  paymentId: number;
  orderId: number;
  branchId: number;
  branchName: string | null;
  status: string;
  amountTotal: number;
  paidAmount: number | null;
  vbankAccountNumber: string;
  vbankBankCode: string;
  vbankBankName: string | null;
  vbankHolderName: string;
  vbankDueDate: string;
  paidAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  innopayMode: string;
  innopayTid: string;
}

@Injectable()
export class AdminPaymentsVbankService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: mysql.Pool) {}

  async list(f: ListVbankPaymentsFilters) {
    const conds: string[] = [`p.method = 'VBANK_INNOPAY'`];
    const params: any[] = [];
    if (f.statuses && f.statuses.length > 0) {
      conds.push(`p.status IN (${f.statuses.map(() => '?').join(',')})`);
      params.push(...f.statuses);
    }
    if (f.branchId) {
      conds.push(`o.organization_id = ?`);
      params.push(f.branchId);
    }
    if (f.from) {
      conds.push(`p.created_at >= ?`);
      params.push(f.from);
    }
    if (f.to) {
      conds.push(`p.created_at <= ?`);
      params.push(f.to);
    }
    if (f.mode) {
      conds.push(`p.innopay_mode = ?`);
      params.push(f.mode);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const [countRows] = await this.pool.query<any[]>(
      `SELECT COUNT(*) AS total
       FROM payments p
       LEFT JOIN orders o ON o.id = p.order_id
       ${where}`,
      params,
    );
    const total = Number(countRows?.[0]?.total ?? 0);

    const limit = Math.min(Math.max(1, f.pageSize), 100);
    const offset = Math.max(0, (f.page - 1) * limit);

    const [rows] = await this.pool.query<any[]>(
      `SELECT
         p.id AS paymentId, p.order_id AS orderId, o.organization_id AS branchId,
         org.name AS branchName, p.status, p.amount_total AS amountTotal,
         p.paid_amount AS paidAmount,
         p.vbank_account_number AS vbankAccountNumber,
         p.vbank_bank_code AS vbankBankCode,
         p.vbank_bank_name AS vbankBankName,
         p.vbank_holder_name AS vbankHolderName,
         p.vbank_due_date AS vbankDueDate,
         p.paid_at AS paidAt, p.canceled_at AS canceledAt, p.created_at AS createdAt,
         p.innopay_mode AS innopayMode, p.innopay_tid AS innopayTid
       FROM payments p
       LEFT JOIN orders o ON o.id = p.order_id
       LEFT JOIN organizations org ON org.id = o.organization_id
       ${where}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      items: rows ?? [],
      total,
      page: f.page,
      pageSize: limit,
    };
  }
}
```

`admin-payments-vbank.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../security/admin.guard';
import { AdminPaymentsVbankService } from './admin-payments-vbank.service';

@ApiTags('Admin - Payments Vbank')
@Controller('admin/payments/vbank')
@UseGuards(AdminGuard)
export class AdminPaymentsVbankController {
  constructor(private readonly svc: AdminPaymentsVbankService) {}

  @Get()
  async list(@Query() q: any) {
    const statuses = Array.isArray(q.status)
      ? (q.status as string[])
      : q.status ? [q.status as string] : undefined;
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.max(1, Number(q.pageSize ?? 20));

    return this.svc.list({
      page,
      pageSize,
      statuses,
      branchId: q.branchId ? Number(q.branchId) : undefined,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      mode: (q.mode === 'TEST' || q.mode === 'REAL') ? q.mode : undefined,
    });
  }
}
```

`admin-payments-vbank.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infra/database';
import { AdminPaymentsVbankController } from './admin-payments-vbank.controller';
import { AdminPaymentsVbankService } from './admin-payments-vbank.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminPaymentsVbankController],
  providers: [AdminPaymentsVbankService],
})
export class AdminPaymentsVbankModule {}
```

`app.module.ts`에 import 추가:

```typescript
import { AdminPaymentsVbankModule } from './admin/payments/admin-payments-vbank.module';

@Module({
  imports: [..., AdminPaymentsVbankModule],
})
export class AppModule {}
```

- [ ] **Step 4: 테스트 + 빌드**

```bash
cd apps/api && npm test -- admin-payments-vbank
cd apps/api && npm run build
```

Expected: PASS + 빌드 성공.

- [ ] **Step 5: 라우트 등록 검증 (start + curl)**

```bash
cd apps/api && npm run start:dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/admin/payments/vbank
```

Expected: 401 (AdminGuard — 인증 없이는 접근 불가).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/admin/payments/ apps/api/src/app.module.ts
git commit -m "feat(admin): add GET /admin/payments/vbank monitoring endpoint (Phase 2)"
```

---

## Chunk 6: Frontend — Types + API Clients + Payment Method Selector

> 본 chunk부터는 프론트엔드(`Flower_Frontend_Web`) repo에서 작업. 모든 task에서 `vitest run`으로 단일 실행.

### Task 6.1 [Frontend]: Vbank 타입 정의

**Files:**
- Create: `src/lib/payments/vbank-payment-types.ts`
- Modify: `src/lib/payments/innopay-types.ts` (re-export 추가)

> **이미 존재**: `payment-store.ts`에 `PaymentMethodChoice = 'card' | 'virtual-account'` 정의됨. 이 plan은 그 enum을 사용한다.

- [ ] **Step 1: 타입 작성**

`src/lib/payments/vbank-payment-types.ts`:

```typescript
export type VbankPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELED'
  | 'REVIEW_REQUIRED'
  | 'FAILED';

export interface IssueVbankRequest {
  orderId: number;
  orderName: string;
  customerName?: string;
  customerPhone?: string;
}

export interface IssueVbankResponse {
  paymentId: number;
  innopayTid: string;
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  holderName: string;
  /** ISO 8601, 입금 마감 시각 */
  dueDate: string;
  amount: number;
}

export interface PollVbankStatus {
  status: VbankPaymentStatus;
  paidAt: string | null;
  paidAmount: number | null;
}

/** Admin 모니터링용 행 */
export interface AdminVbankPaymentRow {
  paymentId: number;
  orderId: number;
  branchId: number;
  branchName: string | null;
  status: VbankPaymentStatus;
  amountTotal: number;
  paidAmount: number | null;
  vbankAccountNumber: string;
  vbankBankCode: string;
  vbankBankName: string | null;
  vbankHolderName: string;
  vbankDueDate: string;
  paidAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  innopayMode: 'TEST' | 'REAL';
  innopayTid: string;
}

export interface AdminVbankPaymentsListResponse {
  items: AdminVbankPaymentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminVbankPaymentsFilters {
  status?: VbankPaymentStatus[];
  branchId?: number;
  from?: string; // ISO
  to?: string;
  mode?: 'TEST' | 'REAL';
  page?: number;
  pageSize?: number;
}
```

`innopay-types.ts`에 re-export 추가 (편의):

```typescript
export * from './vbank-payment-types';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/payments/
git commit -m "feat(payments): add Phase 2 vbank payment frontend types"
```

---

### Task 6.2 [Frontend]: 브랜치 결제 API 클라이언트 함수 추가

**Files:**
- Modify: `src/lib/branch/api.ts`
- Create: `src/__tests__/branch-vbank-api.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueInnopayVbank, pollVbankStatus } from '@/lib/branch/api';

describe('branch vbank api', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('issueInnopayVbank POSTs to /public/payments/vbank', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentId: 999, innopayTid: 'tid-1', accountNumber: '1234',
        bankCode: '004', bankName: '국민', holderName: '홍길동',
        dueDate: '2026-04-29T14:59:59Z', amount: 50_000,
      }),
    });
    const result = await issueInnopayVbank({ orderId: 1, orderName: '꽃' });
    expect(result.paymentId).toBe(999);
    expect((fetch as any).mock.calls[0][0]).toContain('/public/payments/vbank');
    expect((fetch as any).mock.calls[0][1].method).toBe('POST');
  });

  it('issueInnopayVbank throws on non-ok response (with error message)', async () => {
    (fetch as any).mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: '충전금이 부족합니다' }),
    });
    await expect(issueInnopayVbank({ orderId: 1, orderName: '꽃' }))
      .rejects.toThrow(/충전금이 부족/);
  });

  it('pollVbankStatus GETs /public/payments/vbank/:id/status', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PENDING', paidAt: null, paidAmount: null }),
    });
    const result = await pollVbankStatus(999);
    expect(result.status).toBe('PENDING');
    expect((fetch as any).mock.calls[0][0]).toContain('/public/payments/vbank/999/status');
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
npx vitest run src/__tests__/branch-vbank-api.test.ts
```

Expected: FAIL — 함수 없음.

- [ ] **Step 3: api.ts에 함수 추가**

`src/lib/branch/api.ts` 끝에 추가:

```typescript
import type { IssueVbankRequest, IssueVbankResponse, PollVbankStatus } from '@/lib/payments/vbank-payment-types';

export async function issueInnopayVbank(body: IssueVbankRequest): Promise<IssueVbankResponse> {
  const res = await fetch(`${API_BASE}/public/payments/vbank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message ?? `vbank issue failed (${res.status})`);
  }
  return res.json();
}

export async function pollVbankStatus(paymentId: number): Promise<PollVbankStatus> {
  const res = await fetch(`${API_BASE}/public/payments/vbank/${paymentId}/status`);
  if (!res.ok) throw new Error(`poll failed (${res.status})`);
  return res.json();
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/branch-vbank-api.test.ts
```

Expected: PASS — 3개.

- [ ] **Step 5: Commit**

```bash
git add src/lib/branch/api.ts src/__tests__/branch-vbank-api.test.ts
git commit -m "feat(branch): add issueInnopayVbank + pollVbankStatus API helpers"
```

---

### Task 6.3 [Frontend]: payment-store 확장 — vbankInfo + pollingActive

**Files:**
- Modify: `src/lib/branch/payment-store.ts`
- Create: `src/__tests__/payment-store-vbank.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { usePaymentStore } from '@/lib/branch/payment-store';

describe('payment-store vbank state', () => {
  beforeEach(() => {
    usePaymentStore.setState({ orderData: null, vbankInfo: null, pollingActive: false });
  });

  it('setVbankInfo stores issue response', () => {
    usePaymentStore.getState().setVbankInfo({
      paymentId: 999, innopayTid: 'tid', accountNumber: '1234',
      bankCode: '004', bankName: '국민', holderName: '홍', dueDate: '2026-04-29T14:59:59Z',
      amount: 50_000,
    });
    expect(usePaymentStore.getState().vbankInfo?.paymentId).toBe(999);
  });

  it('clearVbankInfo resets state', () => {
    usePaymentStore.setState({ vbankInfo: { paymentId: 999 } as any, pollingActive: true });
    usePaymentStore.getState().clearVbankInfo();
    expect(usePaymentStore.getState().vbankInfo).toBeNull();
    expect(usePaymentStore.getState().pollingActive).toBe(false);
  });

  it('setPollingActive toggles state', () => {
    usePaymentStore.getState().setPollingActive(true);
    expect(usePaymentStore.getState().pollingActive).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인 후 store 확장**

`payment-store.ts`:

```typescript
import type { IssueVbankResponse } from '@/lib/payments/vbank-payment-types';

interface PaymentStore {
  orderData: OrderPaymentData | null;
  setOrderData: (data: OrderPaymentData | null) => void;
  // ... 기존
  vbankInfo: IssueVbankResponse | null;
  setVbankInfo: (info: IssueVbankResponse | null) => void;
  clearVbankInfo: () => void;
  pollingActive: boolean;
  setPollingActive: (active: boolean) => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set) => ({
      orderData: null,
      setOrderData: (data) => set({ orderData: data }),
      vbankInfo: null,
      setVbankInfo: (info) => set({ vbankInfo: info }),
      clearVbankInfo: () => set({ vbankInfo: null, pollingActive: false }),
      pollingActive: false,
      setPollingActive: (active) => set({ pollingActive: active }),
    }),
    {
      name: 'branch-payment-store',
      storage: createJSONStorage(() => sessionStorage),
      // vbankInfo는 새로고침 후에도 살아남게 — 폴링 페이지 직접 접근 시 필요
    },
  ),
);
```

- [ ] **Step 3: 테스트 통과 + Commit**

```bash
npx vitest run src/__tests__/payment-store-vbank.test.ts
```

Expected: PASS.

```bash
git add src/lib/branch/payment-store.ts src/__tests__/payment-store-vbank.test.ts
git commit -m "feat(branch): extend payment-store with vbankInfo + pollingActive state"
```

---

### Task 6.4 [Frontend]: /branch/[slug]/payment 결제수단 선택 UI

**Files:**
- Modify: `src/app/branch/[slug]/payment/page.tsx`

> **현재 동작**: 페이지 진입 시 즉시 Toss 위젯 초기화. **변경**: 진입 시 `paymentMethod` 미정 → 카드/가상계좌 선택 카드를 보여주고, 선택 시 분기:
> - `card` → 기존 Toss 위젯 초기화
> - `virtual-account` → `issueInnopayVbank` 호출 → vbankInfo 저장 → `/branch/{slug}/payment/vbank` 이동

- [ ] **Step 1: 페이지 수정 — selector 컴포넌트 + 분기**

선택 UI는 별도 컴포넌트로:

`src/app/branch/[slug]/payment/payment-method-selector.tsx` (신규):

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { CreditCard, Banknote } from 'lucide-react';

interface Props {
  onSelect: (method: 'card' | 'virtual-account') => void;
  loading: 'card' | 'virtual-account' | null;
}

export function PaymentMethodSelector({ onSelect, loading }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">결제수단 선택</h2>
      <button
        type="button"
        onClick={() => onSelect('card')}
        disabled={loading !== null}
        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-50"
      >
        <CreditCard className="h-6 w-6 text-slate-500" />
        <div className="flex-1">
          <div className="font-medium text-slate-800">카드 결제</div>
          <div className="text-xs text-slate-500">신용/체크 카드 즉시 결제</div>
        </div>
        {loading === 'card' && <span className="text-xs text-slate-400">준비 중…</span>}
      </button>
      <button
        type="button"
        onClick={() => onSelect('virtual-account')}
        disabled={loading !== null}
        className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 disabled:opacity-50"
      >
        <Banknote className="h-6 w-6 text-slate-500" />
        <div className="flex-1">
          <div className="font-medium text-slate-800">가상계좌</div>
          <div className="text-xs text-slate-500">계좌 입금 후 자동 처리</div>
        </div>
        {loading === 'virtual-account' && <span className="text-xs text-slate-400">계좌 발급 중…</span>}
      </button>
    </div>
  );
}
```

`page.tsx` 수정 요점:
- 상태 추가: `const [selectedMethod, setSelectedMethod] = useState<'card' | 'virtual-account' | null>(null);`
- `selectedMethod === null` → `<PaymentMethodSelector onSelect={...} loading={...} />` 렌더
- `selectedMethod === 'card'` → 기존 Toss 위젯 초기화 흐름 (현재 useEffect 그대로)
- `selectedMethod === 'virtual-account'` → `issueInnopayVbank` 호출 + 성공 시 store에 저장 + `router.push('/branch/${slug}/payment/vbank')`

핸들러 예시:

```typescript
const [selectedMethod, setSelectedMethod] = useState<'card' | 'virtual-account' | null>(null);
const setVbankInfo = usePaymentStore((s) => s.setVbankInfo);

async function handleSelect(method: 'card' | 'virtual-account') {
  if (!orderData?.orderId) {
    setError('주문 정보가 누락되었습니다.');
    return;
  }
  setSelectedMethod(method);
  if (method === 'virtual-account') {
    try {
      const res = await issueInnopayVbank({
        orderId: orderData.orderId,
        orderName: orderData.productName ?? '꽃배달 상품',
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
      });
      setVbankInfo(res);
      router.push(`/branch/${slug}/payment/vbank?paymentId=${res.paymentId}`);
    } catch (e: any) {
      setError(e?.message ?? '가상계좌 발급에 실패했습니다.');
      setSelectedMethod(null);
    }
  }
}
```

- [ ] **Step 2: Toss 위젯 초기화 useEffect 가드 추가**

기존:
```typescript
useEffect(() => {
  if (!orderData || !orderData.orderId || loading) return;
  if (initStartedRef.current) return;
  // ...Toss 초기화
}, [...]);
```

변경:
```typescript
useEffect(() => {
  if (selectedMethod !== 'card') return;
  if (!orderData || !orderData.orderId || loading) return;
  if (initStartedRef.current) return;
  // ...Toss 초기화 그대로
}, [selectedMethod, orderData, loading]);
```

- [ ] **Step 3: 빌드 + lint**

```bash
npm run build
npm run lint
```

Expected: 빌드/lint 통과.

> **수동 동작 확인은 테스트 서버 배포 후** (CLAUDE.md 규정: 로컬 dev 서버 금지).

- [ ] **Step 4: Commit**

```bash
git add src/app/branch/\[slug\]/payment/page.tsx src/app/branch/\[slug\]/payment/payment-method-selector.tsx
git commit -m "feat(branch): add payment method selector (card vs vbank) with vbank issue flow"
```

---

## Chunk 7: Frontend — Vbank Page + Success/Fail + Admin Monitoring + Wallet Labels

> 본 chunk가 Phase 2 frontend의 핵심. 폴링 훅(useVbankPoll)이 가장 까다로운 단위 — 마감 시각 도달 시 자동 종료, terminal status 시 종료, 컴포넌트 unmount 시 cleanup, visibility hidden 시 정지.

### Task 7.1 [Frontend]: useVbankPoll 훅 — 폴링 + 마감 타이머

**Files:**
- Create: `src/app/branch/[slug]/payment/vbank/use-vbank-poll.ts`
- Create: `src/__tests__/use-vbank-poll.test.ts`

> **동작**:
> 1. 3초 간격 `pollVbankStatus(paymentId)` 호출
> 2. status가 terminal (PAID|CANCELED|REVIEW_REQUIRED|FAILED)이면 폴링 종료 + 콜백
> 3. `dueDate` 도달 시 자동 종료 + onExpired 콜백
> 4. 컴포넌트 unmount 시 interval cleanup
> 5. 일시적 네트워크 에러는 무시(다음 tick 재시도), 5회 연속 실패 시 onError

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVbankPoll } from '@/app/branch/[slug]/payment/vbank/use-vbank-poll';
import * as branchApi from '@/lib/branch/api';

describe('useVbankPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(branchApi, 'pollVbankStatus');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('polls every 3s and calls onTerminal when status=PAID', async () => {
    (branchApi.pollVbankStatus as any).mockResolvedValueOnce({ status: 'PENDING', paidAt: null, paidAmount: null });
    (branchApi.pollVbankStatus as any).mockResolvedValueOnce({ status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50_000 });
    const onTerminal = vi.fn();

    const future = new Date(Date.now() + 60 * 60_000); // 1h later
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future.toISOString(), onTerminal }));

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    await waitFor(() => expect(onTerminal).toHaveBeenCalled());
    expect(onTerminal.mock.calls[0][0].status).toBe('PAID');
  });

  it('calls onExpired when dueDate is reached', async () => {
    (branchApi.pollVbankStatus as any).mockResolvedValue({ status: 'PENDING', paidAt: null, paidAmount: null });
    const onExpired = vi.fn();
    const past = new Date(Date.now() - 1000); // already past
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: past.toISOString(), onExpired }));

    await vi.advanceTimersByTimeAsync(3500);
    expect(onExpired).toHaveBeenCalled();
  });

  it('cleanup stops interval on unmount', async () => {
    (branchApi.pollVbankStatus as any).mockResolvedValue({ status: 'PENDING', paidAt: null, paidAmount: null });
    const future = new Date(Date.now() + 60 * 60_000);
    const { unmount } = renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future.toISOString() }));

    await vi.advanceTimersByTimeAsync(3000);
    expect(branchApi.pollVbankStatus).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(branchApi.pollVbankStatus).toHaveBeenCalledTimes(1); // 더 호출 안 됨
  });

  it('tolerates intermittent errors (continues polling)', async () => {
    (branchApi.pollVbankStatus as any)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 'PAID', paidAt: '2026-04-28T10:00:00Z', paidAmount: 50_000 });
    const onTerminal = vi.fn();
    const future = new Date(Date.now() + 60 * 60_000);
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future.toISOString(), onTerminal }));

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    await waitFor(() => expect(onTerminal).toHaveBeenCalled());
  });

  it('calls onError after 5 consecutive failures', async () => {
    (branchApi.pollVbankStatus as any).mockRejectedValue(new Error('network'));
    const onError = vi.fn();
    const future = new Date(Date.now() + 60 * 60_000);
    renderHook(() => useVbankPoll({ paymentId: 999, dueDate: future.toISOString(), onError }));

    for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(3000);
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: 훅 구현**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { pollVbankStatus } from '@/lib/branch/api';
import type { PollVbankStatus } from '@/lib/payments/vbank-payment-types';

const POLL_INTERVAL_MS = 3000;
const MAX_CONSECUTIVE_ERRORS = 5;

interface Options {
  paymentId: number;
  dueDate: string; // ISO 8601
  onTerminal?: (status: PollVbankStatus) => void;
  onExpired?: () => void;
  onError?: (err: Error) => void;
}

export function useVbankPoll(opts: Options) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let stopped = false;
    let errorCount = 0;
    const dueAt = new Date(opts.dueDate).getTime();

    const tick = async () => {
      if (stopped) return;
      // 마감 시각 체크 — 호출 전 검사
      if (Date.now() >= dueAt) {
        stopped = true;
        optsRef.current.onExpired?.();
        return;
      }
      try {
        const result = await pollVbankStatus(opts.paymentId);
        errorCount = 0;
        if (stopped) return;
        if (result.status !== 'PENDING') {
          stopped = true;
          optsRef.current.onTerminal?.(result);
        }
      } catch (err: any) {
        errorCount += 1;
        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
          stopped = true;
          optsRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    // 즉시 1회 호출 후 interval
    void tick();
    const id = setInterval(() => { void tick(); }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [opts.paymentId, opts.dueDate]);
}
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run src/__tests__/use-vbank-poll.test.ts
```

Expected: PASS — 5개.

- [ ] **Step 4: Commit**

```bash
git add src/app/branch/\[slug\]/payment/vbank/use-vbank-poll.ts src/__tests__/use-vbank-poll.test.ts
git commit -m "feat(branch): add useVbankPoll hook (3s poll + dueDate timeout + error tolerance)"
```

---

### Task 7.2 [Frontend]: /branch/[slug]/payment/vbank 페이지

**Files:**
- Create: `src/app/branch/[slug]/payment/vbank/page.tsx`
- Create: `src/app/branch/[slug]/payment/vbank/vbank-info-card.tsx`

> **동작**: 진입 시 `usePaymentStore.vbankInfo`에서 발급 정보 읽음. 없으면 `paymentId` 쿼리에서 폴링만 진행 (새로고침 케이스 — 이 경우 별도 API로 vbankInfo 조회는 v1에서 미구현, store에서 사라졌으면 fail 페이지로 이동). `useVbankPoll`로 폴링. 입금/취소/만료 → 분기 이동.

- [ ] **Step 1: vbank-info-card.tsx 컴포넌트**

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bankName: string | null;
  bankCode: string;
  accountNumber: string;
  holderName: string;
  amount: number;
  dueDate: string; // ISO
}

export function VbankInfoCard({ bankName, bankCode, accountNumber, holderName, amount, dueDate }: Props) {
  const due = new Date(dueDate);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">가상계좌 입금 안내</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">은행</span>
            <span className="font-medium">{bankName ?? `(${bankCode})`}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">계좌번호</span>
            <span className="font-mono text-lg font-semibold tracking-wider">{accountNumber}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(accountNumber);
                toast.success('계좌번호 복사됨');
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">예금주</span>
            <span>{holderName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">입금액</span>
            <span className="font-semibold text-slate-800">{amount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">마감</span>
            <span className="text-slate-700">{due.toLocaleString('ko-KR')}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          • 정확한 금액으로 입금하셔야 자동 처리됩니다. 부분/초과 입금 시 처리 지연 가능.<br/>
          • 입금 후 자동으로 결제 완료 페이지로 이동합니다 (보통 1~3분 소요).
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: page.tsx**

```typescript
'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePaymentStore } from '@/lib/branch/payment-store';
import { useVbankPoll } from './use-vbank-poll';
import { VbankInfoCard } from './vbank-info-card';
import { toast } from 'sonner';

export default function VbankPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const slug = params.slug as string;
  const paymentIdQuery = Number(search.get('paymentId') ?? '0');

  const vbankInfo = usePaymentStore((s) => s.vbankInfo);
  const clearVbankInfo = usePaymentStore((s) => s.clearVbankInfo);

  // 발급 정보 없거나 paymentId 미일치 → fail 페이지
  useEffect(() => {
    if (!vbankInfo || vbankInfo.paymentId !== paymentIdQuery) {
      router.replace(`/branch/${slug}/payment/fail?reason=missing-vbank-info`);
    }
  }, [vbankInfo, paymentIdQuery, router, slug]);

  useVbankPoll({
    paymentId: paymentIdQuery,
    dueDate: vbankInfo?.dueDate ?? new Date(Date.now() - 1).toISOString(),
    onTerminal: (result) => {
      if (result.status === 'PAID') {
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/success?paymentId=${paymentIdQuery}&method=vbank`);
      } else if (result.status === 'REVIEW_REQUIRED') {
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/fail?reason=review-required&paymentId=${paymentIdQuery}`);
      } else {
        // CANCELED | FAILED
        clearVbankInfo();
        router.replace(`/branch/${slug}/payment/fail?reason=${result.status.toLowerCase()}`);
      }
    },
    onExpired: () => {
      clearVbankInfo();
      router.replace(`/branch/${slug}/payment/fail?reason=expired`);
    },
    onError: (err) => {
      toast.error(`상태 조회 오류 — 페이지를 새로고침해 주세요 (${err.message})`);
    },
  });

  if (!vbankInfo) return null; // useEffect가 redirect 처리

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-slate-800">결제 진행 중</h1>
      <VbankInfoCard
        bankName={vbankInfo.bankName}
        bankCode={vbankInfo.bankCode}
        accountNumber={vbankInfo.accountNumber}
        holderName={vbankInfo.holderName}
        amount={vbankInfo.amount}
        dueDate={vbankInfo.dueDate}
      />
      <p className="text-center text-xs text-slate-500">
        입금 확인 시 자동으로 다음 페이지로 이동합니다.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: 빌드**

```bash
npm run build
```

Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/app/branch/\[slug\]/payment/vbank/
git commit -m "feat(branch): add /payment/vbank page with poll + auto redirect"
```

---

### Task 7.3 [Frontend]: success / fail 페이지 vbank 분기

**Files:**
- Modify: `src/app/branch/[slug]/payment/success/page.tsx`
- Modify: `src/app/branch/[slug]/payment/fail/page.tsx`

> **추가 표시**:
> - success: `?method=vbank` 쿼리가 있으면 "가상계좌 입금이 확인되었습니다" 안내 문구
> - fail: `?reason=expired|canceled|review-required|missing-vbank-info` 쿼리에 따라 한국어 안내 분기

- [ ] **Step 1: success/page.tsx 분기 추가**

기존 success 페이지의 안내 텍스트 영역에 분기 추가:

```typescript
const search = useSearchParams();
const method = search.get('method');

const heading = method === 'vbank' ? '입금이 확인되었습니다' : '결제가 완료되었습니다';
const subtext = method === 'vbank'
  ? '가상계좌 입금 처리가 자동으로 완료되었습니다.'
  : '카드 결제가 정상적으로 처리되었습니다.';
```

- [ ] **Step 2: fail/page.tsx 분기 추가**

```typescript
const search = useSearchParams();
const reason = search.get('reason') ?? 'unknown';

const messages: Record<string, { title: string; sub: string }> = {
  expired: { title: '입금 시간이 만료되었습니다', sub: '마감 시간 내 입금이 확인되지 않았습니다. 다시 결제를 시도해 주세요.' },
  canceled: { title: '결제가 취소되었습니다', sub: '본사 또는 PG에서 결제 취소 처리되었습니다.' },
  'review-required': { title: '입금액 확인이 필요합니다', sub: '입금액이 결제 요청 금액과 다릅니다. 본사가 확인 후 처리합니다.' },
  'missing-vbank-info': { title: '결제 정보를 찾을 수 없습니다', sub: '주문 페이지로 돌아가 다시 시도해 주세요.' },
  unknown: { title: '결제에 실패했습니다', sub: '잠시 후 다시 시도해 주세요.' },
};
const m = messages[reason] ?? messages.unknown;
```

이 객체로 페이지 제목/안내문 분기.

- [ ] **Step 3: 빌드 + Commit**

```bash
npm run build
git add src/app/branch/\[slug\]/payment/success/page.tsx src/app/branch/\[slug\]/payment/fail/page.tsx
git commit -m "feat(branch): branch payment success/fail pages on vbank reason/method"
```

---

### Task 7.4 [Frontend]: Admin 모니터링 API 클라이언트

**Files:**
- Create: `src/lib/api/admin-payments-vbank.ts`
- Create: `src/__tests__/admin-payments-vbank-api.test.ts`

- [ ] **Step 1: 테스트 + 구현 (병합)**

`src/lib/api/admin-payments-vbank.ts`:

```typescript
import { api } from './client';
import type {
  AdminVbankPaymentsListResponse,
  AdminVbankPaymentsFilters,
} from '@/lib/payments/vbank-payment-types';

export async function listVbankPayments(
  filters: AdminVbankPaymentsFilters = {},
): Promise<AdminVbankPaymentsListResponse> {
  const params = new URLSearchParams();
  filters.status?.forEach((s) => params.append('status', s));
  if (filters.branchId) params.set('branchId', String(filters.branchId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.mode) params.set('mode', filters.mode);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();
  return api(`/admin/payments/vbank${qs ? `?${qs}` : ''}`, { method: 'GET' });
}
```

테스트:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listVbankPayments } from '@/lib/api/admin-payments-vbank';
import * as client from '@/lib/api/client';

describe('listVbankPayments', () => {
  beforeEach(() => {
    vi.spyOn(client, 'api').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('serializes status[] as repeated query params', async () => {
    await listVbankPayments({ status: ['PENDING', 'PAID'] });
    expect((client.api as any).mock.calls[0][0]).toContain('status=PENDING&status=PAID');
  });

  it('serializes branchId, from, to, mode, page, pageSize', async () => {
    await listVbankPayments({ branchId: 10, from: '2026-04-01', to: '2026-04-30', mode: 'TEST', page: 2, pageSize: 50 });
    const url = (client.api as any).mock.calls[0][0];
    expect(url).toContain('branchId=10');
    expect(url).toContain('from=2026-04-01');
    expect(url).toContain('mode=TEST');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=50');
  });

  it('omits query string when no filters', async () => {
    await listVbankPayments();
    expect((client.api as any).mock.calls[0][0]).toBe('/admin/payments/vbank');
  });
});
```

- [ ] **Step 2: 테스트 + Commit**

```bash
npx vitest run src/__tests__/admin-payments-vbank-api.test.ts
git add src/lib/api/admin-payments-vbank.ts src/__tests__/admin-payments-vbank-api.test.ts
git commit -m "feat(admin): add listVbankPayments API client"
```

---

### Task 7.5 [Frontend]: /admin/payments/vbank 모니터링 페이지

**Files:**
- Create: `src/app/admin/payments/vbank/page.tsx`
- Create: `src/app/admin/payments/vbank/vbank-payments-table.tsx`
- Create: `src/app/admin/payments/vbank/vbank-status-badge.tsx`
- Create: `src/app/admin/payments/vbank/vbank-payments-filters.tsx`
- Modify: `src/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: vbank-status-badge.tsx**

```typescript
import { Badge } from '@/components/ui/badge';
import type { VbankPaymentStatus } from '@/lib/payments/vbank-payment-types';

const STYLES: Record<VbankPaymentStatus, { label: string; className: string }> = {
  PENDING: { label: '입금대기', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAID: { label: '입금완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELED: { label: '취소/만료', className: 'bg-slate-200 text-slate-700 border-slate-300' },
  REVIEW_REQUIRED: { label: '검토필요', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function VbankStatusBadge({ status }: { status: VbankPaymentStatus }) {
  const style = STYLES[status] ?? STYLES.FAILED;
  return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
}
```

- [ ] **Step 2: vbank-payments-filters.tsx (status + branchId + from/to + mode)**

shadcn `Input`/`Select`/`Button`로 폼 구성, `onChange`로 부모에 filters 전달.

- [ ] **Step 3: vbank-payments-table.tsx**

shadcn `Table` + `useQuery`로 `listVbankPayments(filters)` 호출 결과 렌더. 컬럼: 결제ID / 주문ID / 지사 / 상태 / 요청액 / 입금액 / 가상계좌 / 마감 / 입금시각 / 모드.

- [ ] **Step 4: page.tsx**

```typescript
'use client';

import { useState } from 'react';
import { VbankPaymentsTable } from './vbank-payments-table';
import { VbankPaymentsFilters } from './vbank-payments-filters';
import type { AdminVbankPaymentsFilters } from '@/lib/payments/vbank-payment-types';

export default function AdminVbankPaymentsPage() {
  const [filters, setFilters] = useState<AdminVbankPaymentsFilters>({ pageSize: 20, page: 1 });
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-800">가상계좌 결제 모니터링</h1>
      <VbankPaymentsFilters value={filters} onChange={setFilters} />
      <VbankPaymentsTable filters={filters} onPageChange={(page) => setFilters({ ...filters, page })} />
    </div>
  );
}
```

- [ ] **Step 5: 사이드바 메뉴 추가**

`admin-sidebar.tsx`의 결제 그룹에 추가:

```typescript
{ href: '/admin/payments/vbank', label: '가상계좌 결제' },
```

- [ ] **Step 6: 컴포넌트 테스트 (table 단위)**

```typescript
// src/__tests__/vbank-payments-table.test.tsx
// React Testing Library + msw 또는 useQuery mock으로 데이터 행 렌더 검증.
// (Phase 1 admin 페이지 테스트와 동일 패턴)
```

- [ ] **Step 7: 빌드 + lint + Commit**

```bash
npm run build && npm run lint
npx vitest run src/__tests__/vbank-payments-table.test.tsx
git add src/app/admin/payments/vbank/ src/components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add /admin/payments/vbank monitoring page (filters + table)"
```

---

### Task 7.6 [Frontend]: Wallet 거래내역에 VBANK_HOLD/VBANK_SETTLE 라벨

**Files:**
- Modify: `src/app/admin/branches/[id]/wallet/page.tsx` (또는 wallet 거래내역 컴포넌트)
- Modify: `src/app/branch/[slug]/manage/wallet/page.tsx` (지사 dashboard side)

> **현재**: tx.type에 따라 라벨/색상 부여하는 매핑 존재. **추가**:
> - `VBANK_HOLD` → "가상계좌 차감" / 음수색
> - `VBANK_SETTLE` → "가상계좌 환원" / 양수색

- [ ] **Step 1: tx.type 매핑 객체에 추가**

```typescript
const TX_TYPE_LABEL: Record<string, { label: string; tone: 'positive' | 'negative' | 'neutral' }> = {
  CHARGE: { label: '충전', tone: 'positive' },
  REFUND: { label: '환불', tone: 'positive' },
  ORDER_FEE: { label: '주문 수수료', tone: 'negative' },
  SMS_FEE: { label: 'SMS 발송료', tone: 'negative' },
  ADJUST: { label: '관리자 조정', tone: 'neutral' },
  VBANK_HOLD: { label: '가상계좌 차감', tone: 'negative' },
  VBANK_SETTLE: { label: '가상계좌 환원', tone: 'positive' },
};
```

기존 매핑 위치를 grep으로 찾아 같은 패턴으로 확장.

- [ ] **Step 2: 빌드 + Commit**

```bash
npm run build
git add src/app/admin/branches/\[id\]/wallet/page.tsx src/app/branch/\[slug\]/manage/wallet/page.tsx
git commit -m "feat(wallet): add VBANK_HOLD/VBANK_SETTLE transaction labels"
```

---

## Chunk 8: Integration Testing + Deployment

### Task 8.1: e2e 시나리오 (테스트 서버)

**전제**: backend / frontend 모든 PR이 main에 머지된 상태. 테스트 서버에 배포 완료.

- [ ] **Step 1: 충전금 충분 — vbank 발급 → 입금 시뮬 → SETTLE 확인**

1. 본사 admin → `/admin/innopay-credentials`에서 TEST 모드 자격증명 확인
2. 시범 지사 충전금이 충분한 상태(예: 100,000원 이상)인지 확인
3. 지사 홈페이지 → 주문 → 결제수단 "가상계좌" 선택
4. 발급된 계좌 + 마감시각 확인
5. wallet 거래내역에 `VBANK_HOLD: -50,000` 행이 즉시 보이는지 확인
6. Innopay 테스트 콘솔에서 해당 계좌로 정확한 금액 입금 시뮬
7. `/branch/{slug}/payment/vbank` 페이지가 자동으로 success로 이동하는지 확인
8. wallet 거래내역에 `VBANK_SETTLE: +50,000` + `ORDER_FEE: -500` 행 확인 (잔액 net 99,500)
9. `/admin/payments/vbank`에 PAID 상태로 표시되는지 확인

- [ ] **Step 2: 충전금 부족 — 발급 시점 거부**

1. 시범 지사 충전금을 0원으로 만들고 (또는 amount보다 적게)
2. 결제수단 "가상계좌" 선택
3. 400 응답 + 에러 토스트 "충전금이 부족하여..." 확인
4. payments 테이블에 row 없음 / wallet 거래 없음 확인

- [ ] **Step 3: 부분 입금 — REVIEW_REQUIRED**

1. 발급 (예: amount=50,000)
2. Innopay 콘솔에서 49,000원 입금 시뮬
3. `/admin/payments/vbank`에 REVIEW_REQUIRED 상태로 표시
4. wallet 거래에 SETTLE/ORDER_FEE 없음 (HOLD만 유지)
5. 텔레그램 알림 수신 확인

- [ ] **Step 4: 만료 — cron sweep**

1. 발급된 vbank의 `vbank_due_date`를 DB에서 직접 과거로 수정 (테스트 데이터 조작)
2. cron `0 5 * * * *` 실행 또는 수동으로 `vbankExpirationJob.run()` 호출
3. payments.status = CANCELED, fail_reason = 'VBANK_EXPIRED' 확인
4. wallet HOLD 그대로 유지 (지사 손실 확정) 확인

- [ ] **Step 5: 멱등 — 같은 webhook 2회 수신**

1. Innopay webhook을 동일 transSeq로 2회 호출
2. webhook_events에 2행 INSERT, processed=true 1건만 (2번째는 'duplicate')
3. payments / wallet 거래에 중복 SETTLE 없음 확인

### Task 8.2: 운영 배포 (Phase 1 시범 검증 완료 후)

- [ ] **사전 조건 (전부 충족 시에만 진행)**:
  - [ ] Phase 1 시범 지사에서 REAL 자격증명 1회 이상 정상 충전 확인
  - [ ] Phase 2 e2e 시나리오 5종(Task 8.1) 모두 PASS
  - [ ] 사용자 명시적 운영 배포 승인

- [ ] **백엔드 운영 배포**

```bash
ssh blueadm@49.247.206.190 'cd ~/backend && git pull origin master'
# 마이그레이션 042/043 적용
ssh blueadm@49.247.206.190 'docker compose -f ~/backend/docker/docker-compose.yml exec -T mariadb mysql -uroot -p"$MARIADB_ROOT_PASSWORD" run_flower < ~/backend/migrations/042_payments_vbank_innopay.sql'
ssh blueadm@49.247.206.190 'docker compose -f ~/backend/docker/docker-compose.yml exec -T mariadb mysql -uroot -p"$MARIADB_ROOT_PASSWORD" run_flower < ~/backend/migrations/043_payments_status_review_required.sql'
# 빌드 + 재시작
ssh blueadm@49.247.206.190 'cd ~/backend && docker run --rm -v $(pwd):/app -w /app/apps/api node:18 sh -c "npm install && npm run build"'
ssh blueadm@49.247.206.190 'docker compose -f ~/backend/docker/docker-compose.yml up -d --no-deps api'
# 검증
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/admin/payments/vbank'
# Expected: 401
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/public/payments/vbank/1/status'
# Expected: 404 (paymentId 1 없음) 또는 200 — 라우트 등록 확인
```

- [ ] **프론트엔드 운영 배포**

```bash
bash deploy/deploy-zerodt.sh prod
# zero-downtime 배포 + 헬스체크 자동
```

- [ ] **운영 smoke test**

```bash
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" https://seoulflower.co.kr/admin/payments/vbank'
# 200 (페이지 렌더)
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" https://seoulflower.co.kr/api/proxy/admin/payments/vbank'
# 401 (AdminGuard)
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" -X POST https://seoulflower.co.kr/api/proxy/public/payments/vbank -H "Content-Type: application/json" -d "{}"'
# 400 (validation 에러 — 라우트 정상)
```

- [ ] **운영 시범 운영 1주**:
  - 본사 admin이 시범 지사에서 카드결제 + 가상계좌 모두 사용 가능
  - 가상계좌 발급 1회 → 입금 → SETTLE까지 1주 동안 모니터링
  - 1주 무결성 확인 후 전 지사 활성화

---

## Rollout Strategy

1. **테스트 서버 배포** (Phase 2 plan 완료 직후)
   - e2e Task 8.1 5개 시나리오 모두 PASS

2. **Phase 1 시범 검증 완료 대기** (1~2주, 별도 user 작업)
   - REAL 자격증명 전환 + 충전 1회 이상 정상 입금 확인

3. **운영 배포** (사용자 승인 후)
   - DB 마이그레이션 042/043
   - Backend + Frontend 동시 배포
   - smoke test 통과

4. **운영 시범 운영 1주**
   - 시범 지사 1개에서 가상계좌 결제 활성화
   - 1주 모니터링

5. **전 지사 확대**
   - 모든 지사의 결제수단에 가상계좌 옵션 추가
   - Phase 2 종료, 후속(부분/초과 입금 자동 처리, 자동 환불 등)은 별도 plan

---

## Rollback Procedures

**프론트 즉시 롤백 (~1초)**:
```bash
bash deploy/rollback-zerodt.sh prod
```

**백엔드 코드 롤백**:
```bash
ssh blueadm@49.247.206.190 'cd ~/backend && git revert <phase2 squash commit SHA> && docker compose -f docker/docker-compose.yml up -d --no-deps api'
```

**DB 마이그레이션 롤백**:
```bash
# 역순으로
ssh blueadm@49.247.206.190 'docker compose ... mariadb ... < migrations/043_payments_status_review_required_rollback.sql'
ssh blueadm@49.247.206.190 'docker compose ... mariadb ... < migrations/042_payments_vbank_innopay_rollback.sql'
```

> **주의**: 롤백 시점에 vbank/innopay 컬럼에 운영 데이터가 들어있으면 영구 손실. 가능하면 컬럼 보존 + 코드만 revert.

---

## v1 범위 외 (후속 계획)

- 부분/초과 입금 자동 처리 (REVIEW_REQUIRED → 본사 admin이 수동으로 처리하는 UI)
- 가상계좌 결제 통계 대시보드 (월별 매출/수수료/취소율)
- 자동 환불 API (현재는 수동 송금 + ADJUST)
- 카드결제 영수증/영수증 발급 → 가상계좌도 동일 처리

---

## End of Plan





