import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function Nav() {
  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold">
            WanderAI
          </Link>

          <div className="flex items-center gap-4">
            <SignedIn>
              <Link href="/trips">
                <Button variant="ghost">My Trips</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <Link href="/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}
