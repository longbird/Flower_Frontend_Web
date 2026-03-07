'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function CidSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">CID 설정</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">CID 설정 API가 아직 구현되지 않았습니다.</p>
          <p className="text-xs text-slate-300 mt-2">백엔드에 /admin/cid-settings 엔드포인트 추가 후 사용 가능합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
