import React from 'react';

import { format } from 'date-fns';
import { Calendar, Wallet } from 'lucide-react';

import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { ParsedTrip } from '../types';
import ActivitiesPopover from './ActivitiesPopover';

interface TripPreferencesBarProps {
  trip: ParsedTrip;
  onUpdatePreferences: (key: string, value: any) => void;
}

export default function TripPreferencesBar({ trip, onUpdatePreferences }: TripPreferencesBarProps) {
  const { preferences, startDate, endDate } = trip;
  const budgetLabels = {
    budget: 'Low',
    moderate: 'Medium',
    luxury: 'High',
  };

  return (
    <div className="border-b border-gray-100 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Dates */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Calendar className="w-4 h-4 mr" />
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={({ startDate, endDate }) => {
                  if (startDate && endDate) {
                    onUpdatePreferences('dates', { startDate, endDate });
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Budget */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Wallet className="w-4 h-4 mr" />
                {`Budget: ${budgetLabels[preferences.budget]}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="flex flex-col gap-1">
                {Object.entries(budgetLabels).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={preferences.budget === value ? 'secondary' : 'ghost'}
                    className="justify-start"
                    onClick={() => onUpdatePreferences('budget', value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Activities */}
          <ActivitiesPopover
            selectedCategories={preferences.activities}
            onUpdateCategories={categories => onUpdatePreferences('activityCategories', categories)}
          />
        </div>
      </div>
    </div>
  );
}
