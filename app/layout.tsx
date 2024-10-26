import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

import { Nav } from '@/components/nav';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          <Nav />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
