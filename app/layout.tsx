import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

import { PageLayout } from '@/components/layout/PageLayout';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          <PageLayout>
            <GoogleMapsProvider>{children}</GoogleMapsProvider>
          </PageLayout>
          <Toaster richColors position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
