import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@aws-amplify/ui-react-liveness/styles.css';
import '../../../example-unframer-app/src/framer/styles.css';
import './globals.css';
import { Providers } from './providers';
import { cn } from "@/lib/utils";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(teodor.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
