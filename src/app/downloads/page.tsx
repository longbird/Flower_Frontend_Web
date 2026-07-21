'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, Monitor, Smartphone } from 'lucide-react';
import {
  type DownloadArtifact,
  buildDownloadHref,
  fetchDownloadsManifest,
  formatBytes,
} from '@/lib/aircpm/downloads';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 공개 다운로드 페이지 — 로그인 없이 접근한다(/aircpm/* 인증 가드 밖의 앱 루트).
 * 데스크톱 업데이터와 모바일 APK 를 매니페스트에서 읽어 카드로 보여준다.
 */
export default function DownloadsPage() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['downloads-manifest'],
    queryFn: fetchDownloadsManifest,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <header className="mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-sm mx-auto mb-4">
            <Download className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">자동콜패스 다운로드</h1>
          <p className="text-sm text-slate-500 mt-1.5">설치 파일을 아래에서 내려받으세요.</p>
        </header>

        {isLoading && <LoadingCards />}

        {isError && <ErrorCard onRetry={() => refetch()} retrying={isFetching} />}

        {data && (
          <div className="space-y-4">
            <DownloadCard
              icon={<Monitor className="w-6 h-6 text-violet-600" />}
              iconWrap="bg-violet-50"
              title="CPM 데스크톱 업데이터"
              description="실행하면 최신 CPM 을 자동으로 설치·갱신합니다. (Windows)"
              artifact={data.desktop}
              ariaLabel="데스크톱 업데이터 다운로드"
            />
            <DownloadCard
              icon={<Smartphone className="w-6 h-6 text-sky-600" />}
              iconWrap="bg-sky-50"
              title="CPM 모바일 앱"
              description="Android 기기에 설치합니다. 최초 설치 시 '알 수 없는 출처' 허용이 필요합니다."
              artifact={data.mobile}
              ariaLabel="모바일 앱 다운로드"
            />
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
          로그인·기기 승인 후 이용할 수 있습니다. 승인 문의는 관리자에게 연락하세요.
        </p>
      </div>
    </div>
  );
}

function DownloadCard({
  icon,
  iconWrap,
  title,
  description,
  artifact,
  ariaLabel,
}: {
  icon: React.ReactNode;
  iconWrap: string;
  title: string;
  description: string;
  artifact: DownloadArtifact;
  ariaLabel: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>v{artifact.version}</span>
            <span aria-hidden>·</span>
            <span>{formatBytes(artifact.sizeBytes)}</span>
            <span aria-hidden>·</span>
            <span>{artifact.updatedAt}</span>
          </div>
        </div>
        <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
          <a href={buildDownloadHref(artifact.file)} aria-label={ariaLabel} download>
            <Download className="w-4 h-4 mr-1.5" />
            다운로드
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardContent className="p-5 flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full max-w-xs" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorCard({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-600">다운로드 정보를 불러오지 못했습니다.</p>
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          {retrying ? '다시 시도 중...' : '다시 시도'}
        </Button>
      </CardContent>
    </Card>
  );
}
