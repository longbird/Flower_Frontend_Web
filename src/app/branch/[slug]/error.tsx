'use client';

export default function BranchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: 600, margin: '2rem auto' }}>
      <h2 style={{ color: 'red' }}>Branch Error</h2>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f5f5f5', padding: '1rem', borderRadius: 8 }}>
        {error.message}
      </pre>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#fff0f0', padding: '1rem', borderRadius: 8, fontSize: 12 }}>
        {error.stack}
      </pre>
      {error.digest && <p>Digest: {error.digest}</p>}
      <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
        다시 시도
      </button>
    </div>
  );
}
