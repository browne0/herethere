import React from 'react';

import { Clock } from 'lucide-react';

interface TimeDisplayProps {
  startTime?: string | Date;
  endTime?: string | Date;
  timeZone: string;
  isStreaming?: boolean;
}

export function TimeDisplay({ startTime, endTime, timeZone, isStreaming }: TimeDisplayProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [formattedTime, setFormattedTime] = React.useState<string>('');
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const formatLocalTime = React.useCallback(
    (timeStr?: string | Date) => {
      if (!timeStr) return '';
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return '';

        const options: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timeZone || undefined,
        };

        return new Intl.DateTimeFormat('en-US', options).format(date);
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

    // Set initial loading state if streaming or missing times
    if (isStreaming || !startTime || !endTime) {
      setIsLoading(true);
      return;
    }

    // Attempt to format times
    const formattedStart = formatLocalTime(startTime);
    const formattedEnd = formatLocalTime(endTime);

    if (!formattedStart || !formattedEnd) {
      setIsLoading(true);
      return;
    }

    // Add a small delay before showing the formatted time to prevent flickering
    timeoutRef.current = setTimeout(() => {
      setFormattedTime(`${formattedStart} - ${formattedEnd}`);
      setIsLoading(false);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startTime, endTime, formatLocalTime, isStreaming]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground h-6">
      <Clock className="h-4 w-4 shrink-0" />
      <div className="min-w-[100px] transition-opacity duration-300">
        {isLoading ? (
          <div
            className="h-4 w-24 bg-muted/80 rounded animate-pulse"
            style={{ animationDuration: '2s' }}
          />
        ) : (
          <span className="animate-fadeIn">{formattedTime}</span>
        )}
      </div>
    </div>
  );
}

export default TimeDisplay;
