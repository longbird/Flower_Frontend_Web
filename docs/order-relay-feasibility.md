# 주문 이관 (외부 사이트 자동 발주) 가능성 분석

> 작성일: 2026-03-09
> 조사 대상: ebestflower.co.kr (베스트플라워), 468.co.kr (꽃비 파트너스)

---

## 결론 요약

| 사이트 | 자동 주문 등록 | 방식 | 난이도 |
|--------|:---:|------|:---:|
| **468.co.kr** | **가능** | HTTP POST (UTF-8, Laravel CSRF) | 중 |
| **ebestflower.co.kr** | **가능** | HTTP POST (EUC-KR, imgTk 토큰) | 중상 |

두 사이트 모두 Headless 브라우저 없이 **순수 HTTP 요청**으로 구현 가능합니다.

---

## 1. 468.co.kr (꽃비 파트너스)

### 가능한 것

- **주문 등록 (POST)**: `POST https://www.468.co.kr/order/create`
  - curl로 미리보기(인수증) 응답 확인 완료 (HTTP 200, 정상 HTML 반환)
- **로그인 유지**: Laravel 세션 쿠키로 장시간 유지 가능
- **미리보기**: `/order/preview` 로 등록 전 검증 가능
- **상품/화원 검색**: 팝업 URL에 직접 접근하여 데이터 획득 가능

### 제약 사항

| 제약 | 대응 방안 |
|------|----------|
| CSRF 토큰 (`_token`) 필요 | 발주 페이지 GET → 토큰 추출 → POST에 포함 |
| 폼 고유키 (`unique_key`) 필요 | 위와 동일하게 매 요청마다 추출 |
| 수주화원 ID (`obtainer`) 필요 | 화원 선택 팝업 API로 ID 획득 또는 고정값 사용 |
| 상품코드 체계 다름 | 매핑 테이블로 변환 (우리 코드 → 꽃비 코드) |

### 필수 필드

```
_token, unique_key, obtainer,
product, product_name, product_price, product_total,
delivery_address, delivery_date_date, delivery_date_time,
to_name, to_tel,
message_type02_content[], sender[],
require_happy_call, reorder_option
```

### 인증 정보

- ID: d72001 / PW: 1111
- 로그인: `POST /login?callback=...` (CSRF _token 필요)

---

## 2. ebestflower.co.kr (베스트플라워)

### 가능한 것

- **회원간발주 (POST)**: `POST /jikbalju/jikbalju_view.htm`
  - curl 제출 시 서버가 비즈니스 로직 응답 반환 확인 완료
- **본부발주 (POST)**: `POST /bonbalju/bonbalju_view.htm`
  - 영업시간 내에만 가능 (시간 외 거부 확인됨)
- **미리보기/저장 모드**: `submituse=view` (미리보기), `submituse=save` (실제 저장)
- **로그인 유지**: PHP 세션 쿠키 (`PHPSESSID`)

### 제약 사항

| 제약 | 대응 방안 |
|------|----------|
| **본부발주 시간 제한** | 영업시간 외에는 불가 → 큐에 저장 후 영업시간에 전송, 또는 회원간발주 사용 |
| **EUC-KR 인코딩** | Node.js `iconv-lite`로 UTF-8 → EUC-KR 변환 |
| **imgTk 토큰** | 발주 페이지 GET → imgTk 추출 → POST에 포함 (매번 갱신) |
| **수주화원 선택 필수** (회원간발주) | 화원 검색 API 호출 또는 고정 수주화원 ID 사용 |
| **상품코드 체계 다름** | 매핑 테이블로 변환 |
| **한국어 파라미터 인코딩** | EUC-KR로 URL-encode 필요 |

### 필수 필드

```
baljuid, sid, imgTk, sujuid, sujufax,
goodcode, good, su, fprice, gprice,
arrive_place1, arrive_place2,
byear, bmonth, bday, b01, b04,
arrive_name, arrive_tel,
ribon[], ribon_card[], msgtype,
happycall, submituse, sujucall,
oyear, omonth, oday
```

### 인증 정보

- ID: best6434 / PW: b1599@
- 로그인: `POST /login/login.htm` (sid, spw)
- 회원간발주: http://ebestflower.co.kr/gomenu.htm?urlkey=jikbalju
- 본부발주: http://ebestflower.co.kr/gomenu.htm?urlkey=bonbalju

---

## 3. 불가능한 것 / 주의 사항

### 공통

| 항목 | 설명 |
|------|------|
| **실시간 주문 상태 추적** | 이관 후 외부 사이트의 주문 상태 변경을 자동으로 감지할 수 없음. 수동 확인 필요 |
| **주문 수정/취소 연동** | 이관된 주문을 우리 시스템에서 수정/취소해도 외부에 반영 안 됨 |
| **상품 사진 자동 전송** | 파일 업로드는 multipart/form-data로 별도 처리 필요. URL 방식은 가능 |
| **이관 실패 시 복구** | 네트워크/세션/시간 제한 에러 시 재시도 필요. 중복 등록 방지 로직 필수 |

### ebestflower.co.kr 전용

| 항목 | 설명 |
|------|------|
| **본부발주 시간 제한** | 영업시간(추정 08:00~18:00) 외 본부발주 불가. 회원간발주로 대체 가능하나 수주화원 직접 지정 필요 |
| **회원간발주 시 수주화원 ID** | 수주 가능한 화원 목록을 별도 조회해야 함 (지역 기반 검색) |

### 468.co.kr 전용

| 항목 | 설명 |
|------|------|
| **세션 타임아웃** | Laravel 세션 기본 120분, 장시간 미사용 시 재로그인 필요 |
| **수주화원 선택** | obtainer 값이 필수. 화원 검색 팝업 API 별도 호출 필요 |

---

## 4. 구현 아키텍처

```
[주문 등록 페이지]                   [주문 상세 페이지]
     │                                   │
     └──── 주문 저장 (우리 DB) ────────────┤
                                          │
                              "주문 이관" 버튼 클릭
                              또는 자동 (설정된 시간 경과)
                                          │
                                          ▼
                               ┌────────────────────┐
                               │ POST /api/relay     │  ← Next.js API Route
                               │ (서버 사이드 실행)    │     (서버에서만 외부 호출)
                               └────────┬───────────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   ┌───────────┐ ┌───────────┐ ┌───────────┐
                   │ 468 어댑터  │ │ebest 어댑터│ │ 추후 추가  │
                   │ (UTF-8)   │ │ (EUC-KR)  │ │           │
                   └───────────┘ └───────────┘ └───────────┘
```

### 핵심 모듈

| 모듈 | 파일 (예정) | 역할 |
|------|------------|------|
| 릴레이 API | `src/app/api/relay/[site]/route.ts` | 프론트 → 서버 중계 엔드포인트 |
| 세션 매니저 | `src/lib/relay/session-manager.ts` | 외부 사이트 로그인/세션 유지 |
| 468 어댑터 | `src/lib/relay/adapters/ggochbi.ts` | 468.co.kr 필드 매핑 + POST |
| ebest 어댑터 | `src/lib/relay/adapters/ebestflower.ts` | ebestflower 필드 매핑 + POST (EUC-KR) |
| 필드 매핑 | `src/lib/relay/field-mapping.ts` | 우리 주문 데이터 → 외부 필드 변환 |

### 필요 npm 패키지

- `iconv-lite` — EUC-KR 인코딩 변환 (ebestflower용)
- 나머지는 Node.js 내장 `fetch` + `URLSearchParams`로 충분

---

## 5. 상품코드 매핑 (초안)

| 우리 코드 | 우리 라벨 | ebestflower goodcode | 468.co.kr product |
|-----------|----------|---------------------|-------------------|
| CELEBRATION_3 | 축하 3단 | 35 | 축하3단 |
| CELEBRATION_4 | 축하 4단 | 37 | 축하화환 |
| CONDOLENCE_3 | 근조 3단 | 39 | 근조3단 |
| CONDOLENCE_4 | 근조 4단 | 42 | 근조화환 |
| OBJET | 오브제 | 49 | 근조오브제 |
| ORIENTAL_ORCHID | 동양란 | 04 | 동양란 |
| WESTERN_ORCHID | 서양란 | 12 | 서양란 |
| BASKET | 꽃바구니 | 02 | 꽃바구니 |
| BOUQUET | 꽃다발 | 01 | — |
| FOLIAGE | 관엽식물 | 05 | 관엽식물 |
| RICE_WREATH | 쌀화환 | 45 | — |
| FRUIT_BASKET | 과일바구니 | 44 | — |

> 매핑은 실제 운영 시 확정 필요. 일부 상품은 대상 사이트에 없을 수 있음.
