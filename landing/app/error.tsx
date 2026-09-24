'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  return (
    <main className="pf flex min-h-screen flex-col items-start justify-center">
      <div className="pf-wrap">
        <h1 className="pf-display pf-h2 max-w-[18ch]">
          Something went wrong on this page.
        </h1>
        <p className="pf-body mt-4 text-ink-soft">
          Try again. If it keeps happening, the rest of the site still works.
        </p>
        <button type="button" onClick={reset} className="pf-btn mt-8">
          Try again
        </button>
      </div>
    </main>
  );
}
