import { describe, it, expect } from 'vitest';
import {
  digitsOnly,
  inputToTels,
  parsePastedSources,
  summarizeRules,
  telsToInput,
  validateJisamapRules,
  type JisamapRule,
} from '@/lib/aircpm/jisamap';

// 2026-08-12 AirCPM 요청서 §2 의 실제 표.
const REAL_RULES: JisamapRule[] = [
  {
    target: { name: '공오대리', tel: '1588-0005' },
    sources: [
      { name: '둘둘대리', tels: ['1666-2222'] },
      { name: '집으로대리', tels: ['1588-9494'] },
      { name: '핸들대리', tels: ['1533-8882', '1600-8824'] },
      { name: '집으로대리', tels: ['1688-9611'] },
      { name: '공오대리', tels: ['1588-0005'] },
    ],
  },
  {
    target: { name: 'HM법인전용', tel: '1544-6977' },
    sources: [{ name: '핸들법인', tels: ['1544-6977'] }],
  },
];

describe('digitsOnly', () => {
  it('표기가 달라도 같은 숫자열이 된다', () => {
    expect(digitsOnly('1588-0005')).toBe('15880005');
    expect(digitsOnly('1588 - 0005')).toBe('15880005');
    expect(digitsOnly('[1588-0005]')).toBe('15880005');
    expect(digitsOnly(null)).toBe('');
  });
});

describe('validateJisamapRules', () => {
  it('요청서 실제 데이터가 통과한다', () => {
    const r = validateJisamapRules(REAL_RULES);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('걸면 안 되는 검증 3가지를 걸지 않는다 (이름 중복 / 자기참조 / 번호 2개)', () => {
    // REAL_RULES 자체가 셋 다 위반한다 — 위 테스트가 곧 이 보장이지만, 의도를 남긴다.
    const names = REAL_RULES[0].sources.map((s) => s.name);
    expect(names.filter((n) => n === '집으로대리')).toHaveLength(2);
    expect(REAL_RULES[0].sources.some((s) => s.tels.length === 2)).toBe(true);
    expect(REAL_RULES[0].sources.some((s) => s.tels[0] === REAL_RULES[0].target.tel)).toBe(true);
    expect(validateJisamapRules(REAL_RULES).errors).toEqual([]);
  });

  it('대상 번호가 비면 거절', () => {
    const r = validateJisamapRules([
      { target: { name: 'A', tel: '' }, sources: [{ name: 'S', tels: ['1666-2222'] }] },
    ]);
    expect(r.errors).toHaveLength(1);
  });

  it('소스가 없으면 거절', () => {
    const r = validateJisamapRules([{ target: { name: 'A', tel: '1588-0005' }, sources: [] }]);
    expect(r.errors).toHaveLength(1);
  });

  it('규칙 간 소스 번호 중복은 표기가 달라도 잡는다', () => {
    const r = validateJisamapRules([
      { target: { name: 'A', tel: '1588-0005' }, sources: [{ name: 'S', tels: ['1666-2222'] }] },
      { target: { name: 'B', tel: '1544-6977' }, sources: [{ name: 'S', tels: ['16662222'] }] },
    ]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('중복');
  });

  it('자릿수 이상은 경고만 (저장 가능)', () => {
    const r = validateJisamapRules([
      { target: { name: 'A', tel: '1588-0005' }, sources: [{ name: 'S', tels: ['166-22'] }] },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
  });

  it('빈 규칙 목록은 유효하다', () => {
    expect(validateJisamapRules([]).errors).toEqual([]);
  });
});

describe('parsePastedSources', () => {
  it('지사명 TAB 대표번호 표를 그대로 받는다', () => {
    const { sources } = parsePastedSources('둘둘대리\t1666-2222\n이삼대리\t1577-2233');
    expect(sources).toEqual([
      { name: '둘둘대리', tels: ['1666-2222'] },
      { name: '이삼대리', tels: ['1577-2233'] },
    ]);
  });

  it('한 칸에 번호가 여러 개면 나눠 담는다', () => {
    const { sources } = parsePastedSources('핸들대리\t1533-8882 , 1600-8824');
    expect(sources[0]).toEqual({ name: '핸들대리', tels: ['1533-8882', '1600-8824'] });
  });

  it('번호가 열로 나뉘어 있어도 합친다', () => {
    const { sources } = parsePastedSources('핸들대리\t1533-8882\t1600-8824');
    expect(sources[0].tels).toEqual(['1533-8882', '1600-8824']);
  });

  it('열 순서가 반대여도 번호를 알아본다', () => {
    const { sources } = parsePastedSources('1666-2222\t둘둘대리');
    expect(sources[0]).toEqual({ name: '둘둘대리', tels: ['1666-2222'] });
  });

  it('탭 없이 공백만 있어도 나눈다', () => {
    const { sources } = parsePastedSources('둘둘대리 1666-2222');
    expect(sources[0]).toEqual({ name: '둘둘대리', tels: ['1666-2222'] });
  });

  it('헤더 행처럼 번호가 없는 줄은 건너뛰고 알려 준다', () => {
    const { sources, skipped } = parsePastedSources('지사명\t대표번호\n둘둘대리\t1666-2222');
    expect(sources).toHaveLength(1);
    expect(skipped).toEqual(['지사명\t대표번호']);
  });

  it('이름에 숫자가 섞여 있어도 번호로 오인하지 않는다', () => {
    const { sources } = parsePastedSources('2호점대리\t1666-2222');
    expect(sources[0]).toEqual({ name: '2호점대리', tels: ['1666-2222'] });
  });

  it('번호만 있는 줄은 이름 없이 담는다', () => {
    const { sources } = parsePastedSources('1666-2222');
    expect(sources[0]).toEqual({ name: null, tels: ['1666-2222'] });
  });

  it('빈 줄과 빈 입력을 안전하게 넘긴다', () => {
    expect(parsePastedSources('\n\n  \n').sources).toEqual([]);
    expect(parsePastedSources('').sources).toEqual([]);
  });

  it('요청서 그룹1 표를 통째로 붙여넣으면 11행이 된다', () => {
    const table = [
      '지사명\t대표번호',
      '둘둘대리\t1666-2222',
      '이삼대리\t1577-2233',
      '삼삼대리\t1877-3333',
      '삼칠대리\t1588-3737',
      '공오대리\t1588-0005',
      '사오대리\t1688-4545',
      '육팔대리\t1688-6868',
      '집으로대리\t1588-9494',
      '핸들대리\t1533-8882 , 1600-8824',
      '안심대리\t1555-1822',
      '집으로대리\t1688-9611',
    ].join('\n');
    const { sources, skipped } = parsePastedSources(table);
    expect(sources).toHaveLength(11);
    expect(skipped).toHaveLength(1);
    expect(sources.find((s) => s.name === '핸들대리')?.tels).toHaveLength(2);
  });
});

describe('summarizeRules', () => {
  it('규칙마다 몇 개 지사가 어디로 가는지 한 줄로 만든다', () => {
    expect(summarizeRules(REAL_RULES)).toEqual([
      '5개 지사 → 공오대리(1588-0005)',
      '1개 지사 → HM법인전용(1544-6977)',
    ]);
  });

  it('비어 있는 대상도 표시는 된다', () => {
    expect(summarizeRules([{ target: { name: '', tel: '' }, sources: [] }])).toEqual([
      '0개 지사 → (이름 없음)((번호 없음))',
    ]);
  });
});

describe('telsToInput / inputToTels', () => {
  it('쉼표 구분 입력과 배열을 오간다', () => {
    expect(telsToInput(['1533-8882', '1600-8824'])).toBe('1533-8882, 1600-8824');
    expect(inputToTels('1533-8882, 1600-8824')).toEqual(['1533-8882', '1600-8824']);
    expect(inputToTels('  1533-8882 ; 1600-8824  ')).toEqual(['1533-8882', '1600-8824']);
    expect(inputToTels('')).toEqual([]);
  });
});
