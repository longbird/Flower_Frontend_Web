import { describe, it, expect } from 'vitest';
import {
  errorFilterToParams,
  CALL_ERROR_OPTIONS,
} from '@/app/aircpm/calls/error-filter';

describe('errorFilterToParams', () => {
  it('전체 → errorOnly=false, errorType 없음', () => {
    expect(errorFilterToParams('all')).toEqual({ errorOnly: false });
  });

  it('오류 전체 → errorOnly=true, errorType 없음', () => {
    expect(errorFilterToParams('error')).toEqual({ errorOnly: true });
  });

  it('후처리 실패 → errorOnly=true + errorType=postprocess (구 백엔드 degradation)', () => {
    expect(errorFilterToParams('postprocess')).toEqual({
      errorOnly: true,
      errorType: 'postprocess',
    });
  });

  it('붙여넣기 실패 → errorOnly=true + errorType=paste', () => {
    expect(errorFilterToParams('paste')).toEqual({
      errorOnly: true,
      errorType: 'paste',
    });
  });
});

describe('CALL_ERROR_OPTIONS', () => {
  it('4개 옵션(전체/오류 전체/후처리 실패/붙여넣기 실패)', () => {
    expect(CALL_ERROR_OPTIONS.map((o) => o.value)).toEqual([
      'all',
      'error',
      'postprocess',
      'paste',
    ]);
  });
});
