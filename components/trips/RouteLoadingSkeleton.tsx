import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function RouteLoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Route Summary</CardTitle>
        <div className="flex gap-4">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
