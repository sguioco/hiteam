'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HiTeam application failed', error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            color: '#25324c',
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <section style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 42 }}>HiTeam</div>
            <h1 style={{ margin: '28px 0 0', fontSize: 26 }}>Приложение временно не открылось</h1>
            <p style={{ margin: '12px 0 0', color: '#7f879d', fontSize: 15, lineHeight: 1.6 }}>
              Нажмите кнопку ниже. Ваши данные не потеряны.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 24,
                border: 0,
                borderRadius: 16,
                background: '#3155ff',
                color: '#ffffff',
                padding: '13px 24px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              type="button"
            >
              Попробовать снова
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
