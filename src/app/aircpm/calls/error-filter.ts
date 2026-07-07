// 콜 조회 "오류 필터" 옵션 ↔ API 파라미터 매핑.
//
// 서버 페이지네이션이라 유형별 필터는 클라이언트에서 나눌 수 없고 백엔드가
// errorType 을 받아야 실제로 좁혀진다. errorType 미지원(구) 백엔드에서도
// 최소한 '오류 전체'로 걸러지도록 postprocess/paste 도 errorOnly=true 를 함께 보낸다
// (우아한 degradation — 백엔드 반영 후 자동으로 유형별로 좁혀짐).

export type CallErrorFilter = 'all' | 'error' | 'postprocess' | 'paste';

export type CallErrorType = 'postprocess' | 'paste';

export const CALL_ERROR_OPTIONS: Array<{ value: CallErrorFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'error', label: '오류 전체' },
  { value: 'postprocess', label: '후처리 실패' },
  { value: 'paste', label: '붙여넣기 실패' },
];

export interface CallErrorParams {
  errorOnly: boolean;
  errorType?: CallErrorType;
}

export function errorFilterToParams(filter: CallErrorFilter): CallErrorParams {
  switch (filter) {
    case 'error':
      return { errorOnly: true };
    case 'postprocess':
      return { errorOnly: true, errorType: 'postprocess' };
    case 'paste':
      return { errorOnly: true, errorType: 'paste' };
    case 'all':
    default:
      return { errorOnly: false };
  }
}
