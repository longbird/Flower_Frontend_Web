'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function AircpmUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">사용자 관리</h1>
        <p className="text-sm text-slate-500 mt-1">AirCPM 데스크톱 클라이언트 사용자 계정 관리.</p>
      </div>
      <Card>
        <CardContent className="p-10 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-slate-600 font-medium">준비 중입니다</p>
          <p className="text-slate-400 text-sm mt-1">
            사용자 CRUD · 권한(power) · 설정(appTitle / copyApps / pasteApps / priceUp) 편집이 곧 추가됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
