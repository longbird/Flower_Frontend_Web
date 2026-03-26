'use client';

interface Props {
  checked: boolean;
  setChecked: (v: boolean) => void;
}

export function PrivacyConsent({ checked, setChecked }: Props) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy-consent"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[var(--branch-green)] focus:ring-[var(--branch-green)] accent-[var(--branch-green)]"
        />
        <label
          htmlFor="privacy-consent"
          className="text-sm text-gray-500 leading-relaxed cursor-pointer"
        >
          주문 처리를 위해 개인정보(성함, 연락처, 주소)를 수집 및 이용하는 것에 동의합니다.
        </label>
      </div>
    </section>
  );
}
