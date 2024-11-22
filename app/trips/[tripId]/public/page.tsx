import { notFound } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { CalendarDays, MapPin, Clock } from 'lucide-react';

import { Container } from '@/components/layouts/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db';

export default async function PublicTripPage({ 
  params 
}: { 
  params: { tripId: string } 
}) {

  const {tripId} = await params;

  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
      isPublic: true, // Only fetch public trips
    },
    include: {
      activities: {
        orderBy: {
          startTime: 'asc',
        },
      },
    },
  });

  if (!trip) {
    notFound();
  }

  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;

  // Group activities by date
  const groupedActivities = trip.activities.reduce((groups, activity) => {
    const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, typeof trip.activities>);

  return (
    <Container size="md">
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{trip.title}</h1>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              {trip.destination}
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-2" />
              {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Itinerary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Object.entries(groupedActivities).map(([date, activities]) => (
                <div key={date}>
                  <h3 className="font-semibold text-lg mb-4">
                    {format(new Date(date), 'EEEE, MMMM d')}
                  </h3>
                  <div className="space-y-4">
                    {activities.map(activity => (
                      <div 
                        key={activity.id} 
                        className="relative pl-6 border-l-2 border-gray-200"
                      >
                        <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
                        <div className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{activity.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <p>
                                  {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                                  {format(new Date(activity.endTime), 'h:mm a')}
                                </p>
                                <Badge variant="secondary">
                                  {activity.category}
                                </Badge>
                              </div>
                              {activity.address && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.address}
                                </p>
                              )}
                              {activity.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {activity.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Created with HereThere
      </div>
    </Container>
  );
}