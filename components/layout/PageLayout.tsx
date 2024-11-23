'use client';
import { usePathname } from 'next/navigation';

import { Nav } from '@/components/nav';

export const ROUTES_WITHOUT_NAV = [
  // Hide nav only on specific trip view, but show for all /new/* routes
  '/trips/[tripId](?!/new(?:/.*)?)',
  '/sign-in',
  '/sign-up',
  '/verify',
  '/reset-password',
];

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const pathname = usePathname();

  const shouldShowNav = !ROUTES_WITHOUT_NAV.some(route => {
    // Convert route patterns with parameters to regex
    const routePattern = route
      // Replace route params with regex pattern
      .replace(/\[.*?\]/g, '[^/]+')
      // Escape forward slashes and other special regex characters
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Remove the escape for any intentional regex we added (like negative lookahead)
      .replace('\\(\\?\\!', '(?!')
      // Remove escape for any intentional regex we added (like optional group)
      .replace('\\(\\.\\*\\)', '(.*)');

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
