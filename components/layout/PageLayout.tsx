'use client';
import { usePathname } from 'next/navigation';

import { Nav } from '@/components/nav';

export const ROUTES_WITHOUT_NAV = [
  '/trips/[tripId]', // Hide nav on trip view for focused experience
  '/sign-in', // Authentication pages should be clean
  '/sign-up',
  '/verify', // Email verification page
  '/reset-password', // Password reset flow
];

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const pathname = usePathname();

  // Check if current path matches any of our no-nav routes
  // Uses a function to allow for pattern matching (e.g., dynamic routes)
  const shouldShowNav = !ROUTES_WITHOUT_NAV.some(route => {
    // Convert route patterns with parameters (e.g., [demoTripId]) to regex
    const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(pathname);
  });

  return (
    <>
      {shouldShowNav && <Nav />}
      <div className={shouldShowNav ? 'pt-16' : ''}>{children}</div>
    </>
  );
}
