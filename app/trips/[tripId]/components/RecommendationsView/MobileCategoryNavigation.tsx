import React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ActivityCategoryType } from '../../types';

interface MobileCategoryNavigationProps {
  categories: ActivityCategoryType[];
  selectedCategory: ActivityCategoryType | undefined;
  onCategoryChange: (categoryType: string) => void;
}

const MobileCategoryNavigation = ({
  categories,
  selectedCategory,
  onCategoryChange,
}: MobileCategoryNavigationProps) => {
  if (!selectedCategory) return null;

  return (
    <div className="px-4 pt-4 bg-white">
      {/* Category Selector */}
      <Select value={selectedCategory.type} onValueChange={value => onCategoryChange(value)}>
        <SelectTrigger className="w-full mb-4">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {categories.map(category => (
              <SelectItem key={category.type} value={category.type} className="focus:bg-gray-100">
                <div className="flex items-center justify-start w-full gap-2 py-1">
                  <span className="flex items-center justify-center w-5 h-5">{category.icon}</span>
                  <span className="capitalize">{category.type.replace(/-/g, ' ')}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default MobileCategoryNavigation;
