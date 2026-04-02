import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@aws-amplify/ui-react-liveness/styles.css';
import '../../../example-unframer-app/src/framer/styles.css';
import './globals.css';
import { Providers } from './providers';
import { cn } from "@/lib/utils";
import { getServerSession } from "@/lib/server-auth";
import { loadInitialShellBootstrap } from "@/lib/server-shell";

const teodor = localFont({
  src: [
    {
      path: '../public/fonts/TeodorTRIAL-Regular.otf',
      style: 'normal',
      weight: '400',
    },
    {
      path: '../public/fonts/TeodorTRIAL-RegularItalic.otf',
      style: 'italic',
      weight: '400',
    },
  ],
  variable: '--font-brand',
});

export const metadata: Metadata = {
  title: 'Smart',
  description: 'Operational control center for attendance, scheduling, and workforce workflows.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialSession = await getServerSession();
  const initialShellBootstrap = initialSession
    ? await loadInitialShellBootstrap(initialSession)
    : null;
  const sessionBootstrapScript = `window.__SMART_INITIAL_SESSION__ = ${JSON.stringify(initialSession).replace(/</g, "\\u003c")}; window.__SMART_INITIAL_SHELL__ = ${JSON.stringify(initialShellBootstrap).replace(/</g, "\\u003c")};`;

  return (
    <html lang="en" className={cn(teodor.variable)}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: sessionBootstrapScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
