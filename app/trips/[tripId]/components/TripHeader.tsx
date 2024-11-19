import { format } from 'date-fns';
import { MapPin, Calendar } from 'lucide-react';

interface TripHeaderProps {
  trip: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
}

export function TripHeader({ trip }: TripHeaderProps) {
  const dateRange = `${format(trip.startDate, 'MMM d')} - ${format(trip.endDate, 'MMM d, yyyy')}`;

  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{trip.title}</h1>

        <div className="flex flex-wrap gap-4 text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            <span>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span>{dateRange}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
