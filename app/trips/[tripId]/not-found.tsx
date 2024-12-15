'use client';

import { ErrorPage } from '@/components/ErrorComponents';

export default function TripNotFound() {
  return (
    <ErrorPage
      title="Trip Not Found"
      description="We couldn't find the trip you're looking for. It might have been deleted or you don't have access to it."
    />
  );
}
