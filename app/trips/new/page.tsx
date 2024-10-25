import { TripForm } from '@/components/trips/trip-form';

export default function NewTripPage() {
  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-4xl font-bold mb-8">Create New Trip</h1>
      <TripForm />
    </div>
  );
}
