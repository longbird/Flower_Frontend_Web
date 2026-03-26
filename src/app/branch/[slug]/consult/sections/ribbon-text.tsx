'use client';

import { useRef, useState } from 'react';
import { CONDOLENCE_PRESETS } from '@/lib/types/order-register';
import { inputClass, validateFile, ACCEPTED_FILE_TYPES } from '../utils';

interface Props {
  ribbonLeft: string;
  setRibbonLeft: (v: string) => void;
  ribbonRight: string;
  setRibbonRight: (v: string) => void;
  ribbonImage: File | null;
  setRibbonImage: (v: File | null) => void;
}

export function RibbonText({
  ribbonLeft, setRibbonLeft,
  ribbonRight, setRibbonRight,
  ribbonImage, setRibbonImage,
}: Props) {
  const [showPresets, setShowPresets] = useState(false);
  const [presetTab, setPresetTab] = useState<'celebration' | 'condolence' | 'life'>('celebration');
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
    setRibbonImage(file);
  };

  const handleRemoveFile = () => {
    setRibbonImage(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      {/* 왼쪽 문구 */}
      <div className="mb-3">
        <label className="block text-sm font-bold text-gray-900 mb-1.5">왼쪽 문구</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ribbonLeft}
            onChange={(e) => setRibbonLeft(e.target.value)}
            placeholder="예) 주식회사 에이비씨 대표 홍길동"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-[var(--branch-green)] text-white text-sm font-medium hover:bg-[var(--branch-green-hover)] transition-colors whitespace-nowrap"
          >
            리본 이미지
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* 리본 이미지 미리보기 */}
      {ribbonImage && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
          {ribbonImage.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(ribbonImage)}
              alt="리본 이미지"
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              PDF
            </div>
          )}
          <span className="text-xs text-gray-600 flex-1 truncate">{ribbonImage.name}</span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {fileError && <p className="text-xs text-red-500 mb-3">{fileError}</p>}

      {/* 오른쪽 문구 */}
      <div className="mb-3">
        <label className="block text-sm font-bold text-gray-900 mb-1.5">오른쪽 문구</label>
        <input
          type="text"
          value={ribbonRight}
          onChange={(e) => setRibbonRight(e.target.value)}
          placeholder="예) 삼가 고인의 명복을 빕니다"
          className={inputClass}
        />
      </div>

      {/* 샘플 문구 보기 */}
      <button
        type="button"
        onClick={() => setShowPresets(!showPresets)}
        className="w-full py-2.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
      >
        **샘플 문구 보기**
      </button>

      {showPresets && (
        <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex gap-1 mb-3">
            {([
              { key: 'celebration', label: '축하' },
              { key: 'condolence', label: '근조' },
              { key: 'life', label: '생활' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPresetTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  presetTab === tab.key
                    ? 'bg-[var(--branch-green)] text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CONDOLENCE_PRESETS[presetTab].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRibbonRight(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  ribbonRight === preset
                    ? 'bg-[var(--branch-green)] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[var(--branch-green)] hover:text-[var(--branch-green)]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
