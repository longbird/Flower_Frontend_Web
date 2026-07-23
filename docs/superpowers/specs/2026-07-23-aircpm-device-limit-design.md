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
| 일반 사용자 (power=5, is_mobile=0) | 데스크톱 최대 **2기기** | 승인 시점 차단 (신규) |
| 모바일 사용자 (power=5, is_mobile=1) | 모바일 **1기기** | 기존 강제 유지 — 변경 없음 |
| 관리자 (power=7/9) | 제한 없음 | 요구사항 범위가 "일반 사용자"이므로 제외 |

- "기기 1대" = `aircpm_device_cert`의 approved 행 1개. (동일 물리 기기는 user_id+serial+MAC 교집합 매칭으로 기존 행을 재사용하므로 행 수 ≒ 기기 수)
- 인증 요청(pending) 접수는 제한하지 않는다 — 3번째 기기 요청은 접수되고, 관리자가 기존 기기를 '승인 해제'한 뒤 승인하는 흐름.
- 기존 초과분(3대 이상 승인)은 **마이그레이션으로 자동 정리** (사용자 결정).

## 1. 백엔드 (run_flower_backend_final_repo)

### 1-1. 승인 시점 차단 — `AircpmAuthService.approveCert()` 수정

- 승인 전에 대상 cert의 user를 조회해 **power=5인 경우에만** 같은 user_id의 `approved` cert 수를 센다.
- 이미 2개면 `ConflictException(409)` `{ code: 'DEVICE_LIMIT_EXCEEDED', message: '기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요.' }`
- 동시 승인 경합 방지: 트랜잭션 안에서 `SELECT ... FOR UPDATE`(해당 user의 cert 행 잠금) 후 카운트 → 승인 UPDATE → 커밋.
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
    limit: number;        // isMobile ? 1 : 2
    overLimit: boolean;   // isMobile ? mobileBound > 1 : desktopApproved > 2
  }],
  total: number; page: number; limit: number;
}
```

- 대상: `aircpm_user`의 **power=5 전체** (기기 0대 계정 포함 — LEFT JOIN 집계). 비활성 계정 포함하되 `isActive` 반환.
- 쿼리 파라미터: `q`(userId/name/brchCd 부분검색), `overLimitOnly`(boolean), `page`, `limit`.
- scope: 슈퍼=전체(+`brchCd` 필터 선택), 지사관리자=자기 `brch_cd`의 power=5만. `brchCd` NULL인 지사관리자는 빈 결과 (기존 규칙 동일).
- 정렬: overLimit DESC → 승인 기기 수 DESC → user_id.

### 1-3. 마이그레이션 080 — 기존 초과분 자동 정리

`migrations/080_aircpm_desktop_device_limit_cleanup.sql` + `_rollback.sql`

- 대상: power=5 사용자 중 approved cert가 3개 이상인 계정.
- 유지 기준(계정별 상위 2개): cert별 최근 활동 = `MAX(aircpm_login_log.attempted_at WHERE result='success' AND endpoint='login' AND user_id·serial 일치)`, 없으면 `decided_at`, 없으면 `requested_at`. `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 활동 DESC)` ≤ 2 유지.
- 나머지: `status='rejected'`, `reject_reason='기기 수 제한(최대 2대) 초과 자동 해제'`, `decided_at=NOW()`, `decided_by=NULL`.
- 해제된 cert의 세션 정밀 폐기: `aircpm_refresh_tokens`에서 해당 user의 **serial이 해제 cert와 일치하는** 활성 토큰만 `revoked_at=NOW(), revoke_reason='FORCED'`. 남는 2대의 세션은 유지.
- rollback: `reject_reason='기기 수 제한(최대 2대) 초과 자동 해제'`인 행을 `approved`로 복원(reject_reason=NULL). 폐기된 refresh 토큰은 복원 불가(재로그인으로 해소) — 파일에 주석 명기.

### 1-4. 백엔드 테스트 (`aircpm_auth.service.spec.ts` 패턴)

- approveCert: 2대째 승인 허용(경계), 3대째 차단(DEVICE_LIMIT_EXCEEDED), power=7/9 대상은 제한 없음, 거부/폐기 후 재승인 가능.
- summary: 슈퍼/지사관리자 scope 필터, overLimit 계산, overLimitOnly 필터.

## 2. 프론트엔드 (Flower_Frontend_Web)

### 2-1. API 클라이언트 — `src/lib/api/aircpm.ts`

`AircpmDeviceSummaryItem` 타입 + `listAircpmDeviceSummary(params)` 추가 (`GET /admin/aircpm/devices/summary`).

### 2-2. 기기 인증 페이지 탭 — `/aircpm/certs`

- 페이지 상단에 **[기기별 | 계정별]** 탭 추가 (`view: 'devices' | 'accounts'` state). 기존 기기별 뷰는 변경 없음.
- 계정별 탭은 새 컴포넌트 `src/components/aircpm/account-device-summary.tsx`로 분리 (페이지가 이미 533줄):
  - 행: userId · 이름 · 지사 · 유형(💻/📱) · 승인 `n/한도`(초과 시 빨간 배지 `3/2`) · 대기 수 · 활성 여부.
  - 필터: 초과만 보기 토글, 검색(q), 페이지네이션. TanStack Query (`refetchInterval` 기존 페이지와 동일 15초).
  - 행의 "기기 보기" 버튼 → `onShowDevices(userId)` 콜백으로 기기별 탭 전환 + userId 검색 적용 (기존 검색 state 재사용).
- 에러 매핑: `toastForError`에 `DEVICE_LIMIT_EXCEEDED` → "기기 수 제한(최대 2대)을 초과했습니다. 기존 기기를 먼저 해제해주세요."
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
