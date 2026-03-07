'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SCOPE_LABELS: Record<string, string> = {
  ALL: '전체',
  BRANCH: '지사',
  PARTNERS: '파트너',
};

export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', isPinned: false });

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['admin-announcement', id],
    queryFn: () => api<any>(`/admin/announcements/${id}`).catch(() => null),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; content: string; isPinned: boolean }) =>
      api(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('공지사항이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-announcement', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setIsEditing(false);
    },
    onError: () => {
      toast.error('수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/admin/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('공지사항이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      router.replace('/admin/announcements');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });

  const startEdit = () => {
    if (announcement) {
      setEditForm({
        title: announcement.title || '',
        content: announcement.content || '',
        isPinned: announcement.isPinned || false,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editForm.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!editForm.content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }
    updateMutation.mutate(editForm);
  };

  const handleDelete = () => {
    if (confirm('이 공지사항을 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!announcement) return <div className="text-center py-12 text-red-500">공지사항을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/admin/announcements')}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            목록
          </Button>
          <h1 className="text-xl font-bold">공지사항 상세</h1>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>수정</Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:border-red-200"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">내용</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[160px]"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editPinned"
                checked={editForm.isPinned}
                onChange={(e) => setEditForm({ ...editForm, isPinned: e.target.checked })}
              />
              <label htmlFor="editPinned" className="text-sm text-slate-700">상단 고정</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>취소</Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {announcement.isPinned && <Badge variant="destructive" className="text-[10px]">고정</Badge>}
              <Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[announcement.scopeType] || announcement.scopeType}</Badge>
            </div>
            <CardTitle className="text-lg">{announcement.title}</CardTitle>
            <div className="text-xs text-slate-500 mt-1">
              {announcement.createdByName || '-'}
              {announcement.createdByRole && ` (${announcement.createdByRole})`}
              {' · '}
              {announcement.createdAt ? new Date(announcement.createdAt).toLocaleString('ko-KR') : '-'}
              {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                <span className="text-slate-400"> (수정: {new Date(announcement.updatedAt).toLocaleString('ko-KR')})</span>
              )}
              {announcement.readCount != null && ` · 열람 ${announcement.readCount}명`}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-t pt-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{announcement.content || '-'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
