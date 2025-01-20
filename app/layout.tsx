import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

import { PageLayout } from '@/components/layout/PageLayout';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import QueryProvider from '@/components/QueryProvider';
import { Toaster } from '@/components/ui/sonner';
import { Metadata, Viewport } from 'next';
import './globals.css';
import { baseMetadata } from './lib/metadata';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ClerkProvider afterSignOutUrl="/">
          <QueryProvider>
            <PageLayout>
              <GoogleMapsProvider>{children}</GoogleMapsProvider>
              <Toaster closeButton position="top-center" />
            </PageLayout>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  ...baseMetadata,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
