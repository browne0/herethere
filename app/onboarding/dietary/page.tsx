'use client';

import React, { useState } from 'react';

import { Utensils, Coffee, Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Cuisine, DietaryRestriction, usePreferences } from '@/lib/stores/preferences';
import { MealType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Option<T> {
  label: string;
  value: T;
}

interface MultiSelectProps<T> {
  options: Option<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder: string;
  title: string;
  searchPlaceholder?: string;
  type?: 'default' | 'dietary';
}

// Responsive MultiSelect component that uses Drawer on mobile and Popover on desktop
const ResponsiveMultiSelect = <T extends string>({
  options,
  selected,
  onChange,
  placeholder,
  title,
  searchPlaceholder = 'Search...',
  type = 'default',
}: MultiSelectProps<T>) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleSelect = (value: T) => {
    if (type === 'dietary' && value === 'none') {
      // If "no dietary restrictions" is selected
      if (selected.includes('none' as T)) {
        // If it's already selected, clear it
        onChange([]);
      } else {
        // If it's not selected, clear others and select it
        onChange(['none' as T]);
      }
    } else if (type === 'dietary') {
      // If selecting any other restriction, remove 'none' if it exists
      const newSelected = selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected.filter(item => item !== 'none'), value];
      onChange(newSelected);
    } else {
      // Default behavior for non-dietary selections
      onChange(
        selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]
      );
    }
  };

  const SelectionList = ({ onSelect }: { onSelect: (value: T) => void }) => (
    <Command>
      <CommandInput
        placeholder={searchPlaceholder}
        className="border-transparent focus:border-transparent focus:ring-0"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map(option => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={() => {
                onSelect(option.value);
                if (isDesktop) setOpen(true);
              }}
            >
              <div
                className={cn(
                  'mr-2 h-4 w-4 border rounded flex items-center justify-center',
                  selected.includes(option.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : ''
                )}
              >
                {selected.includes(option.value) && <Check className="h-3 w-3" />}
              </div>
              <span>{option.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isDesktop) {
    return (
      <div className="flex items-center space-x-4 mt-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[275px] justify-between">
              <span className="truncate">
                {selected.length > 0 ? `${selected.length} selected` : placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[275px]" align="start">
            <SelectionList onSelect={handleSelect} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <p className="text-sm text-muted-foreground">{title}</p>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="truncate">
              {selected.length > 0 ? `${selected.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{placeholder}</DrawerDescription>
          </DrawerHeader>
          <SelectionList onSelect={handleSelect} />
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const DietaryPage = () => {
  const {
    dietaryRestrictions,
    setDietaryRestrictions,
    cuisinePreferences,
    setCuisinePreferences,
    mealImportance,
    setMealImportance,
  } = usePreferences();

  const DIETARY_RESTRICTIONS: Array<{ label: string; value: DietaryRestriction }> = [
    { label: 'No dietary restrictions', value: 'none' },
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
  ];

  const CUISINE_PREFERENCES: Array<{ label: string; value: Cuisine }> = [
    { label: 'Afghan', value: 'afghani' },
    { label: 'African', value: 'african' },
    { label: 'American', value: 'american' },
    { label: 'Asian', value: 'asian' },
    { label: 'Brazilian', value: 'brazilian' },
    { label: 'Chinese', value: 'chinese' },
    { label: 'French', value: 'french' },
    { label: 'Greek', value: 'greek' },
    { label: 'Indian', value: 'indian' },
    { label: 'Italian', value: 'italian' },
    { label: 'Japanese', value: 'japanese' },
    { label: 'Korean', value: 'korean' },
    { label: 'Lebanese', value: 'lebanese' },
    { label: 'Mexican', value: 'mexican' },
    { label: 'Middle Eastern', value: 'middle_eastern' },
    { label: 'Seafood', value: 'seafood' },
    { label: 'Spanish', value: 'spanish' },
    { label: 'Thai', value: 'thai' },
    { label: 'Turkish', value: 'turkish' },
    { label: 'Vietnamese', value: 'vietnamese' },
  ];

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];

  return (
    <div className={cn('max-w-2xl mx-auto', isDesktop ? '' : 'p-4')}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Food Preferences</h1>
        <p className="mt-2 text-gray-600">Let's personalize your dining experiences</p>
      </div>

      <Card className={cn('space-y-4', isDesktop ? 'p-6' : 'p-4')}>
        {/* Dietary Restrictions */}
        <div>
          <div className="font-medium">Dietary Restrictions</div>
          <div className="text-sm text-gray-500">Get catered restaurant suggestions for you</div>
          <ResponsiveMultiSelect
            options={DIETARY_RESTRICTIONS}
            selected={dietaryRestrictions}
            onChange={setDietaryRestrictions}
            placeholder="Select any dietary restrictions"
            title="Dietary Restrictions"
            searchPlaceholder="Search restrictions..."
            type="dietary"
          />
        </div>

        {/* Cuisine Preferences */}
        <div>
          <div className="font-medium">Favorite Cuisines</div>
          <div className="text-sm text-gray-500">Select which foods you enjoy</div>
          <ResponsiveMultiSelect
            options={CUISINE_PREFERENCES}
            selected={cuisinePreferences.preferred}
            onChange={preferred =>
              setCuisinePreferences({ preferred, avoided: cuisinePreferences.avoided })
            }
            placeholder="Select your favorite cuisines"
            title="Favorite Cuisines"
            searchPlaceholder="Search cuisines..."
          />
        </div>

        {/* Meal Importance */}
        <div className="mb-2">
          <p className="font-medium">Important Meals</p>
          <p className="text-sm text-gray-500">Select which meals matter most</p>
        </div>
        <div className={cn('grid gap-3', isDesktop ? 'grid-cols-3' : 'grid-cols-1')}>
          {meals.map(meal => (
            <button
              key={meal}
              onClick={() => {
                setMealImportance({
                  ...mealImportance,
                  [meal]: !mealImportance[meal],
                });
              }}
              className={`p-3 rounded-lg border transition-all flex items-center gap-2 justify-center
                  ${mealImportance[meal] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {meal === 'breakfast' ? (
                <Coffee className="w-4 h-4" />
              ) : (
                <Utensils className="w-4 h-4" />
              )}
              <span className="capitalize">{meal}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DietaryPage;
