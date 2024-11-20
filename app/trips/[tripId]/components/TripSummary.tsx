import { format } from 'date-fns';
import { Calendar, MapPin, Users } from 'lucide-react';

interface TripSummaryProps {
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  participants?: { id: string; color: string }[]; // We can expand this later
}

export function TripSummary({
  title,
  destination,
  startDate,
  endDate,
  participants,
}: TripSummaryProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 border-b">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center text-slate-600 text-sm sm:text-base">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{destination}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{title}</h1>
        </div>
        <div className="flex items-center sm:items-end justify-between sm:flex-col sm:text-right">
          <div className="flex items-center text-slate-600 text-sm sm:text-base">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
          <div className="sm:mt-2 flex items-center">
            <div className="flex -space-x-2">
              {participants?.map((participant, i) => (
                <div
                  key={participant.id}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-${participant.color}-100 border-2 border-white flex items-center justify-center`}
                >
                  <Users className={`w-3 h-3 sm:w-4 sm:h-4 text-${participant.color}-600`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
