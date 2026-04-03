'use client';

import { ReactNode } from 'react';
import { LivePageTranslation } from '@/components/live-page-translation';
import { I18nProvider } from '../lib/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <LivePageTranslation scope="document" />
    </I18nProvider>
  );
}
