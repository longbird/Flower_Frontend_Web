# AirCPM 계정별 기기 제한 & 현황 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일반 사용자(power=5) 데스크톱 기기를 계정당 최대 2대로 승인 시점에 강제하고, 관리자 사이트에 계정별 기기 현황 탭을 추가한다.

**Architecture:** 백엔드(NestJS)는 `approveCert()`에 트랜잭션 기반 한도 검사 추가 + 계정별 집계 API(`GET /admin/aircpm/devices/summary`) 신설 + 마이그레이션 080으로 기존 초과분 정리. 프론트(Next.js)는 `/aircpm/certs` 페이지에 [기기별|계정별] 탭을 추가하고 계정별 뷰는 새 컴포넌트로 분리한다. 모바일 1기기 제한은 이미 강제되므로 변경 없음.

**Tech Stack:** NestJS + mysql2(MariaDB), Next.js 16 + TanStack Query v5 + shadcn/ui, jest(백엔드)/vitest(프론트)

**Spec:** `docs/superpowers/specs/2026-07-23-aircpm-device-limit-design.md`

**두 저장소:**
- 백엔드: `D:\Work\AI_Projects\RunFlower\src\run_flower_backend_final_repo` — 피처 브랜치는 **`deploy/monitoring-appversion`(fdb6676)에서 분기** (master에는 마이그 079가 아직 없음)
- 프론트: `D:\Work\AI_Projects\RunFlower\src\Flower_Frontend_Web` (master)

**빌드/테스트 환경 (CRITICAL):**
- 백엔드 단위 테스트·타입체크는 로컬 가능: `cd apps/api && npx jest <path>` / `npx tsc --noEmit -p tsconfig.json`. 실제 빌드·실행은 테스트 서버 Docker.
- 프론트 vitest·lint는 로컬 가능. 실제 화면 확인은 테스트 서버 배포 후.
- 커밋은 **명시된 파일만 `git add`** (`git add -A` 금지 — 프론트 작업트리에 다른 세션의 미커밋 변경이 있음).

**File Structure:**

| 저장소 | 파일 | 역할 |
|---|---|---|
| 백엔드 | Create `migrations/080_aircpm_desktop_device_limit_cleanup.sql` (+`_rollback.sql`) | 기존 초과분 자동 정리 |
| 백엔드 | Modify `apps/api/src/aircpm/security/aircpm_auth.service.ts` | approveCert 한도 차단 + 상수 export |
| 백엔드 | Modify `apps/api/src/aircpm/security/aircpm_auth.service.spec.ts` | 한도 테스트 추가 |
| 백엔드 | Create `apps/api/src/aircpm/admin/aircpm_device_summary.service.ts` | 계정별 집계 쿼리 전담 |
| 백엔드 | Create `apps/api/src/aircpm/admin/aircpm_device_summary.service.spec.ts` | 집계 서비스 테스트 |
| 백엔드 | Create `apps/api/src/aircpm/admin/admin_aircpm_device_summary.controller.ts` | GET /admin/aircpm/devices/summary |
| 백엔드 | Create `apps/api/src/aircpm/admin/dto/admin-aircpm-device-summary.dto.ts` | 쿼리/응답 DTO |
| 백엔드 | Modify `apps/api/src/aircpm/aircpm.module.ts` | 서비스/컨트롤러 등록 |
| 프론트 | Modify `src/lib/api/aircpm.ts` | summary 타입 + API 함수 |
| 프론트 | Create `src/components/aircpm/account-device-summary.tsx` | 계정별 탭 컴포넌트 |
| 프론트 | Modify `src/app/aircpm/certs/page.tsx` | 탭 추가 + extractErrorInfo 수정 + 에러 매핑 |
| 프론트 | Create `src/__tests__/aircpm/device-summary-api.test.ts` | API 함수 테스트 |
| 프론트 | Create `src/__tests__/aircpm/account-summary-tab.test.tsx` | 컴포넌트 테스트 |
| 프론트 | Modify `src/__tests__/aircpm/devices-page.test.tsx` | 탭 전환·에러코드 매핑 테스트 |

---

## Chunk 1: 백엔드

### Task 1: 피처 브랜치 + 마이그레이션 080

**Files:**
- Create: `migrations/080_aircpm_desktop_device_limit_cleanup.sql`
- Create: `migrations/080_aircpm_desktop_device_limit_cleanup_rollback.sql`

- [ ] **Step 1: 피처 브랜치 생성**

```bash
cd D:/Work/AI_Projects/RunFlower/src/run_flower_backend_final_repo
git checkout deploy/monitoring-appversion
git checkout -b feat/aircpm-device-limit
```

- [ ] **Step 2: 마이그레이션 SQL 작성**

`migrations/080_aircpm_desktop_device_limit_cleanup.sql`:

```sql
-- Migration: 080_aircpm_desktop_device_limit_cleanup.sql
-- Description: 일반 사용자(power=5) 데스크톱 기기 한도(2대) 도입에 따른 기존 초과분 정리.
--              계정별 approved cert 를 최근 활동(성공 로그인 MAX(attempted_at) → decided_at → requested_at)
--              순으로 상위 2대만 남기고 나머지를 rejected 처리한 뒤, 해제된 cert 의 refresh 토큰을
--              (user, serial) 매칭으로 정밀 폐기한다. is_mobile 여부와 무관하게 power=5 전체 적용.
-- 주의: 유지 cert 와 해제 cert 의 serial 이 같은 경우(동일 기기 복수 행) 유지 기기의 세션도 함께
--       끊긴다 — 재로그인으로 해소되므로 허용한다.
-- Requires: MariaDB >= 10.2 (윈도우 함수). UPDATE 에서 직접 못 쓰므로 파생 테이블로 JOIN.
-- 재실행 안전: 1) 은 status='approved' 만 순위 대상이라 이미 해제된 행이 다시 잡히지 않고,
--             2) 는 revoked_at IS NULL 로 걸러 중복 폐기하지 않는다. 중단 후 재실행해도 안전.
-- Date: 2026-07-23

-- 1) 계정별 3번째 이후 approved cert → rejected
UPDATE aircpm_device_cert c
JOIN (
  SELECT id FROM (
    SELECT c2.id,
           ROW_NUMBER() OVER (
             PARTITION BY c2.user_id
             ORDER BY COALESCE(ll.last_success, c2.decided_at, c2.requested_at) DESC, c2.id DESC
           ) AS rn
      FROM aircpm_device_cert c2
      JOIN aircpm_user u ON u.user_id = c2.user_id AND u.power = 5
      LEFT JOIN (
        SELECT user_id, serial, MAX(attempted_at) AS last_success
          FROM aircpm_login_log
         WHERE endpoint = 'login' AND result = 'success'
         GROUP BY user_id, serial
      ) ll ON ll.user_id = c2.user_id AND ll.serial = c2.serial
     WHERE c2.status = 'approved'
  ) ranked
  WHERE rn > 2
) drop_list ON drop_list.id = c.id
SET c.status = 'rejected',
    c.reject_reason = '기기 수 제한(최대 2대) 초과 자동 해제',
    c.decided_at = NOW(),
    c.decided_by = NULL;

-- 2) 해제된 cert 의 활성 refresh 토큰 폐기 (aircpm_user.id ↔ user_id 변환 후 serial 매칭)
UPDATE aircpm_refresh_tokens rt
JOIN aircpm_user u ON u.id = rt.aircpm_user_id
JOIN aircpm_device_cert c ON c.user_id = u.user_id AND c.serial = rt.serial
SET rt.revoked_at = NOW(), rt.revoke_reason = 'FORCED'
WHERE c.status = 'rejected'
  AND c.reject_reason = '기기 수 제한(최대 2대) 초과 자동 해제'
  AND rt.revoked_at IS NULL;

-- 검증(수동 실행): 초과 계정이 남아있지 않아야 한다 → 0 rows 기대
-- SELECT c.user_id, COUNT(*) AS cnt
--   FROM aircpm_device_cert c JOIN aircpm_user u ON u.user_id = c.user_id AND u.power = 5
--  WHERE c.status = 'approved' GROUP BY c.user_id HAVING cnt > 2;
```

`migrations/080_aircpm_desktop_device_limit_cleanup_rollback.sql`:

```sql
-- Rollback: 080_aircpm_desktop_device_limit_cleanup
-- 마이그레이션이 자동 해제한 cert 를 approved 로 복원한다.
-- 대상 식별: reject_reason 문구 + decided_by IS NULL.
--   rejectCert()/revokeCert() 등 사람이 거부한 행은 decided_by 에 admin id 가 반드시 남으므로,
--   decided_by IS NULL 조건이 관리자가 같은 문구로 수동 거부한 cert 를 오복원하는 것을 막는다
--   (071_aircpm_mobile_device_approval_backfill.sql 과 같은 판별 방식).
-- 주의: decided_at 에는 마이그레이션 실행 시각이 남는다(관리자 행위로 오독 금지).
--       폐기된 refresh 토큰은 복원 불가 — 해당 기기 재로그인으로 해소된다.
UPDATE aircpm_device_cert
   SET status = 'approved', reject_reason = NULL
 WHERE status = 'rejected'
   AND reject_reason = '기기 수 제한(최대 2대) 초과 자동 해제'
   AND decided_by IS NULL;
```

- [ ] **Step 3: 커밋**

```bash
git add migrations/080_aircpm_desktop_device_limit_cleanup.sql migrations/080_aircpm_desktop_device_limit_cleanup_rollback.sql
git commit -m "feat(aircpm): 마이그 080 — 데스크톱 기기 한도(2대) 기존 초과분 정리"
```

### Task 2: approveCert 한도 차단 (TDD)

**Files:**
- Modify: `apps/api/src/aircpm/security/aircpm_auth.service.ts` (approveCert ~:881, 상수 ~:134)
- Test: `apps/api/src/aircpm/security/aircpm_auth.service.spec.ts`

**컨텍스트:** 새 approveCert 는 cert 조회 시 `aircpm_user.power` 를 LEFT JOIN 으로 함께 읽어, power=5 면 트랜잭션(`pool.getConnection()`) 안에서 `SELECT ... FOR UPDATE` 카운트 후 승인한다. 기존 spec 의 `makePool()` 헬퍼에는 `getConnection` 이 없으므로 확장이 선행되어야 한다.

- [ ] **Step 1: makePool 헬퍼에 getConnection 추가 (기존 테스트에 영향 없는 추가 변경)**

`aircpm_auth.service.spec.ts` 의 `makePool()` 을 다음으로 교체:

```ts
function makePool() {
  const queue: Array<any[] | ((sql: string, params: any[]) => any[])> = [];
  const calls: Array<{ sql: string; params: any[] }> = [];
  const query = jest.fn(async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    const next = queue.shift();
    if (!next) return [[], []];
    if (typeof next === 'function') return [next(sql, params), []];
    return [next, []];
  });
  // 트랜잭션 경로(approveCert 한도 검사)가 쓰는 커넥션 — 쿼리는 pool 과 같은 큐를 공유한다.
  const conn = {
    query,
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const pool = { query, getConnection: jest.fn(async () => conn) };
  return {
    pool,
    conn,
    calls,
    enqueue(rowsOrFn: any[] | ((sql: string, params: any[]) => any[])) {
      queue.push(rowsOrFn);
    },
    enqueueInsert(id: number) {
      queue.push({ insertId: id, affectedRows: 1 } as any);
    },
    enqueueUpdate(affected = 1) {
      queue.push({ affectedRows: affected } as any);
    },
  };
}
```

주의: 기존 `const pool = { query: jest.fn(...) }` 구조에서 `query` 를 밖으로 빼는 형태 변화만 있고 동작은 동일하다. 기존의 `(pool.query as jest.Mock).mockResolvedValueOnce(...)` 사용처도 그대로 동작한다.

- [ ] **Step 2: 실패하는 테스트 작성** — **바깥 `describe('AircpmAuthService')` 블록 안**, 그 닫는 `});` 직전에 추가한다 (`jwt` 변수가 그 스코프에 선언되어 있어 파일 끝에 붙이면 컴파일 에러):

> **실행 중 반영된 변경(코드 리뷰 결과):** 잠금 대상이 `aircpm_user` 행으로 바뀌면서 트랜잭션 경로를 타는 테스트(`0대`/`1대 경계`/`2대 차단`/`rejected 재승인`/`is_mobile`)는 cert+power 조회와 approved 카운트 **사이에** 사용자 행 잠금용 `h.enqueue([{ id: 1 }])` 가 하나 더 필요하다. 또한 리뷰 지적으로 테스트 3개(cert 없음 → NotFound, 비-슈퍼 스코프 한도 적용, 트랜잭션 중 실패 시 rollback·release)가 추가됐다.

```ts
describe('approveCert 기기 한도', () => {
  const superScope = { isSuper: true, brchCd: null };
  const certRow = (over: Partial<any> = {}) => ({
    id: 10,
    status: 'pending',
    user_id: 'user01',
    power: 5,
    ...over,
  });

  it('승인 기기 0대 → 승인 성공', async () => {
    const h = makePool();
    h.enqueue([certRow()]); // cert + power 조회
    h.enqueue([]); // FOR UPDATE 카운트: 0대
    h.enqueueUpdate(1); // 승인 UPDATE
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).resolves.toEqual({ ok: true });
    expect(h.conn.commit).toHaveBeenCalled();
  });

  it('승인 기기 1대 → 2대째 승인 허용 (경계)', async () => {
    const h = makePool();
    h.enqueue([certRow()]);
    h.enqueue([{ id: 1 }]); // 승인 1대
    h.enqueueUpdate(1);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).resolves.toEqual({ ok: true });
  });

  it('승인 기기 2대 → 3대째 차단 DEVICE_LIMIT_EXCEEDED, 승인 UPDATE 미실행', async () => {
    const h = makePool();
    h.enqueue([certRow()]);
    h.enqueue([{ id: 1 }, { id: 2 }]); // 이미 2대
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).rejects.toMatchObject({
      response: { code: 'DEVICE_LIMIT_EXCEEDED' },
    });
    expect(h.conn.rollback).toHaveBeenCalled();
    const updates = h.calls.filter((c) => /UPDATE aircpm_device_cert/i.test(c.sql));
    expect(updates).toHaveLength(0);
  });

  it('rejected cert 재승인 — 한도 내면 허용', async () => {
    const h = makePool();
    h.enqueue([certRow({ status: 'rejected' })]);
    h.enqueue([{ id: 1 }]);
    h.enqueueUpdate(1);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).resolves.toEqual({ ok: true });
  });

  it('모바일 사용자(is_mobile=1)라도 power=5 면 데스크톱 한도 적용', async () => {
    const h = makePool();
    h.enqueue([certRow({ is_mobile: 1 })]); // 구현은 is_mobile 을 보지 않는다 — power=5 만 본다
    h.enqueue([{ id: 1 }, { id: 2 }]);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).rejects.toMatchObject({
      response: { code: 'DEVICE_LIMIT_EXCEEDED' },
    });
  });

  it.each([7, 9])('관리자 계정(power=%i) → 한도 없이 승인, 트랜잭션 미사용', async (power) => {
    const h = makePool();
    h.enqueue([certRow({ power })]);
    h.enqueueUpdate(1);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).resolves.toEqual({ ok: true });
    expect(h.pool.getConnection).not.toHaveBeenCalled();
  });

  it('고아 cert(사용자 행 없음, power=null) → 검사 생략하고 승인', async () => {
    const h = makePool();
    h.enqueue([certRow({ power: null })]);
    h.enqueueUpdate(1);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).resolves.toEqual({ ok: true });
    expect(h.pool.getConnection).not.toHaveBeenCalled();
  });

  it('이미 approved → ALREADY_APPROVED (기존 동작 유지)', async () => {
    const h = makePool();
    h.enqueue([certRow({ status: 'approved' })]);
    const svc = new AircpmAuthService(jwt, h.pool as any);

    await expect(svc.approveCert(10, 99, superScope)).rejects.toMatchObject({
      response: { code: 'ALREADY_APPROVED' },
    });
  });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts -t "approveCert 기기 한도"
```
Expected: FAIL (DEVICE_LIMIT_EXCEEDED 미구현, 쿼리 순서 불일치)

- [ ] **Step 4: 구현**

`aircpm_auth.service.ts` 수정 3곳:

(a) import 에 `ConflictException` 추가 (1행):

```ts
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
```

(b) 상수 정의(:134 `AIRCPM_USER_POWER` 근처)에 추가. summary 서비스가 재사용하므로 export:

```ts
// 일반 사용자(power=5) 계정당 데스크톱 승인 기기 한도. 승인 시점(approveCert)에 강제한다.
export const AIRCPM_DESKTOP_DEVICE_LIMIT = 2;
```

(c) `approveCert` (:881-899) 를 다음으로 교체 + private 헬퍼 추가:

```ts
  async approveCert(id: number, adminId: number, scope: CallerScope) {
    await this.assertCanManageCert(scope, id);
    const [rows] = await this.pool.query<any[]>(
      `SELECT c.id, c.status, c.user_id, u.power
         FROM aircpm_device_cert c
         LEFT JOIN aircpm_user u ON u.user_id = c.user_id
        WHERE c.id = ? LIMIT 1`,
      [id],
    );
    const cert = rows?.[0];
    if (!cert) throw new NotFoundException('인증 요청을 찾을 수 없습니다.');
    if (cert.status === 'approved') {
      throw new UnauthorizedException({ code: 'ALREADY_APPROVED', message: '이미 승인된 요청입니다.' });
    }

    // 일반 사용자(power=5)만 기기 한도를 강제한다. 관리자(7/9)는 정책 밖이고,
    // 고아 cert(사용자 행 없음)는 power 를 알 수 없어 기존과 동일하게 승인한다.
    if (Number(cert.power) === AIRCPM_USER_POWER) {
      await this.approveCertWithinLimit(cert.id, cert.user_id, adminId);
    } else {
      await this.pool.query(
        `UPDATE aircpm_device_cert
            SET status = 'approved', decided_at = NOW(), decided_by = ?, reject_reason = NULL
          WHERE id = ?`,
        [adminId, id],
      );
    }
    return { ok: true };
  }

  // 한도 검사와 승인을 한 트랜잭션으로 묶는다.
  // 잠금 대상은 aircpm_user 행이다 — 승인 대상 cert 는 아직 pending 이라 approved 집합에
  // 포함되지 않으므로, cert 행만 잠그면 같은 사용자의 서로 다른 pending cert 를 동시에
  // 승인하는 경합을 막지 못한다(승인 0대면 잠글 행조차 없다). user_id 는 UNIQUE 라
  // 항상 한 행이 잡히고, 그 사용자의 모든 승인이 이 행에서 직렬화된다.
  private async approveCertWithinLimit(certId: number, userId: string, adminId: number) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`SELECT id FROM aircpm_user WHERE user_id = ? FOR UPDATE`, [userId]);
      const [approved] = await conn.query<any[]>(
        `SELECT id FROM aircpm_device_cert WHERE user_id = ? AND status = 'approved'`,
        [userId],
      );
      if ((approved?.length ?? 0) >= AIRCPM_DESKTOP_DEVICE_LIMIT) {
        throw new ConflictException({
          code: 'DEVICE_LIMIT_EXCEEDED',
          message: '기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.',
        });
      }
      await conn.query(
        `UPDATE aircpm_device_cert
            SET status = 'approved', decided_at = NOW(), decided_by = ?, reject_reason = NULL
          WHERE id = ?`,
        [adminId, certId],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
```

- [ ] **Step 5: 테스트 실행 — 전체 통과 확인 (기존 테스트 포함)**

```bash
cd apps/api && npx jest src/aircpm/security/aircpm_auth.service.spec.ts
```
Expected: PASS, 0 failures (기존 테스트 전부 + 신규 9개)

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/aircpm/security/aircpm_auth.service.ts apps/api/src/aircpm/security/aircpm_auth.service.spec.ts
git commit -m "feat(aircpm): 데스크톱 기기 승인 한도(계정당 2대) — 승인 시점 트랜잭션 차단"
```

### Task 3: 계정별 집계 서비스 (TDD)

**Files:**
- Create: `apps/api/src/aircpm/admin/aircpm_device_summary.service.ts`
- Test: `apps/api/src/aircpm/admin/aircpm_device_summary.service.spec.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`aircpm_device_summary.service.spec.ts`:

```ts
import { AircpmDeviceSummaryService } from './aircpm_device_summary.service';

function makePool() {
  const queue: any[][] = [];
  const calls: Array<{ sql: string; params: any[] }> = [];
  const pool = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return [queue.shift() ?? [], []];
    }),
  };
  return { pool, calls, enqueue: (rows: any[]) => queue.push(rows) };
}

const ROW = {
  user_id: 'user01',
  name: '홍길동',
  brch_cd: 'S001',
  is_mobile: 0,
  is_active: 1,
  desktop_approved: 3,
  desktop_pending: 1,
  mobile_bound: 0,
  mobile_pending: 0,
  over_limit: 1,
};

describe('AircpmDeviceSummaryService.summary', () => {
  it('슈퍼: power=5 전체 집계, camelCase 매핑', async () => {
    const h = makePool();
    h.enqueue([ROW]);
    h.enqueue([{ c: 1 }]);
    const svc = new AircpmDeviceSummaryService(h.pool as any);

    const res = await svc.summary({ scope: { isSuper: true, brchCd: null } });
    expect(res.total).toBe(1);
    expect(res.items[0]).toEqual({
      userId: 'user01',
      name: '홍길동',
      brchCd: 'S001',
      isMobile: false,
      isActive: true,
      desktopApproved: 3,
      desktopPending: 1,
      mobileBound: 0,
      mobilePending: 0,
      overLimit: true,
    });
    // 대상은 일반 사용자(power=5)만
    expect(h.calls[0].sql).toContain('u.power = ?');
    expect(h.calls[0].params).toContain(5);
    // 초과 계정 우선 정렬
    expect(h.calls[0].sql).toMatch(/ORDER BY over_limit DESC/);
  });

  it('지사 관리자: 자기 brch_cd 필터 강제', async () => {
    const h = makePool();
    h.enqueue([]);
    h.enqueue([{ c: 0 }]);
    const svc = new AircpmDeviceSummaryService(h.pool as any);

    await svc.summary({ scope: { isSuper: false, brchCd: 'S001' } });
    expect(h.calls[0].sql).toContain('u.brch_cd = ?');
    expect(h.calls[0].params).toContain('S001');
  });

  it('brchCd 없는 지사 관리자 → 빈 결과, 쿼리 미실행', async () => {
    const h = makePool();
    const svc = new AircpmDeviceSummaryService(h.pool as any);

    const res = await svc.summary({ scope: { isSuper: false, brchCd: null } });
    expect(res).toEqual({ items: [], total: 0, page: 1, limit: 50 });
    expect(h.pool.query).not.toHaveBeenCalled();
  });

  it('overLimitOnly=true → 초과 조건이 WHERE 에 추가', async () => {
    const h = makePool();
    h.enqueue([]);
    h.enqueue([{ c: 0 }]);
    const svc = new AircpmDeviceSummaryService(h.pool as any);

    await svc.summary({ overLimitOnly: true, scope: { isSuper: true, brchCd: null } });
    const withoutFilter = h.calls[0].sql;
    expect(withoutFilter.match(/COALESCE\(dc\.approved_cnt,0\) > 2/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('q 검색 — user_id/name/brch_cd LIKE', async () => {
    const h = makePool();
    h.enqueue([]);
    h.enqueue([{ c: 0 }]);
    const svc = new AircpmDeviceSummaryService(h.pool as any);

    await svc.summary({ q: 'hong', scope: { isSuper: true, brchCd: null } });
    expect(h.calls[0].sql).toContain('u.user_id LIKE ?');
    expect(h.calls[0].params).toContain('%hong%');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd apps/api && npx jest src/aircpm/admin/aircpm_device_summary.service.spec.ts
```
Expected: FAIL — "Cannot find module './aircpm_device_summary.service'"

- [ ] **Step 3: 구현**

`aircpm_device_summary.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { DATABASE_POOL } from '../../infra/database';
import type { CallerScope } from '../security/aircpm_auth.service';
import { AIRCPM_DESKTOP_DEVICE_LIMIT } from '../security/aircpm_auth.service';

// 집계 대상은 일반 사용자(power=5)만 — 관리자(7/9)는 기기 한도 정책 밖이다.
const AIRCPM_USER_POWER = 5;
// 모바일 1인 1기기는 approveMobileDevice 가 강제하지만, DB 직접 수정 등으로
// 깨진 데이터를 화면에서 잡아내도록 초과 판정에는 포함한다.
const AIRCPM_MOBILE_DEVICE_LIMIT = 1;

// 상수만 들어가는 초과 판정식 — 사용자 입력이 섞이지 않으므로 문자열 조립이 안전하다.
const OVER_LIMIT_EXPR = `(COALESCE(dc.approved_cnt,0) > ${AIRCPM_DESKTOP_DEVICE_LIMIT}
     OR (u.is_mobile = 1 AND COALESCE(md.bound_cnt,0) > ${AIRCPM_MOBILE_DEVICE_LIMIT}))`;

const BASE_FROM = `
  FROM aircpm_user u
  LEFT JOIN (
    SELECT user_id,
           SUM(status = 'approved') AS approved_cnt,
           SUM(status = 'pending')  AS pending_cnt
      FROM aircpm_device_cert
     GROUP BY user_id
  ) dc ON dc.user_id = u.user_id
  LEFT JOIN (
    SELECT user_id,
           SUM(status = 'bound')   AS bound_cnt,
           SUM(status = 'pending') AS pending_cnt
      FROM aircpm_mobile_device
     GROUP BY user_id
  ) md ON md.user_id = u.user_id`;

export interface DeviceSummaryOpts {
  q?: string;
  brchCd?: string;
  overLimitOnly?: boolean;
  page?: number;
  limit?: number;
  scope: CallerScope;
}

@Injectable()
export class AircpmDeviceSummaryService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: mysql.Pool) {}

  async summary(opts: DeviceSummaryOpts) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    const params: any[] = [AIRCPM_USER_POWER];
    let where = 'WHERE u.power = ?';
    // 지사 관리자는 자기 지사만. brchCd 없으면 빈 결과 (listUsers 와 동일 규칙).
    if (!opts.scope.isSuper) {
      if (!opts.scope.brchCd) {
        return { items: [], total: 0, page, limit };
      }
      where += ' AND u.brch_cd = ?';
      params.push(opts.scope.brchCd);
    } else if (opts.brchCd) {
      where += ' AND u.brch_cd = ?';
      params.push(opts.brchCd);
    }
    if (opts.q) {
      where += ' AND (u.user_id LIKE ? OR u.name LIKE ? OR u.brch_cd LIKE ?)';
      params.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
    }
    if (opts.overLimitOnly) {
      where += ` AND ${OVER_LIMIT_EXPR}`;
    }

    const [rows] = await this.pool.query<any[]>(
      `SELECT u.user_id, u.name, u.brch_cd, u.is_mobile, u.is_active,
              COALESCE(dc.approved_cnt, 0) AS desktop_approved,
              COALESCE(dc.pending_cnt, 0)  AS desktop_pending,
              COALESCE(md.bound_cnt, 0)    AS mobile_bound,
              COALESCE(md.pending_cnt, 0)  AS mobile_pending,
              ${OVER_LIMIT_EXPR} AS over_limit
         ${BASE_FROM}
         ${where}
         ORDER BY over_limit DESC,
                  (COALESCE(dc.approved_cnt,0) + COALESCE(md.bound_cnt,0)) DESC,
                  u.user_id
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [countRows] = await this.pool.query<any[]>(
      `SELECT COUNT(*) AS c ${BASE_FROM} ${where}`,
      params,
    );

    return {
      items: (rows ?? []).map((r) => ({
        userId: r.user_id,
        name: r.name ?? null,
        brchCd: r.brch_cd ?? null,
        isMobile: !!r.is_mobile,
        isActive: !!r.is_active,
        desktopApproved: Number(r.desktop_approved),
        desktopPending: Number(r.desktop_pending),
        mobileBound: Number(r.mobile_bound),
        mobilePending: Number(r.mobile_pending),
        overLimit: !!r.over_limit,
      })),
      total: Number(countRows?.[0]?.c ?? 0),
      page,
      limit,
    };
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd apps/api && npx jest src/aircpm/admin/aircpm_device_summary.service.spec.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/aircpm/admin/aircpm_device_summary.service.ts apps/api/src/aircpm/admin/aircpm_device_summary.service.spec.ts
git commit -m "feat(aircpm): 계정별 기기 현황 집계 서비스"
```

### Task 4: 컨트롤러 + DTO + 모듈 등록

**Files:**
- Create: `apps/api/src/aircpm/admin/dto/admin-aircpm-device-summary.dto.ts`
- Create: `apps/api/src/aircpm/admin/admin_aircpm_device_summary.controller.ts`
- Modify: `apps/api/src/aircpm/aircpm.module.ts`

- [ ] **Step 1: DTO 작성** (NestJS whitelist 가 미선언 필드를 제거하므로 쿼리 파라미터 전부 선언)

`admin-aircpm-device-summary.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminDeviceSummaryQueryDto {
  @ApiPropertyOptional({ description: 'userId/name/brchCd 부분검색' })
  @IsOptional() @IsString() @MaxLength(64)
  q?: string;

  @ApiPropertyOptional({ description: '슈퍼 전용 지사 필터' })
  @IsOptional() @IsString() @MaxLength(32)
  brchCd?: string;

  // Type(() => Boolean) 은 'false' 문자열도 true 로 바꾸는 함정이 있어 문자열로 받는다.
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional() @IsIn(['true', 'false'])
  overLimitOnly?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;
}

export class AdminDeviceSummaryItemDto {
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) name: string | null;
  @ApiPropertyOptional({ nullable: true }) brchCd: string | null;
  @ApiProperty() isMobile: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() desktopApproved: number;
  @ApiProperty() desktopPending: number;
  @ApiProperty() mobileBound: number;
  @ApiProperty() mobilePending: number;
  @ApiProperty() overLimit: boolean;
}

export class AdminDeviceSummaryResponseDto {
  @ApiProperty({ type: [AdminDeviceSummaryItemDto] }) items: AdminDeviceSummaryItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
```

- [ ] **Step 2: 컨트롤러 작성** (`admin_aircpm_cert.controller.ts` 의 가드/역할 패턴 복제)

`admin_aircpm_device_summary.controller.ts`:

```ts
import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AircpmSiteGuard } from '../security/aircpm_site.guard';
import { callerScopeFromReq } from '../security/aircpm_scope';
import { AircpmDeviceSummaryService } from './aircpm_device_summary.service';
import {
  AdminDeviceSummaryQueryDto,
  AdminDeviceSummaryResponseDto,
} from './dto/admin-aircpm-device-summary.dto';

const ALLOWED_ROLES = new Set(['AIRCPM_SUPER_ADMIN', 'AIRCPM_BRANCH_ADMIN', 'AIRCPM_ADMIN']);

function ensureAdminRole(req: any) {
  const role = req.user?.role;
  if (!ALLOWED_ROLES.has(role)) {
    throw new ForbiddenException('권한이 없습니다.');
  }
}

@ApiTags('AirCPM - Admin Device Summary')
@ApiBearerAuth()
@Controller('admin/aircpm/devices')
@UseGuards(AircpmSiteGuard)
export class AdminAircpmDeviceSummaryController {
  constructor(private readonly svc: AircpmDeviceSummaryService) {}

  @Get('summary')
  @ApiOperation({ summary: '계정별 기기 현황 (일반 사용자 power=5 대상)' })
  @ApiResponse({ status: 200, type: AdminDeviceSummaryResponseDto })
  async summary(
    @Req() req: any,
    @Query() q: AdminDeviceSummaryQueryDto,
  ): Promise<AdminDeviceSummaryResponseDto> {
    ensureAdminRole(req);
    return this.svc.summary({
      q: q.q,
      brchCd: q.brchCd,
      overLimitOnly: q.overLimitOnly === 'true',
      page: q.page,
      limit: q.limit,
      scope: callerScopeFromReq(req),
    });
  }
}
```

- [ ] **Step 3: 모듈 등록** — `aircpm.module.ts`:

- import 2줄 추가:
```ts
import { AdminAircpmDeviceSummaryController } from './admin/admin_aircpm_device_summary.controller';
import { AircpmDeviceSummaryService } from './admin/aircpm_device_summary.service';
```
- `controllers` 배열의 `AdminAircpmCertController` 다음에 `AdminAircpmDeviceSummaryController` 추가
- `providers` 배열의 `AircpmAuthService` 다음에 `AircpmDeviceSummaryService` 추가

- [ ] **Step 4: 타입체크 + 전체 aircpm 테스트**

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json && npx jest src/aircpm
```
Expected: tsc 에러 0, jest 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/aircpm/admin/dto/admin-aircpm-device-summary.dto.ts apps/api/src/aircpm/admin/admin_aircpm_device_summary.controller.ts apps/api/src/aircpm/aircpm.module.ts
git commit -m "feat(aircpm): GET /admin/aircpm/devices/summary 컨트롤러·DTO·모듈 등록"
```

---

## Chunk 2: 프론트엔드

**선행 확인:** 이전 세션의 미커밋 변경(branches/login-logs 페이지, aircpm.ts 등)은 SessionStart auto-commit 훅이 `a06acce` 로 이미 커밋했다. `git status --short` 로 작업트리가 깨끗한지만 확인하고 시작한다. 만약 새 미커밋 변경이 남아 있으면 해당 파일만 명시해 `wip:` 커밋으로 보존한 뒤 진행한다 (`git add -A` 금지).

### Task 5: API 클라이언트 (TDD)

**Files:**
- Modify: `src/lib/api/aircpm.ts`
- Test: Create `src/__tests__/aircpm/device-summary-api.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`device-summary-api.test.ts` (기존 `calls-api.test.ts` 패턴):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api/client';
import { listAircpmDeviceSummary } from '@/lib/api/aircpm';

vi.mock('@/lib/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
const mockApi = api as ReturnType<typeof vi.fn>;

describe('listAircpmDeviceSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기본: page/limit 만 — GET /admin/aircpm/devices/summary', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmDeviceSummary();
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('/admin/aircpm/devices/summary?');
    expect(url).toContain('page=1');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('q=');
    expect(url).not.toContain('overLimitOnly');
    expect(url).not.toContain('brchCd');
  });

  it('전체 파라미터 조립', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 2, limit: 20 });
    await listAircpmDeviceSummary({ q: 'hong', overLimitOnly: true, page: 2, limit: 20 });
    const url = mockApi.mock.calls[0][0] as string;
    expect(url).toContain('q=hong');
    expect(url).toContain('overLimitOnly=true');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=20');
  });

  it('overLimitOnly=false 는 파라미터 미전송', async () => {
    mockApi.mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 50 });
    await listAircpmDeviceSummary({ overLimitOnly: false });
    expect(mockApi.mock.calls[0][0]).not.toContain('overLimitOnly');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/aircpm/device-summary-api.test.ts
```
Expected: FAIL — listAircpmDeviceSummary is not exported

- [ ] **Step 3: 구현** — `src/lib/api/aircpm.ts` 의 `// ─── Mobile devices ───` 섹션 뒤에 추가:

```ts
// ─── 계정별 기기 현황 ──────────────────────────────────────────────

export interface AircpmDeviceSummaryItem {
  userId: string;
  name: string | null;
  brchCd: string | null;
  isMobile: boolean;
  isActive: boolean;
  desktopApproved: number;
  desktopPending: number;
  mobileBound: number;
  mobilePending: number;
  overLimit: boolean;
}

export interface AircpmDeviceSummaryResponse {
  items: AircpmDeviceSummaryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListDeviceSummaryParams {
  q?: string;
  overLimitOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function listAircpmDeviceSummary(params: ListDeviceSummaryParams = {}) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 50));
  if (params.q) sp.set('q', params.q);
  if (params.overLimitOnly) sp.set('overLimitOnly', 'true');
  return api<AircpmDeviceSummaryResponse>(`/admin/aircpm/devices/summary?${sp.toString()}`);
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/__tests__/aircpm/device-summary-api.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/aircpm.ts src/__tests__/aircpm/device-summary-api.test.ts
git commit -m "feat(aircpm): 계정별 기기 현황 API 클라이언트"
```

### Task 6: 계정별 탭 컴포넌트 (TDD)

**Files:**
- Create: `src/components/aircpm/account-device-summary.tsx`
- Test: Create `src/__tests__/aircpm/account-summary-tab.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`account-summary-tab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api/aircpm', () => ({
  listAircpmDeviceSummary: vi.fn(),
}));

import { AccountDeviceSummary } from '@/components/aircpm/account-device-summary';
import { listAircpmDeviceSummary } from '@/lib/api/aircpm';

const mockList = listAircpmDeviceSummary as ReturnType<typeof vi.fn>;

const DESKTOP_OVER = {
  userId: 'cpm07',
  name: '김철수',
  brchCd: 'm8282_1',
  isMobile: false,
  isActive: true,
  desktopApproved: 3,
  desktopPending: 1,
  mobileBound: 0,
  mobilePending: 0,
  overLimit: true,
};

const MOBILE_OK = {
  userId: 'mob01',
  name: '홍길동',
  brchCd: 'demo',
  isMobile: true,
  isActive: true,
  desktopApproved: 0,
  desktopPending: 0,
  mobileBound: 1,
  mobilePending: 0,
  overLimit: false,
};

function renderTab(onShowDevices = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AccountDeviceSummary onShowDevices={onShowDevices} />
    </QueryClientProvider>,
  );
  return onShowDevices;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ items: [DESKTOP_OVER, MOBILE_OK], total: 2, page: 1, limit: 50 });
});

describe('AccountDeviceSummary', () => {
  it('계정 행 렌더 — 데스크톱 n/2, 모바일 n/1 표기', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('3/2')).toBeInTheDocument();  // 초과
    expect(screen.getByText('1/1')).toBeInTheDocument();  // 모바일 정상
    expect(screen.getByText('mob01')).toBeInTheDocument();
  });

  it('초과 계정에 한도 초과 배지 표시', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('한도 초과')).toBeInTheDocument();
  });

  it('초과만 보기 토글 → overLimitOnly=true 로 재조회', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '초과만 보기' }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ overLimitOnly: true })),
    );
  });

  it('기기 보기 클릭 → onShowDevices(userId)', async () => {
    const cb = renderTab();
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    const row = screen.getByText('cpm07').closest('tr')!;
    const btn = Array.from(row.querySelectorAll('button')).find((b) => b.textContent === '기기 보기')!;
    fireEvent.click(btn);
    expect(cb).toHaveBeenCalledWith('cpm07');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/aircpm/account-summary-tab.test.tsx
```
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/components/aircpm/account-device-summary.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAircpmDeviceSummary, type AircpmDeviceSummaryItem } from '@/lib/api/aircpm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 50;
// 표시용 한도 — 실제 강제는 백엔드(approveCert / approveMobileDevice)가 한다.
const DESKTOP_LIMIT = 2;
const MOBILE_LIMIT = 1;

function countBadge(count: number, limit: number, label: string) {
  const over = count > limit;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={
          over
            ? 'font-mono text-sm font-bold text-red-600'
            : 'font-mono text-sm text-slate-700'
        }
      >
        {count}/{limit}
      </span>
    </span>
  );
}

interface Props {
  /** 기기별 탭으로 전환하며 해당 userId 로 검색을 적용한다. */
  onShowDevices: (userId: string) => void;
}

export function AccountDeviceSummary({ onShowDevices }: Props) {
  const [q, setQ] = useState('');
  const [qActive, setQActive] = useState('');
  const [overLimitOnly, setOverLimitOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-aircpm-device-summary', qActive, overLimitOnly, page],
    queryFn: () =>
      listAircpmDeviceSummary({
        q: qActive || undefined,
        overLimitOnly: overLimitOnly || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    refetchInterval: 15000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setQActive(q.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">계정 검색 (ID/이름/지사)</label>
            <div className="flex gap-2">
              <Input
                placeholder="userId / 이름 / 지사코드"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="default" size="sm" onClick={handleSearch}>
                검색
              </Button>
            </div>
          </div>
          <Button
            variant={overLimitOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setOverLimitOnly((v) => !v);
              setPage(1);
            }}
          >
            초과만 보기
          </Button>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-12 text-slate-500">로딩 중...</div>}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">표시할 계정이 없습니다.</div>
      )}

      {items.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">계정</th>
                  <th className="px-4 py-2.5 font-medium">지사</th>
                  <th className="px-4 py-2.5 font-medium">승인 기기</th>
                  <th className="px-4 py-2.5 font-medium">대기</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((it: AircpmDeviceSummaryItem) => (
                  <tr key={it.userId} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{it.userId}</span>
                        {it.name && <span className="text-slate-500">({it.name})</span>}
                        {it.isMobile ? (
                          <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700">
                            📱 모바일
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-700">
                            💻 데스크톱
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{it.brchCd ?? '-'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {(it.desktopApproved > 0 || !it.isMobile) &&
                          countBadge(it.desktopApproved, DESKTOP_LIMIT, '💻')}
                        {it.isMobile && countBadge(it.mobileBound, MOBILE_LIMIT, '📱')}
                        {it.overLimit && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                            한도 초과
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {it.desktopPending + it.mobilePending > 0
                        ? `${it.desktopPending + it.mobilePending}건`
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {it.isActive ? (
                        <span className="text-emerald-600 text-xs">활성</span>
                      ) : (
                        <span className="text-slate-400 text-xs">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => onShowDevices(it.userId)}>
                        기기 보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-slate-500">
            총 {total}건 · {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/__tests__/aircpm/account-summary-tab.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/aircpm/account-device-summary.tsx src/__tests__/aircpm/account-summary-tab.test.tsx
git commit -m "feat(aircpm): 계정별 기기 현황 탭 컴포넌트"
```

### Task 7: certs 페이지 통합 — 탭 + extractErrorInfo 수정 (TDD)

**Files:**
- Modify: `src/app/aircpm/certs/page.tsx`
- Test: Modify `src/__tests__/aircpm/devices-page.test.tsx`

- [ ] **Step 1: 실패하는 테스트 추가** — `devices-page.test.tsx`:

(a) 파일 상단 `vi.mock('@/lib/api/aircpm', ...)` 팩토리에 한 줄 추가 (페이지가 새 컴포넌트를 import 하므로 필수):

```ts
  listAircpmDeviceSummary: vi.fn(),
```

(b) import 목록에 `listAircpmDeviceSummary` 추가 후 파일 끝에 describe 추가:

```tsx
describe('계정별 탭 & 에러코드 매핑', () => {
  it('계정별 탭 클릭 → 계정 현황 조회·렌더', async () => {
    (listAircpmDeviceSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          userId: 'cpm07', name: '김철수', brchCd: 'm8282_1',
          isMobile: false, isActive: true,
          desktopApproved: 3, desktopPending: 0, mobileBound: 0, mobilePending: 0,
          overLimit: true,
        },
      ],
      total: 1, page: 1, limit: 50,
    });
    mockListCerts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 200 });
    mockListMobiles.mockResolvedValue({ items: [] });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '계정별' }));
    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    expect(screen.getByText('한도 초과')).toBeInTheDocument();
  });

  it('승인 실패 DEVICE_LIMIT_EXCEEDED(ApiError.data.code) → 한도 초과 토스트', async () => {
    mockListCerts.mockResolvedValue({ items: [CERT], total: 1, page: 1, limit: 200 });
    mockListMobiles.mockResolvedValue({ items: [] });
    // 에러 message 를 매핑 문구와 다르게 둔다 — 같으면 fallback toast.error(message) 가
    // 우연히 통과해 code 추출 경로를 전혀 검증하지 못한다(가짜 GREEN).
    const err = Object.assign(new Error('Conflict'), {
      status: 409,
      data: { code: 'DEVICE_LIMIT_EXCEEDED', message: 'Conflict' },
    });
    mockApproveCert.mockRejectedValue(err);
    renderPage();

    await waitFor(() => expect(screen.getByText('cpm07')).toBeInTheDocument());
    fireEvent.click(rowButton('cpm07', '승인'));
    fireEvent.click(dialogButton('승인'));
    const { toast } = await import('sonner');
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        '기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.',
      ),
    );
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/__tests__/aircpm/devices-page.test.tsx
```
Expected: FAIL — 두 테스트 모두 실패 ('계정별' 버튼 없음 / 토스트가 매핑 문구가 아닌 'Conflict' 로 호출됨)

- [ ] **Step 3: 페이지 구현** — `src/app/aircpm/certs/page.tsx` 수정 6곳:

(a) import 추가:

```tsx
import { AccountDeviceSummary } from '@/components/aircpm/account-device-summary';
```

(b) `extractErrorInfo` 교체 (44-50행) — ApiError 는 응답 본문을 `.data` 에 담으므로 code 를 거기서 꺼낸다 (기존 ALREADY_APPROVED/NOT_APPROVED 매핑의 잠복 버그도 이 수정으로 되살아난다):

```tsx
function extractErrorInfo(err: unknown): { status?: number; code?: string; message?: string } {
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; code?: string; data?: unknown };
    const dataCode =
      anyErr.data && typeof anyErr.data === 'object' && 'code' in anyErr.data
        ? String((anyErr.data as Record<string, unknown>).code)
        : undefined;
    return { status: anyErr.status, code: anyErr.code ?? dataCode, message: err.message };
  }
  return { message: String(err) };
}
```

(c) `toastForError` 에 매핑 추가 (`if (status === 403)` 줄 다음):

```tsx
  if (code === 'DEVICE_LIMIT_EXCEEDED')
    return toast.error('기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.');
```

(d) 컴포넌트에 view state + 계정별→기기별 전환 핸들러 추가 (`const [page, setPage] = useState(1);` 다음):

```tsx
  const [view, setView] = useState<'devices' | 'accounts'>('devices');

  // 계정별 탭에서 "기기 보기" — 기기별 탭으로 전환하며 그 계정의 모든 기기를 보여준다.
  const showDevicesOf = (userId: string) => {
    setView('devices');
    setKind('all');
    setStatus('all');
    setUserIdQuery(userId);
    setUserIdActive(userId);
    setPage(1);
  };
```

(e) 헤더 아래 탭 버튼 + 조건부 렌더. 헤더 `<div className="flex items-center justify-between flex-wrap gap-3">...</div>` 블록 바로 다음에 추가:

```tsx
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setView('devices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'devices'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          기기별
        </button>
        <button
          onClick={() => setView('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'accounts'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          계정별
        </button>
      </div>

      {view === 'accounts' && <AccountDeviceSummary onShowDevices={showDevicesOf} />}
```

그리고 기존 기기별 UI(필터 Card부터 페이지네이션까지, Dialog 3개는 제외)를 `{view === 'devices' && (<> ... </>)}` 로 감싼다. Dialog 는 탭과 무관하게 항상 렌더 유지(기존 상태 로직 변경 없음).

(f) 승인 Dialog 설명에 데스크톱 한도 문구 추가 — `DialogDescription` 안 모바일 안내 문구와 나란히:

```tsx
              {approveTarget?.kind === 'desktop' &&
                ' 데스크톱은 계정당 최대 2대까지 승인됩니다.'}
```

- [ ] **Step 4: 테스트 실행 — 전체 통과 확인**

```bash
npx vitest run src/__tests__/aircpm/devices-page.test.tsx src/__tests__/aircpm/account-summary-tab.test.tsx src/__tests__/aircpm/device-summary-api.test.ts
```
Expected: PASS (기존 devices-page 테스트 포함 전부)

- [ ] **Step 5: 전체 테스트 + lint**

```bash
npm test && npm run lint
```
Expected: 전체 PASS, lint 에러 0 (다른 세션 변경분의 기존 경고는 무시)

- [ ] **Step 6: 커밋**

```bash
git add src/app/aircpm/certs/page.tsx src/__tests__/aircpm/devices-page.test.tsx
git commit -m "feat(aircpm): 기기 인증 페이지 계정별 탭 + ApiError 코드 추출 수정"
```

---

## Chunk 3: 배포 & 검증

### Task 8: 테스트 서버 배포 — 백엔드

**순서 고정: 마이그 → 백엔드 → 프론트.**

- [ ] **Step 1: 백엔드 파일 SCP**

```bash
cd D:/Work/AI_Projects/RunFlower/src/run_flower_backend_final_repo
scp migrations/080_aircpm_desktop_device_limit_cleanup.sql migrations/080_aircpm_desktop_device_limit_cleanup_rollback.sql blueadm@49.247.46.86:/home/blueadm/backend/migrations/
scp apps/api/src/aircpm/security/aircpm_auth.service.ts apps/api/src/aircpm/security/aircpm_auth.service.spec.ts blueadm@49.247.46.86:/home/blueadm/backend/apps/api/src/aircpm/security/
scp apps/api/src/aircpm/admin/aircpm_device_summary.service.ts apps/api/src/aircpm/admin/aircpm_device_summary.service.spec.ts apps/api/src/aircpm/admin/admin_aircpm_device_summary.controller.ts blueadm@49.247.46.86:/home/blueadm/backend/apps/api/src/aircpm/admin/
scp apps/api/src/aircpm/admin/dto/admin-aircpm-device-summary.dto.ts blueadm@49.247.46.86:/home/blueadm/backend/apps/api/src/aircpm/admin/dto/
scp apps/api/src/aircpm/aircpm.module.ts blueadm@49.247.46.86:/home/blueadm/backend/apps/api/src/aircpm/
```

- [ ] **Step 2: 마이그레이션 실행 전 현황 백업 조회** (초과 계정 수 기록 — 실행 후 비교)

```bash
ssh blueadm@49.247.46.86 'MARIADB_CONTAINER=$(docker ps --format "{{.Names}}" | grep mariadb) && ROOT_PW=$(grep MARIADB_ROOT_PASSWORD /home/blueadm/backend/docker/.env | cut -d= -f2) && DB_NAME=$(grep MARIADB_DATABASE /home/blueadm/backend/docker/.env | cut -d= -f2) && echo "SELECT c.user_id, COUNT(*) cnt FROM aircpm_device_cert c JOIN aircpm_user u ON u.user_id=c.user_id AND u.power=5 WHERE c.status='"'"'approved'"'"' GROUP BY c.user_id HAVING cnt > 2;" | docker exec -i "$MARIADB_CONTAINER" mysql -u root -p"$ROOT_PW" "$DB_NAME"'
```
결과(초과 계정 목록)를 기록해 둔다.

- [ ] **Step 3: 마이그레이션 080 실행 + 검증**

```bash
ssh blueadm@49.247.46.86 'MARIADB_CONTAINER=$(docker ps --format "{{.Names}}" | grep mariadb) && ROOT_PW=$(grep MARIADB_ROOT_PASSWORD /home/blueadm/backend/docker/.env | cut -d= -f2) && DB_NAME=$(grep MARIADB_DATABASE /home/blueadm/backend/docker/.env | cut -d= -f2) && cat /home/blueadm/backend/migrations/080_aircpm_desktop_device_limit_cleanup.sql | docker exec -i "$MARIADB_CONTAINER" mysql -u root -p"$ROOT_PW" "$DB_NAME"'
```
직후 Step 2 의 검증 쿼리 재실행 → **0 rows** 확인.

- [ ] **Step 4: 컨테이너 빌드 + 재시작 + 기동 확인** (생략 시 반영 안 됨 — CRITICAL)

```bash
ssh blueadm@49.247.46.86 'docker exec runflower-api npm run build'
ssh blueadm@49.247.46.86 'docker restart runflower-api'
ssh blueadm@49.247.46.86 'sleep 20 && docker logs runflower-api --tail 5'
ssh blueadm@49.247.46.86 'docker exec runflower-api grep -c "devices/summary\|DEVICE_LIMIT_EXCEEDED" /app/dist/src/aircpm/admin/admin_aircpm_device_summary.controller.js /app/dist/src/aircpm/security/aircpm_auth.service.js'
```
Expected: 로그 정상 기동, grep 각 파일에서 1 이상

- [ ] **Step 5: 컨테이너 jest + 라우트 스모크**

```bash
ssh blueadm@49.247.46.86 'docker exec runflower-api npx jest src/aircpm/security/aircpm_auth.service.spec.ts src/aircpm/admin/aircpm_device_summary.service.spec.ts --silent'
ssh blueadm@49.247.46.86 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/admin/aircpm/devices/summary'
```
Expected: jest 전체 PASS / curl **401** (404 면 라우트 미등록 — 모듈 등록·빌드 재확인)

- [ ] **Step 6: 백엔드 커밋 푸시** (git 저장소 원칙 — SCP만으로는 미완료)

```bash
cd D:/Work/AI_Projects/RunFlower/src/run_flower_backend_final_repo
git push -u origin feat/aircpm-device-limit
```

### Task 9: 테스트 서버 배포 — 프론트 + e2e 확인

- [ ] **Step 1: 프론트 배포**

```bash
cd D:/Work/AI_Projects/RunFlower/src/Flower_Frontend_Web
bash deploy/deploy-zerodt.sh test
```
Expected: 헬스체크 통과 (실패 시 자동 롤백됨)

- [ ] **Step 2: 화면 확인 체크리스트** (테스트 서버 http://49.247.46.86:3030/aircpm/certs — 사용자 또는 브라우저 자동화로 확인)

- [ ] 기기별/계정별 탭 전환 동작
- [ ] 계정별 탭: 계정 목록·기기 수(`n/2`, `n/1`)·초과 배지 표시
- [ ] 초과만 보기 필터 동작
- [ ] 기기 보기 → 기기별 탭 + 해당 userId 필터 적용
- [ ] 승인 기기 2대인 계정의 3번째 기기 승인 시도 → "기기 수 제한(최대 2대)" 토스트 (테스트 데이터 필요 시 pending cert 를 임시 생성)
- [ ] 기존 기능 회귀 없음: 기기별 탭 승인/거부/해제 다이얼로그 정상

- [ ] **Step 3: 결과 보고 후 사용자 승인 대기**

**여기서 STOP — 운영 배포는 사용자 확인 후 별도 진행:**
1. 운영 마이그 080 (초과 계정 사전 조회 → 실행 → 0 rows 검증)
2. 운영 백엔드: `feat/aircpm-device-limit` → master 병합/cherry-pick 후 운영 절차
3. 운영 프론트: `bash deploy/deploy-zerodt.sh prod`
