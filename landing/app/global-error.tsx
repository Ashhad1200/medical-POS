'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
        <p style={{ color: '#666', maxWidth: 360 }}>
          The application failed to load. Please refresh.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: '#4f46e5',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </body>
    </html>
  );
}
