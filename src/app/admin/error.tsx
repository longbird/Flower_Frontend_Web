'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl w-full">
        <h2 className="text-lg font-bold text-red-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-sm text-red-600 break-all">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-red-400 mt-1">Digest: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
      >
        다시 시도
      </button>
    </div>
  );
}
