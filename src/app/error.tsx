'use client';

import { useEffect } from 'react';
import ErrorShell from './components/ErrorShell';

// ── Error boundary (root segment) ─────────────────────────────────────────
// An error thrown while rendering anything below the root layout lands here.
// It has to be a Client Component (that is the API), and `reset()` re-renders
// the failed segment in place — so "Riprova" is a real retry, not a reload that
// would throw away whatever the visitor had typed.
//
// The console report includes the digest: that is the identifier the platform
// logs (Vercel) attach to the full stack trace, so a visitor quoting the code
// on screen is enough to find the exact failure.
//
// Errors thrown in the root LAYOUT itself cannot be caught here — those are
// handled by app/global-error.tsx.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error-boundary]', error.digest ?? '(no digest)', error);
  }, [error]);

  return <ErrorShell variant="error" digest={error.digest} onRetry={reset} />;
}
