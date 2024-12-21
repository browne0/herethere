// app/trips/[tripId]/layout.tsx
import { Suspense } from 'react';
import Loading from './loading';

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
