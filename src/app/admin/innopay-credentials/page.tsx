'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getInnopayCredentials,
  updateInnopayCredentials,
} from '@/lib/api/innopay-credentials';
import type { InnopayMode } from '@/lib/payments/innopay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface FieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

function Field({ id, label, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function InnopayCredentialsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['innopay-creds'],
    queryFn: getInnopayCredentials,
  });

  const [mode, setMode] = useState<InnopayMode>('TEST');
  const [merchantId, setMerchantId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.innopay.co.kr');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      updateInnopayCredentials({ mode, merchantId, licenseKey, apiBaseUrl }),
    onSuccess: () => {
      toast.success('자격증명이 저장되었습니다.');
      setLicenseKey('');
      queryClient.invalidateQueries({ queryKey: ['innopay-creds'] });
    },
    onError: (e: Error) => {
      toast.error(e.message || '저장 실패');
    },
  });

  const handleSave = () => {
    mutate();
  };

  const isDisabled = isPending || !merchantId || !licenseKey || !apiBaseUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-bold text-slate-800">이노페이 자격증명 설정</h1>

      {/* 현재 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-700">현재 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-500">모드</dt>
            <dd>
              {data?.mode ? (
                <Badge
                  variant={data.mode === 'REAL' ? 'destructive' : 'outline'}
                  className={
                    data.mode === 'REAL'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }
                >
                  {data.mode}
                </Badge>
              ) : (
                <span className="text-slate-400">미설정</span>
              )}
            </dd>

            <dt className="text-slate-500">Merchant ID</dt>
            <dd className="font-mono text-slate-800">
              {data?.merchantId ?? <span className="text-slate-400">-</span>}
            </dd>

            <dt className="text-slate-500">API Base URL</dt>
            <dd className="font-mono break-all text-slate-800">
              {data?.apiBaseUrl ?? <span className="text-slate-400">-</span>}
            </dd>

            <dt className="text-slate-500">최종 수정</dt>
            <dd className="text-slate-800">
              {data?.updatedAt
                ? new Date(data.updatedAt).toLocaleString('ko-KR')
                : <span className="text-slate-400">-</span>}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {/* 자격증명 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-700">자격증명 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode selector */}
          <Field id="mode" label="모드">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'TEST' ? 'default' : 'outline'}
                onClick={() => setMode('TEST')}
                size="sm"
              >
                TEST
              </Button>
              <Button
                type="button"
                variant={mode === 'REAL' ? 'default' : 'outline'}
                onClick={() => setMode('REAL')}
                size="sm"
              >
                REAL
              </Button>
            </div>
          </Field>

          {/* Merchant ID */}
          <Field id="merchant-id" label="Merchant ID (MID)">
            <Input
              id="merchant-id"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="MID를 입력하세요"
            />
          </Field>

          {/* License Key */}
          <Field id="license-key" label="License Key">
            <Input
              id="license-key"
              type="password"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="저장 후 노출되지 않음"
            />
          </Field>

          {/* API Base URL */}
          <Field id="api-base-url" label="API Base URL">
            <Input
              id="api-base-url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.innopay.co.kr"
            />
          </Field>

          {/* Save button */}
          <Button
            type="button"
            className="w-full"
            disabled={isDisabled}
            onClick={handleSave}
          >
            저장
          </Button>

          <p className="text-xs text-slate-500">
            저장 시 라이선스 키는 서버에서 AES-256-GCM으로 암호화되어 보관됩니다. 입력 후 화면에서는 비워집니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
