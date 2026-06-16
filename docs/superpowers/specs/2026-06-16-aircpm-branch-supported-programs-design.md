# AirCPM 지사별 지원 프로그램 설정 (Branch-level copyApps/pasteApps)

- 작성일: 2026-06-16
- 상태: 설계 승인 대기
- 범위: 풀스택 (백엔드 `run_flower_backend_final_repo` + 프론트 `Flower_Frontend_Web`)

## 1. 배경 / 목표

AirCPM 데스크톱 클라이언트는 로그인 시 서버에서 `settings.copyApps` / `settings.pasteApps`
(각 4개 불리언 배열)을 받아 어떤 배차 프로그램에서 데이터 복사/붙여넣기를 허용할지 결정한다.

현재 이 값은 **사용자 단위**(`aircpm_user_settings.copy_apps/paste_apps`, `CHAR(4)`)로 저장된다.
운영 요구는 이를 **지사 단위**로 일원화하고, 프로그램 슬롯에 **D2를 추가(4→5)** 하는 것이다.

### 목표
1. `copyApps`/`pasteApps`(= "지원 프로그램")를 지사(`aircpm_branch`) 단위로 이전한다.
2. 프로그램 슬롯을 5개로 확장한다: 순서 **AUTO · Logi D5 · XE4 · Icon · D2** (인덱스 0..4).
3. 데스크톱 로그인 응답의 `settings.copyApps/pasteApps`를 지사값에서 파생해 전달한다
   (기존 `cardPayEnabled`가 지사에서 파생되는 패턴과 동일).
4. 관리자 웹(`/aircpm/branches`)에서 지사별 지원 프로그램을 편집한다.
5. 사용자별 설정 화면에서 copyApps/pasteApps 편집 UI를 제거한다.

### 비목표 (YAGNI)
- `appTitle`, `priceUp`, `telegram` 자격은 **사용자 단위 그대로 유지** (이전하지 않음).
- 기존 사용자별 copy/paste 값의 **자동 이전 없음**. 지사는 기본 `'11111'`(전체 ON)로 시작.
- `aircpm_user_settings.copy_apps/paste_apps` 컬럼 **DROP 하지 않음** (데이터 보존, 코드/UI에서만 미사용).
- 지사별 지원 프로그램 편집은 **슈퍼 관리자 전용** (지사 관리 페이지가 이미 슈퍼 전용).

## 2. 슬롯 정의 (계약)

| 인덱스 | 코드 | 라벨(UI) |
|---|---|---|
| 0 | AUTO | AUTO |
| 1 | D5 | Logi D5 |
| 2 | XE4 | XE4 |
| 3 | ICON | Icon |
| 4 | D2 | D2 |

비트스트링 표현: `CHAR(5)`, 예 `'11111'`(전체 허용), `'10100'`(AUTO·XE4만).
데스크톱 클라이언트는 5슬롯(D2 포함)을 읽도록 함께 업데이트됨(확인됨).

## 3. 데이터 모델 — 마이그레이션 056

신규 파일 `migrations/056_aircpm_branch_apps.sql`:

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

롤백 `migrations/056_aircpm_branch_apps_rollback.sql`:

```sql
ALTER TABLE aircpm_branch
  DROP COLUMN paste_apps,
  DROP COLUMN copy_apps;
```

`aircpm_user_settings`는 변경하지 않는다 (컬럼 보존).

## 4. 백엔드 변경 (`apps/api/src/aircpm`)

### 4.1 비트 헬퍼 (길이 4→5)
`security/aircpm_auth.service.ts`의 `bitStringToBooleans`/`booleansToBitString`를 길이 5로 일반화.
패딩/기본값 `'11111'`, 슬라이스 5. (가능하면 길이를 인자화한 공용 헬퍼로 정리.)

### 4.2 지사 DB 계층 (`payment/db/aircpm_branch.db.ts`)
- `AircpmBranch` 타입에 `copyApps: boolean[]`, `pasteApps: boolean[]` 추가.
- `findByCode` / `list`: `copy_apps, paste_apps` SELECT 후 불리언 배열로 변환.
- `upsert`: `copyApps?`/`pasteApps?`를 받아 비트스트링으로 저장 (미지정 시 `COALESCE`로 기존 유지).

### 4.3 로그인 settings 파생 (`security/aircpm_auth.service.ts` `getSettings`)
- 기존 지사 조회 쿼리(`card_payment_enabled` 파생)에 `b.copy_apps, b.paste_apps`를 추가.
- `copyApps`/`pasteApps`를 **지사값**으로 구성. 사용자가 소속(`brch_cd`) 없거나 지사 행이 없으면 기본 `'11111'`.
- **`settingsRowToDto` / `DEFAULT_SETTINGS` 최종 형태 (명시)**:
  - `settingsRowToDto`는 더 이상 `copyApps`/`pasteApps`를 반환하지 않는다 (appTitle·priceUp·telegram만 반환).
  - `DEFAULT_SETTINGS`에서도 `copyApps`/`pasteApps` 키 제거.
  - `getSettings`가 두 번째(지사) 쿼리 결과로 `copyApps`/`pasteApps`(5배열)와 `cardPayEnabled`를
    **항상** 채워 최종 settings 객체를 완성한다. 즉 copy/paste의 단일 소스는 지사 쿼리.
- `login()` / `getMe()`는 `getSettings()`를 그대로 사용하므로 자동 반영.

### 4.4 사용자 설정 입력 정리 (`upsertSettings` + `UpdateAircpmSettingsDto`)
- `UpdateAircpmSettingsDto`에서 `copyApps`/`pasteApps` 필드 **삭제** (미검증 잔재 없이 완전 제거).
- `upsertSettings`: 병합 객체(`merged`)와 **INSERT 컬럼 목록 양쪽에서** `copy_apps`/`paste_apps`를 제거한다.
  - 신규 row INSERT 시 컬럼을 생략하면 DB 기본값 `'1111'`이 적용되고, 기존 row는 ON DUPLICATE KEY
    UPDATE 대상에서 빠지므로 **기존 값이 그대로 보존**된다.
  - 결과적으로 길이 5 헬퍼가 `CHAR(4)` 사용자 컬럼에 쓰일 일이 없어 truncation 위험도 없다
    (사용자 컬럼은 데드 상태로 보존).

### 4.5 지사 Upsert DTO/서비스/컨트롤러
- `payment/dto/aircpm-branch.dto.ts` `UpsertBranchDto`에 추가:
  ```ts
  @ApiPropertyOptional({ example: [true,true,true,true,true] })
  @IsOptional() @IsArray() @ArrayMinSize(5) @ArrayMaxSize(5) @IsBoolean({ each: true })
  copyApps?: boolean[];
  // pasteApps 동일
  ```
- `AircpmBranchService.upsertBranch`는 dto를 그대로 db.upsert로 통과 (이미 통과 구조).
- `AircpmBranchAdminController` 변경 없음 (dto 통과). `list()` 응답에 copy/paste 포함됨.

### 4.6 settings DTO 갱신 (`security/dto/aircpm-auth.dto.ts`)
- `AircpmSettingsDto.copyApps/pasteApps` 예시·설명을 5슬롯(`0=AUTO,1=D5,2=XE4,3=ICON,4=D2`)으로.

## 5. 프론트엔드 변경 (`src`)

### 5.1 API 클라이언트 (`lib/api/aircpm-payments.ts`)
- `AircpmBranch` 타입에 `copyApps: boolean[]`, `pasteApps: boolean[]` 추가.
- `upsertAircpmBranch` 바디에 `copyApps?`/`pasteApps?` 추가.

### 5.2 지사 관리 페이지 (`app/aircpm/branches/page.tsx`)
- 공용 상수 `PROGRAM_LABELS = ['AUTO','Logi D5','XE4','Icon','D2']`.
- 생성/편집 다이얼로그 둘 다에 **지원 프로그램** 섹션 추가:
  행 = 프로그램 5개, 열 = `복사`/`붙여넣기` 체크박스(총 10토글). 불변 업데이트로 토글.
  - 생성: 기본 전체 ON(`[true×5]`), 편집 가능.
  - 편집: 기존 지사값으로 초기화.
- 지사 카드 목록에 요약 1줄(예: `복사 AUTO·D5·XE4 / 붙여넣기 전체`) 표시.

### 5.3 사용자 설정 페이지 (`app/aircpm/users/[userId]/settings/page.tsx`)
- copyApps/pasteApps 카드·상태(`copyApps`,`pasteApps`,`toggleCopy`,`togglePaste`) 제거.
- **`useEffect` 초기화 블록에서 `setCopyApps`/`setPasteApps` 두 줄 제거** (제거된 state 참조가 남으면 TS 에러).
- `APP_LABELS` 상수 제거(미사용). 저장 페이로드에서 copy/paste 제거.
  헤더 설명 문구를 "앱 타이틀, 단가 인상, 진단 로그 Telegram"으로 수정.
- `AircpmUserSettingsPatch`(`lib/api/aircpm.ts`)에서 `copyApps`/`pasteApps` 제거.
  `AircpmUserSettings` 응답 타입의 copy/paste는 화면 미사용이므로 `boolean[]`로 완화(5슬롯 허용).

## 6. 테스트

### 백엔드 (vitest/jest spec) — 기존 spec 파일 **확장**(중복 생성 금지)
- `aircpm_auth.service.spec.ts`:
  - **기존 단언 갱신**: 현재 `res.settings.copyApps`를 길이 4(`[true×4]`)로 단정하는 단언(현 라인 ~133)은
    길이 5(`[true×5]`) + **지사값 기준**으로 수정해야 함 (헬퍼 기본값이 `'11111'`로 바뀌어 그대로 두면 실패).
  - 신규: `getSettings`가 지사값에서 copy/paste를 구성(5슬롯), 소속/지사행 없을 때 기본 `'11111'`,
    사용자 row의 copy/paste는 무시됨, `upsertSettings`가 사용자 copy/paste 컬럼을 건드리지 않음.
- `aircpm_branch.db.spec.ts`: upsert/조회 시 copy/paste 비트스트링 ↔ 불리언 5배열 왕복.
- `aircpm_branch.service.spec.ts` / `aircpm_branch_admin.controller.spec.ts`: copy/paste 통과.
- DTO 검증: 길이 5 아닌 copyApps/pasteApps 입력 거부.

### 프론트 (vitest + RTL)
- 지사 편집 다이얼로그: 토글 변경 후 저장 시 `upsertAircpmBranch`에 길이 5 배열 전달.
- 사용자 설정 페이지: copy/paste 섹션이 렌더되지 않음.

### Red-Green (회귀)
- `getSettings` 지사 파생 동작은 변경 전(사용자값) → 변경 후(지사값) 차이를 테스트로 고정.

## 7. 배포 / 호환

- 데스크톱 클라이언트: 5슬롯(D2) 지원 확인됨 — 백엔드는 5슬롯 전달.
- 백엔드: 테스트 서버 SCP→컨테이너 빌드→restart + 마이그레이션 056 적용. 운영은 별도 승인 후 (git commit+push → 운영 pull/적용).
- 프론트: `deploy/deploy-zerodt.sh test` → 검증 후 운영.
- 마이그레이션은 가산(ADD COLUMN, 기본값 보유)이라 기존 동작 무중단. 단, `getSettings`가 사용자값→지사값으로 바뀌므로 **배포 시점에 모든 지사 기본 전체 ON**으로 시작함을 운영에 공지.
- **배포 순서 주의(계약 변경)**: 백엔드가 길이 5 배열을 내려주므로 5슬롯을 못 읽는 구버전 클라이언트가 남아 있으면 안 됨. 클라이언트 5슬롯 지원이 선행/동시 배포되어야 함(확인됨). 미확정 시 백엔드 운영 배포 보류.

## 8. 영향 파일 요약

백엔드:
- `migrations/056_aircpm_branch_apps.sql` (+rollback) — 신규
- `apps/api/src/aircpm/security/aircpm_auth.service.ts`
- `apps/api/src/aircpm/security/dto/aircpm-auth.dto.ts`
- `apps/api/src/aircpm/payment/db/aircpm_branch.db.ts`
- `apps/api/src/aircpm/payment/dto/aircpm-branch.dto.ts`
- (+ 관련 spec 파일들)

프론트:
- `src/lib/api/aircpm-payments.ts`
- `src/lib/api/aircpm.ts`
- `src/app/aircpm/branches/page.tsx`
- `src/app/aircpm/users/[userId]/settings/page.tsx`
- (+ 관련 테스트)
