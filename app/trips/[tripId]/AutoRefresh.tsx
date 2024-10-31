'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export function AutoRefresh({ children, status }: { children: React.ReactNode; status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== 'complete' && status !== 'error') {
      const interval = setInterval(() => {
        router.refresh();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [status, router]);

  return <>{children}</>;
}
