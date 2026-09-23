/**
 * 지사 콜패스 매핑 — 화면용 순수 로직.
 *
 * 검증 규칙은 백엔드 apps/api/src/aircpm/config/jisamap.validate.ts 와 같은 내용을 한 벌 더
 * 구현한 것이다. 여기 것은 **입력 중 즉시 경고**용이고, 최종 판정은 항상 서버다.
 * 규칙을 바꿀 일이 생기면 두 파일을 함께 고쳐야 한다.
 */

export interface JisamapSource {
  name?: string | null;
  tels: string[];
}

export interface JisamapRule {
  target: { name?: string | null; tel: string };
  sources: JisamapSource[];
  /**
   * 규칙 on/off. 관리자 화면·DB 에만 있는 필드이며 CPM 응답에는 나가지 않는다
   * (서버가 toClientRules 로 걷어낸다). 키가 없으면 활성으로 읽는다.
   */
  enabled?: boolean;
  /** 적용 방향 = 붙여넣는 앱. 키 없음 = ANY(양방향). 백엔드 jisamap.validate.ts 와 같은 정의. */
  dir?: JisamapDir;
}

export type JisamapDir = 'ANY' | 'TO_XE4' | 'TO_LOGI';
export const JISAMAP_DIRS: readonly JisamapDir[] = ['ANY', 'TO_XE4', 'TO_LOGI'];
export const JISAMAP_DIR_LABEL: Record<JisamapDir, string> = {
  ANY: '양방향',
  TO_XE4: '콜마너로 보낼 때',
  TO_LOGI: '로지로 보낼 때',
};

export function ruleDir(rule: { dir?: unknown } | null | undefined): JisamapDir {
  const d = rule?.dir;
  return d === 'TO_XE4' || d === 'TO_LOGI' ? d : 'ANY';
}

/** 두 규칙이 같은 붙여넣기에서 함께 적용될 수 있는가. 한쪽이 양방향이면 항상 겹친다. */
export function dirsOverlap(a: JisamapDir, b: JisamapDir): boolean {
  return a === 'ANY' || b === 'ANY' || a === b;
}

/** 꺼져 있다고 명시된 것만 비활성. undefined/누락은 활성이다. */
export function isRuleEnabled(rule: { enabled?: boolean } | null | undefined): boolean {
  return rule?.enabled !== false;
}

/**
 * CPM 이 실제로 받게 될 형태 — 비활성 규칙을 빼고 `enabled` 키를 제거하고 방향(dir)을 싣는다.
 * 백엔드 `jisamap.validate.ts` 의 같은 이름 함수와 동작이 같아야 한다.
 * 화면에서는 저장 요약과 중복 판정을 "CPM 이 받을 것" 기준으로 맞추는 데 쓴다.
 */
export function toClientRules(rules: JisamapRule[]): JisamapRule[] {
  if (!Array.isArray(rules)) return [];
  return rules
    .filter((r) => isRuleEnabled(r))
    .map((r) => ({ target: r.target, sources: r.sources, dir: ruleDir(r) }));
}

/**
 * 방향이 겹치는 두 활성 규칙에 함께 나오는 소스 번호(숫자만). 입력칸을 빨갛게 물들이는 데 쓴다.
 * clientRules(= toClientRules 결과)를 받는다 — 서버 검증 4번과 같은 기준이다.
 */
export function conflictingSourceDigits(clientRules: JisamapRule[]): Set<string> {
  const seenBy = new Map<string, { rule: number; dir: JisamapDir }[]>();
  const dup = new Set<string>();
  clientRules.forEach((r, i) => {
    const dir = ruleDir(r);
    (r.sources ?? []).forEach((s) => {
      (s.tels ?? []).forEach((t) => {
        const d = digitsOnly(t);
        if (!d) return;
        const prior = seenBy.get(d) ?? [];
        if (prior.some((p) => p.rule !== i && dirsOverlap(p.dir, dir))) dup.add(d);
        if (!prior.some((p) => p.rule === i)) seenBy.set(d, [...prior, { rule: i, dir }]);
      });
    });
  });
  return dup;
}

export interface JisamapValidation {
  errors: string[];
  warnings: string[];
}

/** 표기와 무관하게 숫자만 뽑는다. CPM 도 같은 방식으로 비교한다. */
export function digitsOnly(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '');
}

const MIN_DIGITS = 8;
const MAX_DIGITS = 12;

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function validateJisamapRules(rules: JisamapRule[]): JisamapValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(rules)) {
    return { errors: ['규칙 목록이 배열이 아닙니다.'], warnings };
  }

  // 방향이 겹치지 않는 규칙끼리(콜마너 전용 vs 로지 전용)는 같은 번호를 가져도 모호하지 않다.
  const seenBy = new Map<string, { rule: number; dir: JisamapDir }[]>();

  rules.forEach((rule, i) => {
    const ruleNo = i + 1;

    if (!isObject(rule)) {
      errors.push(`규칙 ${ruleNo}: 형식이 올바르지 않습니다.`);
      return;
    }

    // 꺼진 규칙은 CPM 에 나가지 않으므로 다른 규칙과 번호가 겹쳐도 모호하지 않다.
    // 나머지 검증(1~3)은 꺼진 규칙에도 적용한다 — 다시 켜는 것이 언제나 안전해야 한다.
    const enabled = isRuleEnabled(rule as { enabled?: boolean });

    const rawDir = (rule as { dir?: unknown }).dir;
    if (rawDir !== undefined && rawDir !== null && !JISAMAP_DIRS.includes(rawDir as JisamapDir)) {
      errors.push(`규칙 ${ruleNo}: 적용 방향 값 '${String(rawDir)}' 이 올바르지 않습니다.`);
    }
    const dir = ruleDir(rule);

    if (!isObject(rule.target)) {
      errors.push(`규칙 ${ruleNo}: 대상 지사 정보가 없습니다.`);
    } else {
      const targetDigits = digitsOnly(rule.target.tel);
      if (!targetDigits) {
        errors.push(`규칙 ${ruleNo}: 대상 지사의 대표번호에 숫자가 없습니다. 치환할 대상이 없습니다.`);
      } else if (targetDigits.length < MIN_DIGITS || targetDigits.length > MAX_DIGITS) {
        warnings.push(
          `규칙 ${ruleNo}: 대상 번호 '${rule.target.tel}' 이 ${MIN_DIGITS}~${MAX_DIGITS}자리가 아닙니다. 오타를 확인해 주세요.`,
        );
      }
    }

    if (!Array.isArray(rule.sources)) {
      errors.push(`규칙 ${ruleNo}: 소스 지사 목록이 배열이 아닙니다.`);
      return;
    }
    if (rule.sources.length === 0) {
      errors.push(`규칙 ${ruleNo}: 소스 지사가 없습니다. 아무도 걸리지 않는 규칙입니다.`);
      return;
    }

    rule.sources.forEach((src, j) => {
      const where = `규칙 ${ruleNo} · 소스 ${j + 1}`;

      if (!isObject(src)) {
        errors.push(`${where}: 형식이 올바르지 않습니다.`);
        return;
      }
      if (!Array.isArray(src.tels) || src.tels.length === 0) {
        errors.push(`${where}: 번호가 없습니다. 매칭 키가 없어 아무 콜도 걸리지 않습니다.`);
        return;
      }

      const withDigits = src.tels.filter((t) => digitsOnly(t));
      if (withDigits.length === 0) {
        errors.push(`${where}: 번호에 숫자가 하나도 없습니다.`);
        return;
      }
      if (withDigits.length < src.tels.length) {
        warnings.push(`${where}: 숫자가 없는 번호 항목이 있어 무시됩니다.`);
      }

      for (const tel of withDigits) {
        const digits = digitsOnly(tel);

        if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
          warnings.push(
            `${where}: '${tel}' 이 ${MIN_DIGITS}~${MAX_DIGITS}자리가 아닙니다. 오타를 확인해 주세요.`,
          );
        }

        // 같은 규칙 안의 중복은 결과가 같아 무해하므로 통과시킨다. 비활성 규칙도 마찬가지.
        if (enabled) {
          const prior = seenBy.get(digits) ?? [];
          const clash = prior.find((p) => p.rule !== i && dirsOverlap(p.dir, dir));
          if (clash) {
            errors.push(
              `소스 번호 '${tel}' 가 규칙 ${clash.rule + 1} 과 규칙 ${ruleNo} 에 중복 등장합니다. 어느 대상으로 보낼지 모호합니다.`,
            );
          }
          if (!prior.some((p) => p.rule === i)) seenBy.set(digits, [...prior, { rule: i, dir }]);
        }
      }
    });
  });

  return { errors, warnings };
}

// ─── 붙여넣기 일괄 등록 ─────────────────────────────────────────────

/**
 * 번호로 볼 최소 자릿수. 8 이 아니라 5 인 이유 —
 *  · '2호점대리' 처럼 이름에 숫자가 섞인 열을 번호로 오인하지 않으려면 하한이 필요하고,
 *  · '166-222' 같은 오타는 번호로 받아들여 화면 경고까지 가야 운영자가 알아챈다.
 * 두 요구가 만나는 자리가 5 다.
 */
const TEL_MIN_DIGITS = 5;

const looksLikeTel = (s: string) => digitsOnly(s).length >= TEL_MIN_DIGITS;

export interface PasteResult {
  sources: JisamapSource[];
  /** 번호를 못 찾아 건너뛴 줄 (헤더 행 등). 화면에 그대로 보여 준다. */
  skipped: string[];
}

/**
 * 엑셀 표를 그대로 붙여넣어 소스 목록을 만든다.
 *
 * 지원 형태 (운영자가 실제로 쓰는 것들):
 *   둘둘대리<TAB>1666-2222
 *   핸들대리<TAB>1533-8882 , 1600-8824      ← 한 지사 번호 여러 개
 *   핸들대리<TAB>1533-8882<TAB>1600-8824    ← 번호가 열로 나뉜 경우
 *   1666-2222<TAB>둘둘대리                   ← 열 순서가 반대
 *   둘둘대리 1666-2222                       ← 탭 없이 공백만
 *
 * 번호가 하나도 없는 줄은 헤더로 보고 건너뛴다.
 */
export function parsePastedSources(text: string): PasteResult {
  const sources: JisamapSource[] = [];
  const skipped: string[] = [];

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // 탭이 있으면 탭이 열 구분자다. 없으면 2칸 이상 공백, 그것도 없으면 낱말 단위로 쪼갠다.
    let cols = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
    if (cols.length === 1) cols = cols[0].split(/\s+/);
    cols = cols.map((c) => c.trim()).filter(Boolean);

    const telCols = cols.filter(looksLikeTel);
    const nameCols = cols.filter((c) => !looksLikeTel(c));

    const tels = telCols
      .flatMap((c) => c.split(/[,;/]+|\s+/))
      .map((t) => t.trim())
      .filter((t) => digitsOnly(t));

    if (tels.length === 0) {
      skipped.push(line);
      continue;
    }
    sources.push({ name: nameCols.join(' ').trim() || null, tels });
  }

  return { sources, skipped };
}

// ─── 저장 전 요약 ───────────────────────────────────────────────────

/** "11개 지사 → 공오대리(1588-0005)" — 저장 버튼을 누르기 전에 몇 건이 바뀌는지 보여 준다. */
export function summarizeRules(rules: JisamapRule[]): string[] {
  if (!Array.isArray(rules)) return [];
  return rules.map((r) => {
    const name = r?.target?.name?.trim() || '(이름 없음)';
    const tel = r?.target?.tel?.trim() || '(번호 없음)';
    const n = Array.isArray(r?.sources) ? r.sources.length : 0;
    return `${n}개 지사 → ${name}(${tel})`;
  });
}

/** 소스 한 줄의 번호 입력칸에 쓰는 표기. 태그 입력 대신 쉼표 구분을 쓴다. */
export function telsToInput(tels: string[]): string {
  return (tels ?? []).join(', ');
}

export function inputToTels(v: string): string[] {
  return String(v ?? '')
    .split(/[,;/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
