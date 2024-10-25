import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <Container>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        {/* Trip list will go here */}
      </div>
    </Container>
  );
}
