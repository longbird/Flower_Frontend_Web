# Innopay 가상계좌 — Phase 1: Foundation + 지사 충전 자동화 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 본사 단일 이노페이 자격증명 + 지사별 충전용 가상계좌를 발급하고, 지사가 해당 계좌에 입금하면 webhook으로 충전금이 자동 적립되는 흐름까지 end-to-end 구현.

**Architecture:** 백엔드(NestJS 10)는 기존 `payments/providers/` 디렉터리에 `innopay/` Provider를 추가하고, `wallets` 모듈을 확장해 webhook 입금을 자동 CHARGE 거래로 변환. 프론트엔드(Next.js 16)는 본사 admin에 자격증명 + 지사별 vbank 발급 UI를 추가하고, 지사 관리자에게 자기 가상계좌 정보를 노출.

**Tech Stack:** NestJS 10 (TypeScript) + MariaDB / Next.js 16 + React 19 + TanStack Query / vitest + jest

**Spec:** `docs/superpowers/specs/2026-04-27-innopay-vbank-design.md`

**Phase 2 (별도 plan):** 고객 결제용 vbank + HOLD/SETTLE 흐름 + 모니터링.

---

## Repos

| Repo | 경로 | 역할 |
|------|------|------|
| Backend | `D:\Work\AI_Projects\RunFlower\src\run_flower_backend_final_repo` | NestJS API |
| Frontend | `D:\Work\AI_Projects\RunFlower\src\Flower_Frontend_Web` | Next.js admin/branch web |

각 task의 `Files:` 섹션은 절대경로 prefix 없이 repo 기준 상대경로로 표기. 대상 repo는 task 헤더에 `[Backend]` / `[Frontend]`로 표시.

---

## File Structure

### Backend (`run_flower_backend_final_repo/`)

```
migrations/
  040_innopay_foundation.sql                      [new] DB schema (credentials, branches 확장, webhook_events)
  041_wallet_tx_type_innopay.sql                  [new] wallet tx_type 확장 메모(스키마는 VARCHAR이라 컬럼 변경 불필요)

apps/api/src/payments/providers/innopay/         [new dir]
  innopay.module.ts                              모듈 등록
  innopay.client.ts                              HTTP 클라이언트 (vbank 발급/조회/취소)
  innopay.client.spec.ts
  innopay-credentials.db.ts                      자격증명 DAO (단일 행)
  innopay-credentials.db.spec.ts
  innopay-credentials.service.ts                 비즈니스 로직 (mode 검증, encrypted at rest)
  innopay-credentials.service.spec.ts
  innopay-credentials.controller.ts              POST/GET /admin/innopay/credentials
  innopay-credentials.controller.spec.ts
  innopay-webhook.controller.ts                  POST /admin/payments/innopay/webhook
  innopay-webhook.service.ts                     서명검증 + dispatch + 멱등
  innopay-webhook.service.spec.ts
  innopay-topup.service.ts                       지사 충전 자동 CHARGE 핸들러
  innopay-topup.service.spec.ts
  innopay-provider.ts                            PaymentProvider 인터페이스 구현 (Phase 1: vbank 발급만)
  dto/
    issue-vbank.dto.ts                            request/response DTO
    webhook-payload.dto.ts
    update-credentials.dto.ts

apps/api/src/payments/webhook-events/             [new dir]
  webhook-events.db.ts                           감사 로그 DAO
  webhook-events.db.spec.ts
  webhook-events.module.ts

apps/api/src/admin/branches/                       [extend]
  branch-topup-vbank.controller.ts                [new] POST/GET/PATCH /admin/branches/:id/topup-vbank
  branch-topup-vbank.service.ts                   [new]
  branch-topup-vbank.service.spec.ts              [new]
  branches.controller.ts                          [extend] GET 응답에 topup_vbank_* 필드 추가
  branches.module.ts                              [extend] 신규 controller/service import

apps/api/src/branch/                                [extend]
  branch-public.controller.ts (or 기존 위치)       [extend] GET /branch/:slug/topup-vbank 추가

apps/api/src/wallets/
  wallet.service.ts                                [extend] applyInnopayTopup(branchId, amount, tid)
  wallet.service.spec.ts                           [extend] 신규 메서드 테스트
  wallet.constants.ts                              [extend] tx ref_type INNOPAY_TOPUP 추가
```

### Frontend (`Flower_Frontend_Web/`)

```
src/lib/payments/
  innopay-types.ts                                 [new] InnopayCredentials, BranchTopupVbank types

src/lib/api/
  innopay-credentials.ts                           [new] admin API 클라이언트
  branch-topup-vbank.ts                            [new] admin API 클라이언트
  admin.ts                                         [extend] re-export

src/lib/branch/
  branch-api.ts                                    [extend] getMyTopupVbank(slug)

src/app/admin/innopay-credentials/
  page.tsx                                         [new] 자격증명 관리 UI

src/app/admin/branches/[id]/
  page.tsx                                         [extend] 충전용 vbank 발급/조회 패널
  topup-vbank-panel.tsx                            [new] 패널 컴포넌트 (기존 page.tsx에서 import)

src/app/branch/[slug]/manage/
  wallet/page.tsx                                  [extend or new] 지사 자기 vbank 정보 표시

src/__tests__/
  admin/innopay-credentials.test.tsx               [new]
  admin/branch-topup-vbank-panel.test.tsx          [new]
  branch/manage-wallet-vbank.test.tsx              [new]
```

---

## Task 0: 사전 준비 (HARD-GATE — 다음 chunk 진입 전 필수)

### Task 0.1: 브랜치 생성

- [ ] **Backend repo**: `cd D:\Work\AI_Projects\RunFlower\src\run_flower_backend_final_repo && git checkout -b feat/innopay-foundation`
- [ ] **Frontend repo**: `cd D:\Work\AI_Projects\RunFlower\src\Flower_Frontend_Web && git checkout -b feat/innopay-foundation`

### Task 0.2: 이노페이 API 가이드 정독 + 사양 문서화 ✅ 완료

산출물: `docs/innopay-api-reference.md` (백엔드 레포) — **이미 작성됨** (2026-04-27, Playwright 자동 추출)

확정 사양 요약:
- **API base URL**: `https://api.innopay.co.kr` (TEST/REAL 동일)
- **인증**: JSON body에 `mid` + `licenseKey` 포함 (Bearer 헤더 X)
- **Endpoints**:
  - 발급: `POST /api/vbankApi`
  - 발급상태조회/삭제: `POST /api/vacctInquery`
  - 가상계좌 취소: `POST /api/vbankCancel`
  - 통합 결제 취소: `POST /api/cancelApi`
- **두 종류 vbank**:
  - 채번형(one-time): `vbankExpDate=YYYYMMDD` → 고객 결제용 (Phase 2)
  - 벌크형(영구): `vbankExpDate=99999999` → **지사 충전용 (Phase 1)** — 거래정보 저장 안 됨, vbankCancel 미지원
- **Webhook (Noti)**:
  - Content-Type: `application/x-www-form-urlencoded`
  - 응답: plain text `"0000"` (성공) / 그 외 → 1분×10회 재전송
  - **서명 검증 메커니즘 없음** → IP allowlist + payload `mid` 일치 검증 + 멱등 키(`transSeq`)로 보안
- **결제 상태**: `status=25` 결제완료, `status=85` 결제취소 (가상계좌는 입금 후 2시간 30분 내 취소 가능)
- **결제수단 코드**: 가상계좌 = `08`
- **결과 코드**: `4100` 성공
- **payload 핵심 필드**: `shopCode`(=mid), `transSeq`(이노페이 tid), `moid`(가맹점 주문번호 — 벌크형 임의), `vacctNo`(가상계좌번호), `vbankBankCd`, `vbankAcctNm`(송금자명), `goodsAmt`(입금금액), `mallReserved`(예비)

### Task 0.3: 백엔드 데이터 모델 확인 (table/guard 이름 확정)

- [ ] **지사 테이블 확인**: Run `cd apps/api && grep -rn "FROM organizations\|FROM branches" src/`
  - Expected: 지사는 `organizations` 테이블에 `type='BRANCH'`로 저장됨 (마이그 039 검증). 본 plan은 `organizations` 기준으로 작성됨.
  - 만약 별도 `branches` 테이블이 존재하면 plan 전반의 SQL/DAO 경로를 보정.
- [ ] **AdminAuthGuard 경로 확인**: Run `grep -rn "class.*AdminAuthGuard\|class.*AdminGuard" apps/api/src/`
  - 정확한 export 위치를 본 plan의 import 경로(`../../../admin/auth/admin-auth.guard`)와 비교 → 다르면 보정
- [ ] **Branch Admin Guard 확인 (지사 관리자 토큰)**: Run `grep -rn "BranchAdmin\|@UseGuards.*[Bb]ranch" apps/api/src/`
  - Task 4.4의 `@UseGuards(BranchAdminGuard)` 부분에 사용할 정확한 클래스명 확정
- [ ] **rawBody parser 존재 확인**: Run `grep -n "rawBody\|verify.*req\|bodyParser\.json" apps/api/src/main.ts`
  - 없으면 Task 4.5에서 `main.ts` 수정 task 추가 필요

산출물: `docs/innopay-api-reference.md`에 위 결과 추가.

### Task 0.4: 테스트 자격증명 확보

- [ ] 이노페이 콘솔(`testpay01` / `ars123!@#`) 로그인
- [ ] `MID`(또는 가맹점 코드), 테스트 API base URL, 테스트 webhook secret 확보
- [ ] 추후 Task 5.3에서 화면에 입력할 값으로 노트에 보관

### Task 0.5: 암호화 키 운영 절차 문서화

- [ ] `INNOPAY_ENCRYPTION_KEY_HEX` 32바이트(64-hex) 키 생성: `openssl rand -hex 32`
- [ ] `apps/api/.env.local` (개발), 테스트 서버 `.env`, 운영 `shared/.env.local` 각각에 주입 (운영은 사용자 본인이 직접 편집 — `shared/.env.local 보호 규칙` 준수)
- [ ] **키 회전 정책**: 본 v1에서는 키 회전 시 기존 암호문 행을 모두 신규 키로 재암호화하는 절차 필요. `docs/innopay-key-rotation.md` (백엔드) 신규 작성 — 절차만 기재, 자동화 후속.
- [ ] `InnopayCredentialsService` 생성자에서 키 부재 시 fail-fast (Task 2.2 Step 3 보정 — 아래 참조)

---

## Chunk 1: Backend DB Foundation

### Task 1.1: Migration 040 — 자격증명·지사 vbank·감사 테이블 [Backend]

**Files:**
- Create: `migrations/040_innopay_foundation.sql`

- [ ] **Step 0: Precondition — Task 0.3 완료**

지사 테이블 이름이 본 plan의 가정(`organizations`)과 일치하는지 확인 완료되어야 함. 일치하지 않으면 본 task 진입 전 plan 수정.

- [ ] **Step 1: SQL 작성 (멱등 가능, IF NOT EXISTS 활용)**

`migrations/040_innopay_foundation.sql`:

```sql
-- Migration: 040_innopay_foundation
-- Description: 이노페이 가상계좌 도입 Phase 1 — 자격증명 단일 행, 지사 충전용 vbank 컬럼, webhook 감사 로그
-- Date: 2026-04-27
-- Related spec: docs/superpowers/specs/2026-04-27-innopay-vbank-design.md
-- Rollback: migrations/040_innopay_foundation_rollback.sql

-- 1) 본사 단일 자격증명
CREATE TABLE IF NOT EXISTS innopay_credentials (
  id INT NOT NULL PRIMARY KEY DEFAULT 1,
  mode VARCHAR(10) NOT NULL DEFAULT 'TEST' COMMENT 'TEST | REAL',
  merchant_id VARCHAR(100) NOT NULL,
  merchant_key_encrypted VARBINARY(512) NOT NULL COMMENT 'AES-256-GCM 암호화 키',
  api_base_url VARCHAR(255) NOT NULL,
  license_key_encrypted VARBINARY(512) NOT NULL COMMENT '이노페이 licenseKey (암호화). API 인증 body에 포함',
  updated_by BIGINT NULL COMMENT 'admin_users.id',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_innopay_singleton CHECK (id = 1),
  CONSTRAINT ck_innopay_mode CHECK (mode IN ('TEST', 'REAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 지사 충전용 vbank 컬럼 (organizations 테이블, type='BRANCH')
-- MariaDB 10.5+: ADD COLUMN IF NOT EXISTS 지원. 더 낮은 버전이면 별도 information_schema 점검 필요.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS topup_vbank_account_number VARCHAR(50) NULL COMMENT '이노페이 발급 충전용 가상계좌',
  ADD COLUMN IF NOT EXISTS topup_vbank_bank_code VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS topup_vbank_holder_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS topup_vbank_innopay_id VARCHAR(100) NULL COMMENT '이노페이 측 식별자',
  ADD COLUMN IF NOT EXISTS topup_vbank_issued_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS topup_vbank_active TINYINT(1) NOT NULL DEFAULT 0;

-- UNIQUE 인덱스: ALTER TABLE은 동일 키명 추가 시 에러. CREATE UNIQUE INDEX IF NOT EXISTS 사용.
CREATE UNIQUE INDEX IF NOT EXISTS uk_topup_vbank_account ON organizations (topup_vbank_account_number);
CREATE UNIQUE INDEX IF NOT EXISTS uk_topup_vbank_innopay ON organizations (topup_vbank_innopay_id);

-- 3) Webhook 감사 로그 (Innopay 이외 PG 확장 가능하도록 source 컬럼 보유)
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(30) NOT NULL COMMENT 'INNOPAY | TOSS | ...',
  event_type VARCHAR(50) NOT NULL,
  external_tid VARCHAR(100) NULL COMMENT '이노페이 거래 ID (innopay_tid)',
  raw_payload JSON NOT NULL,
  signature VARCHAR(255) NULL,
  signature_valid TINYINT(1) NOT NULL DEFAULT 0,
  processed TINYINT(1) NOT NULL DEFAULT 0,
  processing_error TEXT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  INDEX ix_source_received (source, received_at DESC),
  INDEX ix_external_tid (external_tid),
  INDEX ix_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Rollback SQL 작성**

`migrations/040_innopay_foundation_rollback.sql`:
```sql
-- Rollback for 040_innopay_foundation
-- 주의: webhook_events / innopay_credentials 데이터가 있을 경우 손실 가능. 실행 전 백업 필수.
DROP INDEX IF EXISTS uk_topup_vbank_account ON organizations;
DROP INDEX IF EXISTS uk_topup_vbank_innopay ON organizations;
ALTER TABLE organizations
  DROP COLUMN IF EXISTS topup_vbank_account_number,
  DROP COLUMN IF EXISTS topup_vbank_bank_code,
  DROP COLUMN IF EXISTS topup_vbank_holder_name,
  DROP COLUMN IF EXISTS topup_vbank_innopay_id,
  DROP COLUMN IF EXISTS topup_vbank_issued_at,
  DROP COLUMN IF EXISTS topup_vbank_active;
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS innopay_credentials;
```

- [ ] **Step 3: 마이그레이션 실행 (로컬)**

Run: `cd docker && docker-compose exec -T mariadb mysql -u root -p$MYSQL_ROOT_PWD run_flower < ../migrations/040_innopay_foundation.sql`
Expected: 0 errors. (재실행해도 IF NOT EXISTS 덕분에 에러 없음)

- [ ] **Step 4: 검증 SQL**

```sql
DESCRIBE innopay_credentials;
SHOW COLUMNS FROM organizations LIKE 'topup_vbank_%';  -- 6개 컬럼
DESCRIBE webhook_events;
SHOW INDEX FROM organizations WHERE Key_name LIKE 'uk_topup_vbank%';  -- 2개
```
Expected: 위 결과 모두 충족

- [ ] **Step 5: 테스트 서버에 적용** (Task 7.4 단계에서 일괄 처리하지 말고 본 chunk 종료 시 즉시 적용 — 이후 task가 신규 컬럼에 의존)

Run: `bash backend repo의 deploy script (또는 docker-compose 수동 적용)`

- [ ] **Step 6: Commit**

```bash
git add migrations/040_innopay_foundation.sql migrations/040_innopay_foundation_rollback.sql
git commit -m "feat(payment): 이노페이 가상계좌 DB foundation (자격증명/지사 vbank/감사로그) + rollback"
```

---

### Task 1.2: Wallet 거래 ref_type 상수 확장 [Backend]

**Files:**
- Modify: `apps/api/src/wallets/wallet.constants.ts`

- [ ] **Step 1: 기존 파일 확인**

Run: `cat apps/api/src/wallets/wallet.constants.ts`

- [ ] **Step 2: `INNOPAY_TOPUP` ref_type 추가**

기존 상수 객체에 추가:
```typescript
export const WALLET_REF_TYPE = {
  ORDER: 'ORDER',
  SMS: 'SMS',
  MANUAL: 'MANUAL',
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  INNOPAY_TOPUP: 'INNOPAY_TOPUP', // [신규] 이노페이 vbank 입금에 의한 자동 충전
} as const

export type WalletRefType = (typeof WALLET_REF_TYPE)[keyof typeof WALLET_REF_TYPE]
```

- [ ] **Step 3: 사용처 grep으로 회귀 점검**

Run: `grep -rn "WALLET_REF_TYPE" apps/api/src/`
Expected: 기존 사용처가 새 상수 추가 후에도 컴파일 성공

- [ ] **Step 4: 빌드 검증**

Run: `cd apps/api && npm run build`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/wallets/wallet.constants.ts
git commit -m "feat(wallet): INNOPAY_TOPUP ref_type 상수 추가"
```

---

## Chunk 2: Backend Innopay Credentials Module

### Task 2.1: Credentials DAO [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.db.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.db.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// innopay-credentials.db.spec.ts
import { InnopayCredentialsDb } from './innopay-credentials.db'
import { Pool } from 'mysql2/promise'

describe('InnopayCredentialsDb', () => {
  let db: InnopayCredentialsDb
  let pool: jest.Mocked<Pool>

  beforeEach(() => {
    pool = { execute: jest.fn() } as any
    db = new InnopayCredentialsDb(pool)
  })

  it('upsertSingleton: id=1 행이 없으면 INSERT, 있으면 UPDATE', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }] as any)
    await db.upsertSingleton({
      mode: 'TEST',
      merchantId: 'testpay01',
      merchantKeyEncrypted: Buffer.from('enc'),
      apiBaseUrl: 'https://test.innopay.co.kr',
      webhookSecretEncrypted: Buffer.from('enc2'),
      updatedBy: 1,
    })
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO innopay_credentials.+ON DUPLICATE KEY UPDATE/i),
      expect.any(Array),
    )
  })

  it('findSingleton: id=1 행 반환', async () => {
    pool.execute.mockResolvedValueOnce([
      [{ id: 1, mode: 'TEST', merchant_id: 'testpay01', merchant_key_encrypted: Buffer.from('e'), api_base_url: 'x', webhook_secret_encrypted: Buffer.from('w'), updated_by: 1, updated_at: new Date() }],
    ] as any)
    const result = await db.findSingleton()
    expect(result?.merchantId).toBe('testpay01')
  })

  it('findSingleton: 행 없으면 null', async () => {
    pool.execute.mockResolvedValueOnce([[]] as any)
    expect(await db.findSingleton()).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/api && npm test -- innopay-credentials.db.spec`
Expected: FAIL — module not found

- [ ] **Step 3: DAO 구현**

```typescript
// innopay-credentials.db.ts
import { Inject, Injectable } from '@nestjs/common'
import { Pool, RowDataPacket } from 'mysql2/promise'
import { DATABASE_POOL } from '../../../infra/database/database.constants'

export interface InnopayCredentialsRow {
  id: number
  mode: 'TEST' | 'REAL'
  merchantId: string
  merchantKeyEncrypted: Buffer
  apiBaseUrl: string
  webhookSecretEncrypted: Buffer
  updatedBy: number | null
  updatedAt: Date
}

export interface UpsertCredentialsInput {
  mode: 'TEST' | 'REAL'
  merchantId: string
  merchantKeyEncrypted: Buffer
  apiBaseUrl: string
  webhookSecretEncrypted: Buffer
  updatedBy: number
}

@Injectable()
export class InnopayCredentialsDb {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findSingleton(): Promise<InnopayCredentialsRow | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT id, mode, merchant_id, merchant_key_encrypted, api_base_url,
              webhook_secret_encrypted, updated_by, updated_at
         FROM innopay_credentials WHERE id = 1`,
    )
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      id: r.id,
      mode: r.mode,
      merchantId: r.merchant_id,
      merchantKeyEncrypted: r.merchant_key_encrypted,
      apiBaseUrl: r.api_base_url,
      webhookSecretEncrypted: r.webhook_secret_encrypted,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at,
    }
  }

  async upsertSingleton(input: UpsertCredentialsInput): Promise<void> {
    await this.pool.execute(
      `INSERT INTO innopay_credentials
         (id, mode, merchant_id, merchant_key_encrypted, api_base_url, webhook_secret_encrypted, updated_by)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         mode = VALUES(mode),
         merchant_id = VALUES(merchant_id),
         merchant_key_encrypted = VALUES(merchant_key_encrypted),
         api_base_url = VALUES(api_base_url),
         webhook_secret_encrypted = VALUES(webhook_secret_encrypted),
         updated_by = VALUES(updated_by)`,
      [
        input.mode,
        input.merchantId,
        input.merchantKeyEncrypted,
        input.apiBaseUrl,
        input.webhookSecretEncrypted,
        input.updatedBy,
      ],
    )
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && npm test -- innopay-credentials.db.spec`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/providers/innopay/innopay-credentials.db.ts apps/api/src/payments/providers/innopay/innopay-credentials.db.spec.ts
git commit -m "feat(payment): innopay credentials DAO (singleton row)"
```

---

### Task 2.2: Credentials Service (암복호화 + mode 검증) [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.service.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.service.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// innopay-credentials.service.spec.ts
import { InnopayCredentialsService } from './innopay-credentials.service'

describe('InnopayCredentialsService', () => {
  let svc: InnopayCredentialsService
  let dbMock: any
  const KEY = Buffer.alloc(32, 7) // 256-bit key

  beforeEach(() => {
    process.env.INNOPAY_ENCRYPTION_KEY_HEX = KEY.toString('hex')
    dbMock = {
      findSingleton: jest.fn(),
      upsertSingleton: jest.fn(),
    }
    svc = new InnopayCredentialsService(dbMock)
  })

  it('upsert: 평문을 암호화해서 DAO에 전달', async () => {
    await svc.upsert({
      mode: 'TEST',
      merchantId: 'testpay01',
      merchantKey: 'plain-key',
      apiBaseUrl: 'https://test.innopay.co.kr',
      webhookSecret: 'plain-secret',
      updatedBy: 1,
    })
    const arg = dbMock.upsertSingleton.mock.calls[0][0]
    expect(arg.merchantKeyEncrypted).toBeInstanceOf(Buffer)
    expect(arg.merchantKeyEncrypted.length).toBeGreaterThan(0)
    expect(arg.merchantKeyEncrypted.toString()).not.toContain('plain-key')
  })

  it('getDecrypted: 암호화된 값을 복호화해서 반환', async () => {
    // upsert로 먼저 저장한 암호문으로 시뮬레이션
    let stored: any
    dbMock.upsertSingleton.mockImplementation((x: any) => { stored = x; return Promise.resolve() })
    await svc.upsert({
      mode: 'TEST', merchantId: 'm', merchantKey: 'k', apiBaseUrl: 'u', webhookSecret: 's', updatedBy: 1,
    })
    dbMock.findSingleton.mockResolvedValue({
      id: 1, mode: 'TEST', merchantId: 'm', apiBaseUrl: 'u',
      merchantKeyEncrypted: stored.merchantKeyEncrypted,
      webhookSecretEncrypted: stored.webhookSecretEncrypted,
      updatedBy: 1, updatedAt: new Date(),
    })
    const dec = await svc.getDecrypted()
    expect(dec).not.toBeNull()
    expect(dec!.merchantKey).toBe('k')
    expect(dec!.webhookSecret).toBe('s')
  })

  it('upsert: mode 외 값 거부', async () => {
    await expect(svc.upsert({
      mode: 'INVALID' as any, merchantId: 'm', merchantKey: 'k',
      apiBaseUrl: 'u', webhookSecret: 's', updatedBy: 1,
    })).rejects.toThrow(/mode/i)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**
Run: `cd apps/api && npm test -- innopay-credentials.service.spec`
Expected: FAIL

- [ ] **Step 3: 서비스 구현**

```typescript
// innopay-credentials.service.ts
import { Injectable, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import { InnopayCredentialsDb } from './innopay-credentials.db'

export interface DecryptedCredentials {
  mode: 'TEST' | 'REAL'
  merchantId: string
  merchantKey: string
  apiBaseUrl: string
  webhookSecret: string
  updatedAt: Date
}

export interface UpsertInput {
  mode: 'TEST' | 'REAL'
  merchantId: string
  merchantKey: string
  apiBaseUrl: string
  webhookSecret: string
  updatedBy: number
}

const ALG = 'aes-256-gcm'
const IV_LEN = 12

function encrypt(plain: string): Buffer {
  const key = Buffer.from(process.env.INNOPAY_ENCRYPTION_KEY_HEX!, 'hex')
  if (key.length !== 32) throw new Error('INNOPAY_ENCRYPTION_KEY_HEX must be 32 bytes hex')
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALG, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc])
}

function decrypt(buf: Buffer): string {
  const key = Buffer.from(process.env.INNOPAY_ENCRYPTION_KEY_HEX!, 'hex')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + 16)
  const enc = buf.subarray(IV_LEN + 16)
  const decipher = crypto.createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

@Injectable()
export class InnopayCredentialsService {
  constructor(private readonly db: InnopayCredentialsDb) {
    // fail-fast: 키 부재 시 모듈 부팅 실패 (production에서 침묵하지 않도록)
    const hex = process.env.INNOPAY_ENCRYPTION_KEY_HEX
    if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error('INNOPAY_ENCRYPTION_KEY_HEX must be 64-char hex (32 bytes). See docs/innopay-key-rotation.md')
    }
  }

  async upsert(input: UpsertInput): Promise<void> {
    if (input.mode !== 'TEST' && input.mode !== 'REAL') {
      throw new BadRequestException('mode는 TEST 또는 REAL만 허용')
    }
    if (!input.merchantId || !input.merchantKey || !input.apiBaseUrl || !input.webhookSecret) {
      throw new BadRequestException('필수 필드 누락')
    }
    await this.db.upsertSingleton({
      mode: input.mode,
      merchantId: input.merchantId,
      merchantKeyEncrypted: encrypt(input.merchantKey),
      apiBaseUrl: input.apiBaseUrl,
      webhookSecretEncrypted: encrypt(input.webhookSecret),
      updatedBy: input.updatedBy,
    })
  }

  async getDecrypted(): Promise<DecryptedCredentials | null> {
    const row = await this.db.findSingleton()
    if (!row) return null
    return {
      mode: row.mode,
      merchantId: row.merchantId,
      merchantKey: decrypt(row.merchantKeyEncrypted),
      apiBaseUrl: row.apiBaseUrl,
      webhookSecret: decrypt(row.webhookSecretEncrypted),
      updatedAt: row.updatedAt,
    }
  }

  async getMasked(): Promise<{ mode: 'TEST'|'REAL'; merchantId: string; apiBaseUrl: string; updatedAt: Date } | null> {
    const row = await this.db.findSingleton()
    if (!row) return null
    return {
      mode: row.mode,
      merchantId: row.merchantId,
      apiBaseUrl: row.apiBaseUrl,
      updatedAt: row.updatedAt,
    }
  }
}
```

- [ ] **Step 4: 테스트 통과**
Run: `cd apps/api && npm test -- innopay-credentials.service.spec`
Expected: 3 passed

- [ ] **Step 5: 환경변수 추가**

`apps/api/.env.example`에 추가:
```
INNOPAY_ENCRYPTION_KEY_HEX=  # 64-char hex (32 bytes). 운영용은 KMS 또는 secret manager로 주입
```

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/payments/providers/innopay/innopay-credentials.service.ts apps/api/src/payments/providers/innopay/innopay-credentials.service.spec.ts apps/api/.env.example
git commit -m "feat(payment): innopay credentials service (AES-256-GCM)"
```

---

### Task 2.3: Credentials Admin Controller [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.controller.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-credentials.controller.spec.ts`
- Create: `apps/api/src/payments/providers/innopay/dto/update-credentials.dto.ts`

- [ ] **Step 1: DTO 작성**

```typescript
// dto/update-credentials.dto.ts
import { IsEnum, IsString, IsUrl, MinLength } from 'class-validator'
export class UpdateCredentialsDto {
  @IsEnum(['TEST', 'REAL'])
  mode!: 'TEST' | 'REAL'
  @IsString() @MinLength(1)
  merchantId!: string
  @IsString() @MinLength(1)
  merchantKey!: string
  @IsUrl({ require_protocol: true })
  apiBaseUrl!: string
  @IsString() @MinLength(1)
  webhookSecret!: string
}
```

- [ ] **Step 2: 컨트롤러 + 테스트 작성 (동시에)**

```typescript
// innopay-credentials.controller.ts
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common'
import { InnopayCredentialsService } from './innopay-credentials.service'
import { UpdateCredentialsDto } from './dto/update-credentials.dto'
import { AdminAuthGuard } from '../../../admin/auth/admin-auth.guard' // 기존 가드 경로 확인

@Controller('admin/innopay/credentials')
@UseGuards(AdminAuthGuard)
export class InnopayCredentialsController {
  constructor(private readonly svc: InnopayCredentialsService) {}

  @Get()
  async get() {
    const masked = await this.svc.getMasked()
    return masked ?? { mode: null, merchantId: null, apiBaseUrl: null, updatedAt: null }
  }

  @Put()
  async update(@Body() dto: UpdateCredentialsDto, @Req() req: any) {
    const adminId = req.user?.id ?? 0
    await this.svc.upsert({ ...dto, updatedBy: adminId })
    return { ok: true }
  }
}
```

```typescript
// innopay-credentials.controller.spec.ts
import { InnopayCredentialsController } from './innopay-credentials.controller'

describe('InnopayCredentialsController', () => {
  let ctrl: InnopayCredentialsController
  let svc: any

  beforeEach(() => {
    svc = { getMasked: jest.fn(), upsert: jest.fn() }
    ctrl = new InnopayCredentialsController(svc)
  })

  it('GET: masked 반환, 없으면 null들', async () => {
    svc.getMasked.mockResolvedValue(null)
    expect(await ctrl.get()).toEqual({ mode: null, merchantId: null, apiBaseUrl: null, updatedAt: null })
  })

  it('PUT: req.user.id를 updatedBy로 전달', async () => {
    await ctrl.update(
      { mode: 'TEST', merchantId: 'm', merchantKey: 'k', apiBaseUrl: 'https://x', webhookSecret: 's' } as any,
      { user: { id: 42 } } as any,
    )
    expect(svc.upsert).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: 42 }))
  })
})
```

- [ ] **Step 3: 테스트 통과 확인**
Run: `cd apps/api && npm test -- innopay-credentials.controller.spec`
Expected: 2 passed

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/payments/providers/innopay/innopay-credentials.controller.ts apps/api/src/payments/providers/innopay/innopay-credentials.controller.spec.ts apps/api/src/payments/providers/innopay/dto/update-credentials.dto.ts
git commit -m "feat(payment): innopay credentials admin API (GET/PUT)"
```

---

## Chunk 3: Backend Innopay Client + Webhook Skeleton

> **HARD-GATE 통과**: `docs/innopay-api-reference.md` 작성 완료 (2026-04-27). 본 chunk의 모든 코드는 reference doc의 endpoint/필드명/응답 형식을 그대로 사용한다.

**핵심 설계 변경 (사양 반영)**:
- 인증은 JSON body의 `mid` + `licenseKey` (Bearer 헤더 X)
- Webhook 페이로드는 `application/x-www-form-urlencoded` (JSON 아님), 응답은 plain text `"0000"`
- **서명 검증 메커니즘 없음** → 다층 방어로 대체:
  1. IP allowlist (nginx) — 운영 시 이노페이에 IP 대역 문의
  2. payload `mid` 일치 검증 (본사 등록값과 비교)
  3. 멱등 키: `transSeq` (이노페이 tid)
  4. 금액 양수 가드

### Task 3.1: Innopay HTTP Client (vbank 발급 + 영구 가맹점 vbank 발급) [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay.client.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay.client.spec.ts`
- Create: `apps/api/src/payments/providers/innopay/dto/issue-vbank.dto.ts`

> **이노페이 API 사양 미정**: 가이드 정독 후 endpoint 경로 / 요청 필드명 확정 필요. 본 task는 인터페이스만 정의하고 실제 호출 spy로 테스트.

- [ ] **Step 1: DTO 작성**

```typescript
// dto/issue-vbank.dto.ts
export interface IssueOneTimeVbankInput {
  orderId: string
  amount: number
  orderName: string
  customerName: string
  validHours?: number
}

export interface IssuePermanentVbankInput {
  externalKey: string  // branch ID 등 가맹점 측 식별자
  holderName: string   // 표시용 예금주명
}

export interface IssuedVbank {
  innopayTid: string
  accountNumber: string
  bankCode: string
  bankName: string
  holderName: string
  dueDate?: string  // 1회용일 때만
}
```

- [ ] **Step 2: Client 인터페이스 + 테스트 작성**

```typescript
// innopay.client.spec.ts
import { InnopayClient } from './innopay.client'

describe('InnopayClient', () => {
  let credSvc: any
  let httpMock: jest.Mock

  beforeEach(() => {
    credSvc = {
      getDecrypted: jest.fn().mockResolvedValue({
        mode: 'TEST', merchantId: 'testpay01', merchantKey: 'k',
        apiBaseUrl: 'https://test.innopay.co.kr', webhookSecret: 's', updatedAt: new Date(),
      }),
    }
    httpMock = jest.fn()
  })

  it('issueOneTimeVbank: credentials 조회 후 endpoint 호출', async () => {
    httpMock.mockResolvedValueOnce({
      status: 'OK',
      tid: 'innopay-tid-1',
      accountNo: '1234-5678-9012',
      bankCode: '004',
      bankName: '국민은행',
      holderName: '꽃배달',
      dueDate: '2026-04-30T23:59:59',
    })
    const c = new InnopayClient(credSvc, httpMock as any)
    const out = await c.issueOneTimeVbank({
      orderId: 'order-1', amount: 50000, orderName: '꽃다발', customerName: '홍길동',
    })
    expect(out.innopayTid).toBe('innopay-tid-1')
    expect(out.accountNumber).toBe('1234-5678-9012')
    expect(httpMock).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('https://test.innopay.co.kr'),
      method: 'POST',
    }))
  })

  it('issuePermanentVbank: 별도 endpoint 호출, dueDate 없음', async () => {
    httpMock.mockResolvedValueOnce({
      status: 'OK', tid: 'tid-2', accountNo: '1', bankCode: '004', bankName: '국민', holderName: 'h',
    })
    const c = new InnopayClient(credSvc, httpMock as any)
    const out = await c.issuePermanentVbank({ externalKey: 'branch-1', holderName: '지사1' })
    expect(out.dueDate).toBeUndefined()
  })

  it('자격증명 미설정 시 에러', async () => {
    credSvc.getDecrypted.mockResolvedValue(null)
    const c = new InnopayClient(credSvc, httpMock as any)
    await expect(c.issueOneTimeVbank({
      orderId: 'o', amount: 1, orderName: 'n', customerName: 'c',
    })).rejects.toThrow(/credentials/i)
  })
})
```

- [ ] **Step 3: Client 구현**

```typescript
// innopay.client.ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import axios from 'axios'
import { InnopayCredentialsService } from './innopay-credentials.service'
import { IssueOneTimeVbankInput, IssuePermanentVbankInput, IssuedVbank } from './dto/issue-vbank.dto'

export type HttpExecutor = (cfg: { url: string; method: string; data?: any; headers?: any }) => Promise<any>

const defaultHttp: HttpExecutor = async (cfg) => {
  const res = await axios.request({
    url: cfg.url,
    method: cfg.method as any,
    data: cfg.data,
    headers: cfg.headers,
    timeout: 10_000,
  })
  return res.data
}

@Injectable()
export class InnopayClient {
  constructor(
    private readonly credSvc: InnopayCredentialsService,
    private readonly http: HttpExecutor = defaultHttp,
  ) {}

  async issueOneTimeVbank(input: IssueOneTimeVbankInput): Promise<IssuedVbank> {
    const cred = await this.credSvc.getDecrypted()
    if (!cred) throw new ServiceUnavailableException('Innopay credentials not configured')
    // [TODO 가이드 확인] 정확한 endpoint 경로 + 요청 필드명
    // 채번형 (one-time): vbankExpDate = YYYYMMDD (오늘+N일)
    const expDate = formatYYYYMMDD(addDays(new Date(), input.validHours ? Math.ceil(input.validHours / 24) : 1))
    const data = await this.http({
      url: `${cred.apiBaseUrl}/api/vbankApi`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        mid: cred.merchantId,
        licenseKey: cred.licenseKey,
        moid: input.orderId,
        goodsCnt: '1',
        goodsName: input.orderName,
        amt: String(input.amount),
        buyerName: input.customerName,
        vbankBankCode: input.bankCode ?? '004', // 기본 KB. 사용자 선택 시 받아야 함 (Phase 2 입력 폼)
        vbankExpDate: expDate,
        vbankAccountName: input.customerName,
        countryCode: 'KR',
        socNo: input.socNo ?? '000000', // 가맹점 정책. 가이드는 필수.
        accountTel: input.customerPhone ?? '00000000000',
      },
    })
    if (data?.resultCode !== '4100') {
      throw new ServiceUnavailableException(`Innopay vbank issue failed (resultCode=${data?.resultCode}): ${data?.resultMsg ?? 'unknown'}`)
    }
    return {
      innopayTid: data.tid,
      accountNumber: data.vbankNum,
      bankCode: input.bankCode ?? '004',
      bankName: data.vbankBankNm,
      holderName: input.customerName,
      dueDate: expDate,
    }
  }

  /** 벌크형 가상계좌 발급 (지사 충전용 영구 계좌) */
  async issuePermanentVbank(input: IssuePermanentVbankInput): Promise<IssuedVbank> {
    const cred = await this.credSvc.getDecrypted()
    if (!cred) throw new ServiceUnavailableException('Innopay credentials not configured')
    const data = await this.http({
      url: `${cred.apiBaseUrl}/api/vbankApi`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        mid: cred.merchantId,
        licenseKey: cred.licenseKey,
        moid: input.externalKey, // 'branch-{id}-topup' 등 임의값. 벌크형은 거래정보 미저장.
        goodsName: `${input.holderName} 충전`,
        amt: '0',  // 벌크형은 amt 미사용
        buyerName: input.holderName,
        vbankBankCode: input.bankCode ?? '004',
        vbankExpDate: '99999999',  // 벌크형 영구 발급 매직값
        vbankAccountName: input.holderName,
        countryCode: 'KR',
        socNo: '000000',
        accountTel: '00000000000',
      },
    })
    if (data?.resultCode !== '4100') {
      throw new ServiceUnavailableException(`Innopay bulk vbank issue failed (resultCode=${data?.resultCode}): ${data?.resultMsg ?? 'unknown'}`)
    }
    return {
      innopayTid: data.tid ?? `bulk-${data.vbankNum}`, // 벌크형은 tid가 없을 수 있음 — 계좌번호 fallback
      accountNumber: data.vbankNum,
      bankCode: input.bankCode ?? '004',
      bankName: data.vbankBankNm,
      holderName: input.holderName,
    }
  }
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function formatYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
```

- [ ] **Step 4: 테스트 통과**
Run: `cd apps/api && npm test -- innopay.client.spec`
Expected: 3 passed

- [ ] **Step 5: 코드 내 endpoint URL/필드명을 Task 0.2 산출물에 정확히 일치시켜 보정**

위 Step 3의 placeholder(`/api/v1/vbank/onetime` 등)는 절대 그대로 commit 금지. `docs/innopay-api-reference.md`의 endpoint·요청·응답 키와 일치시킨 후 commit.

영구 가맹점 vbank 미지원 시 → **§Permanent VBank Fallback** 분기로 진입 (본 plan 하단 참조). `issuePermanentVbank` 메서드는 client에서 제거하고, Task 4.3의 service는 운영자가 수동 입력한 계좌번호를 등록하는 방식으로 변경.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/payments/providers/innopay/innopay.client.ts apps/api/src/payments/providers/innopay/innopay.client.spec.ts apps/api/src/payments/providers/innopay/dto/issue-vbank.dto.ts
git commit -m "feat(payment): innopay HTTP client (vbank 발급) — 가이드 사양 반영"
```

---

### Task 3.2: Webhook Events DAO [Backend]

**Files:**
- Create: `apps/api/src/payments/webhook-events/webhook-events.db.ts`
- Create: `apps/api/src/payments/webhook-events/webhook-events.db.spec.ts`

- [ ] **Step 1: 테스트**
```typescript
// webhook-events.db.spec.ts
import { WebhookEventsDb } from './webhook-events.db'
describe('WebhookEventsDb', () => {
  let db: WebhookEventsDb
  let pool: any
  beforeEach(() => { pool = { execute: jest.fn() }; db = new WebhookEventsDb(pool) })

  it('insertReceived: raw + signature 저장', async () => {
    pool.execute.mockResolvedValue([{ insertId: 99 }] as any)
    const id = await db.insertReceived({
      source: 'INNOPAY', eventType: 'DEPOSIT', externalTid: 'tid-1',
      rawPayload: { foo: 'bar' }, signature: 'sig', signatureValid: true,
    })
    expect(id).toBe(99)
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO webhook_events/i),
      expect.any(Array),
    )
  })

  it('markProcessed: processed=1, processed_at=now()', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }] as any)
    await db.markProcessed(99, null)
    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE webhook_events.+processed = 1.+processed_at = NOW\(\)/is),
      [null, 99],
    )
  })

  it('findByTid: 같은 source+tid 검색', async () => {
    pool.execute.mockResolvedValue([[{ id: 1, processed: 1 }]] as any)
    const r = await db.findByTid('INNOPAY', 'tid-1')
    expect(r?.processed).toBe(1)
  })
})
```

- [ ] **Step 2: 구현**
```typescript
// webhook-events.db.ts
import { Inject, Injectable } from '@nestjs/common'
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { DATABASE_POOL } from '../../infra/database/database.constants'

export interface InsertReceivedInput {
  source: 'INNOPAY' | 'TOSS'
  eventType: string
  externalTid: string | null
  rawPayload: any
  signature: string | null
  signatureValid: boolean
}

@Injectable()
export class WebhookEventsDb {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async insertReceived(input: InsertReceivedInput): Promise<number> {
    const [res] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO webhook_events
         (source, event_type, external_tid, raw_payload, signature, signature_valid)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.source, input.eventType, input.externalTid, JSON.stringify(input.rawPayload),
       input.signature, input.signatureValid ? 1 : 0],
    )
    return res.insertId
  }

  async markProcessed(id: number, error: string | null): Promise<void> {
    await this.pool.execute(
      `UPDATE webhook_events
          SET processed = 1, processing_error = ?, processed_at = NOW()
        WHERE id = ?`,
      [error, id],
    )
  }

  async findByTid(source: string, tid: string): Promise<{ id: number; processed: number } | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT id, processed FROM webhook_events
        WHERE source = ? AND external_tid = ? AND signature_valid = 1
        ORDER BY id DESC LIMIT 1`,
      [source, tid],
    )
    if (rows.length === 0) return null
    return { id: rows[0].id, processed: rows[0].processed }
  }
}
```

- [ ] **Step 3: 테스트 통과**
Run: `cd apps/api && npm test -- webhook-events.db.spec`
Expected: 3 passed

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/payments/webhook-events/
git commit -m "feat(payment): webhook events 감사 로그 DAO"
```

---

### Task 3.3: Webhook Service (mid 검증 + 멱등 + dispatch) [Backend]

**중요**: 가이드에 서명 검증 메커니즘이 없으므로 **HMAC 검증 코드 없음**. 대신 다층 방어:
1. nginx에서 이노페이 IP allowlist
2. payload `mid`가 본사 등록 `mid`와 일치 검증
3. `transSeq` 단위 멱등 처리
4. `goodsAmt > 0` 가드

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-webhook.service.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-webhook.service.spec.ts`
- Create: `apps/api/src/payments/providers/innopay/dto/webhook-payload.dto.ts`

- [ ] **Step 1: payload DTO (form-urlencoded 파싱 결과)**
```typescript
// dto/webhook-payload.dto.ts
// 이노페이 Noti는 form-urlencoded로 전송됨. NestJS body-parser가 객체로 파싱한 결과.
export interface InnopayNotiPayload {
  shopCode: string       // = mid (본사 등록값과 일치 검증 대상)
  transSeq: string       // 이노페이 거래번호 — 멱등 키
  moid: string           // 가맹점 주문번호 (벌크형은 임의값)
  goodsName?: string
  goodsAmt: string       // 입금금액 (문자열로 전송됨, parseInt 필요)
  payMethod: string      // '08' = 가상계좌
  status: string         // '25' = 결제완료, '85' = 결제취소
  pgAppDate?: string
  pgAppTime?: string
  pgTid?: string
  vacctNo: string        // 가상계좌번호 (지사 매핑용)
  vbankBankCd?: string
  vbankAcctNm?: string   // 송금자명
  mallReserved?: string
  // 그 외 필드는 reference doc 참조
}
```

- [ ] **Step 2: 서비스 + 테스트**

```typescript
// innopay-webhook.service.spec.ts
import { InnopayWebhookService } from './innopay-webhook.service'

describe('InnopayWebhookService', () => {
  let svc: InnopayWebhookService
  let credSvc: any, eventsDb: any, topupSvc: any

  beforeEach(() => {
    credSvc = { getDecrypted: jest.fn().mockResolvedValue({
      mode: 'TEST', merchantId: 'testpay01m', licenseKey: 'k', apiBaseUrl: 'u',
      updatedAt: new Date(),
    }) }
    eventsDb = {
      insertReceived: jest.fn().mockResolvedValue(1),
      markProcessed: jest.fn(),
      findByTid: jest.fn().mockResolvedValue(null),
    }
    topupSvc = { handleDeposit: jest.fn() }
    svc = new InnopayWebhookService(credSvc, eventsDb, topupSvc)
  })

  const validPayload = () => ({
    shopCode: 'testpay01m', transSeq: 't1', moid: 'branch-1-topup',
    goodsAmt: '50000', payMethod: '08', status: '25',
    vacctNo: '1234567', vbankBankCd: '004', vbankAcctNm: '서울지사',
  })

  it('mid 불일치: 401 throw, dispatch 호출 X', async () => {
    const p = { ...validPayload(), shopCode: 'WRONG' }
    await expect(svc.handle(p)).rejects.toMatchObject({ status: 401 })
    expect(eventsDb.insertReceived).toHaveBeenCalledWith(expect.objectContaining({ signatureValid: false }))
    expect(topupSvc.handleDeposit).not.toHaveBeenCalled()
  })

  it('status=25 + mid 일치: topup 디스패치 후 markProcessed', async () => {
    await svc.handle(validPayload())
    expect(topupSvc.handleDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ transSeq: 't1', goodsAmt: 50000, vacctNo: '1234567', isCancel: false }),
      expect.any(Number),
    )
    expect(eventsDb.markProcessed).toHaveBeenCalled()
  })

  it('status=85 (취소): 취소 분기로 dispatch (역방향 차감)', async () => {
    await svc.handle({ ...validPayload(), status: '85' })
    expect(topupSvc.handleDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ isCancel: true }),
      expect.any(Number),
    )
  })

  it('중복 webhook (이미 processed): dispatch 스킵', async () => {
    eventsDb.findByTid.mockResolvedValue({ id: 5, processed: 1 })
    await svc.handle(validPayload())
    expect(topupSvc.handleDeposit).not.toHaveBeenCalled()
  })

  it('금액 0 또는 음수: 거부 (4xx)', async () => {
    await expect(svc.handle({ ...validPayload(), goodsAmt: '0' })).rejects.toMatchObject({ status: 400 })
  })

  it('credentials 미설정: 503 throw', async () => {
    credSvc.getDecrypted.mockResolvedValue(null)
    await expect(svc.handle(validPayload())).rejects.toMatchObject({ status: 503 })
  })
})
```

- [ ] **Step 3: 구현**

```typescript
// innopay-webhook.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { InnopayCredentialsService } from './innopay-credentials.service'
import { WebhookEventsDb } from '../../webhook-events/webhook-events.db'
import { InnopayTopupService } from './innopay-topup.service'
import { InnopayNotiPayload } from './dto/webhook-payload.dto'

@Injectable()
export class InnopayWebhookService {
  constructor(
    private readonly credSvc: InnopayCredentialsService,
    private readonly eventsDb: WebhookEventsDb,
    private readonly topupSvc: InnopayTopupService,
  ) {}

  /**
   * 이노페이 Noti 처리. body는 form-urlencoded → NestJS가 객체로 파싱한 결과.
   * 반환값을 controller가 plain text "0000"으로 응답 (실패 시 400/401/503 throw → controller가 다른 텍스트로 응답)
   */
  async handle(payload: InnopayNotiPayload): Promise<{ ok: true }> {
    const cred = await this.credSvc.getDecrypted()
    if (!cred) throw new HttpException('Innopay not configured', HttpStatus.SERVICE_UNAVAILABLE)

    // 1. mid 일치 검증 (서명 대체)
    const midOk = payload?.shopCode === cred.merchantId
    const eventId = await this.eventsDb.insertReceived({
      source: 'INNOPAY',
      eventType: `STATUS_${payload?.status ?? 'NA'}`,
      externalTid: payload?.transSeq ?? null,
      rawPayload: payload,
      signature: null,
      signatureValid: midOk,
    })
    if (!midOk) {
      // TODO: 텔레그램 알림 (운영 시)
      throw new HttpException('mid mismatch', HttpStatus.UNAUTHORIZED)
    }

    // 2. 금액 가드
    const amount = Number.parseInt(payload.goodsAmt ?? '0', 10)
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.eventsDb.markProcessed(eventId, 'invalid amount')
      throw new HttpException('Invalid goodsAmt', HttpStatus.BAD_REQUEST)
    }

    // 3. 멱등: 이미 processed인 transSeq면 스킵
    const existing = await this.eventsDb.findByTid('INNOPAY', payload.transSeq)
    if (existing && existing.id !== eventId && existing.processed === 1) {
      await this.eventsDb.markProcessed(eventId, 'duplicate')
      return { ok: true }
    }

    // 4. dispatch — Phase 1은 가상계좌(payMethod=08)만 처리
    if (payload.payMethod !== '08') {
      await this.eventsDb.markProcessed(eventId, `unsupported payMethod=${payload.payMethod}`)
      return { ok: true } // 다른 결제수단은 무시 (Phase 2/Phase 3에서 처리)
    }
    const isCancel = payload.status === '85'
    if (payload.status !== '25' && payload.status !== '85') {
      await this.eventsDb.markProcessed(eventId, `unhandled status=${payload.status}`)
      return { ok: true }
    }
    try {
      await this.topupSvc.handleDeposit(
        { ...payload, goodsAmt: amount, isCancel },
        eventId,
      )
      await this.eventsDb.markProcessed(eventId, null)
    } catch (err: any) {
      await this.eventsDb.markProcessed(eventId, err?.message ?? String(err))
      throw err
    }
    return { ok: true }
  }
}
```

- [ ] **Step 4: 테스트 통과**
Run: `cd apps/api && npm test -- innopay-webhook.service.spec`
Expected: 4 passed

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/payments/providers/innopay/innopay-webhook.service.ts apps/api/src/payments/providers/innopay/innopay-webhook.service.spec.ts apps/api/src/payments/providers/innopay/dto/webhook-payload.dto.ts
git commit -m "feat(payment): innopay webhook service (서명 + 멱등 + dispatch)"
```

---

## Chunk 4: Backend Top-up Vbank API + Auto-charge

### Task 4.1: Wallet Service 확장 — `applyInnopayTopup` [Backend]

**Files:**
- Modify: `apps/api/src/wallets/wallet.service.ts` (메서드 추가)
- Modify: `apps/api/src/wallets/wallet.service.spec.ts` (또는 새 spec)

- [ ] **Step 1: 기존 service 시그니처 파악**
Run: `grep -n "applyTransaction\|charge\|refund" apps/api/src/wallets/wallet.service.ts`

- [ ] **Step 2: 신규 메서드 테스트**
```typescript
// wallet.service.spec.ts에 추가
describe('applyInnopayTopup', () => {
  it('CHARGE 거래 추가 + balance += amount', async () => {
    // 기존 transactional helper mock
    // 검증: tx_type='CHARGE', ref_type='INNOPAY_TOPUP', ref_id=tid, actor_type='SYSTEM'
  })
  it('동일 tid 중복 호출: 기존 거래 재사용 (멱등) — UNIQUE on ref_type+ref_id 활용', async () => {
    // 같은 tid 두 번 호출 → 한 번만 적용
  })
})
```

- [ ] **Step 3: 메서드 구현**
```typescript
// wallet.service.ts에 추가
import { WALLET_REF_TYPE } from './wallet.constants'

async applyInnopayTopup(input: { branchId: number; amount: number; innopayTid: string; depositorName?: string }): Promise<void> {
  if (input.amount <= 0) throw new BadRequestException('amount must be positive')
  const conn = await this.pool.getConnection()
  try {
    await conn.beginTransaction()
    // 멱등: 같은 (ref_type, ref_id) 거래가 이미 있으면 무시
    const [dup] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM branch_wallet_transactions
        WHERE branch_id = ? AND ref_type = ? AND ref_id = ?
        LIMIT 1`,
      [input.branchId, WALLET_REF_TYPE.INNOPAY_TOPUP, input.innopayTid],
    )
    if ((dup as any[]).length > 0) {
      await conn.commit()
      return
    }
    // 잔액 update + 거래 insert
    await conn.execute(
      `UPDATE branch_wallets SET balance = balance + ? WHERE branch_id = ?`,
      [input.amount, input.branchId],
    )
    const [bal] = await conn.execute<RowDataPacket[]>(
      `SELECT balance FROM branch_wallets WHERE branch_id = ?`,
      [input.branchId],
    )
    const balanceAfter = (bal as any[])[0].balance
    await conn.execute(
      `INSERT INTO branch_wallet_transactions
         (branch_id, type, amount, balance_after, ref_type, ref_id, memo, actor_type)
       VALUES (?, 'CHARGE', ?, ?, ?, ?, ?, 'SYSTEM')`,
      [input.branchId, input.amount, balanceAfter, WALLET_REF_TYPE.INNOPAY_TOPUP, input.innopayTid,
       input.depositorName ? `이노페이 자동충전: ${input.depositorName}` : '이노페이 자동충전'],
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
```

- [ ] **Step 4: DB 레벨 멱등 보강 — 별도 토픽 ledger 테이블 사용**

기존 `branch_wallet_transactions`에 `(ref_type, ref_id, branch_id)` UNIQUE를 추가하면 다음 위험:
- ORDER_FEE의 ref_id가 같은 주문에 두 번 차감되는 정상 케이스 차단
- ref_id NULL인 거래(MANUAL CHARGE)는 멱등성 보장 안 됨

대신 INNOPAY_TOPUP 전용 ledger 테이블로 분리:

`migrations/041_innopay_topup_ledger.sql`:
```sql
-- 이노페이 충전 멱등 ledger (애플리케이션 락 보완)
-- 단일 (innopay_tid) 단위로 1회만 적립되도록 보장
CREATE TABLE IF NOT EXISTS innopay_topup_ledger (
  innopay_tid VARCHAR(100) NOT NULL PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  amount INT NOT NULL,
  wallet_tx_id BIGINT NOT NULL COMMENT 'branch_wallet_transactions.id',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_branch (branch_id),
  CONSTRAINT fk_topup_wallet_tx FOREIGN KEY (wallet_tx_id)
    REFERENCES branch_wallet_transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Rollback (`041_innopay_topup_ledger_rollback.sql`):
```sql
DROP TABLE IF EXISTS innopay_topup_ledger;
```

- [ ] **Step 4-1: applyInnopayTopup 구현 변경**

위 ledger 테이블을 활용하도록 Step 3의 코드 변경:
```typescript
async applyInnopayTopup(input: { branchId: number; amount: number; innopayTid: string; depositorName?: string }): Promise<void> {
  if (input.amount <= 0) throw new BadRequestException('amount must be positive')
  const conn = await this.pool.getConnection()
  try {
    await conn.beginTransaction()
    // 1. ledger 행 INSERT 시도 — PK 충돌 시 이미 처리된 tid (멱등)
    try {
      await conn.execute(
        `INSERT INTO innopay_topup_ledger (innopay_tid, branch_id, amount, wallet_tx_id)
         VALUES (?, ?, ?, 0)`,  // wallet_tx_id는 일단 0, 아래에서 update
        [input.innopayTid, input.branchId, input.amount],
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        await conn.commit()  // 멱등: 이미 처리됨
        return
      }
      throw e
    }
    // 2. 잔액 update + 거래 insert
    await conn.execute(
      `UPDATE branch_wallets SET balance = balance + ? WHERE branch_id = ?`,
      [input.amount, input.branchId],
    )
    const [bal] = await conn.execute<RowDataPacket[]>(
      `SELECT balance FROM branch_wallets WHERE branch_id = ?`,
      [input.branchId],
    )
    const balanceAfter = (bal as any[])[0].balance
    const [insRes] = await conn.execute<ResultSetHeader>(
      `INSERT INTO branch_wallet_transactions
         (branch_id, type, amount, balance_after, ref_type, ref_id, memo, actor_type)
       VALUES (?, 'CHARGE', ?, ?, ?, ?, ?, 'SYSTEM')`,
      [input.branchId, input.amount, balanceAfter, WALLET_REF_TYPE.INNOPAY_TOPUP, input.innopayTid,
       input.depositorName ? `이노페이 자동충전: ${input.depositorName}` : '이노페이 자동충전'],
    )
    // 3. ledger.wallet_tx_id 업데이트
    await conn.execute(
      `UPDATE innopay_topup_ledger SET wallet_tx_id = ? WHERE innopay_tid = ?`,
      [insRes.insertId, input.innopayTid],
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
```

- [ ] **Step 4-2: 테스트 케이스 — 멱등 검증**
```typescript
it('동일 tid 중복 호출 시 두 번째는 무시 (PK 충돌로 ledger 차단)', async () => {
  // 첫 호출: wallet_tx 1건 + ledger 1건 추가
  // 두 번째 호출: ledger PK 충돌, wallet 변경 없음
  // 검증: branch_wallets.balance 한 번만 증가, branch_wallet_transactions.count == 1
})
```

- [ ] **Step 5: 테스트 통과**
Run: `cd apps/api && npm test -- wallet.service.spec`
Expected: 새 케이스 포함 모두 pass

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/wallets/wallet.service.ts apps/api/src/wallets/wallet.service.spec.ts migrations/041_wallet_innopay_unique.sql
git commit -m "feat(wallet): applyInnopayTopup — 이노페이 자동충전 멱등 거래"
```

---

### Task 4.2: Innopay Topup Service [Backend]

**매핑 규칙 (reference doc 기반)**:
- 1차: `vacctNo`(가상계좌번호) → `organizations.topup_vbank_account_number` 매칭 (벌크형 영구 계좌)
- 2차: `transSeq` 또는 `mallReserved`로 fallback (대부분 1차에서 끝남)
- 매칭 실패 시 NotFoundException → webhook 재전송 사이클로 진입(운영자가 매핑 보정 후 재처리)
- 취소(`status=85`): 동일 `transSeq`의 ledger 조회 → 충전금 역방향 차감 거래 추가

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-topup.service.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay-topup.service.spec.ts`
- Modify: `apps/api/src/admin/branches/branches.db.ts` (또는 organizations DAO) — `findBranchByTopupVbank` 메서드 추가

- [ ] **Step 1: 지사 조회 DAO 메서드 추가**

```typescript
// organizations.db.ts (또는 branches DAO)
async findBranchByTopupInnopayId(innopayId: string): Promise<{ id: number } | null> {
  const [rows] = await this.pool.execute<RowDataPacket[]>(
    `SELECT id FROM organizations
      WHERE topup_vbank_innopay_id = ? AND topup_vbank_active = 1 AND is_active = 1
      LIMIT 1`,
    [innopayId],
  )
  return rows.length === 0 ? null : { id: rows[0].id }
}

async findBranchByTopupAccountNumber(accountNumber: string): Promise<{ id: number } | null> {
  const [rows] = await this.pool.execute<RowDataPacket[]>(
    `SELECT id FROM organizations
      WHERE topup_vbank_account_number = ? AND topup_vbank_active = 1 AND is_active = 1
      LIMIT 1`,
    [accountNumber],
  )
  return rows.length === 0 ? null : { id: rows[0].id }
}
```

- [ ] **Step 2: TopupService 테스트**

```typescript
// innopay-topup.service.spec.ts
import { InnopayTopupService } from './innopay-topup.service'

describe('InnopayTopupService', () => {
  let svc: InnopayTopupService
  let orgsDb: any, walletSvc: any
  beforeEach(() => {
    orgsDb = { findBranchByTopupInnopayId: jest.fn(), findBranchByTopupAccountNumber: jest.fn() }
    walletSvc = { applyInnopayTopup: jest.fn() }
    svc = new InnopayTopupService(orgsDb, walletSvc)
  })

  it('handleDeposit: tid가 충전용 vbank와 매칭되면 walletSvc 호출', async () => {
    orgsDb.findBranchByTopupInnopayId.mockResolvedValue({ id: 7 })
    await svc.handleDeposit({
      tid: 't', type: 'DEPOSIT', amount: 100000, vbankAccountNo: '1', bankCode: '004',
    } as any, 1)
    expect(walletSvc.applyInnopayTopup).toHaveBeenCalledWith({
      branchId: 7, amount: 100000, innopayTid: 't', depositorName: undefined,
    })
  })

  it('handleDeposit: tid 매칭 실패 시 accountNumber로 fallback 매칭', async () => {
    orgsDb.findBranchByTopupInnopayId.mockResolvedValue(null)
    orgsDb.findBranchByTopupAccountNumber.mockResolvedValue({ id: 9 })
    await svc.handleDeposit({
      tid: 't', type: 'DEPOSIT', amount: 50000, vbankAccountNo: '12345', bankCode: '004',
    } as any, 1)
    expect(walletSvc.applyInnopayTopup).toHaveBeenCalledWith(expect.objectContaining({ branchId: 9 }))
  })

  it('handleDeposit: 어디에도 매칭 안 되면 에러 throw → webhook이 processing_error에 기록', async () => {
    orgsDb.findBranchByTopupInnopayId.mockResolvedValue(null)
    orgsDb.findBranchByTopupAccountNumber.mockResolvedValue(null)
    await expect(svc.handleDeposit({
      tid: 't', type: 'DEPOSIT', amount: 1, vbankAccountNo: '?', bankCode: '004',
    } as any, 1)).rejects.toThrow(/no matching branch/i)
  })
})
```

- [ ] **Step 3: 구현**

```typescript
// innopay-topup.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { OrganizationsDb } from '../../../admin/organizations/organizations.db' // 경로 확인
import { WalletService } from '../../../wallets/wallet.service'
import { InnopayWebhookPayload } from './dto/webhook-payload.dto'

@Injectable()
export class InnopayTopupService {
  constructor(
    private readonly orgsDb: OrganizationsDb,
    private readonly walletSvc: WalletService,
  ) {}

  async handleDeposit(payload: InnopayWebhookPayload, _eventId: number): Promise<void> {
    // 1차: innopay_id로 매칭, 2차: 계좌번호로 fallback
    let branch = await this.orgsDb.findBranchByTopupInnopayId(payload.tid)
    if (!branch && payload.vbankAccountNo) {
      branch = await this.orgsDb.findBranchByTopupAccountNumber(payload.vbankAccountNo)
    }
    if (!branch) {
      throw new NotFoundException(`No matching branch for vbank tid=${payload.tid} account=${payload.vbankAccountNo}`)
    }
    await this.walletSvc.applyInnopayTopup({
      branchId: branch.id,
      amount: payload.amount,
      innopayTid: payload.tid,
      depositorName: payload.depositorName,
    })
  }
}
```

- [ ] **Step 4: 테스트 통과**
Run: `cd apps/api && npm test -- innopay-topup.service.spec`
Expected: 3 passed

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/payments/providers/innopay/innopay-topup.service.ts apps/api/src/payments/providers/innopay/innopay-topup.service.spec.ts
git commit -m "feat(payment): innopay 충전용 vbank 입금 자동 CHARGE 핸들러"
```

---

### Task 4.3: Branch Top-up Vbank Admin API [Backend]

**Files:**
- Create: `apps/api/src/admin/branches/branch-topup-vbank.controller.ts`
- Create: `apps/api/src/admin/branches/branch-topup-vbank.service.ts`
- Create: `apps/api/src/admin/branches/branch-topup-vbank.service.spec.ts`
- Modify: `apps/api/src/admin/branches/branches.module.ts`
- Modify: `apps/api/src/admin/organizations/organizations.db.ts` — issue/deactivate 메서드 추가

- [ ] **Step 1: DAO 메서드 추가**
```typescript
// organizations.db.ts
async setTopupVbank(branchId: number, v: {
  accountNumber: string; bankCode: string; holderName: string; innopayId: string;
}): Promise<void> {
  await this.pool.execute(
    `UPDATE organizations
        SET topup_vbank_account_number = ?,
            topup_vbank_bank_code = ?,
            topup_vbank_holder_name = ?,
            topup_vbank_innopay_id = ?,
            topup_vbank_issued_at = NOW(),
            topup_vbank_active = 1
      WHERE id = ? AND type = 'BRANCH'`,
    [v.accountNumber, v.bankCode, v.holderName, v.innopayId, branchId],
  )
}

async deactivateTopupVbank(branchId: number): Promise<void> {
  await this.pool.execute(
    `UPDATE organizations SET topup_vbank_active = 0 WHERE id = ?`,
    [branchId],
  )
}

async getTopupVbank(branchId: number): Promise<{
  accountNumber: string; bankCode: string; holderName: string; active: boolean; issuedAt: Date | null;
} | null> {
  const [rows] = await this.pool.execute<RowDataPacket[]>(
    `SELECT topup_vbank_account_number, topup_vbank_bank_code, topup_vbank_holder_name,
            topup_vbank_active, topup_vbank_issued_at
       FROM organizations WHERE id = ? AND type = 'BRANCH'`,
    [branchId],
  )
  if (rows.length === 0 || !rows[0].topup_vbank_account_number) return null
  return {
    accountNumber: rows[0].topup_vbank_account_number,
    bankCode: rows[0].topup_vbank_bank_code,
    holderName: rows[0].topup_vbank_holder_name,
    active: rows[0].topup_vbank_active === 1,
    issuedAt: rows[0].topup_vbank_issued_at,
  }
}
```

- [ ] **Step 2: Service**
```typescript
// branch-topup-vbank.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common'
import { InnopayClient } from '../../payments/providers/innopay/innopay.client'
import { OrganizationsDb } from '../organizations/organizations.db'

@Injectable()
export class BranchTopupVbankService {
  constructor(
    private readonly client: InnopayClient,
    private readonly orgsDb: OrganizationsDb,
  ) {}

  async issue(branchId: number, holderName: string): Promise<{
    accountNumber: string; bankCode: string; holderName: string; issuedAt: Date;
  }> {
    const branch = await this.orgsDb.findById(branchId) // 기존 메서드 재사용
    if (!branch || branch.type !== 'BRANCH' || !branch.is_active) {
      throw new BadRequestException('Invalid branch')
    }
    const existing = await this.orgsDb.getTopupVbank(branchId)
    if (existing && existing.active) {
      throw new ConflictException('이미 활성 충전용 가상계좌가 있습니다. 재발급은 PATCH /reissue 사용')
    }
    const issued = await this.client.issuePermanentVbank({
      externalKey: `branch-${branchId}`,
      holderName,
    })
    await this.orgsDb.setTopupVbank(branchId, {
      accountNumber: issued.accountNumber,
      bankCode: issued.bankCode,
      holderName: issued.holderName,
      innopayId: issued.innopayTid,
    })
    const after = await this.orgsDb.getTopupVbank(branchId)
    return after as any
  }

  async reissue(branchId: number, holderName: string) {
    await this.orgsDb.deactivateTopupVbank(branchId)
    return this.issue(branchId, holderName)
  }

  async get(branchId: number) {
    return this.orgsDb.getTopupVbank(branchId)
  }
}
```

- [ ] **Step 3: Controller**
```typescript
// branch-topup-vbank.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { BranchTopupVbankService } from './branch-topup-vbank.service'
import { AdminAuthGuard } from '../auth/admin-auth.guard'

class IssueDto {
  @IsString() @MinLength(1)
  holderName!: string
}

@Controller('admin/branches/:id/topup-vbank')
@UseGuards(AdminAuthGuard)
export class BranchTopupVbankController {
  constructor(private readonly svc: BranchTopupVbankService) {}

  @Get()
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id)
  }

  @Post()
  issue(@Param('id', ParseIntPipe) id: number, @Body() dto: IssueDto) {
    return this.svc.issue(id, dto.holderName)
  }

  @Patch('reissue')
  reissue(@Param('id', ParseIntPipe) id: number, @Body() dto: IssueDto) {
    return this.svc.reissue(id, dto.holderName)
  }
}
```

- [ ] **Step 4: Service 테스트 작성 + 통과**
- [ ] **Step 5: Module 등록**
```typescript
// branches.module.ts에 추가
providers: [..., BranchTopupVbankService],
controllers: [..., BranchTopupVbankController],
imports: [..., InnopayModule, OrganizationsModule],
```

- [ ] **Step 6: 통합 빌드**
Run: `cd apps/api && npm run build`
Expected: 0 errors

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/admin/branches/branch-topup-vbank.* apps/api/src/admin/organizations/organizations.db.ts apps/api/src/admin/branches/branches.module.ts
git commit -m "feat(payment): 지사 충전용 vbank 발급/재발급/조회 API"
```

---

### Task 4.4: Branch Public — 자기 vbank 조회 [Backend]

**Files:**
- Modify: 기존 지사 관리자 controller (정확한 파일은 Task 0.3 결과로 확정)

- [ ] **Step 0: 지사 관리자 가드/컨트롤러 위치 재확인**

Run: `grep -rn "branch.*controller\|@UseGuards.*[Bb]ranch" apps/api/src/branch/ apps/api/src/partner/ 2>/dev/null`
- 정확한 파일과 가드 클래스명 확정.
- 본 plan은 `BranchAdminGuard` 가정. Task 0.3에서 다른 이름이면 보정.

- [ ] **Step 1: 슬러그 → 지사ID 조회 후 vbank 반환**

```typescript
import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common'
import { BranchAdminGuard } from '../auth/branch-admin.guard'  // Step 0에서 확정한 경로
import { BranchTopupVbankService } from '../../admin/branches/branch-topup-vbank.service'
import { OrganizationsDb } from '../../admin/organizations/organizations.db'

@Controller('branch')
@UseGuards(BranchAdminGuard)
export class BranchPublicController {
  constructor(
    private readonly orgsDb: OrganizationsDb,
    private readonly topupSvc: BranchTopupVbankService,
  ) {}

  @Get(':slug/topup-vbank')
  async getMyTopupVbank(@Param('slug') slug: string) {
    const branch = await this.orgsDb.findBySlug(slug)  // 기존 메서드 재사용 (Task 0.3에서 확인)
    if (!branch || branch.type !== 'BRANCH') throw new NotFoundException('Branch not found')
    return this.topupSvc.get(branch.id)
  }
}
```

- [ ] **Step 2: 가드가 토큰의 branch_id와 path slug의 branch.id를 일치시키는지 확인**

기존 BranchAdminGuard가 슬러그 기반 권한 검사를 하지 않으면, 컨트롤러에서 직접 검증 추가:
```typescript
// req.user.branchId !== branch.id → ForbiddenException
```

- [ ] **Step 3: 테스트**
```typescript
describe('BranchPublicController.getMyTopupVbank', () => {
  it('인증된 지사 본인의 vbank 조회 성공')
  it('다른 지사 slug 접근 시 403')
  it('없는 slug → 404')
})
```

- [ ] **Step 4: 통과 + Commit**
```bash
git commit -m "feat(payment): 지사 관리자가 자기 충전용 vbank 조회"
```

---

### Task 4.5: Webhook Controller (HTTP entry) + Module 등록 [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay-webhook.controller.ts`
- Create: `apps/api/src/payments/providers/innopay/innopay.module.ts`

- [ ] **Step 0: form-urlencoded body parser 검증/추가**

Run: `grep -n "urlencoded\|bodyParser" apps/api/src/main.ts`
- 있으면 그대로 사용. 없으면 `apps/api/src/main.ts`에 추가:
```typescript
import * as bodyParser from 'body-parser'
// 이노페이 Noti는 application/x-www-form-urlencoded — JSON parser와 별도 등록
app.use('/admin/payments/innopay/webhook', bodyParser.urlencoded({ extended: false, limit: '64kb' }))
```

- [ ] **Step 1: Controller**
```typescript
// innopay-webhook.controller.ts
// CRITICAL: 가맹점 응답은 plain text "0000"이어야 이노페이가 성공으로 인식.
// 실패 시(401/400/503 throw) NestJS는 JSON 응답을 보내지만 "0000" 외이므로 이노페이가 1분×10회 재시도.
import { Body, Controller, Header, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common'
import { InnopayWebhookService } from './innopay-webhook.service'
import { InnopayNotiPayload } from './dto/webhook-payload.dto'

@Controller('admin/payments/innopay/webhook')
export class InnopayWebhookController {
  constructor(private readonly svc: InnopayWebhookService) {}

  @Post()
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async handle(@Body() body: InnopayNotiPayload): Promise<string> {
    try {
      await this.svc.handle(body)
      return '0000'  // plain text 성공 응답 (이노페이 표준)
    } catch (err) {
      // 서비스가 throw하면 그대로 전파해 NestJS가 4xx/5xx 응답.
      // 이노페이는 "0000" 외엔 실패로 간주하고 재시도 → 멱등 키로 안전.
      throw err instanceof HttpException ? err : new HttpException('Internal', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
```

> **IP allowlist (운영)**: 이노페이 webhook 송신 IP를 nginx 또는 운영 방화벽에서 허용. `docs/innopay-api-reference.md`에 따라 운영 적용 시 이노페이에 IP 대역 문의 후 nginx config에 반영. 본 plan에서는 코드 외 운영 작업으로 별도 task 없음 (mid 검증 + 멱등 키가 1차 방어, IP는 2차 방어).

- [ ] **Step 2: 모듈**
```typescript
// innopay.module.ts
import { Module } from '@nestjs/common'
import { InnopayClient } from './innopay.client'
import { InnopayCredentialsDb } from './innopay-credentials.db'
import { InnopayCredentialsService } from './innopay-credentials.service'
import { InnopayCredentialsController } from './innopay-credentials.controller'
import { InnopayWebhookController } from './innopay-webhook.controller'
import { InnopayWebhookService } from './innopay-webhook.service'
import { InnopayTopupService } from './innopay-topup.service'
import { WebhookEventsModule } from '../../webhook-events/webhook-events.module'
import { WalletsModule } from '../../../wallets/wallets.module'
import { OrganizationsModule } from '../../../admin/organizations/organizations.module'

@Module({
  imports: [WebhookEventsModule, WalletsModule, OrganizationsModule],
  controllers: [InnopayCredentialsController, InnopayWebhookController],
  providers: [InnopayCredentialsDb, InnopayCredentialsService, InnopayClient, InnopayWebhookService, InnopayTopupService],
  exports: [InnopayClient, InnopayCredentialsService],
})
export class InnopayModule {}
```

- [ ] **Step 3: AppModule에 import**
- [ ] **Step 4: 빌드 + 통합 테스트**

```bash
cd apps/api && npm run build && npm test
```
Expected: 0 errors, 모든 spec 통과

- [ ] **Step 5: Commit**
```bash
git commit -m "feat(payment): innopay webhook controller + module 등록"
```

---

## Chunk 5: Frontend — Admin Innopay Credentials Page

### Task 5.1: 타입 정의 [Frontend]

**Files:**
- Create: `src/lib/payments/innopay-types.ts`

- [ ] **Step 1: 작성**
```typescript
// src/lib/payments/innopay-types.ts
export type InnopayMode = 'TEST' | 'REAL'

export interface InnopayCredentialsMasked {
  mode: InnopayMode | null
  merchantId: string | null
  apiBaseUrl: string | null
  updatedAt: string | null  // ISO
}

export interface UpdateInnopayCredentialsRequest {
  mode: InnopayMode
  merchantId: string
  merchantKey: string
  apiBaseUrl: string
  webhookSecret: string
}

export interface BranchTopupVbank {
  accountNumber: string
  bankCode: string
  bankName?: string
  holderName: string
  active: boolean
  issuedAt: string | null
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/payments/innopay-types.ts
git commit -m "feat(payment): innopay 프론트엔드 타입 정의"
```

---

### Task 5.2: API 클라이언트 [Frontend]

**Files:**
- Create: `src/lib/api/innopay-credentials.ts`

- [ ] **Step 1: 작성**
```typescript
import { api } from './client'
import type {
  InnopayCredentialsMasked,
  UpdateInnopayCredentialsRequest,
} from '@/lib/payments/innopay-types'

export async function getInnopayCredentials(): Promise<InnopayCredentialsMasked> {
  return api<InnopayCredentialsMasked>('/admin/innopay/credentials', { method: 'GET' })
}

export async function updateInnopayCredentials(payload: UpdateInnopayCredentialsRequest): Promise<{ ok: true }> {
  return api<{ ok: true }>('/admin/innopay/credentials', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Commit**
```bash
git commit -m "feat(payment): innopay credentials API client"
```

---

### Task 5.3: 자격증명 관리 페이지 [Frontend]

**Files:**
- Create: `src/app/admin/innopay-credentials/page.tsx`
- Create: `src/__tests__/admin/innopay-credentials.test.tsx`

- [ ] **Step 1: 페이지**
```tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getInnopayCredentials,
  updateInnopayCredentials,
} from '@/lib/api/innopay-credentials'
import type { InnopayMode } from '@/lib/payments/innopay-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function InnopayCredentialsPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['innopay-creds'], queryFn: getInnopayCredentials })

  const [mode, setMode] = useState<InnopayMode>('TEST')
  const [merchantId, setMerchantId] = useState('')
  const [merchantKey, setMerchantKey] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('https://test.innopay.co.kr')
  const [webhookSecret, setWebhookSecret] = useState('')

  const m = useMutation({
    mutationFn: () => updateInnopayCredentials({ mode, merchantId, merchantKey, apiBaseUrl, webhookSecret }),
    onSuccess: () => {
      toast.success('자격증명이 저장되었습니다.')
      setMerchantKey(''); setWebhookSecret('')
      qc.invalidateQueries({ queryKey: ['innopay-creds'] })
    },
    onError: (e: Error) => toast.error(e.message || '저장 실패'),
  })

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold">이노페이 자격증명</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">현재 설정</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? '로딩...' : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">모드</dt>
              <dd>
                {q.data?.mode ? (
                  <Badge className={q.data.mode === 'REAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                    {q.data.mode}
                  </Badge>
                ) : <span className="text-slate-400">미설정</span>}
              </dd>
              <dt className="text-slate-500">MID</dt>
              <dd className="font-mono">{q.data?.merchantId ?? '-'}</dd>
              <dt className="text-slate-500">API URL</dt>
              <dd className="font-mono break-all">{q.data?.apiBaseUrl ?? '-'}</dd>
              <dt className="text-slate-500">최근 갱신</dt>
              <dd>{q.data?.updatedAt ? new Date(q.data.updatedAt).toLocaleString('ko-KR') : '-'}</dd>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">자격증명 변경</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>모드</Label>
            <div className="flex gap-2">
              {(['TEST', 'REAL'] as InnopayMode[]).map((m) => (
                <Button key={m} type="button" variant={mode === m ? 'default' : 'outline'} onClick={() => setMode(m)}>
                  {m}
                </Button>
              ))}
            </div>
          </div>
          <Field label="Merchant ID (MID)" value={merchantId} onChange={setMerchantId} />
          <Field label="Merchant Key" value={merchantKey} onChange={setMerchantKey} type="password" placeholder="저장 후 노출되지 않음" />
          <Field label="API Base URL" value={apiBaseUrl} onChange={setApiBaseUrl} />
          <Field label="Webhook Secret" value={webhookSecret} onChange={setWebhookSecret} type="password" placeholder="서명 검증용 시크릿" />
          <Button
            disabled={m.isPending || !merchantId || !merchantKey || !apiBaseUrl || !webhookSecret}
            onClick={() => m.mutate()}
            className="w-full"
          >
            {m.isPending ? '저장 중...' : '저장'}
          </Button>
          <p className="text-[11px] text-slate-400">
            저장 시 키들은 서버에서 AES-256-GCM으로 암호화되어 보관됩니다. 입력 후 화면에서는 비워집니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
```

- [ ] **Step 2: 테스트**
```tsx
// __tests__/admin/innopay-credentials.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InnopayCredentialsPage from '@/app/admin/innopay-credentials/page'
import { vi } from 'vitest'

vi.mock('@/lib/api/innopay-credentials', () => ({
  getInnopayCredentials: vi.fn().mockResolvedValue({
    mode: 'TEST', merchantId: 'testpay01', apiBaseUrl: 'https://test.innopay.co.kr', updatedAt: '2026-04-27T00:00:00Z',
  }),
  updateInnopayCredentials: vi.fn().mockResolvedValue({ ok: true }),
}))

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('InnopayCredentialsPage', () => {
  it('현재 설정 표시', async () => {
    render(<QueryClientProvider client={qc()}><InnopayCredentialsPage /></QueryClientProvider>)
    expect(await screen.findByText('testpay01')).toBeInTheDocument()
    expect(screen.getByText('TEST')).toBeInTheDocument()
  })

  it('모드/MID 변경 후 저장 호출', async () => {
    const { updateInnopayCredentials } = await import('@/lib/api/innopay-credentials')
    render(<QueryClientProvider client={qc()}><InnopayCredentialsPage /></QueryClientProvider>)
    await screen.findByText('testpay01')
    fireEvent.change(screen.getByLabelText('Merchant ID (MID)'), { target: { value: 'realpay99' } })
    fireEvent.change(screen.getByLabelText('Merchant Key'), { target: { value: 'k' } })
    fireEvent.change(screen.getByLabelText('Webhook Secret'), { target: { value: 's' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(updateInnopayCredentials).toHaveBeenCalledWith(expect.objectContaining({
      merchantId: 'realpay99', merchantKey: 'k', webhookSecret: 's',
    })))
  })
})
```

- [ ] **Step 3: 테스트 통과**
Run: `npm test -- innopay-credentials`
Expected: 2 passed

- [ ] **Step 4: 사이드바·라우트 등록**
기존 admin 사이드바(`src/components/admin/sidebar.tsx` 또는 유사 파일) 메뉴에 `이노페이 설정` 추가, path `/admin/innopay-credentials`.

- [ ] **Step 5: Commit**
```bash
git add src/app/admin/innopay-credentials/ src/__tests__/admin/innopay-credentials.test.tsx [사이드바 파일]
git commit -m "feat(admin): 이노페이 자격증명 관리 페이지"
```

---

## Chunk 6: Frontend — Branch Top-up Vbank Panel

### Task 6.1: API 클라이언트 [Frontend]

**Files:**
- Create: `src/lib/api/branch-topup-vbank.ts`
- Modify: `src/lib/branch/branch-api.ts` (지사 관리자용 GET)

- [ ] **Step 1: admin client**
```typescript
// src/lib/api/branch-topup-vbank.ts
import { api } from './client'
import type { BranchTopupVbank } from '@/lib/payments/innopay-types'

export async function getBranchTopupVbank(branchId: number): Promise<BranchTopupVbank | null> {
  return api<BranchTopupVbank | null>(`/admin/branches/${branchId}/topup-vbank`, { method: 'GET' })
}

export async function issueBranchTopupVbank(branchId: number, holderName: string): Promise<BranchTopupVbank> {
  return api<BranchTopupVbank>(`/admin/branches/${branchId}/topup-vbank`, {
    method: 'POST',
    body: JSON.stringify({ holderName }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function reissueBranchTopupVbank(branchId: number, holderName: string): Promise<BranchTopupVbank> {
  return api<BranchTopupVbank>(`/admin/branches/${branchId}/topup-vbank/reissue`, {
    method: 'PATCH',
    body: JSON.stringify({ holderName }),
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: branch admin용 client**
```typescript
// src/lib/branch/branch-api.ts에 추가
export async function getMyTopupVbank(slug: string): Promise<BranchTopupVbank | null> {
  return branchApi<BranchTopupVbank | null>(`/branch/${slug}/topup-vbank`, { method: 'GET' })
}
```

- [ ] **Step 3: Commit**
```bash
git commit -m "feat(payment): branch topup-vbank API client"
```

---

### Task 6.2: 본사 admin 지사 상세 페이지 패널 [Frontend]

**Files:**
- Create: `src/app/admin/branches/[id]/topup-vbank-panel.tsx`
- Modify: `src/app/admin/branches/[id]/page.tsx` (패널 import)

- [ ] **Step 1: 패널 작성**
```tsx
// topup-vbank-panel.tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getBranchTopupVbank,
  issueBranchTopupVbank,
  reissueBranchTopupVbank,
} from '@/lib/api/branch-topup-vbank'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function BranchTopupVbankPanel({ branchId }: { branchId: number }) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['branch-topup-vbank', branchId],
    queryFn: () => getBranchTopupVbank(branchId),
  })
  const [holder, setHolder] = useState('')

  const issue = useMutation({
    mutationFn: () => issueBranchTopupVbank(branchId, holder),
    onSuccess: () => {
      toast.success('충전용 가상계좌가 발급되었습니다.')
      qc.invalidateQueries({ queryKey: ['branch-topup-vbank', branchId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const reissue = useMutation({
    mutationFn: () => reissueBranchTopupVbank(branchId, holder),
    onSuccess: () => {
      toast.success('재발급되었습니다. 기존 계좌는 비활성화됩니다.')
      qc.invalidateQueries({ queryKey: ['branch-topup-vbank', branchId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (q.isLoading) return <div className="text-sm text-slate-400">로딩...</div>
  const v = q.data

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">충전용 가상계좌 (이노페이)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {v && v.active ? (
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <dt className="text-slate-500">은행</dt>
            <dd className="col-span-2">{v.bankName ?? v.bankCode}</dd>
            <dt className="text-slate-500">계좌번호</dt>
            <dd className="col-span-2 font-mono tabular-nums">{v.accountNumber}</dd>
            <dt className="text-slate-500">예금주</dt>
            <dd className="col-span-2">{v.holderName}</dd>
            <dt className="text-slate-500">발급일</dt>
            <dd className="col-span-2">{v.issuedAt ? new Date(v.issuedAt).toLocaleString('ko-KR') : '-'}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">아직 발급되지 않았습니다.</p>
        )}
        <div className="space-y-1.5 pt-3 border-t">
          <Label>예금주명 (지사명 권장)</Label>
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="예: 서울지사" />
          <div className="flex gap-2 pt-2">
            {!v?.active ? (
              <Button disabled={!holder || issue.isPending} onClick={() => issue.mutate()}>
                {issue.isPending ? '발급 중...' : '발급'}
              </Button>
            ) : (
              <Button variant="outline" disabled={!holder || reissue.isPending} onClick={() => reissue.mutate()}>
                {reissue.isPending ? '재발급 중...' : '재발급'}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            재발급 시 기존 가상계좌는 비활성화되며, 그 이후 입금은 자동 충전 처리되지 않습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 지사 상세 page.tsx에 패널 삽입**
```tsx
// src/app/admin/branches/[id]/page.tsx (적절한 위치에)
import { BranchTopupVbankPanel } from './topup-vbank-panel'
// ...
<BranchTopupVbankPanel branchId={Number(id)} />
```

- [ ] **Step 3: 테스트**
```tsx
// __tests__/admin/branch-topup-vbank-panel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BranchTopupVbankPanel } from '@/app/admin/branches/[id]/topup-vbank-panel'
import { vi } from 'vitest'

const issued = {
  accountNumber: '1234-5678', bankCode: '004', bankName: '국민', holderName: '서울지사',
  active: true, issuedAt: '2026-04-27T00:00:00Z',
}

vi.mock('@/lib/api/branch-topup-vbank', () => ({
  getBranchTopupVbank: vi.fn(),
  issueBranchTopupVbank: vi.fn().mockResolvedValue(issued),
  reissueBranchTopupVbank: vi.fn().mockResolvedValue(issued),
}))

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('BranchTopupVbankPanel', () => {
  it('미발급 → 발급 버튼 노출', async () => {
    const { getBranchTopupVbank } = await import('@/lib/api/branch-topup-vbank')
    vi.mocked(getBranchTopupVbank).mockResolvedValue(null)
    render(<QueryClientProvider client={qc()}><BranchTopupVbankPanel branchId={1} /></QueryClientProvider>)
    expect(await screen.findByText('아직 발급되지 않았습니다.')).toBeInTheDocument()
  })

  it('발급된 vbank 정보 표시', async () => {
    const { getBranchTopupVbank } = await import('@/lib/api/branch-topup-vbank')
    vi.mocked(getBranchTopupVbank).mockResolvedValue(issued as any)
    render(<QueryClientProvider client={qc()}><BranchTopupVbankPanel branchId={1} /></QueryClientProvider>)
    expect(await screen.findByText('1234-5678')).toBeInTheDocument()
    expect(screen.getByText('서울지사')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: 통과 + Commit**

---

### Task 6.3: 지사 관리자 wallet 페이지에 자기 vbank 표시 [Frontend]

**Files:**
- Modify: `src/app/branch/[slug]/manage/wallet/page.tsx` (신규일 가능성, 파일 존재 여부 확인 후)

- [ ] **Step 1: 파일 존재 여부 확인**
Run: `ls src/app/branch/[slug]/manage/`

- [ ] **Step 2: 없으면 새로 생성, 있으면 vbank 카드 추가**

```tsx
// 핵심 카드만 (전체 페이지 레이아웃은 기존 패턴 따름)
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getMyTopupVbank } from '@/lib/branch/branch-api'

function MyTopupVbankCard() {
  const slug = (useParams() as any).slug as string
  const q = useQuery({ queryKey: ['my-topup-vbank', slug], queryFn: () => getMyTopupVbank(slug) })
  if (q.isLoading) return null
  const v = q.data
  if (!v || !v.active) return (
    <div className="rounded-xl border p-4 text-sm text-slate-500">
      충전용 가상계좌가 아직 발급되지 않았습니다. 본사에 문의해 주세요.
    </div>
  )
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <h3 className="font-semibold">충전용 가상계좌</h3>
      <p className="text-sm text-slate-500">아래 계좌로 입금하면 자동으로 충전금에 반영됩니다.</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <dt className="text-slate-500">은행</dt><dd className="col-span-2">{v.bankName ?? v.bankCode}</dd>
        <dt className="text-slate-500">계좌번호</dt><dd className="col-span-2 font-mono">{v.accountNumber}</dd>
        <dt className="text-slate-500">예금주</dt><dd className="col-span-2">{v.holderName}</dd>
      </dl>
    </div>
  )
}
```

- [ ] **Step 3: 테스트 + 커밋**

---

## Chunk 7: 통합 테스트 + 배포

### Task 7.1: 백엔드 통합 테스트 (webhook 시나리오) [Backend]

**Files:**
- Create: `apps/api/src/payments/providers/innopay/innopay.e2e-spec.ts`

- [ ] **Step 1: 시나리오**
1. 자격증명 PUT (TEST 모드) → 200
2. 지사 vbank 발급 POST → 200 (이노페이 client는 mocked, 임의 응답)
3. webhook DEPOSIT 호출 (서명 OK + 매칭되는 tid) → 200, wallet balance += amount
4. 같은 webhook 재호출 → 200, balance 변동 없음 (멱등)
5. 서명 잘못된 webhook → 401
6. 매칭 안 되는 tid → 200(eventsDb엔 processing_error 기록), wallet 변동 없음

- [ ] **Step 2: 실행 + 통과**
Run: `cd apps/api && npm run test:e2e -- innopay`
Expected: 6 시나리오 통과

- [ ] **Step 3: Commit**

---

### Task 7.2: 백엔드 PR 생성 + 머지 [Backend]

- [ ] `git push -u origin feat/innopay-foundation`
- [ ] `gh pr create --title "feat(payment): 이노페이 가상계좌 Phase 1 — 자격증명 + 지사 충전 자동화" --body "..."`
- [ ] 백엔드 단독 머지 가능 (프론트 변경 없이도 동작 — 자격증명·vbank 발급은 API만 있어도 검증 가능)

---

### Task 7.3: 프론트엔드 PR 생성 + 머지 [Frontend]

- [ ] `git push -u origin feat/innopay-foundation`
- [ ] `gh pr create --title "feat(admin): 이노페이 자격증명 + 지사 충전용 vbank 관리 UI" --body "..."`
- [ ] 백엔드 PR 머지 후 머지 (의존성 순서)

---

### Task 7.4: 테스트 서버 배포 + 스모크 테스트 [Both]

> **순서 (CRITICAL)**: 마이그레이션 → 백엔드 release → 프론트엔드 release. 마이그레이션 없이 백엔드를 띄우면 신규 컬럼/테이블 부재로 502가 발생할 수 있고, 백엔드 없이 프론트만 띄우면 admin 페이지가 404를 받음.

- [ ] **Step 1: DB 마이그레이션 실행 (테스트 서버)**

```bash
# 백엔드 서버 SSH
docker exec -i mariadb mysql -u root -p$MYSQL_ROOT_PWD run_flower < migrations/040_innopay_foundation.sql
docker exec -i mariadb mysql -u root -p$MYSQL_ROOT_PWD run_flower < migrations/041_innopay_topup_ledger.sql
```
Expected: 0 errors

- [ ] **Step 2: 백엔드 release**

```bash
# 백엔드 서버에서
cd ~/backend && git pull && docker-compose build api && docker-compose restart api
```
헬스체크: `curl http://127.0.0.1:8080/health` (또는 기존 헬스체크 경로)
Expected: 200

- [ ] **Step 3: 프론트엔드 release**

```bash
# 로컬에서
bash deploy/deploy-zerodt.sh test
```

- [ ] **Step 4: 스모크**
  - `/admin/innopay-credentials` 페이지에서 `testpay01 / 테스트API` 저장 → 마스킹 표시 확인
  - 한 지사 상세 페이지에서 충전용 vbank 발급 → 계좌번호 응답 확인
  - 이노페이 테스트 콘솔에서 해당 vbank로 입금 시뮬레이션 → webhook 수신 → 충전금 +반영 확인 (`/admin/branches/[id]/wallet` 거래내역에 `CHARGE` + memo `이노페이 자동충전`)
  - 동일 webhook 재발송 → 거래 중복 안 됨 확인

---

### Task 7.5: 운영 배포 [Both]

- [ ] 운영 키 이노페이 발급 후 `INNOPAY_ENCRYPTION_KEY_HEX` 운영 환경변수 설정 (shared/.env.local 보호 규칙 준수)
- [ ] 본사 admin에서 자격증명을 REAL로 전환
- [ ] 시범 지사 1개 선정해 vbank 발급, 1~2주 운영 후 전 지사 확대

---

## 검증 체크리스트 (Phase 1 완료 기준)

- [ ] 본사 admin이 `/admin/innopay-credentials`에서 자격증명을 저장/마스킹조회 가능
- [ ] 본사 admin이 지사 상세에서 충전용 vbank 발급/재발급/조회 가능
- [ ] 지사 관리자가 `/branch/[slug]/manage/wallet`에서 자기 vbank 정보 조회 가능
- [ ] 이노페이 webhook이 서명 검증 → 멱등 → 자동 CHARGE까지 동작
- [ ] webhook 감사 로그(`webhook_events`)에 모든 수신 기록(서명 실패 포함)
- [ ] 모든 spec 통과(backend `npm test`, frontend `npm test`)
- [ ] 테스트 서버 e2e 스모크 통과
- [ ] 운영 배포 후 시범 지사 자동 충전 1건 이상 성공

---

---

## §Permanent VBank Fallback

이노페이가 영구 가맹점 가상계좌 발급 API를 제공하지 않을 경우의 대체 흐름.

### 변경 범위

- Task 3.1의 `issuePermanentVbank` 메서드 **제거**
- Task 4.3의 `BranchTopupVbankService.issue` 변경: 운영자가 입력한 계좌번호/은행코드/예금주를 받아 그대로 `organizations` 테이블에 저장 (이노페이 API 호출 없음)
- 가상계좌는 본사 운영자가 이노페이 콘솔(웹)에서 사전 발급한 후 그 계좌번호를 시스템에 등록하는 흐름
- DTO `IssueDto`에 `accountNumber` / `bankCode` / `innopayId`(이노페이 콘솔에서 부여하는 식별자) 필드 추가

### Webhook 매핑

영구 vbank 흐름이라도 `topup_vbank_innopay_id` 또는 `topup_vbank_account_number`로 webhook 입금을 매핑하는 Task 4.2 로직은 동일하게 적용 가능. 이노페이가 입금통보 시 가상계좌 식별자를 페이로드에 포함하면 매핑됨.

### Frontend 변경

Task 6.2의 패널: `holderName` 입력 → `accountNumber + bankCode + holderName + innopayId` 입력으로 확장. 발급 버튼 라벨도 "발급" → "등록".

### 결정 시점

Task 0.2에서 가이드 정독 후 영구 vbank 미지원 확정 시 본 fallback 분기 적용. 본 plan의 Task 3.1 / 4.3 / 6.2를 위 변경에 맞춰 수정한 후 진행.

---

## Phase 2 예고

- 고객 결제용 vbank 발급 API (1회용)
- VBANK_HOLD / VBANK_SETTLE wallet 거래 타입 + 흐름
- 지사 결제 페이지에 결제수단 선택(카드 / 가상계좌) 추가
- `/branch/[slug]/payment/vbank` 발급 안내 + 폴링 페이지
- 본사 admin 가상계좌 결제 모니터링 페이지(`/admin/payments/vbank`)
- 만료 cron + 부분/초과 입금 REVIEW_REQUIRED 처리
