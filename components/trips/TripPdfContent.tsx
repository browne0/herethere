import { Activity, Trip } from '@prisma/client';
import { format } from 'date-fns';

interface TripPdfContentProps {
  trip: Trip & {
    activities: Activity[];
  };
}

function groupActivitiesByDate(activities: Activity[]) {
  const grouped = new Map<string, Activity[]>();

  activities.forEach(activity => {
    const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(activity);
  });

  grouped.forEach(activities => {
    activities.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return grouped;
}

export function TripPdfContent({ trip }: TripPdfContentProps) {
  const groupedActivities = groupActivitiesByDate(trip.activities);

  return (
    <div id="pdf-content" className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{trip.title}</h1>
        <p className="text-gray-600 mb-1">{trip.destination}</p>
        <p className="text-gray-600">
          {format(new Date(trip.startDate), 'MMMM d')} -{' '}
          {format(new Date(trip.endDate), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Activities */}
      <div className="space-y-8">
        {Array.from(groupedActivities.entries()).map(([date, activities]) => (
          <div key={date}>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              {format(new Date(date), 'EEEE, MMMM d')}
            </h2>
            <div className="space-y-4">
              {activities.map(activity => (
                <div key={activity.id} className="ml-4">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{activity.name}</h3>
                      <p className="text-gray-600 text-sm">
                        {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                        {format(new Date(activity.endTime), 'h:mm a')}
                      </p>
                      <p className="text-gray-600 text-sm">{activity.address}</p>
                      {activity.notes && (
                        <p className="text-gray-600 text-sm mt-1">{activity.notes}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{activity.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
