# 백엔드 코드 리뷰 보고서

**서비스**: 달려라 꽃배달 (RunFlower) Backend
**서버**: 49.247.206.190 (프로덕션), 커밋 850ef59
**리뷰일**: 2026-04-01
**범위**: Branch, Public Branch, Orders, Organizations, Florist Photos 모듈

---

## 요약

| 심각도 | 건수 | 핵심 주제 |
|--------|------|-----------|
| CRITICAL | 5 | 라우트 충돌, 레이스 컨디션, 입력 검증 누락 |
| HIGH | 5 | 관리자 모듈 필드 누락, 트랜잭션 미사용, 디버그 로그 |
| MEDIUM | 6 | 코드 구조, 복잡한 SQL, 메모리 이슈, 불일치 |
| LOW | 5 | 에러 무시, 역할 기반 접근, 응답 형식 |

---

## CRITICAL (즉시 수정 필요)

### C1. Public Branch 컨트롤러 중복 등록 (라우트 충돌)

**파일**:
- `catalog/controllers/public_branch.controller.ts`
- `public/branch/public_branch.controller.ts`

두 컨트롤러 모두 `@Controller('public/branch')`로 등록. NestJS는 에러 없이 양쪽 모두 등록하고, 마지막으로 등록된 것이 요청을 처리. 두 서비스의 쿼리와 반환 데이터가 다름 (surcharges 테이블명 차이, 파일 존재 확인 유무).

**위험**: 데이터 불일치. 상담 요청(consult) 엔드포인트가 모듈 로드 순서에 따라 접근 불가할 수 있음.

**권장**: 하나를 제거. `public/branch/` 버전이 상담 생성, 파일 업로드 등 완전한 로직을 가지고 있으므로 이것을 유지하고 `catalog/` 버전 제거.

---

### C2. 주문번호 생성 레이스 컨디션

**파일**: `orders/db/orders.db.ts`

```sql
SELECT COUNT(*) + 1 AS seq FROM orders WHERE YEAR(created_at) = ?
```

동시에 두 주문이 생성되면 같은 COUNT를 반환 → 중복 주문번호 발생 가능.

**권장**: AUTO_INCREMENT 컬럼, 시퀀스 테이블(SELECT FOR UPDATE), 또는 UUID 기반 주문번호 사용.

---

### C3. adminForce 상태 검증 누락

**파일**: `orders/services/order_write.service.ts`

`adminForce` 메서드가 임의의 문자열을 status로 DB에 기록. 빈 문자열도 기록 가능.

**권장**: 서비스 내부에서 `OrderStatus` enum 검증 추가 (방어적 프로그래밍).

---

### C4. Branch 수정 API 입력 검증 없음

**파일**: `branch/branch.controller.ts` (line 53)

`@Body() body: any` — DTO 없이 raw JSON을 직접 서비스에 전달. `homepageDesign`에 임의 문자열 허용.

**권장**: `UpdateBranchInfoDto` 생성 + class-validator 데코레이터. `homepageDesign`은 enum 검증.

---

### C5. Public 상담 요청 API 입력 검증 없음

**파일**: `public/branch/public_branch.controller.ts` (line 88)

인증 없는 공개 엔드포인트에서 `@Body() body: any`. 유일한 검증은 `customerPhone` 존재 확인뿐.

**위험**: 저장 XSS (관리자 패널에서 조회 시), 대용량 페이로드 DoS, 스팸 상담 요청.

**권장**: DTO 생성, 필드 길이 제한, HTML 삭제(sanitize), 레이트 리미팅.

---

## HIGH (빠른 시일 내 수정)

### H1. Admin Organizations 모듈에 homepageDesign/enableOnlinePayment 누락

관리자 조직 관리 API에서 이 필드들을 조회/수정할 수 없음. branch 앱에서만 수정 가능.

### H2. 다단계 주문 작업에 트랜잭션 미사용

주문 수정(update) 시 주문 업데이트 + 변경 로그 기록이 트랜잭션 없이 순차 실행. 부분 실패 시 데이터 불일치.

### H3. 요청 경로에서 파일 시스템 존재 확인 (성능 병목)

추천 상품 조회 시 모든 사진에 대해 순차적 `fs.access()` 호출. 수백 건 결과 시 수백 ms 지연.

### H4. 프로덕션에 디버그 console.log 잔존

`florist-photos.service.ts`의 `removeText` 메서드에 대량의 디버그 로깅.

### H5. 중복 컨트롤러 간 surcharges 테이블 불일치

catalog 버전은 `branch_surcharges`, public 버전은 `surcharges` 테이블 참조. 다른 데이터 반환 가능.

---

## MEDIUM (가능할 때 수정)

| ID | 이슈 | 파일 |
|----|------|------|
| M1 | 서비스+컨트롤러 한 파일에 합침 | `catalog/.../public_branch.controller.ts` |
| M2 | URL 문자열 파싱으로 florist ID 추출 (복잡한 SQL) | `catalog/.../public_branch.controller.ts` |
| M3 | 전체 사진 메모리 로드 후 페이지네이션 | `florist-photos.service.ts` |
| M4 | allowFloristSearch 별도 쿼리 | `branch.service.ts` |
| M5 | enableOnlinePayment Boolean 처리 불일치 | 3개 서비스 |
| M6 | 공개 엔드포인트 레이트 리미팅 없음 | public 컨트롤러 |

---

## LOW (개선 사항)

| ID | 이슈 |
|----|------|
| L1 | 감사 로그 실패 시 에러 무시 (로깅 없음) |
| L2 | 임시 파일 정리 안 됨 ("debug용 유지" 주석) |
| L3 | AdminGuard에 역할 확인 없음 (모든 관리자 전체 접근) |
| L4 | 응답 형식 불일치 (`{ok,data}` vs `{data}` vs raw) |
| L5 | getConsultRequests → listConsultRequests 불필요한 래퍼 |

---

## 서버 동기화 상태

테스트 서버(49.247.46.86)와 프로덕션 서버(49.247.206.190) 모두 동일 커밋(`850ef59`). 소스 불일치 없음.

---

## 우선 조치 권장 순서

1. **C1** (라우트 충돌) — 중복 컨트롤러 제거
2. **C5** (공개 API 검증) — 고객 서비스에 직접 영향
3. **C4** (Branch 입력 검증) — DTO 생성
4. **C2** (주문번호 레이스 컨디션) — 주문 증가 전 해결
5. **H2** (트랜잭션) — 데이터 무결성
