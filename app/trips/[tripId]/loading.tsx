// app/trips/[tripId]/loading.tsx
import { MapPin, Calendar } from 'lucide-react';

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Trip Header Skeleton */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-9 w-2/3 bg-gray-200 rounded mb-4"></div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-300" />
              <div className="h-5 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-300" />
              <div className="h-5 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-12">
          {[1, 2, 3].map(shelf => (
            <div key={shelf}>
              <div className="flex justify-between items-center mb-6">
                <div className="h-7 w-48 bg-gray-200 rounded"></div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-100"></div>
                  <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-100"></div>
                </div>
              </div>
              <div className="flex gap-4">
                {[1, 2, 3].map(card => (
                  <div
                    key={card}
                    className="flex-shrink-0 w-72 rounded-xl overflow-hidden bg-white shadow-md"
                  >
                    <div className="aspect-[4/3] bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton for SelectedActivitiesBanner */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full animate-pulse">
            <div className="space-y-2">
              <div className="h-5 w-36 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-9 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
