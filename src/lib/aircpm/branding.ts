/**
 * AirCPM 관리자 화면의 브랜드 문구.
 *
 * 같은 코드베이스를 두 서버에 배포한다(꽃배달 본서버 / 8282call 분리 서버).
 * 두 사이트가 똑같이 보이면 운영자가 어느 쪽을 보고 있는지 헷갈리므로 env 로 덮어쓴다.
 * 미설정이면 기존 문구 그대로라 본서버 동작은 변하지 않는다.
 *
 * NEXT_PUBLIC_* 는 빌드타임에 인라인된다 — 값을 바꾸려면 재빌드가 필요하고,
 * `process.env.NEXT_PUBLIC_X` 형태로 **직접** 참조해야 치환된다(구조분해·동적 접근 불가).
 */

/** 헤더·로그인 화면의 제품명. */
export const APP_BRAND = process.env.NEXT_PUBLIC_APP_BRAND || 'AirCPM Admin';

/** 헤더 제품명 아래 한 줄. CSS 가 uppercase 처리하므로 영문이 자연스럽다. */
export const APP_SUBTITLE =
  process.env.NEXT_PUBLIC_APP_SUBTITLE || 'Device Cert Management';

/** 로그인 화면 제품명 아래 설명. */
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_APP_TAGLINE || '데스크톱 클라이언트 기기 인증 관리';
