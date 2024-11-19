'use client';
import React, { useState } from 'react';

import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: { startDate: Date | null; endDate: Date | null }) => void;
  minDate?: Date;
  maxDate?: Date;
}

const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  minDate = new Date(),
  maxDate = addMonths(new Date(), 12),
}: DateRangePickerProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonthDays = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };

  const handleDateClick = (date: Date) => {
    const normalizedDate = startOfDay(date);

    // If no start date or we're starting a new selection
    if (!startDate || endDate) {
      onChange({ startDate: normalizedDate, endDate: null });
    }
    // If we have a start date and are selecting an end date
    else {
      if (normalizedDate < startDate) {
        onChange({ startDate: normalizedDate, endDate: startDate });
      } else {
        onChange({ startDate, endDate: normalizedDate });
      }
    }
  };

  const isInRange = (date: Date) => {
    if (startDate && endDate) {
      return isWithinInterval(date, { start: startDate, end: endDate });
    }
    return false;
  };

  const renderMonth = (monthDate: Date) => {
    const days = getMonthDays(monthDate);
    const firstDay = days[0].getDay();

    return (
      <div className="select-none">
        <div className="mb-2 text-sm font-medium text-gray-900 flex items-center justify-center hidden sm:flex">
          {format(monthDate, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="h-6 text-xs text-gray-400 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="h-9 sm:h-8" />
          ))}
          {days.map(date => {
            const isSelected =
              startDate && endDate
                ? isSameDay(date, startDate) || isSameDay(date, endDate)
                : startDate
                  ? isSameDay(date, startDate)
                  : false;
            const inRange = isInRange(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                disabled={date < minDate || date > maxDate}
                className={cn(
                  'h-9 sm:h-8 text-sm relative flex items-center justify-center rounded',
                  'focus:outline-none',
                  {
                    'bg-indigo-600 text-white': isSelected,
                    'bg-indigo-50': inRange && !isSelected,
                    'hover:bg-gray-100': !isSelected && !inRange,
                    'opacity-50 cursor-not-allowed': date < minDate || date > maxDate,
                    'font-medium': isToday(date),
                  }
                )}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Selected dates display - Mobile Only */}
      <div className="mb-4 sm:hidden space-y-2 px-2">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Start date</div>
            <div className="text-sm font-medium">
              {startDate ? format(startDate, 'EEE, MMM d') : 'Select date'}
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="space-y-1">
            <div className="text-xs text-gray-500">End date</div>
            <div className="text-sm font-medium">
              {endDate ? format(endDate, 'EEE, MMM d') : 'Select date'}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-2 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(date => addMonths(date, -1))}
            disabled={isSameMonth(currentDate, minDate)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {format(currentDate, 'MMMM yyyy')}
            <span className="hidden sm:inline">
              {' '}
              - {format(addMonths(currentDate, 1), 'MMMM yyyy')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(date => addMonths(date, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {renderMonth(currentDate)}
            <div className="hidden sm:block">{renderMonth(addMonths(currentDate, 1))}</div>
          </div>
        </div>

        {/* Selected dates display - Desktop Only */}
        <div className="hidden sm:block border-t p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Start date</div>
              <div className="text-sm font-medium">
                {startDate ? format(startDate, 'EEE, MMM d') : 'Select date'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">End date</div>
              <div className="text-sm font-medium">
                {endDate ? format(endDate, 'EEE, MMM d') : 'Select date'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
