import { Skeleton } from '@/components/ui/skeleton';

function Loading() {
  return (
    <div className="flex flex-col bg-gray-50 h-[calc(100vh-73px)]">
      {/* Category Navigation */}
      <div className="bg-white shadow sticky top-[73px] z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex min-w-[100px] flex-col items-center py-4">
                <Skeleton className="h-5 w-5 mb-2 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="w-7/12">
          <div className="p-4">
            <Skeleton className="h-24 w-full mb-8" />
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96 mb-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-72 w-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="w-5/12 bg-gray-100">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
export default Loading;
