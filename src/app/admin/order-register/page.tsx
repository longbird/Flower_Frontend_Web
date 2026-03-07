'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OrderRegisterPage() {
  const router = useRouter();
  const [messageText, setMessageText] = useState('');

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          돌아가기
        </Button>
        <h1 className="text-xl font-bold">주문 등록</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">메시지 파싱 주문 등록</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>카카오톡/SMS 메시지 붙여넣기</Label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[200px] resize-y focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              placeholder="주문 메시지를 붙여넣으세요..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!messageText.trim()}>파싱 및 등록</Button>
            <Button variant="outline" onClick={() => setMessageText('')}>초기화</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
