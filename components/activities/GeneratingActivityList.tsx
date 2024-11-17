import React, { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { ProcessedActivity } from '@/contexts/TripActivitiesContext';

import { ActivityCategoryBadge } from './ActivityDetails';
import TimeDisplay from '../trips/TimeDisplay';

// Simple wrapper component to prevent re-renders
const ActivityCard = React.memo(
  ({ activity, timeZone }: { activity: ProcessedActivity; timeZone: string }) => (
    <Card className={`transition-colors ${activity.error ? 'border-destructive' : ''}`}>
      <CardContent className="p-4 space-y-4">
        {activity.isProcessing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Finding location...</span>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-medium">{activity.name}</h4>
            {activity.error && <p className="text-sm text-destructive mt-1">{activity.error}</p>}
          </div>
          <ActivityCategoryBadge category={activity.category} />
        </div>
        <TimeDisplay
          startTime={activity.startTime}
          endTime={activity.endTime}
          timeZone={timeZone}
        />
      </CardContent>
    </Card>
  )
);

ActivityCard.displayName = 'ActivityCard';

export default function GeneratingActivityList({
  activities,
  timeZone,
}: {
  activities: ProcessedActivity[];
  timeZone: string;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  // Reset visible count when activities array is cleared
  useEffect(() => {
    if (activities.length === 0) {
      setVisibleCount(0);
    }
  }, [activities.length]);

  // Incrementally show activities
  useEffect(() => {
    if (activities.length > visibleCount) {
      const timer = setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 1, activities.length));
      }, 200); // Adjust timing as needed
      return () => clearTimeout(timer);
    }
  }, [activities.length, visibleCount]);

  const visibleActivities = activities.slice(0, visibleCount);

  return (
    <div>
      <AnimatePresence mode="popLayout">
        {visibleActivities.map(activity => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative mb-8 last:mb-0"
          >
            <ActivityCard activity={activity} timeZone={timeZone} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
