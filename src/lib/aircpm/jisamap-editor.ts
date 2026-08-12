import {
  inputToTels,
  isRuleEnabled,
  telsToInput,
  type JisamapRule,
  type JisamapSource,
} from './jisamap';

/**
 * 화면 편집용 모델.
 *
 * 왜 서버 모델(JisamapRule)을 그대로 편집하지 않는가:
 *  1. 번호는 쉼표 구분 **문자열**로 입력받는다. 키 입력마다 배열로 바꾸면 '1533-8882, ' 처럼
 *     입력 중인 쉼표가 사라져 커서가 튄다. 문자열 원본을 그대로 들고 있다가 저장 때만 바꾼다.
 *  2. 행을 지우거나 순서를 바꿀 때 React key 가 필요한데, 서버 모델에는 식별자가 없다.
 *     여기에 id 를 두면 백엔드 DTO(whitelist·forbidNonWhitelisted)에 없는 필드를 보내
 *     400 을 맞는 일도 없다 — 전송 직전에 toWireRules 가 걷어낸다.
 */

export interface EditorSource {
  id: string;
  name: string;
  /** 쉼표 구분 원문. 예: '1533-8882, 1600-8824' */
  telsInput: string;
}

export interface EditorRule {
  id: string;
  targetName: string;
  targetTel: string;
  sources: EditorSource[];
  /** 꺼두면 소스 목록은 그대로 보존한 채 CPM 에만 내려가지 않는다. */
  enabled: boolean;
}

let seq = 0;
export function nextId(prefix = 'r'): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function newSource(src?: Partial<JisamapSource>): EditorSource {
  return {
    id: nextId('s'),
    name: src?.name ?? '',
    telsInput: telsToInput(src?.tels ?? []),
  };
}

export function newRule(): EditorRule {
  return { id: nextId('r'), targetName: '', targetTel: '', sources: [newSource()], enabled: true };
}

export function fromWireRules(rules: JisamapRule[] | undefined): EditorRule[] {
  return (rules ?? []).map((r) => ({
    id: nextId('r'),
    targetName: r?.target?.name ?? '',
    targetTel: r?.target?.tel ?? '',
    sources: (r?.sources ?? []).map((s) => newSource(s)),
    // enabled 키가 없던 설정(이 기능 이전에 저장된 것)은 활성으로 읽는다.
    enabled: isRuleEnabled(r),
  }));
}

export function toWireRules(rules: EditorRule[]): JisamapRule[] {
  return rules.map((r) => ({
    target: { name: r.targetName.trim(), tel: r.targetTel.trim() },
    sources: r.sources.map((s) => ({ name: s.name.trim(), tels: inputToTels(s.telsInput) })),
    // 항상 명시적으로 실어 보낸다 — 이력에서 그 시점의 on/off 를 눈으로 확인할 수 있어야 한다.
    enabled: r.enabled,
  }));
}
