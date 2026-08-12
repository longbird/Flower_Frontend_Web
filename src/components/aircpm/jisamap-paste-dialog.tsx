'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parsePastedSources, type JisamapSource } from '@/lib/aircpm/jisamap';

/**
 * 엑셀 표 붙여넣기 → 소스 지사 일괄 등록.
 * 확정 전에 **파싱 결과를 그대로 보여준다** — 잘못 읽힌 줄을 저장 뒤에 발견하면 정산이 틀어진다.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sources: JisamapSource[]) => void;
}

export function JisamapPasteDialog({ open, onOpenChange, onConfirm }: Props) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parsePastedSources(text), [text]);

  const close = () => {
    setText('');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>붙여넣기로 소스 지사 추가</DialogTitle>
          <DialogDescription>
            엑셀 표를 그대로 붙여넣으세요. <code>지사명 → 대표번호</code> 순서든 반대든 읽습니다.
            한 지사에 번호가 여러 개면 쉼표나 탭으로 나눠 적으면 됩니다.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          aria-label="붙여넣을 표"
          placeholder={'둘둘대리\t1666-2222\n핸들대리\t1533-8882 , 1600-8824'}
          className="w-full px-3 py-2.5 text-[13px] rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono leading-snug resize-y"
        />

        {text.trim() && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">
              읽은 결과 · {parsed.sources.length}개 지사
            </p>
            <div className="max-h-[240px] overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {parsed.sources.map((s, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 text-slate-700 w-[40%]">{s.name || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600 tabular-nums">
                        {s.tels.join(' , ')}
                      </td>
                    </tr>
                  ))}
                  {parsed.sources.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-400 text-center">
                        번호를 찾지 못했습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {parsed.skipped.length > 0 && (
              <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-0.5">
                <p className="font-medium">번호가 없어 건너뛴 줄 {parsed.skipped.length}개</p>
                {parsed.skipped.slice(0, 5).map((l, i) => (
                  <div key={i} className="font-mono truncate">
                    {l}
                  </div>
                ))}
                {parsed.skipped.length > 5 && <div>… 외 {parsed.skipped.length - 5}줄</div>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            취소
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={parsed.sources.length === 0}
            onClick={() => {
              onConfirm(parsed.sources);
              close();
            }}
          >
            {parsed.sources.length}개 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
