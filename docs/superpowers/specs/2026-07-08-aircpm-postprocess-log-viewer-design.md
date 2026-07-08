# AirCPM 콜패스 후처리 실패 로그 조회 — 관리자 웹 연동 (설계)

- 날짜: 2026-07-08
- 저장소: `run_flower_backend_final_repo` (백엔드) + `Flower_Frontend_Web` (프론트)
- 배경 커밋: 백엔드 `31de233 feat(callpass): 후처리 실패 이벤트에 상세 로그 첨부 저장·조회 (#25)` (v1.1.0.26 / 마이그 064)

## 목표

콜패스 자동화 후처리 실패(`POST_PROCESS_FAILED`) 시 CPM 클라이언트가 업로드한 상세 로그
(`post_process_log`, ≤~18,000자)를 **AirCPM 관리자 웹의 슈퍼 관리자**가 조회해 원인을 분석한다.

## 문제 (왜 프론트만으로 안 되나)

기존 진단 엔드포인트 `/aircpm/callpass/paste-diagnostics*` 는:

1. **클라이언트 JWT 전략(`aircpm-jwt`, `scope:'aircpm'`, `AIRCPM_JWT_SECRET`)** 으로 보호됨.
   관리자 웹은 **별도 전략(`aircpm-site-jwt`, `AIRCPM_SITE_JWT_SECRET`)** 토큰을 쓰며 두 전략은
   의도적으로 격리 → 관리자 토큰으로는 인증 자체가 불가(401).
2. **demo 게이트(`brchCd==='demo'`)**. 슈퍼 관리자는 무소속(`brchCd=null`)이라
   `brchOf`에서 400 `BRANCH_NOT_ASSIGNED`, 소속이 있어도 'demo'가 아니면 403 `REPLAY_DEMO_ONLY`.

→ 관리자 웹(슈퍼)에서 로그를 보려면 진단 조회를 **`AircpmSiteGuard` + 슈퍼 전용**으로 새로 노출해야 한다.
기존 `AdminAircpmCallsController`(사이트 가드 + 역할 체크 + `CallpassQueryService`)와 동일 패턴.

## 접근 방식

기존 `CallpassCallsDb.listPasteDiagnostics` / `getPostProcessLog`(이미 존재)를 재사용하고,
관리자 사이트 경로에 슈퍼 전용 얇은 컨트롤러를 새로 추가한다. DB/서비스 로직 신규 없음.

## 백엔드 (`run_flower_backend_final_repo`)

### 1. `CallpassQueryService` 패스스루 추가
```ts
async listPasteDiagnostics(limit: number, brchCd?: string) {
  return this.calls.listPasteDiagnostics(limit, brchCd);
}
async getPostProcessLog(callId: number): Promise<string | null> {
  return this.calls.getPostProcessLog(callId);
}
```

### 2. `AdminAircpmDiagnosticsController` (신규, 슈퍼 전용)
- `@Controller('admin/aircpm/diagnostics')`, `@UseGuards(AircpmSiteGuard)`
- `GET /` — `ensureSuper(req)` → limit(1..200, 기본 50) 클램프 + 선택 `brchCd` → 목록 배열 반환
- `GET /:callId/log` — `ensureSuper(req)` → callId 양의 정수 검증(아니면 400 `INVALID_CALL_ID`)
  → `getPostProcessLog` → null이면 404 `LOG_NOT_FOUND`, 아니면 `{ log }`
- `aircpm.module.ts`에 컨트롤러 배선

### 응답 형태 (목록 항목 — `CallpassCallsDb.listPasteDiagnostics` 그대로)
```ts
{ callId: number; brchCd: string; orderNo: string|null;
  appType: 'D5'|'XE4'|'D2'|'ICON'|'AUTO'; totalMs: number|null;
  pasteOk: boolean; bottleneck: string|null;
  postProcessStatus: 'NONE'|'PENDING'|'DONE'|'FAILED';
  postProcessError: string|null; hasLog: boolean; createdAt: string /* ISO */ }
```

### 3. jest 테스트
- 컨트롤러: 슈퍼 통과 / 비-슈퍼 403 / 목록 위임 / log 404·400(INVALID_CALL_ID)
- 쿼리서비스 패스스루 위임

## 프론트 (`Flower_Frontend_Web`)

### 1. `src/lib/api/aircpm.ts`
- `PasteDiagnosticItem` 타입(위 응답 형태)
- `listAircpmDiagnostics({limit?, brchCd?})` → `GET /admin/aircpm/diagnostics?…`
- `getAircpmDiagnosticLog(callId)` → `GET /admin/aircpm/diagnostics/:callId/log` → `{ log }`
- 기존 `api()`가 Bearer(사이트 토큰)·프록시·401 리프레시 처리

### 2. `src/app/aircpm/diagnostics/page.tsx` (신규)
- `useQuery`로 목록 로드. 컬럼: 시각·콜ID·지사·주문번호·앱·붙여넣기(성공/실패+totalMs)·병목·후처리(FAILED면 rose 배지+사유)·로그
- `hasLog===true` 행에만 "로그 보기" → **Dialog** 모달에서 `getAircpmDiagnosticLog` 지연 조회,
  `<pre className="whitespace-pre-wrap font-mono text-xs max-h-[70vh] overflow-auto">`로 렌더(파싱 없음)
- 오류 안내: 403(슈퍼 전용)·로그 404(로그 없음)·기타 일반
- 선택 지사 필터(슈퍼는 전 지사) — `listAircpmBranches` 재사용
- `콜 조회` 페이지 스타일(Card + raw table + Badge) 미러링

### 3. `src/app/aircpm/layout.tsx`
- `NavItem`에 `superOnly` 이미 존재 — `{ href:'/aircpm/diagnostics', label:'붙여넣기 진단', superOnly:true }` 추가
- **'콜 조회'는 무변경**(지사 관리자 자기 지사 조회 유지)

### 4. vitest 테스트
- API URL/파라미터, 실패 배지, `hasLog` 버튼 게이팅, 로그 조회·403/404 처리

## 범위 밖 (명시)
- '콜 조회'(`/aircpm/calls`, `/admin/aircpm/calls`) 접근 정책 변경 없음.
- DB/마이그레이션 변경 없음(064는 배포 완료).
- 기존 demo-gated `/aircpm/callpass/paste-diagnostics*`(클라이언트 경로)는 그대로 둔다.

## 검증
- 백엔드 jest, 프론트 vitest/tsc 실행 증거.
- 배포: 백엔드(커밋+push+컨테이너 빌드+restart), 프론트(deploy-zerodt).
