import { Container } from '@/components/layouts/container';
import { TripForm } from '@/components/trips/TripForm';

export default async function NewTripPage() {
  return (
    <Container size="sm">
      <h1 className="text-4xl font-bold mb-8">Create New Trip</h1>
      <TripForm />
    </Container>
  );
}
