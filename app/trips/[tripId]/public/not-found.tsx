import Link from 'next/link';
import { Container } from '@/components/layouts/container';
import { Button } from '@/components/ui/button';

export default function TripNotFound() {
  return (
    <Container>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-4xl font-bold mb-4">Trip Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This trip either doesn't exist or is not public.
        </p>
        <Button asChild>
          <Link href="/">
            Return Home
          </Link>
        </Button>
      </div>
    </Container>
  );
}