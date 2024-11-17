import React, { useEffect, useState } from 'react';

import { DeepPartial } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { GeneratedActivity } from '@/lib/trip-generation/types';

import { ActivityCategoryBadge } from './ActivityDetails';
import TimeDisplay from '../trips/TimeDisplay';

// Simple wrapper component to prevent re-renders
const ActivityCard = React.memo(
  ({ activity, timeZone }: { activity: DeepPartial<GeneratedActivity>; timeZone: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative mb-8 last:mb-0"
    >
      <Card className="transition-colors">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium">{activity?.name}</h4>
            </div>
            <ActivityCategoryBadge category={activity?.category} />
          </div>
          <TimeDisplay
            startTime={activity?.startTime}
            endTime={activity?.endTime}
            timeZone={timeZone}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
);

ActivityCard.displayName = 'ActivityCard';

export default function GeneratingActivityList({
  activities,
  timeZone,
}: {
  activities: DeepPartial<GeneratedActivity>[];
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
        {visibleActivities.map((activity, index) => (
          <ActivityCard
            key={`generating-${index}-${activity?.name}`}
            activity={activity}
            timeZone={timeZone}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
