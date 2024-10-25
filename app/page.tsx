import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const { userId } = await auth();

  // If the user is signed in, redirect them to the dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <Container size="lg">
      <div className="flex flex-col items-center text-center py-20">
        <h1 className="text-6xl font-bold mb-6">Plan Your Perfect Trip</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          WanderWeave helps you create personalized travel itineraries with dietary preferences in
          mind.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
