# AirCPM 계정별 기기 제한 & 현황 설계

날짜: 2026-07-23
상태: 사용자 승인 (설계 방향 확정)

## 배경 / 문제

- 데스크톱 기기 인증(`aircpm_device_cert`)은 (userId, serial, MAC) 단위 건별 승인만 있고 **계정당 승인 기기 수 제한이 없다.** 한 계정으로 기기 여러 대를 승인받아 공유 사용이 가능하다.
- 관리자 사이트에는 기기 건별 목록(`/aircpm/certs`)만 있어 **어느 계정이 몇 대를 쓰는지 모아 볼 방법이 없다.**
- 모바일(`aircpm_mobile_device`)은 1인 1기기가 이미 승인 시점에 강제된다(승인 시 같은 유저의 다른 bound 기기 자동 폐기 + refresh 전체 폐기, 2026-07-08 운영 배포). 모바일은 현황 표시만 추가한다.

## 정책 (확정)

| 계정 유형 | 제한 | 강제 방식 |
|---|---|---|
| 일반 사용자 (power=5) | 데스크톱 최대 **2기기** | 승인 시점 차단 (신규) |
| 모바일 사용자 (power=5, is_mobile=1) | 모바일 **1기기** (+ 데스크톱 cert를 보유한 경우 그것도 2기기 제한) | 모바일은 기존 강제 유지, 데스크톱은 신규 차단 |
| 관리자 (power=7/9) | 제한 없음 | 요구사항 범위가 "일반 사용자"이므로 제외 |

- **데스크톱 2기기 제한은 is_mobile 여부와 무관하게 power=5 전체에 적용한다.** 데스크톱 로그인/인증 요청은 is_mobile을 검사하지 않으므로 모바일 사용자도 데스크톱 cert를 가질 수 있다 — 정책·승인 차단·summary·마이그레이션 네 곳 모두 이 규칙으로 통일.

- "기기 1대" = `aircpm_device_cert`의 approved 행 1개. (동일 물리 기기는 user_id+serial+MAC 교집합 매칭으로 기존 행을 재사용하므로 행 수 ≒ 기기 수)
- 인증 요청(pending) 접수는 제한하지 않는다 — 3번째 기기 요청은 접수되고, 관리자가 기존 기기를 '승인 해제'한 뒤 승인하는 흐름.
- 기존 초과분(3대 이상 승인)은 **마이그레이션으로 자동 정리** (사용자 결정).

## 1. 백엔드 (run_flower_backend_final_repo)

### 1-1. 승인 시점 차단 — `AircpmAuthService.approveCert()` 수정

- 승인 전에 대상 cert의 user를 조회해 **power=5인 경우에만**(is_mobile 무관) 같은 user_id의 `approved` cert 수를 센다.
- 이미 2개면 `ConflictException(409)` `{ code: 'DEVICE_LIMIT_EXCEEDED', message: '기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.' }` — 409는 클라이언트의 401 자동 refresh 경로를 타지 않으므로 안전.
- 동시 승인 경합 방지: 트랜잭션 안에서 **`aircpm_user` 행을 `SELECT ... FOR UPDATE` 로 잠근 뒤** approved cert 를 카운트 → 승인 UPDATE → 커밋 (모듈 내 기존 트랜잭션 패턴 재사용 — 예: `aircpm_config.service.ts:82-115`).
  - **cert 행을 잠그면 안 되는 이유**: 승인 대상 cert 는 아직 pending 이라 `status='approved'` 잠금 집합에 포함되지 않는다. 같은 사용자의 서로 다른 pending cert 를 두 관리자가 동시에 승인하면 같은 행을 잠근다는 보장이 없고, 승인 0대면 잠글 행조차 없어 둘 다 통과한다. `aircpm_device_cert` 에는 `(user_id, status)` 복합 인덱스가 없어(마이그 034) 안전 여부가 옵티마이저 인덱스 선택에 좌우된다. `aircpm_user.user_id` 는 UNIQUE 라 항상 정확히 한 행이 잡히고, 그 사용자의 모든 승인이 그 행에서 직렬화된다.
- 고아 cert(대응하는 `aircpm_user` 행이 없는 경우 — listCerts가 LEFT JOIN이라 존재 가능): power를 알 수 없으므로 제한 검사를 건너뛰고 기존과 동일하게 승인한다.
- 상수 `AIRCPM_DESKTOP_DEVICE_LIMIT = 2` 정의.

### 1-2. 계정별 현황 API — 신규 `GET /admin/aircpm/devices/summary`

새 파일 2개 (기존 `aircpm_auth.service.ts`가 이미 1,567줄이라 더 키우지 않는다):

- `aircpm/admin/aircpm_device_summary.service.ts` — 집계 쿼리 전담 서비스
- `aircpm/admin/admin_aircpm_device_summary.controller.ts` — `AircpmSiteGuard` + 기존 `ensureAdminRole` 패턴, `aircpm.module.ts`에 등록

응답 (기존 camelCase 계약, 페이지네이션은 `listUsers`와 동일 형식):

```ts
{
  items: [{
    userId: string; name: string | null; brchCd: string | null;
    isMobile: boolean; isActive: boolean;
    desktopApproved: number; desktopPending: number;
    mobileBound: number; mobilePending: number;
    overLimit: boolean;   // desktopApproved > 2 || (isMobile && mobileBound > 1)
  }],
  total: number; page: number; limit: number;
}
```

- 한도 숫자(2/1)는 응답에 넣지 않는다 — 프론트가 표시용 상수로 가진다(데스크톱 `n/2`, 모바일 `n/1` 각각 표기).

- 대상: `aircpm_user`의 **power=5 전체** (기기 0대 계정 포함 — LEFT JOIN 집계). 비활성 계정 포함하되 `isActive` 반환.
- 쿼리 파라미터: `q`(userId/name/brchCd 부분검색), `overLimitOnly`(boolean), `page`, `limit`.
- scope: 슈퍼=전체(+`brchCd` 필터 선택), 지사관리자=자기 `brch_cd`의 power=5만. `brchCd` NULL인 지사관리자는 빈 결과 (기존 규칙 동일).
- 정렬: overLimit DESC → `(desktopApproved + mobileBound)` DESC → user_id.

### 1-3. 마이그레이션 080 — 기존 초과분 자동 정리

`migrations/080_aircpm_desktop_device_limit_cleanup.sql` + `_rollback.sql`

- 대상: power=5 사용자(is_mobile 무관) 중 approved cert가 3개 이상인 계정.
- 유지 기준(계정별 상위 2개): cert별 최근 활동 = `MAX(aircpm_login_log.attempted_at WHERE result='success' AND endpoint='login' AND user_id·serial 일치)`, 없으면 `decided_at`, 없으면 `requested_at`. `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 활동 DESC, id DESC)` ≤ 2 유지 — **`id DESC` 최종 타이브레이커 필수** (같은 serial의 복수 행은 로그인 로그 매칭이 serial 단위라 활동 시각이 동일해짐; 타이브레이커 없으면 테스트/운영 결과가 달라질 수 있다).
- MariaDB는 UPDATE에서 윈도우 함수를 직접 못 쓴다 — `ROW_NUMBER()` 결과를 파생 테이블로 만들어 JOIN UPDATE 한다 (MariaDB ≥ 10.2 필요, 운영 Docker MariaDB 충족).
- 나머지: `status='rejected'`, `reject_reason='기기 수 제한(최대 2대) 초과 자동 해제'`, `decided_at=NOW()`, `decided_by=NULL`.
- 해제된 cert의 세션 정밀 폐기: `aircpm_refresh_tokens`에서 해당 user의 **serial이 해제 cert와 일치하는** 활성 토큰만 `revoked_at=NOW(), revoke_reason='FORCED'`. 남는 2대의 세션은 원칙적으로 유지되지만, **유지 cert와 해제 cert의 serial이 같은 경우**(동일 기기 복수 행) 유지 기기의 세션도 함께 끊긴다 — 재로그인으로 해소되므로 허용하고 마이그레이션 파일에 주석 명기.
- rollback: `reject_reason='기기 수 제한(최대 2대) 초과 자동 해제'` **AND `decided_by IS NULL`** 인 행을 `approved`로 복원(reject_reason=NULL). `decided_by IS NULL` 은 사람이 같은 문구로 수동 거부한 cert 의 오복원을 막는 판별자다 — `rejectCert()`/`revokeCert()` 는 항상 admin id 를 남기므로 NULL 은 마이그레이션이 찍은 행뿐이다(마이그 071 과 동일 방식). 마이그레이션이 찍은 `decided_at`은 남는다(관리자 행위로 오독하지 않도록 주석 명기). 폐기된 refresh 토큰은 복원 불가(재로그인으로 해소) — 파일에 주석 명기.

### 1-4. 백엔드 테스트 (`aircpm_auth.service.spec.ts` 패턴)

- approveCert: 2대째 승인 허용(경계), 3대째 차단(DEVICE_LIMIT_EXCEEDED), power=7/9 대상은 제한 없음, is_mobile=1이라도 power=5면 차단, 고아 cert는 검사 생략, 거부/폐기 후 재승인 가능.
- summary: 슈퍼/지사관리자 scope 필터, overLimit 계산(모바일 사용자의 데스크톱 초과 포함), overLimitOnly 필터.

### 1-5. 마이그레이션 081 — `(user_id, status)` 복합 인덱스 (실행 중 코드리뷰로 추가)

`migrations/081_aircpm_device_cert_user_status_index.sql` + `_rollback.sql`

- `aircpm_device_cert` 에는 `idx_aircpm_cert_user(user_id)` / `idx_aircpm_cert_status(status)` 단일 인덱스만 있다(마이그 034). 이번에 추가되는 두 쿼리 — summary 의 데스크톱 집계(`GROUP BY user_id` + status별 SUM)와 `approveCert` 의 한도 카운트(`WHERE user_id = ? AND status = 'approved'`) — 가 모두 `(user_id, status)` 조합을 쓴다.
- 자매 테이블 `aircpm_mobile_device` 는 이미 `idx_mobile_device_active(user_id, status)` 를 갖고 있다(마이그 063). 같은 형태로 맞춘다.
- 기존 단일 인덱스는 제거하지 않는다(다른 쿼리가 사용 중일 수 있음 — 추가만 한다).

## 2. 프론트엔드 (Flower_Frontend_Web)

### 2-1. API 클라이언트 — `src/lib/api/aircpm.ts`

`AircpmDeviceSummaryItem` 타입 + `listAircpmDeviceSummary(params)` 추가 (`GET /admin/aircpm/devices/summary`).

### 2-2. 기기 인증 페이지 탭 — `/aircpm/certs`

- 페이지 상단에 **[기기별 | 계정별]** 탭 추가 (`view: 'devices' | 'accounts'` state). 기존 기기별 뷰는 변경 없음.
- 계정별 탭은 새 컴포넌트 `src/components/aircpm/account-device-summary.tsx`로 분리 (페이지가 이미 533줄):
  - 행: userId · 이름 · 지사 · 유형(💻/📱) · 승인 기기 수(데스크톱 `n/2`, 모바일 사용자는 모바일 `n/1`도 병기, 초과 시 빨간 배지) · 대기 수 · 활성 여부.
  - 필터: 초과만 보기 토글, 검색(q), 페이지네이션. TanStack Query (`refetchInterval` 기존 페이지와 동일 15초).
  - 행의 "기기 보기" 버튼 → `onShowDevices(userId)` 콜백으로 기기별 탭 전환 + userId 검색 적용 (기존 검색 state 재사용).
- 에러 매핑: `toastForError`에 `DEVICE_LIMIT_EXCEEDED` → "기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요."
  - **전제 수정 필요**: `ApiError`(client.ts)에는 `.code`가 없고 응답 본문이 `.data`에 담긴다. 현재 `extractErrorInfo`(certs 페이지)는 `err.code`를 읽어 기존 `ALREADY_APPROVED`/`NOT_APPROVED` 매핑도 실제로는 동작하지 않는 잠복 버그가 있다. `extractErrorInfo`가 `ApiError.data`에서 `code`를 꺼내도록 수정한다(기존 매핑도 이 수정으로 살아남).
- 승인 다이얼로그 설명에 데스크톱 한도 문구 1줄 추가 ("데스크톱은 계정당 최대 2대까지 승인됩니다.").

### 2-3. 프론트 테스트 (`src/__tests__/aircpm/`)

- API 함수 테스트 (fetch mock 패턴, 쿼리스트링 구성 확인).
- 계정별 탭 컴포넌트: 렌더·초과 배지·초과만 필터·기기 보기 콜백 (RTL).

## 3. 에러 처리 요약

| 상황 | 코드 | HTTP | 프론트 표시 |
|---|---|---|---|
| 3대째 승인 시도 | `DEVICE_LIMIT_EXCEEDED` | 409 | "기기 수 제한(최대 2대)을 초과했습니다..." |
| 기존 코드 유지 | `ALREADY_APPROVED` 등 | 기존 | 기존 매핑 유지 |

## 4. 배포 순서 (기존 관례)

1. 마이그레이션 080 (테스트 서버 → 검증 → 운영)
2. 백엔드 (테스트 서버 컨테이너 빌드/테스트 → 운영 cherry-pick)
3. 프론트 (`deploy-zerodt.sh test` → 확인 → `prod`)

프론트를 먼저 배포해도 summary 404 외 기존 기능은 동작하지만, 위 순서를 지킨다.

## 범위 밖 (명시)

- 모바일 1기기 로직 변경 없음 (이미 강제됨).
- 관리자 계정(power 7/9) 기기 제한 없음.
- 데스크톱 로그인 시점 차단 없음 (승인 시점만).
- 계정당 한도 개별 설정(가변 한도) 없음 — 고정 2/1.
