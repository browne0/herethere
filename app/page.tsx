import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { FAQ } from '@/components/landing/FAQ';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { MainCTA } from '@/components/landing/MainCTA';

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
