import React from 'react';

import { Clock } from 'lucide-react';

interface TimeDisplayProps {
  startTime?: string | Date;
  endTime?: string | Date;
  timeZone: string;
}

export function TimeDisplay({ startTime, endTime, timeZone }: TimeDisplayProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [formattedTime, setFormattedTime] = React.useState<string>('');
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const formatLocalTime = React.useCallback(
    (timeStr?: string | Date) => {
      if (!timeStr) return '';

      try {
        const date = typeof timeStr === 'string' ? new Date(timeStr) : timeStr;
        if (isNaN(date.getTime())) return '';

        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timeZone || undefined,
        }).format(date);
      } catch {
        return '';
      }
    },
    [timeZone]
  );

  React.useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if we have valid times
    const formattedStart = formatLocalTime(startTime);
    const formattedEnd = formatLocalTime(endTime);

    // If we have both valid times, show them
    if (formattedStart && formattedEnd) {
      timeoutRef.current = setTimeout(() => {
        setFormattedTime(`${formattedStart} - ${formattedEnd}`);
        setIsLoading(false);
      }, 300);
    } else {
      // Keep loading state if either time is invalid/missing
      setIsLoading(true);
      setFormattedTime('');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startTime, endTime, formatLocalTime]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground h-6">
      <Clock className="h-4 w-4 shrink-0" />
      <div className="min-w-[100px] transition-opacity duration-300">
        {isLoading ? (
          <div className="h-4 w-24 bg-muted/80 rounded animate-pulse" />
        ) : (
          <span className="animate-fadeIn">{formattedTime}</span>
        )}
      </div>
    </div>
  );
}

export default TimeDisplay;
