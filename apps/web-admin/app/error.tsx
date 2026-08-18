'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HiTeam page render failed', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#25324c]">
      <section className="w-full max-w-md rounded-[28px] border border-[#e3e8f2] bg-white p-8 text-center shadow-[0_18px_60px_rgba(37,50,76,0.10)]">
        <p className="font-brand text-4xl">HiTeam</p>
        <h1 className="mt-8 text-2xl font-bold">Не удалось открыть страницу</h1>
        <p className="mt-3 text-sm leading-6 text-[#7f879d]">
          Обновите данные страницы. Если ошибка повторится, войдите в аккаунт снова.
        </p>
        <button
          className="mt-7 rounded-2xl bg-[#3155ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2848dc]"
          onClick={reset}
          type="button"
        >
          Попробовать снова
        </button>
      </section>
    </main>
  );
}
