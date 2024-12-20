import React from 'react';

import ResponsiveMultiSelect from '@/app/onboarding/dietary/ResponsiveMultiSelect';
import { ACTIVITY_CATEGORIES, ActivityCategoryId } from '@/lib/types/activities';

interface ActivitiesPopoverProps {
  selectedCategories: ActivityCategoryId[];
  onUpdateCategories: (categories: ActivityCategoryId[]) => void;
}

const ActivitiesPopover = ({ selectedCategories, onUpdateCategories }: ActivitiesPopoverProps) => {
  // Convert ACTIVITY_CATEGORIES to the Option format expected by ResponsiveMultiSelect
  const activityOptions = Object.entries(ACTIVITY_CATEGORIES).map(([_, category]) => ({
    value: category.id,
    label: category.label,
  }));

  return (
    <ResponsiveMultiSelect
      options={activityOptions}
      selected={selectedCategories}
      onChange={onUpdateCategories}
      placeholder="Select activities"
      title="Activities"
      searchPlaceholder="Search activities..."
      entity="activities"
    />
  );
};

export default ActivitiesPopover;
