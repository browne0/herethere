import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();

  // If the user is signed in, redirect them to the dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-primary-600">WanderWeave</h1>
      <p className="mt-4 text-lg text-gray-600">Plan your perfect trip</p>
      <button className="btn-primary mt-4">Get Started</button>
    </div>
  );
}
