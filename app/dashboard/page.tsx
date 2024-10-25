import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Your Trips</h1>
      {/* Trip list will go here */}
    </div>
  );
}
