'use client';

import { useEffect } from 'react';

// ── Global error (last resort) ────────────────────────────────────────────
// This is the boundary for failures in the ROOT LAYOUT itself: at that point
// the layout — and with it the providers, the fonts and every shared style —
// may be exactly what failed, so this file must not rely on any of it.
//
// Hard constraints, deliberately respected:
//   • it renders its OWN <html> and <body> (Next requires it);
//   • no imports from the app: no providers, no icon set, no BorderGlow, no
//     translations module — only React and inline styles. A fallback that
//     shares a dependency with the broken tree is not a fallback;
//   • Italian copy only (the language cookie lives behind a header read that
//     may have failed): a single, correct sentence beats three that cannot
//     load.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#010101',
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(45,212,191,0.10), rgba(45,212,191,0) 62%)',
          color: '#e5e7eb',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: '520px',
            boxSizing: 'border-box',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '24px',
            backgroundColor: 'rgba(8,20,16,0.72)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,212,191,0.10)',
            padding: '40px 28px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(45,212,191,0.9)',
            }}
          >
            Errore imprevisto
          </p>

          <h1 style={{ margin: '18px 0 0', fontSize: '24px', lineHeight: 1.25, color: '#ffffff' }}>
            Qualcosa è andato storto
          </h1>

          <p style={{ margin: '14px 0 0', fontSize: '14px', lineHeight: 1.6, color: '#9ca3af' }}>
            Il sito non è riuscito a caricarsi. Riprova: nella maggior parte dei casi basta
            ricaricare. Se continua, scrivimi a{' '}
            <a href="mailto:info@tiadesigns.it" style={{ color: '#2dd4bf', textDecoration: 'underline' }}>
              info@tiadesigns.it
            </a>
            .
          </p>

          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '999px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '13px 26px',
                boxShadow: '0 12px 30px rgba(13,148,136,0.28)',
              }}
            >
              Riprova
            </button>
            {/* A plain <a>, NOT next/link: Link needs the App Router context
                to be mounted, and this file only renders when the root layout
                (which provides it) is exactly what failed. The lint rule that
                asks for Link is disabled on purpose, for this line only. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.16)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '13px 26px',
                textDecoration: 'none',
              }}
            >
              Torna alla home
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                margin: '26px 0 0',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: '#6b7280',
                wordBreak: 'break-all',
              }}
            >
              CODICE ERRORE {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
