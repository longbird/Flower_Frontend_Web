# AirCPM 지사별 지원 프로그램 설정 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `copyApps`/`pasteApps`(지원 프로그램)를 AirCPM 사용자 단위에서 **지사 단위**로 이전하고 슬롯을 5개(AUTO·Logi D5·XE4·Icon·D2)로 확장한다.

**Architecture:** 기존 `cardPayEnabled`가 사용자 소속 지사에서 파생되는 패턴을 그대로 따른다 — `aircpm_branch`에 `copy_apps`/`paste_apps` `CHAR(5)` 컬럼을 추가하고, 데스크톱 로그인 응답(`getSettings`)이 copy/paste를 지사값에서 단일 소스로 구성한다. 비트스트링↔불리언 변환은 공용 util로 추출(DRY)한다. 관리자 웹은 지사 관리 페이지에서 편집한다.

**Tech Stack:** NestJS(jest) 백엔드 + Next.js 16/React 19/TanStack Query(vitest+RTL) 프론트. MySQL(mysql2).

**참조 스펙:** `docs/superpowers/specs/2026-06-16-aircpm-branch-supported-programs-design.md`

## 실행 환경 메모

- 두 레포에서 작업: 백엔드 `D:\Work\AI_Projects\RunFlower\src\run_flower_backend_final_repo`, 프론트 `D:\Work\AI_Projects\RunFlower\src\Flower_Frontend_Web`. 각 레포에서 별도 커밋.
- **백엔드 테스트(jest)는 로컬에 `node_modules`가 없어 테스트 서버에서 실행**한다(`apps/api`에서 `npm test`/`npx jest`). 로컬은 편집·타입검토만. 프론트 vitest는 로컬 실행 가능.
- 프로젝트 관례상 `master`에 직접 커밋(워크트리 미사용).
- 슬롯 순서(계약): 인덱스 `0=AUTO, 1=D5, 2=XE4, 3=ICON, 4=D2`.

---

## Chunk 1: 백엔드

### Task 1: 공용 비트 변환 util + 마이그레이션 056

**Files:**
- Create: `migrations/056_aircpm_branch_apps.sql`
- Create: `migrations/056_aircpm_branch_apps_rollback.sql`
- Create: `apps/api/src/aircpm/shared/apps_bits.ts`
- Test: `apps/api/src/aircpm/shared/apps_bits.spec.ts`

- [ ] **Step 1: 마이그레이션 작성** (`migrations/056_aircpm_branch_apps.sql`)

```sql
-- Migration: 056_aircpm_branch_apps
-- Description: AirCPM 지사별 지원 프로그램(copy/paste apps) 컬럼 추가 (슬롯 5개: AUTO,D5,XE4,ICON,D2)
-- Date: 2026-06-16
ALTER TABLE aircpm_branch
  ADD COLUMN copy_apps  CHAR(5) NOT NULL DEFAULT '11111'
    COMMENT '비트스트링. 0=AUTO,1=D5,2=XE4,3=ICON,4=D2' AFTER card_payment_enabled,
  ADD COLUMN paste_apps CHAR(5) NOT NULL DEFAULT '11111'
    COMMENT '비트스트링. 동일 규칙' AFTER copy_apps;
```

롤백 (`migrations/056_aircpm_branch_apps_rollback.sql`):

```sql
ALTER TABLE aircpm_branch
  DROP COLUMN paste_apps,
  DROP COLUMN copy_apps;
```

- [ ] **Step 2: 실패 테스트 작성** (`apps/api/src/aircpm/shared/apps_bits.spec.ts`)

```ts
import { APPS_COUNT, bitStringToBooleans, booleansToBitString } from './apps_bits';

describe('apps_bits', () => {
  it('APPS_COUNT === 5', () => {
    expect(APPS_COUNT).toBe(5);
  });

  it('bitStringToBooleans — 5자리 비트스트링 파싱', () => {
    expect(bitStringToBooleans('10100')).toEqual([true, false, true, false, false]);
  });

  it('bitStringToBooleans — null/undefined → 전체 true(기본 ON)', () => {
    expect(bitStringToBooleans(null)).toEqual([true, true, true, true, true]);
    expect(bitStringToBooleans(undefined)).toEqual([true, true, true, true, true]);
  });

  it('bitStringToBooleans — 짧은 입력은 1로 패딩, 긴 입력은 5로 절단', () => {
    expect(bitStringToBooleans('00')).toEqual([false, false, true, true, true]);
    expect(bitStringToBooleans('000000')).toEqual([false, false, false, false, false]);
  });

  it('booleansToBitString — 5요소 배열 직렬화', () => {
    expect(booleansToBitString([true, false, true, false, true])).toBe('10101');
  });

  it('booleansToBitString — 길이 5 아니면 전체 ON으로 방어', () => {
    expect(booleansToBitString([false, false])).toBe('11111');
    expect(booleansToBitString(undefined)).toBe('11111');
  });

  it('왕복 보존', () => {
    expect(bitStringToBooleans(booleansToBitString([false, true, false, true, false])))
      .toEqual([false, true, false, true, false]);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인** (테스트 서버)

Run: `cd apps/api && npx jest src/aircpm/shared/apps_bits.spec.ts`
Expected: FAIL — `Cannot find module './apps_bits'`

- [ ] **Step 4: 구현** (`apps/api/src/aircpm/shared/apps_bits.ts`)

```ts
// AirCPM 지원 프로그램 슬롯: 0=AUTO,1=D5,2=XE4,3=ICON,4=D2
export const APPS_COUNT = 5;

/** 비트스트링(예 '10100') → 길이 5 불리언 배열. null/undefined/짧은 입력은 1(ON)로 패딩. */
export function bitStringToBooleans(s: string | null | undefined): boolean[] {
  const src = (s ?? '1'.repeat(APPS_COUNT)).padEnd(APPS_COUNT, '1').slice(0, APPS_COUNT);
  return Array.from({ length: APPS_COUNT }, (_, i) => src[i] === '1');
}

/** 길이 5 불리언 배열 → 비트스트링. 길이가 5가 아니면 전체 ON('11111')으로 방어. */
export function booleansToBitString(arr: boolean[] | undefined): string {
  const src = arr && arr.length === APPS_COUNT ? arr : Array(APPS_COUNT).fill(true);
  return src.map((b) => (b ? '1' : '0')).join('');
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && npx jest src/aircpm/shared/apps_bits.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: 커밋** (백엔드 레포)

```bash
cd D:/Work/AI_Projects/RunFlower/src/run_flower_backend_final_repo
git add migrations/056_aircpm_branch_apps.sql migrations/056_aircpm_branch_apps_rollback.sql apps/api/src/aircpm/shared/apps_bits.ts apps/api/src/aircpm/shared/apps_bits.spec.ts
git commit -m "feat(aircpm): 지사 지원 프로그램 마이그레이션 056 + 공용 비트 변환 util(5슬롯)"
```

---

### Task 2: 지사 DB 계층에 copy/paste 추가

**Files:**
- Modify: `apps/api/src/aircpm/payment/db/aircpm_branch.db.ts`
- Test: `apps/api/src/aircpm/payment/db/aircpm_branch.db.spec.ts`

- [ ] **Step 1: 기존 테스트 갱신 + 신규 테스트 작성**

기존 `upsert` 테스트 3개는 params 배열이 copy/paste(2개씩 = INSERT 2 + UPDATE 2) 추가로 길어진다. 아래로 교체/추가:

```ts
// findByCode 행 매핑: copy/paste 포함 검증 (기존 테스트 교체)
it('findByCode → 행 매핑(copy/paste 포함)', async () => {
  const { pool, enqueue } = makePool();
  enqueue([{ brch_cd: 'S001', name: '강남', card_payment_enabled: 1, copy_apps: '10100', paste_apps: '11111' }]);
  const db = new AircpmBranchDb(pool as any);
  const r = await db.findByCode('S001');
  expect(r).toMatchObject({
    brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
    copyApps: [true, false, true, false, false],
    pasteApps: [true, true, true, true, true],
  });
});

it('findByCode → copy/paste 컬럼 없으면 기본 전체 ON', async () => {
  const { pool, enqueue } = makePool();
  enqueue([{ brch_cd: 'S001', name: '강남', card_payment_enabled: 0 }]);
  const db = new AircpmBranchDb(pool as any);
  const r = await db.findByCode('S001');
  expect(r?.copyApps).toEqual([true, true, true, true, true]);
  expect(r?.pasteApps).toEqual([true, true, true, true, true]);
});

// upsert: copy/paste 지정 → 비트스트링으로 직렬화 (기존 신규 INSERT 테스트 교체)
it('upsert → copy/paste 지정 시 비트스트링 직렬화', async () => {
  const { pool, calls } = makePool();
  const db = new AircpmBranchDb(pool as any);
  await db.upsert({
    brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
    copyApps: [true, false, true, false, false],
    pasteApps: [true, true, true, true, true],
  });
  expect(calls[0].sql).toMatch(/INSERT INTO aircpm_branch/);
  // INSERT params(5) + UPDATE params(4): brchCd,name,enabled,copy,paste, name,enabled,copy,paste
  expect(calls[0].params).toEqual(['S001', '강남', 1, '10100', '11111', '강남', 1, '10100', '11111']);
});

it('upsert → copy/paste 생략 시 COALESCE(null)로 기존 값 보존', async () => {
  const { pool, calls } = makePool();
  const db = new AircpmBranchDb(pool as any);
  await db.upsert({ brchCd: 'S001', name: '강남' });
  expect(calls[0].sql).toMatch(/copy_apps = COALESCE\(\?, copy_apps\)/);
  expect(calls[0].params).toEqual(['S001', '강남', null, null, null, '강남', null, null, null]);
});
```

기존 `upsert → cardPaymentEnabled 생략...` / `name 생략...` 테스트의 params 기대값도 copy/paste 자리(2개씩) 추가로 갱신:
```ts
// name 생략(cardPaymentEnabled:false): ['S001', null, 0, null, null, null, 0, null, null]
// cardPaymentEnabled 생략(name '강남'): ['S001', '강남', null, null, null, '강남', null, null, null]
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/api && npx jest src/aircpm/payment/db/aircpm_branch.db.spec.ts`
Expected: FAIL (copyApps undefined / params 불일치)

- [ ] **Step 3: 구현** — `aircpm_branch.db.ts` 전체를 아래로 교체

```ts
import { Inject, Injectable } from '@nestjs/common';
import type * as mysql from 'mysql2/promise';
import { DATABASE_POOL } from '../../../infra/database';
import { bitStringToBooleans, booleansToBitString } from '../../shared/apps_bits';

export type AircpmBranch = {
  brchCd: string;
  name: string | null;
  cardPaymentEnabled: boolean;
  copyApps: boolean[];
  pasteApps: boolean[];
};

@Injectable()
export class AircpmBranchDb {
  constructor(@Inject(DATABASE_POOL) private readonly pool: mysql.Pool) {}

  private mapRow(r: any): AircpmBranch {
    return {
      brchCd: r.brch_cd,
      name: r.name,
      cardPaymentEnabled: !!r.card_payment_enabled,
      copyApps: bitStringToBooleans(r.copy_apps),
      pasteApps: bitStringToBooleans(r.paste_apps),
    };
  }

  async findByCode(brchCd: string): Promise<AircpmBranch | null> {
    const [rows] = await this.pool.query<any[]>(
      `SELECT brch_cd, name, card_payment_enabled, copy_apps, paste_apps FROM aircpm_branch WHERE brch_cd=? LIMIT 1`,
      [brchCd],
    );
    const r = rows?.[0];
    return r ? this.mapRow(r) : null;
  }

  async isCardPaymentEnabled(brchCd: string): Promise<boolean> {
    const b = await this.findByCode(brchCd);
    return !!b?.cardPaymentEnabled;
  }

  async list(): Promise<AircpmBranch[]> {
    const [rows] = await this.pool.query<any[]>(
      `SELECT brch_cd, name, card_payment_enabled, copy_apps, paste_apps FROM aircpm_branch ORDER BY brch_cd`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async upsert(input: {
    brchCd: string;
    name?: string | null;
    cardPaymentEnabled?: boolean;
    copyApps?: boolean[];
    pasteApps?: boolean[];
  }): Promise<void> {
    const name = input.name === undefined ? null : input.name;
    const enabled = input.cardPaymentEnabled === undefined ? null : input.cardPaymentEnabled ? 1 : 0;
    const copy = input.copyApps === undefined ? null : booleansToBitString(input.copyApps);
    const paste = input.pasteApps === undefined ? null : booleansToBitString(input.pasteApps);
    await this.pool.query(
      `INSERT INTO aircpm_branch (brch_cd, name, card_payment_enabled, copy_apps, paste_apps)
       VALUES (?, ?, COALESCE(?, 0), COALESCE(?, '11111'), COALESCE(?, '11111'))
       ON DUPLICATE KEY UPDATE
         name = COALESCE(?, name),
         card_payment_enabled = COALESCE(?, card_payment_enabled),
         copy_apps = COALESCE(?, copy_apps),
         paste_apps = COALESCE(?, paste_apps)`,
      [input.brchCd, name, enabled, copy, paste, name, enabled, copy, paste],
    );
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && npx jest src/aircpm/payment/db/aircpm_branch.db.spec.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/aircpm/payment/db/aircpm_branch.db.ts apps/api/src/aircpm/payment/db/aircpm_branch.db.spec.ts
git commit -m "feat(aircpm): 지사 DB copy/paste apps 컬럼 read/write"
```

---

### Task 3: 지사 Upsert DTO + 서비스 시그니처

**Files:**
- Modify: `apps/api/src/aircpm/payment/dto/aircpm-branch.dto.ts:4-8`
- Modify: `apps/api/src/aircpm/payment/aircpm_branch.service.ts:26-33`
- Test: `apps/api/src/aircpm/payment/aircpm_branch.service.spec.ts`

- [ ] **Step 1: 서비스 테스트에 copy/paste 통과 케이스 추가** (`aircpm_branch.service.spec.ts`의 `describe('upsertBranch')`)

```ts
it('super — copyApps/pasteApps 포함 input 그대로 db.upsert 전달', async () => {
  const d = deps();
  d.branchDb.upsert.mockResolvedValue(undefined);
  const withApps = { brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
    copyApps: [true, false, true, false, false], pasteApps: [true, true, true, true, true] };
  await svc(d).upsertBranch(superCaller, withApps);
  expect(d.branchDb.upsert).toHaveBeenCalledWith(withApps);
});
```

- [ ] **Step 2: 테스트 실패 확인 (타입)**

Run: `cd apps/api && npx jest src/aircpm/payment/aircpm_branch.service.spec.ts`
Expected: FAIL (TS — upsertBranch input 타입에 copyApps/pasteApps 없음)

- [ ] **Step 3: DTO 수정** (`aircpm-branch.dto.ts`) — import와 `UpsertBranchDto` 교체

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsBoolean, IsIn, MaxLength,
  IsArray, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';

export class UpsertBranchDto {
  @ApiProperty() @IsString() @MaxLength(32) brchCd: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cardPaymentEnabled?: boolean;

  @ApiPropertyOptional({ example: [true, true, true, true, true], description: '0=AUTO,1=D5,2=XE4,3=ICON,4=D2' })
  @IsOptional() @IsArray() @ArrayMinSize(5) @ArrayMaxSize(5) @IsBoolean({ each: true })
  copyApps?: boolean[];

  @ApiPropertyOptional({ example: [true, true, true, true, true] })
  @IsOptional() @IsArray() @ArrayMinSize(5) @ArrayMaxSize(5) @IsBoolean({ each: true })
  pasteApps?: boolean[];
}
```
(나머지 `UpsertTossCredentialsDto`, `UpdateCustomerDto`는 그대로 유지.)

- [ ] **Step 4: 서비스 시그니처 확장** (`aircpm_branch.service.ts` `upsertBranch`)

```ts
  async upsertBranch(
    caller: AdminCaller,
    input: {
      brchCd: string;
      name?: string | null;
      cardPaymentEnabled?: boolean;
      copyApps?: boolean[];
      pasteApps?: boolean[];
    },
  ) {
    this.requireSuper(caller);
    await this.branchDb.upsert(input);
    return { brchCd: input.brchCd };
  }
```
(컨트롤러 `aircpm_branch_admin.controller.ts`는 dto를 그대로 통과하므로 수정 불필요.)

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && npx jest src/aircpm/payment/aircpm_branch.service.spec.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/aircpm/payment/dto/aircpm-branch.dto.ts apps/api/src/aircpm/payment/aircpm_branch.service.ts apps/api/src/aircpm/payment/aircpm_branch.service.spec.ts
git commit -m "feat(aircpm): 지사 upsert DTO/서비스에 copy/paste apps(5슬롯) 추가"
```

---

### Task 4: getSettings가 copy/paste를 지사에서 파생

**Files:**
- Modify: `apps/api/src/aircpm/security/aircpm_auth.service.ts` (DEFAULT_SETTINGS, SettingsRow, 비트 헬퍼 제거, settingsRowToDto, getSettings)
- Test: `apps/api/src/aircpm/security/aircpm_auth.service.spec.ts`

- [ ] **Step 1: 기존 단언 갱신 + 신규 테스트**

`aircpm_auth.service.spec.ts:133` 의 길이-4 단언을 길이-5 + 지사 파생으로 교체. 해당 테스트(`승인된 기기 → 토큰 + 기본 설정 반환`)의 마지막 settings 쿼리 mock에 copy/paste를 넣지 않으면 기본 전체 ON이 되도록:

```ts
// (line ~122) 지사 쿼리 mock 은 그대로 [{ card_payment_enabled: 0 }] 유지 (copy/paste 없음 → 기본 ON)
// (line 133) 교체:
expect(res.settings.copyApps).toEqual([true, true, true, true, true]);
expect(res.settings.pasteApps).toEqual([true, true, true, true, true]);
```

신규 테스트 추가 (`describe('login')` 내부):

```ts
it('로그인 settings.copyApps/pasteApps — 지사값에서 파생', async () => {
  const h = makePool();
  h.enqueue([activeUserRow()]); // user
  h.enqueue([{ id: 10, user_id: 'user01', serial: 's', mac_address: 'm', status: 'approved', reject_reason: null }]); // cert
  h.enqueueUpdate(1); // refresh token INSERT
  h.enqueue([]); // user_settings (없음)
  h.enqueue([{ brch_cd: 'S001', card_payment_enabled: 1, copy_apps: '10100', paste_apps: '11110' }]); // 지사
  const svc = new AircpmAuthService(jwt, h.pool as any);

  const out = await svc.login({ userId: 'user01', password: 'pw123456', serial: 's', macAddress: 'm' });
  expect(out.settings.copyApps).toEqual([true, false, true, false, false]);
  expect(out.settings.pasteApps).toEqual([true, true, true, true, false]);
  // 지사 쿼리가 copy_apps/paste_apps 를 SELECT 하는지 확인
  expect(h.calls[4].sql).toMatch(/copy_apps/);
  expect(h.calls[4].sql).toMatch(/paste_apps/);
});

it('로그인 settings — 소속 지사 없으면 copy/paste 기본 전체 ON', async () => {
  const h = makePool();
  h.enqueue([activeUserRow({ brch_cd: null })]);
  h.enqueue([{ id: 10, user_id: 'user01', serial: 's', mac_address: 'm', status: 'approved', reject_reason: null }]);
  h.enqueueUpdate(1);
  h.enqueue([]); // user_settings
  h.enqueue([]); // 지사 조회 0건
  const svc = new AircpmAuthService(jwt, h.pool as any);

  const out = await svc.login({ userId: 'user01', password: 'pw123456', serial: 's', macAddress: 'm' });
  expect(out.settings.copyApps).toEqual([true, true, true, true, true]);
  expect(out.settings.pasteApps).toEqual([true, true, true, true, true]);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts -t login`
Expected: FAIL (copyApps 길이 4 / 지사 파생 미구현)

- [ ] **Step 3: 구현** — `aircpm_auth.service.ts` 변경

(a) 상단 import 추가, 로컬 비트 헬퍼(`bitStringToBooleans`/`booleansToBitString`) 제거:
```ts
import { bitStringToBooleans, booleansToBitString } from '../shared/apps_bits';
```

(b) `DEFAULT_SETTINGS` 에서 copyApps/pasteApps/cardPayEnabled 제거:
```ts
const DEFAULT_SETTINGS = Object.freeze({
  appTitle: null as string | null,
  priceUp: false,
  telegram: null as TelegramCreds | null,
});
```

(c) `SettingsRow` 타입에서 copy_apps/paste_apps 제거:
```ts
type SettingsRow = {
  user_id: string;
  app_title: string | null;
  price_up: number;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
};
```

(d) `settingsRowToDto` — copy/paste·cardPayEnabled 제거:
```ts
function settingsRowToDto(row: SettingsRow | null) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    appTitle: row.app_title,
    priceUp: !!row.price_up,
    telegram: telegramRowToDto(row),
  };
}
```

(e) `getSettings` — 사용자 settings 쿼리에서 copy/paste 컬럼 제거, 지사 쿼리에 copy/paste 추가하고 단일 소스로 구성:
```ts
async getSettings(userId: string) {
  const [rows] = await this.pool.query<any[]>(
    `SELECT user_id, app_title, price_up, telegram_bot_token, telegram_chat_id
       FROM aircpm_user_settings WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const base = settingsRowToDto(rows?.[0] ?? null);

  // copy/paste apps + cardPayEnabled 는 사용자 소속 지사에서 파생(단일 소스).
  // 소속/지사행 없거나 비활성 사용자면 copy/paste 기본 전체 ON.
  const [brows] = await this.pool.query<any[]>(
    `SELECT b.card_payment_enabled, b.copy_apps, b.paste_apps
       FROM aircpm_user u LEFT JOIN aircpm_branch b ON b.brch_cd = u.brch_cd
       WHERE u.user_id = ? AND u.is_active = 1 LIMIT 1`,
    [userId],
  );
  const brow = brows?.[0];
  return {
    ...base,
    copyApps: bitStringToBooleans(brow?.copy_apps),
    pasteApps: bitStringToBooleans(brow?.paste_apps),
    cardPayEnabled: !!brow?.card_payment_enabled,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts`
Expected: PASS (기존 cardPayEnabled 테스트 포함 전부)

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/aircpm/security/aircpm_auth.service.ts apps/api/src/aircpm/security/aircpm_auth.service.spec.ts
git commit -m "feat(aircpm): 로그인 settings copy/paste를 지사값에서 파생(5슬롯)"
```

---

### Task 5: 사용자 settings에서 copy/paste 입력·저장 제거 + DTO

**Files:**
- Modify: `apps/api/src/aircpm/security/aircpm_auth.service.ts` (`upsertSettings`)
- Modify: `apps/api/src/aircpm/security/dto/aircpm-auth.dto.ts` (`UpdateAircpmSettingsDto`, `AircpmSettingsDto`)
- Test: `apps/api/src/aircpm/security/aircpm_auth.service.spec.ts`

- [ ] **Step 1: upsertSettings가 copy/paste 컬럼을 건드리지 않음을 검증하는 테스트 추가**

```ts
describe('upsertSettings', () => {
  it('appTitle 만 갱신 — INSERT 에 copy_apps/paste_apps 미포함', async () => {
    const h = makePool();
    h.enqueue([]); // current row 없음
    h.enqueueUpdate(1); // upsert INSERT
    h.enqueue([]); // getSettings: user_settings
    h.enqueue([{ card_payment_enabled: 0 }]); // getSettings: 지사
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await svc.upsertSettings('user01', { appTitle: 'MyApp' });
    const insert = h.calls[1];
    expect(insert.sql).toMatch(/INSERT INTO aircpm_user_settings/);
    expect(insert.sql).not.toMatch(/copy_apps/);
    expect(insert.sql).not.toMatch(/paste_apps/);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts -t upsertSettings`
Expected: FAIL (현재 INSERT 에 copy_apps 포함)

- [ ] **Step 3: 구현** — `upsertSettings` 의 patch 타입·merged·SQL 에서 copy/paste 제거

```ts
async upsertSettings(userId: string, patch: {
  appTitle?: string | null;
  priceUp?: boolean;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
}) {
  const [currentRows] = await this.pool.query<any[]>(
    `SELECT user_id, app_title, price_up, telegram_bot_token, telegram_chat_id
       FROM aircpm_user_settings WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const currentRow = (currentRows?.[0] ?? null) as SettingsRow | null;

  const merged = {
    appTitle: patch.appTitle !== undefined ? patch.appTitle : currentRow?.app_title ?? null,
    priceUp: patch.priceUp !== undefined ? patch.priceUp : !!currentRow?.price_up,
    telegramBotToken:
      patch.telegramBotToken !== undefined
        ? normalizeBlankToNull(patch.telegramBotToken)
        : currentRow?.telegram_bot_token ?? null,
    telegramChatId:
      patch.telegramChatId !== undefined
        ? normalizeBlankToNull(patch.telegramChatId)
        : currentRow?.telegram_chat_id ?? null,
  };
  await this.pool.query(
    `INSERT INTO aircpm_user_settings
       (user_id, app_title, price_up, telegram_bot_token, telegram_chat_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       app_title = VALUES(app_title),
       price_up = VALUES(price_up),
       telegram_bot_token = VALUES(telegram_bot_token),
       telegram_chat_id = VALUES(telegram_chat_id)`,
    [userId, merged.appTitle, merged.priceUp ? 1 : 0, merged.telegramBotToken, merged.telegramChatId],
  );
  return this.getSettings(userId);
}
```
> 신규 row INSERT 시 copy_apps/paste_apps 를 생략하면 DB 기본값 `'1111'`이 적용되고, 기존 row 는 UPDATE 대상에서 빠져 보존된다(데드 컬럼, 길이 5 write 없음).

(b) `dto/aircpm-auth.dto.ts` — `UpdateAircpmSettingsDto` 에서 copyApps/pasteApps 필드 **삭제**:
```ts
export class UpdateAircpmSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128)
  appTitle?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  priceUp?: boolean;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(128)
  telegramBotToken?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(64)
  telegramChatId?: string | null;
}
```

(c) `AircpmSettingsDto` 의 copyApps/pasteApps 예시·설명을 5슬롯으로:
```ts
  @ApiProperty({ example: [true, true, true, true, true], description: '인덱스 0=AUTO,1=D5,2=XE4,3=ICON,4=D2 (지사 설정에서 파생)' })
  copyApps: boolean[];

  @ApiProperty({ example: [true, true, true, true, true] })
  pasteApps: boolean[];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/aircpm/security/aircpm_auth.service.ts apps/api/src/aircpm/security/dto/aircpm-auth.dto.ts apps/api/src/aircpm/security/aircpm_auth.service.spec.ts
git commit -m "refactor(aircpm): 사용자 settings에서 copy/paste 입력·저장 제거(DTO 포함)"
```

---

### Task 6: 백엔드 전체 검증

- [ ] **Step 1: aircpm 전체 테스트 (테스트 서버)**

Run: `cd apps/api && npx jest src/aircpm`
Expected: PASS (0 failures)

- [ ] **Step 2: 타입 체크 / 빌드**

Run: `cd apps/api && npx tsc --noEmit` (또는 프로젝트 빌드 스크립트)
Expected: 0 errors

- [ ] **Step 3: (선택) 마이그레이션 + 수동 e2e — 테스트 서버**

테스트 서버에서 마이그레이션 056 적용 후, 데스크톱 로그인 응답의 `settings.copyApps/pasteApps`가 지사값(길이 5)으로 내려오는지 확인. 미적용 시 운영 배포 보류.

---

## Chunk 2: 프론트엔드

### Task 7: API 클라이언트 타입

**Files:**
- Modify: `src/lib/api/aircpm-payments.ts:3-7,53-60`
- Modify: `src/lib/api/aircpm.ts:105-125`
- Test: `src/__tests__/aircpm/aircpm-payments-api.test.ts`

- [ ] **Step 1: 테스트 추가** (`aircpm-payments-api.test.ts` 의 upsert 케이스 확장)

```ts
it('upsertAircpmBranch → copyApps/pasteApps 바디 포함', async () => {
  mockApi.mockResolvedValueOnce({ ok: true });
  await upsertAircpmBranch({
    brchCd: 'S001',
    copyApps: [true, false, true, false, false],
    pasteApps: [true, true, true, true, true],
  });
  const [, opts] = mockApi.mock.calls[0];
  const body = JSON.parse(opts.body);
  expect(body.copyApps).toEqual([true, false, true, false, false]);
  expect(body.pasteApps).toEqual([true, true, true, true, true]);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/__tests__/aircpm/aircpm-payments-api.test.ts`
Expected: FAIL (TS — upsertAircpmBranch 바디에 copyApps 없음)

- [ ] **Step 3: 구현** (`aircpm-payments.ts`)

`AircpmBranch` 타입:
```ts
export interface AircpmBranch {
  brchCd: string;
  name: string | null;
  cardPaymentEnabled: boolean;
  copyApps: boolean[];   // 5슬롯: 0=AUTO,1=D5,2=XE4,3=ICON,4=D2
  pasteApps: boolean[];
}
```
`upsertAircpmBranch` 바디:
```ts
export async function upsertAircpmBranch(body: {
  brchCd: string; name?: string; cardPaymentEnabled?: boolean;
  copyApps?: boolean[]; pasteApps?: boolean[];
}): Promise<{ ok: true }> {
  return api('/admin/aircpm/branches', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

(`aircpm.ts`) `AircpmUserSettings` 의 copy/paste 를 `boolean[]`로 완화하고 `AircpmUserSettingsPatch` 에서 제거:
```ts
export interface AircpmUserSettings {
  appTitle: string | null;
  copyApps: boolean[];   // 화면 미사용(지사에서 파생), 5슬롯
  pasteApps: boolean[];
  priceUp: boolean;
  telegram: AircpmTelegramCreds | null;
}

export interface AircpmUserSettingsPatch {
  appTitle?: string | null;
  priceUp?: boolean;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/__tests__/aircpm/aircpm-payments-api.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋** (프론트 레포)

```bash
cd D:/Work/AI_Projects/RunFlower/src/Flower_Frontend_Web
git add src/lib/api/aircpm-payments.ts src/lib/api/aircpm.ts src/__tests__/aircpm/aircpm-payments-api.test.ts
git commit -m "feat(aircpm): 지사 API 타입에 copy/paste apps 추가, 사용자 Patch에서 제거"
```

---

### Task 8: 지사 관리 페이지 — 지원 프로그램 토글

**Files:**
- Modify: `src/app/aircpm/branches/page.tsx`
- Test: `src/__tests__/aircpm/branches-page.test.tsx`

- [ ] **Step 1: 테스트 추가** (`branches-page.test.tsx`)

mock 에 `upsertAircpmBranch` 가 이미 있음. 편집 다이얼로그에서 토글 후 저장 시 길이 5 배열 전달을 검증:

```ts
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { listAircpmBranches, upsertAircpmBranch } from '@/lib/api/aircpm-payments';

it('편집 다이얼로그에서 지원 프로그램 토글 후 저장 → 길이 5 배열 전달', async () => {
  (listAircpmBranches as any).mockResolvedValueOnce([
    { brchCd: 'S001', name: '강남', cardPaymentEnabled: true,
      copyApps: [true, true, true, true, true], pasteApps: [true, true, true, true, true] },
  ]);
  (upsertAircpmBranch as any).mockResolvedValueOnce({ ok: true });
  render(<Wrapper><BranchesPage /></Wrapper>);
  await waitFor(() => expect(screen.getByText('S001')).toBeInTheDocument());

  fireEvent.click(screen.getByText('편집'));
  // 지원 프로그램 섹션의 복사-AUTO 체크박스 해제 (testid 기반)
  const copyAuto = await screen.findByTestId('copy-app-0');
  fireEvent.click(copyAuto); // true→false
  fireEvent.click(screen.getByText('저장'));

  await waitFor(() => expect(upsertAircpmBranch).toHaveBeenCalled());
  const arg = (upsertAircpmBranch as any).mock.calls[0][0];
  expect(arg.copyApps).toHaveLength(5);
  expect(arg.copyApps[0]).toBe(false);
  expect(arg.pasteApps).toHaveLength(5);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/__tests__/aircpm/branches-page.test.tsx`
Expected: FAIL (testid 없음 / copyApps 미전달)

- [ ] **Step 3: 구현** — `branches/page.tsx`

(a) 파일 상단 상수 + 공용 컴포넌트 추가:
```tsx
const PROGRAM_LABELS = ['AUTO', 'Logi D5', 'XE4', 'Icon', 'D2'] as const;
const ALL_ON: boolean[] = [true, true, true, true, true];

function summarizeApps(apps: boolean[] | undefined): string {
  const a = apps ?? ALL_ON;
  if (a.every(Boolean)) return '전체';
  const on = PROGRAM_LABELS.filter((_, i) => a[i]);
  return on.length ? on.join('·') : '없음';
}

function SupportedProgramsField({
  copyApps, pasteApps, onToggleCopy, onTogglePaste,
}: {
  copyApps: boolean[]; pasteApps: boolean[];
  onToggleCopy: (i: number) => void; onTogglePaste: (i: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">지원 프로그램 (복사 / 붙여넣기)</label>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500">
          <span>프로그램</span><span className="text-center">복사</span><span className="text-center">붙여넣기</span>
        </div>
        {PROGRAM_LABELS.map((label, i) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 items-center border-t border-slate-100">
            <span className="text-sm text-slate-700">{label}</span>
            <input type="checkbox" data-testid={`copy-app-${i}`}
              checked={copyApps[i]} onChange={() => onToggleCopy(i)}
              className="w-4 h-4 justify-self-center rounded border-slate-300 accent-emerald-600" />
            <input type="checkbox" data-testid={`paste-app-${i}`}
              checked={pasteApps[i]} onChange={() => onTogglePaste(i)}
              className="w-4 h-4 justify-self-center rounded border-slate-300 accent-emerald-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

function toggleAt(arr: boolean[], i: number): boolean[] {
  return arr.map((v, idx) => (idx === i ? !v : v));
}
```

(b) `BranchCreateDialog` — 상태 + 필드 + mutation 바디:
```tsx
const [copyApps, setCopyApps] = useState<boolean[]>(ALL_ON);
const [pasteApps, setPasteApps] = useState<boolean[]>(ALL_ON);
// ...
mutationFn: () => upsertAircpmBranch({
  brchCd: brchCd.trim(),
  name: name.trim() || undefined,
  cardPaymentEnabled,
  copyApps,
  pasteApps,
}),
// JSX: 카드결제 체크박스 아래에 추가
<SupportedProgramsField
  copyApps={copyApps} pasteApps={pasteApps}
  onToggleCopy={(i) => setCopyApps((p) => toggleAt(p, i))}
  onTogglePaste={(i) => setPasteApps((p) => toggleAt(p, i))}
/>
```

(c) `BranchEditDialog` — 기존 지사값으로 초기화(방어적 기본):
```tsx
const [copyApps, setCopyApps] = useState<boolean[]>(branch.copyApps ?? ALL_ON);
const [pasteApps, setPasteApps] = useState<boolean[]>(branch.pasteApps ?? ALL_ON);
// mutationFn 바디에 copyApps, pasteApps 추가
// JSX: 카드결제 체크박스 아래에 동일 <SupportedProgramsField .../>
```

(d) 지사 카드 목록 — 카드결제 배지 영역 아래에 요약 1줄:
```tsx
<p className="text-[11px] text-slate-500">
  복사 {summarizeApps(b.copyApps)} · 붙여넣기 {summarizeApps(b.pasteApps)}
</p>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/__tests__/aircpm/branches-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/aircpm/branches/page.tsx src/__tests__/aircpm/branches-page.test.tsx
git commit -m "feat(aircpm): 지사 관리에 지원 프로그램(복사/붙여넣기) 5슬롯 설정 추가"
```

---

### Task 9: 사용자 설정 페이지 — copy/paste 제거

**Files:**
- Modify: `src/app/aircpm/users/[userId]/settings/page.tsx`
- Test: `src/__tests__/aircpm/user-settings-page.test.tsx` (신규)

- [ ] **Step 1: 신규 테스트** (`src/__tests__/aircpm/user-settings-page.test.tsx`)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AircpmUserSettingsPage from '@/app/aircpm/users/[userId]/settings/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ userId: 'user01' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/aircpm', () => ({
  getAircpmUserSettings: vi.fn(),
  updateAircpmUserSettings: vi.fn(),
}));
import { getAircpmUserSettings } from '@/lib/api/aircpm';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('AircpmUserSettingsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('copy/paste 섹션을 렌더하지 않는다 (지사로 이전)', async () => {
    (getAircpmUserSettings as any).mockResolvedValueOnce({
      appTitle: 'AirCPM',
      copyApps: [true, true, true, true, true],
      pasteApps: [true, true, true, true, true],
      priceUp: false,
      telegram: null,
    });
    render(<Wrapper><AircpmUserSettingsPage /></Wrapper>);
    await waitFor(() => expect(screen.getByText(/앱 타이틀/)).toBeInTheDocument());
    expect(screen.queryByText(/복사 대상 앱/)).not.toBeInTheDocument();
    expect(screen.queryByText(/붙여넣기 대상 앱/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/__tests__/aircpm/user-settings-page.test.tsx`
Expected: FAIL (현재 복사/붙여넣기 카드 렌더됨)

- [ ] **Step 3: 구현** — `settings/page.tsx`

- `APP_LABELS` 상수 제거(line 17).
- `copyApps`/`pasteApps` state + `toggleCopy`/`togglePaste` 제거(line 47-58, 96-105).
- `useEffect` 에서 `setCopyApps(data.copyApps)` / `setPasteApps(data.pasteApps)` 두 줄 제거(line 67-68).
- `saveMutation` body 에서 `copyApps`/`pasteApps` 제거(line 80-86).
- "복사 대상 앱"/"붙여넣기 대상 앱" 두 `<Card>` 블록 제거(line 159-209).
- 헤더 설명(line 121-123)을 `"앱 타이틀, 단가 인상, 진단 로그 Telegram 자격을 편집합니다."` 로 수정.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/__tests__/aircpm/user-settings-page.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add "src/app/aircpm/users/[userId]/settings/page.tsx" src/__tests__/aircpm/user-settings-page.test.tsx
git commit -m "refactor(aircpm): 사용자 설정 화면에서 copy/paste 제거(지사로 이전)"
```

---

### Task 10: 프론트 전체 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: PASS (0 failures)

- [ ] **Step 2: 린트**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 3: 빌드 (테스트 서버 또는 로컬 빌드 허용 시)**

Run: `npm run build`
Expected: 빌드 성공 (0 errors)

---

## 마무리 / 배포 (별도 승인 후)

- [ ] 백엔드: 테스트 서버 배포(SCP→컨테이너 빌드→restart) + 마이그레이션 056 적용 → 수동 e2e
- [ ] 프론트: `bash deploy/deploy-zerodt.sh test` → 검증
- [ ] 데스크톱 클라이언트 5슬롯 지원 확인 후에만 **운영** 배포 (구버전 클라이언트 잔존 시 보류)
- [ ] 운영 반영 시: 모든 지사 copy/paste 기본 전체 ON으로 시작함을 공지
```
