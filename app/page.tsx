import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { Hero } from '@/components/landing/Hero';

export default async function HomePage() {
  const { userId } = await auth();

  // If the user is signed in, redirect them to the dashboard
  if (userId) {
    redirect('/trips');
  }

  return (
    <>
      <Hero />
    </>
  );
}
