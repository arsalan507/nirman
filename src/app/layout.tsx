import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import AuthGate from '@/components/AuthGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nirman — Construction Tracker',
  description: 'Track construction expenses with one-tap entries. Built for Bengaluru.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nirman',
  },
  icons: [
    { rel: 'icon', url: '/icons/icon.svg', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon', url: '/icons/icon.svg' },
  ],
};

export const viewport: Viewport = {
  themeColor: '#FFD93D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white antialiased">
        <Providers>
          <AuthGate>
            <div className="mx-auto max-w-md">{children}</div>
            <BottomNav />
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
