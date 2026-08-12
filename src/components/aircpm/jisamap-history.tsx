'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { summarizeRules } from '@/lib/aircpm/jisamap';
import type { JisamapHistoryItem } from '@/lib/api/aircpm-jisamap';

/**
 * 버전 이력 + 되돌리기.
 *
 * ★되돌리기 전에 **그 버전의 내용을 볼 수 있어야 한다.** 배차앱 설정(targetapps)은 과거 버전
 *   본문을 주는 API 가 없어 "일단 롤백해서 확인" 하는 구조인데, 지사 매핑에서 그렇게 하면
 *   확인하는 동안 잘못된 규칙이 CPM 에 그대로 나간다. 그래서 서버가 rules 를 함께 내려준다.
 */

function fmtDateTime(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface Props {
  items: JisamapHistoryItem[];
  isLoading: boolean;
  onRevert: (item: JisamapHistoryItem) => void;
  disabled?: boolean;
}

export function JisamapHistory({ items, isLoading, onRevert, disabled }: Props) {
  const [viewing, setViewing] = useState<JisamapHistoryItem | null>(null);

  if (isLoading) return <div className="text-center py-8 text-slate-500">로딩 중...</div>;
  if (items.length === 0)
    return <div className="text-center py-12 text-slate-400">이력이 없습니다.</div>;

  return (
    <>
      <div className="space-y-2">
        {items.map((it) => (
          <Card key={it.version} className={it.isActive ? 'ring-1 ring-emerald-200' : ''}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    it.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <span className="font-semibold text-sm text-slate-900 tabular-nums">
                  v{it.version}
                </span>
                {it.isActive && (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                    적용 중
                  </Badge>
                )}
                <span className="text-xs text-slate-500 tabular-nums">
                  {fmtDateTime(it.createdAt)}
                </span>
                <span className="text-xs text-slate-400">
                  by {it.createdBy != null ? `admin#${it.createdBy}` : '시드'}
                </span>
                <span className="text-xs text-slate-500">
                  · 규칙 {it.rules.length}건
                </span>
                {it.note && <span className="text-xs text-slate-500 truncate">· {it.note}</span>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setViewing(it)}>
                  내용 보기
                </Button>
                {!it.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRevert(it)}
                    disabled={disabled}
                  >
                    되돌리기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>v{viewing?.version} 내용</DialogTitle>
            <DialogDescription>
              {viewing && (
                <span className="tabular-nums">
                  {fmtDateTime(viewing.createdAt)} · by{' '}
                  {viewing.createdBy != null ? `admin#${viewing.createdBy}` : '시드'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[55vh] overflow-auto">
            {(viewing?.rules ?? []).map((r, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  {summarizeRules([r])[0]}
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {(r.sources ?? []).map((s, j) => (
                      <tr key={j} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 text-slate-700 w-[40%]">{s.name || '—'}</td>
                        <td className="py-1 text-slate-600 tabular-nums">
                          {(s.tels ?? []).join(' , ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {(viewing?.rules ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">규칙이 없는 버전입니다.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
