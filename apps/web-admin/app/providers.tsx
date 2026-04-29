'use client';

import { ReactNode } from 'react';
import { ChunkLoadRecovery } from '@/components/chunk-load-recovery';
import { LivePageTranslation } from '@/components/live-page-translation';
import { I18nProvider } from '../lib/i18n';

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: "en" | "ru";
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ChunkLoadRecovery />
      {children}
      <LivePageTranslation scope="document" />
    </I18nProvider>
  );
}
