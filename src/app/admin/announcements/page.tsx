'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SCOPE_LABELS: Record<string, string> = {
  ALL: '전체',
  BRANCH: '지사',
  PARTNERS: '파트너',
};

const SCOPE_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'BRANCH', label: '지사' },
  { value: 'PARTNERS', label: '파트너' },
];

interface AnnouncementForm {
  title: string;
  content: string;
  scopeType: string;
  isPinned: boolean;
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>({ title: '', content: '', scopeType: 'ALL', isPinned: false });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', page],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('size', String(pageSize));
      return api<{ items: any[]; total: number }>(`/admin/announcements?${sp.toString()}`).catch(() => ({ items: [], total: 0 }));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementForm) =>
      api('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('공지사항이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowForm(false);
      setForm({ title: '', content: '', scopeType: 'ALL', isPinned: false });
    },
    onError: () => {
      toast.error('등록에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api(`/admin/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('공지사항이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    if (confirm(`"${title}" 공지사항을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }
    createMutation.mutate(form);
  };

  const announcements = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">공지사항</h1>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? '취소' : '새 공지 작성'}
        </Button>
      </div>

      {/* 작성 폼 */}
      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="공지사항 제목"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">내용</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
                placeholder="공지사항 내용을 입력하세요"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">대상</label>
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={form.scopeType}
                  onChange={(e) => setForm({ ...form, scopeType: e.target.value })}
                >
                  {SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                />
                <label htmlFor="isPinned" className="text-sm text-slate-700">상단 고정</label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="text-center py-8 text-slate-500">로딩 중...</div>}

      {!isLoading && announcements.length === 0 && (
        <div className="text-center py-12 text-slate-400">공지사항이 없습니다.</div>
      )}

      <div className="space-y-2">
        {announcements.map((item: any) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/admin/announcements/${item.id}`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {item.isPinned && <Badge variant="destructive" className="text-[10px]">고정</Badge>}
                  <Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[item.scopeType] || item.scopeType}</Badge>
                  <span className="font-medium text-sm truncate">{item.title || '-'}</span>
                  {!item.isRead && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                </div>
                <div className="text-xs text-slate-500">
                  {item.createdByName || '-'}
                  {item.commentCount > 0 && ` · 댓글 ${item.commentCount}`}
                  {item.readCount > 0 && ` · 열람 ${item.readCount}`}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => handleDelete(e, item.id, item.title)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">총 {total}건 / {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        </div>
      )}
    </div>
  );
}
