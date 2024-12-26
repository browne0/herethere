import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

import { PageLayout } from '@/components/layout/PageLayout';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ClerkProvider afterSignOutUrl="/">
          <QueryProvider>
            <PageLayout>
              <GoogleMapsProvider>{children}</GoogleMapsProvider>
              <Toaster closeButton richColors position="top-center" />
            </PageLayout>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
