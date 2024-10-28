import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';

import { Nav } from '@/components/nav';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          <Nav />
          <main className="pt-16">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
