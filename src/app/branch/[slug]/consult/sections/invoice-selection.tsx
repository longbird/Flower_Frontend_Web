'use client';

import { useRef, useState } from 'react';
import type { InvoiceType } from '@/lib/branch/types';
import { validateFile, ACCEPTED_FILE_TYPES } from '../utils';

interface Props {
  invoiceType: InvoiceType;
  setInvoiceType: (v: InvoiceType) => void;
  businessRegFile: File | null;
  setBusinessRegFile: (v: File | null) => void;
  senderPhone?: string;
  cashReceiptPhone: string;
  setCashReceiptPhone: (v: string) => void;
}

export function InvoiceSelection({
  invoiceType, setInvoiceType,
  businessRegFile, setBusinessRegFile,
  senderPhone,
  cashReceiptPhone, setCashReceiptPhone,
}: Props) {
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError('');
    setBusinessRegFile(file);
  };

  const handleRemoveFile = () => {
    setBusinessRegFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const options: { value: InvoiceType; label: string }[] = [
    { value: 'NONE', label: '없음' },
    { value: 'INVOICE', label: '계산서 발행' },
    { value: 'CASH_RECEIPT', label: '현금영수증 발행' },
  ];

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">증빙 서류</h3>
      <div className="flex items-center gap-4 flex-wrap">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="invoiceType"
              value={opt.value}
              checked={invoiceType === opt.value}
              onChange={() => setInvoiceType(opt.value)}
              className="w-4 h-4 accent-[var(--branch-green)]"
            />
            <span className="text-sm text-gray-900 font-medium">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* 계산서: 사업자등록증 첨부 */}
      {invoiceType === 'INVOICE' && (
        <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 text-center mb-3">
            사업자등록증 첨부 (계산서 발행용)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              파일 선택
            </button>
            <span className="text-sm text-gray-500 truncate flex-1">
              {businessRegFile ? businessRegFile.name : '선택된 파일 없음'}
            </span>
            {businessRegFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-xs text-gray-400 mt-2 text-center">
            jpg, png, pdf 파일만 가능 / 최대 5MB
          </p>
          {fileError && <p className="text-xs text-red-500 mt-1 text-center">{fileError}</p>}
        </div>
      )}

      {/* 현금영수증: 발행 전화번호 입력 */}
      {invoiceType === 'CASH_RECEIPT' && (
        <div className="mt-3 p-4 rounded-xl bg-green-50 border border-green-100">
          <label className="block text-sm font-medium text-green-800 mb-2">
            현금영수증 발행 전화번호
          </label>
          <input
            type="tel"
            value={cashReceiptPhone}
            onChange={(e) => setCashReceiptPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full px-4 py-2.5 rounded-lg border border-green-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-colors"
          />
          <p className="text-xs text-green-600 mt-1.5">주문자 번호가 기본 입력됩니다. 다른 번호로 변경 가능합니다.</p>
        </div>
      )}
    </section>
  );
}
