'use client';

import { useState } from 'react';

import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Menu, Sliders, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

// Constants for navigation links and configuration
const LANDING_PAGE_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
] as const;

// Subcomponents for better organization
const Logo = () => (
  <Link href="/" className="font-bold text-xl hover:text-indigo-600 transition-colors">
    HereThere
  </Link>
);

const CustomUserButton = () => (
  <UserButton
    appearance={{
      elements: {
        avatarBox: 'w-8 h-8 hover:scale-110 transition-transform duration-300',
      },
    }}
  >
    <UserButton.MenuItems>
      <UserButton.Link
        label="Preferences"
        labelIcon={<Sliders className="h-4 w-4" />}
        href="/settings/preferences"
      />
    </UserButton.MenuItems>
  </UserButton>
);

const AuthenticatedNav = ({ isOnboardingPage }: { isOnboardingPage: boolean }) => (
  <div className="flex items-center space-x-4 md:space-x-8">
    {!isOnboardingPage && (
      <Link href="/trips">
        <Button
          variant="ghost"
          className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-300 text-sm px-2 md:px-4"
        >
          My Trips
        </Button>
      </Link>
    )}
    <CustomUserButton />
  </div>
);

const LandingPageNav = ({ pathname }: { pathname: string }) => (
  <div className="hidden md:flex items-center space-x-8">
    {LANDING_PAGE_LINKS.map(link => (
      <a
        key={link.href}
        href={link.href}
        className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
      >
        {link.label}
      </a>
    ))}
    <div className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
      <SignInButton />
    </div>
    {!['/sign-in', '/sign-up'].includes(pathname) && (
      <SignUpButton>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
          Get Started
        </Button>
      </SignUpButton>
    )}
  </div>
);

const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <div
    className={`fixed inset-x-0 top-[72px] bg-white border-b border-gray-100 md:hidden transition-all duration-300 ease-in-out ${
      isOpen ? 'max-h-screen opacity-100 visible' : 'max-h-0 opacity-0 invisible'
    }`}
  >
    <div className="py-4 px-4 space-y-3">
      {LANDING_PAGE_LINKS.map(link => (
        <a
          key={link.href}
          href={link.href}
          className="block w-full py-2.5 px-4 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors duration-200 text-base"
          onClick={onClose}
        >
          {link.label}
        </a>
      ))}
      <div className="block w-full py-2.5 px-4 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors duration-200 text-base">
        <SignInButton />
      </div>
      <div className="pt-3 border-t border-gray-100">
        <SignUpButton>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5">
            Get Started
          </Button>
        </SignUpButton>
      </div>
    </div>
  </div>
);

export function Nav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  const isOnboardingPage = /\/onboarding(\/|$)/.test(pathname);

  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 w-full z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          <Logo />

          <nav className="flex items-center space-x-8">
            <SignedIn>
              <AuthenticatedNav isOnboardingPage={isOnboardingPage} />
            </SignedIn>

            <SignedOut>{isLandingPage && <LandingPageNav pathname={pathname} />}</SignedOut>
            <SignedOut>
              {isLandingPage && (
                <button
                  className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6 text-gray-600" />
                  ) : (
                    <Menu className="w-6 h-6 text-gray-600" />
                  )}
                </button>
              )}
            </SignedOut>
          </nav>
        </div>

        <SignedOut>
          {isLandingPage && (
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          )}
        </SignedOut>
      </div>
    </header>
  );
}

export default Nav;
