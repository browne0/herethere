'use client';
import { useState, useEffect } from 'react';

import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function Nav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Check if we're on the landing page
  const isLandingPage = pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Landing page navigation links
  const landingPageLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl hover:text-indigo-600 transition-colors">
            WanderAI
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <SignedIn>
              {/* Authenticated state - show only My Trips and UserButton */}
              <Link href="/trips">
                <Button
                  variant="ghost"
                  className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-300"
                >
                  My Trips
                </Button>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 hover:scale-110 transition-transform duration-300',
                  },
                }}
              />
            </SignedIn>

            <SignedOut>
              {/* Unauthenticated state */}
              {isLandingPage && (
                // Show these links only on landing page
                <>
                  {landingPageLinks.map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </>
              )}
            </SignedOut>
            {['/sign-in', '/sign-up'].includes(pathname) === false && (
              <Link href="/sign-up">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
                  Get Started
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button - Only show on landing page when signed out */}
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
        </div>

        {/* Mobile Menu - Only for landing page when signed out */}
        <SignedOut>
          {isLandingPage && (
            <div
              className={`md:hidden transition-all duration-300 ease-in-out ${
                isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
              }`}
            >
              <div className="py-4 space-y-4">
                {landingPageLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="px-4 pt-4 border-t">
                  <Link href="/sign-up" className="block">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </SignedOut>
      </div>
    </header>
  );
}
