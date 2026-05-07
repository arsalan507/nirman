import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import BottomNav from '@/components/BottomNav';
import AuthGate from '@/components/AuthGate';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

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
    { rel: 'icon', url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192x192.png' },
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
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <ServiceWorkerRegister />
          <AuthGate>
            <div className="mx-auto min-h-screen max-w-md pb-24">{children}</div>
            <BottomNav />
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
