import { auth } from '@clerk/nextjs/server';
import { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';

import { FAQ } from '@/components/landing/FAQ';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { MainCTA } from '@/components/landing/MainCTA';

import { baseMetadata } from './lib/metadata';

export default async function HomePage() {
  const { userId } = await auth();

  // If the user is signed in, redirect them to the dashboard
  if (userId) {
    redirect('/trips');
  }

  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <FAQ />
      <MainCTA />
      <Footer />
    </>
  );
}

export const metadata: Metadata = {
  ...baseMetadata,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
