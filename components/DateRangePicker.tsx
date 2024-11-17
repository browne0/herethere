import React, { useState, useEffect } from 'react';

import { addDays, isSameDay } from 'date-fns';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DateRangeType } from '@/lib/types';

interface DateRangeProps {
  dates: DateRangeType;
  onSelect: (dates: { from: Date | undefined; to: Date | undefined } | undefined) => void;
}

const DateRangeSelect = ({ dates, onSelect }: DateRangeProps) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Set tomorrow as the default start date
  const tomorrow = addDays(new Date(), 1);

  const [ranges, setRanges] = useState([
    {
      startDate: dates?.from || tomorrow,
      endDate: dates?.to || addDays(tomorrow, 7),
      key: 'selection',
    },
  ]);

  const handleSelect = (ranges: any) => {
    setRanges([ranges.selection]);
    onSelect({
      from: ranges.selection.startDate,
      to: ranges.selection.endDate,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="bg-white rounded-lg shadow-sm p-2 max-w-full">
          <DateRange
            onChange={handleSelect}
            showDateDisplay={false}
            months={isMobile ? 1 : 2}
            ranges={ranges}
            direction={isMobile ? 'vertical' : 'horizontal'}
            preventSnapRefocus={true}
            calendarFocus="backwards"
            minDate={tomorrow}
            maxDate={addDays(new Date(), 30)}
            rangeColors={['#4F46E5']}
            monthDisplayFormat="MMMM yyyy"
            className="!border-0"
          />
        </div>
      </div>

      {/* Selected Range Summary */}
      {ranges[0].startDate && (
        <div className="text-center text-sm text-gray-600 mt-2">
          {ranges[0].endDate ? (
            <>
              {ranges[0].startDate.toLocaleDateString()}
              {!isSameDay(ranges[0].startDate, ranges[0].endDate) && (
                <>
                  {' - '}
                  {ranges[0].endDate.toLocaleDateString()}
                  <br />
                  {Math.floor(
                    (ranges[0].endDate.getTime() - ranges[0].startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  days
                </>
              )}
              {isSameDay(ranges[0].startDate, ranges[0].endDate) && (
                <>
                  <br />1 day
                </>
              )}
            </>
          ) : (
            'Select end date'
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangeSelect;
