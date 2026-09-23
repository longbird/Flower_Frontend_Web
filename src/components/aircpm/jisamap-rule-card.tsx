'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { digitsOnly, JISAMAP_DIR_LABEL, JISAMAP_DIRS, type JisamapDir } from '@/lib/aircpm/jisamap';
import { newSource, type EditorRule, type EditorSource } from '@/lib/aircpm/jisamap-editor';

/**
 * 규칙 한 건(대상 지사 + 소스 지사 목록) 편집 카드.
 * 상태는 갖지 않는다 — 모든 변경은 새 객체를 만들어 onChange 로 올린다.
 */

interface Props {
  rule: EditorRule;
  index: number;
  /** 이 번호가 다른 규칙에도 나온다 — 저장하면 서버가 거절한다. */
  duplicateDigits: Set<string>;
  onChange: (rule: EditorRule) => void;
  onRemove: () => void;
  onPaste: () => void;
  disabled?: boolean;
}

export function JisamapRuleCard({
  rule,
  index,
  duplicateDigits,
  onChange,
  onRemove,
  onPaste,
  disabled,
}: Props) {
  const patchSource = (id: string, patch: Partial<EditorSource>) =>
    onChange({
      ...rule,
      sources: rule.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  const removeSource = (id: string) =>
    onChange({ ...rule, sources: rule.sources.filter((s) => s.id !== id) });

  const addSource = () => onChange({ ...rule, sources: [...rule.sources, newSource()] });

  // 꺼진 규칙은 중복 검사 대상이 아니다. 저장은 되는데 빨갛게 두면 왜 되는지 설명이 안 된다.
  const rowHasDuplicate = (telsInput: string) =>
    rule.enabled &&
    telsInput
      .split(/[,;/]+/)
      .map((t) => digitsOnly(t))
      .some((d) => d && duplicateDigits.has(d));

  return (
    <Card className={rule.enabled ? undefined : 'bg-slate-50'}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid={`rule-enabled-${index}`}
                aria-label={`규칙 ${index + 1} 사용`}
                checked={rule.enabled}
                onChange={() => onChange({ ...rule, enabled: !rule.enabled })}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-300 accent-emerald-600"
              />
              <span className="text-sm font-semibold text-slate-900">규칙 {index + 1}</span>
            </label>
            {!rule.enabled && (
              <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 border-slate-300">
                비활성 · CPM 에 내려가지 않음
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={onRemove}
            disabled={disabled}
          >
            규칙 삭제
          </Button>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">적용 방향</label>
            {/* 붙여넣는 앱 기준. 한 지사의 규칙이 양방향 운영 PC 에 똑같이 내려가므로 한쪽 전용 규칙은 여기서 좁힌다. */}
            <select
              value={rule.dir}
              onChange={(e) => onChange({ ...rule, dir: e.target.value as JisamapDir })}
              disabled={disabled}
              aria-label={`규칙 ${index + 1} 적용 방향`}
              data-testid={`rule-dir-${index}`}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {JISAMAP_DIRS.map((d) => (
                <option key={d} value={d}>
                  {JISAMAP_DIR_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">대상 지사명</label>
            <Input
              value={rule.targetName}
              onChange={(e) => onChange({ ...rule, targetName: e.target.value })}
              placeholder="공오대리"
              disabled={disabled}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              대상 대표번호 <span className="text-red-500">*</span>
            </label>
            <Input
              value={rule.targetTel}
              onChange={(e) => onChange({ ...rule, targetTel: e.target.value })}
              placeholder="1588-0005"
              disabled={disabled}
              aria-label={`규칙 ${index + 1} 대상 대표번호`}
            />
          </div>
        </div>

        <div className="pt-1">
          <p className="text-xs text-slate-500 mb-2">이 지사들에서 온 콜을 위 지사로 보냅니다</p>

          <div className="space-y-2">
            {rule.sources.map((s, j) => {
              const dup = rowHasDuplicate(s.telsInput);
              return (
                <div key={s.id} className="flex items-center gap-2 flex-wrap">
                  <Input
                    className="w-[150px]"
                    value={s.name}
                    onChange={(e) => patchSource(s.id, { name: e.target.value })}
                    placeholder="지사명 (선택)"
                    disabled={disabled}
                    aria-label={`규칙 ${index + 1} 소스 ${j + 1} 지사명`}
                  />
                  <Input
                    className={`flex-1 min-w-[180px] ${dup ? 'border-red-400 bg-red-50' : ''}`}
                    value={s.telsInput}
                    onChange={(e) => patchSource(s.id, { telsInput: e.target.value })}
                    placeholder="1533-8882, 1600-8824"
                    disabled={disabled}
                    aria-label={`규칙 ${index + 1} 소스 ${j + 1} 번호`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeSource(s.id)}
                    disabled={disabled}
                    aria-label={`규칙 ${index + 1} 소스 ${j + 1} 삭제`}
                  >
                    삭제
                  </Button>
                </div>
              );
            })}
            {rule.sources.length === 0 && (
              <p className="text-xs text-red-600">소스 지사가 없습니다. 아무 콜도 걸리지 않습니다.</p>
            )}
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" variant="outline" onClick={addSource} disabled={disabled}>
              + 소스 지사 추가
            </Button>
            <Button size="sm" variant="outline" onClick={onPaste} disabled={disabled}>
              붙여넣기로 일괄 추가
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
