'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { digitsOnly } from '@/lib/aircpm/jisamap';
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

  const rowHasDuplicate = (telsInput: string) =>
    telsInput
      .split(/[,;/]+/)
      .map((t) => digitsOnly(t))
      .some((d) => d && duplicateDigits.has(d));

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">규칙 {index + 1}</span>
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
