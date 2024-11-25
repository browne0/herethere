import { Container } from '@/components/layout/container';

export default async function DashboardPage() {
  return (
    <Container>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        {/* Trip list will go here */}
      </div>
    </Container>
  );
}
