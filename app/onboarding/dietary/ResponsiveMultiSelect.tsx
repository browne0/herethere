import React, { useState, useCallback, memo, useEffect } from 'react';

import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

interface Option<T> {
  label: string;
  value: T;
}

// Updated SelectionItem to be generic
interface SelectionItemProps<T> {
  option: Option<T>;
  isSelected: boolean;
  onSelect: (value: T) => void;
}

function SelectionItemComponent<T extends string>({
  option,
  isSelected,
  onSelect,
}: SelectionItemProps<T>) {
  return (
    <CommandItem key={option.value} value={option.value} onSelect={() => onSelect(option.value)}>
      <div
        className={cn(
          'mr-2 h-4 w-4 border rounded flex items-center justify-center',
          isSelected ? 'border-primary bg-primary text-primary-foreground' : ''
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>
      <span>{option.label}</span>
    </CommandItem>
  );
}

const SelectionItem = memo(SelectionItemComponent) as typeof SelectionItemComponent;

// Updated SelectionList to be generic
interface SelectionListProps<T> {
  options: Option<T>[];
  selected: T[];
  onSelect: (value: T) => void;
  searchPlaceholder: string;
}

function SelectionListComponent<T extends string>({
  options,
  selected,
  onSelect,
  searchPlaceholder,
}: SelectionListProps<T>) {
  return (
    <Command>
      <CommandInput
        placeholder={searchPlaceholder}
        className="border-transparent focus:border-transparent focus:ring-0"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map(option => (
            <SelectionItem<T>
              key={option.value}
              option={option}
              isSelected={selected.includes(option.value)}
              onSelect={onSelect}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

const SelectionList = memo(SelectionListComponent) as typeof SelectionListComponent;

// Updated TriggerContent to accept generic type
interface TriggerContentProps<T> {
  selected: T[];
  placeholder: string;
  entity: string;
}

function TriggerContentComponent<T>({ selected, placeholder, entity }: TriggerContentProps<T>) {
  return (
    <>
      <span className="truncate">
        {selected.length > 0 ? `${selected.length} selected` : placeholder}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </>
  );
}

const TriggerContent = memo(TriggerContentComponent) as typeof TriggerContentComponent;

export interface MultiSelectProps<T> {
  options: Option<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder: string;
  title: string;
  searchPlaceholder?: string;
  type?: 'default' | 'dietary';
  entity: string;
}

// SSR-safe media query hook
const useSSRMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [query]);

  return mounted ? matches : false;
};

function ResponsiveMultiSelectComponent<T extends string>({
  options,
  selected,
  onChange,
  placeholder,
  title,
  searchPlaceholder = 'Search...',
  type = 'default',
  entity = '',
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const isDesktop = useSSRMediaQuery('(min-width: 768px)');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelect = useCallback(
    (value: T) => {
      if (type === 'dietary' && value === 'none') {
        onChange(selected.includes('none' as T) ? [] : ['none' as T]);
      } else if (type === 'dietary') {
        const newSelected = selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected.filter(item => item !== 'none'), value];
        onChange(newSelected);
      } else {
        onChange(
          selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]
        );
      }
    },
    [selected, onChange, type]
  );

  if (!mounted) {
    return (
      <div className="flex flex-col space-y-2">
        <Button variant="outline" size="sm" className="w-full md:w-[275px] justify-between">
          <span className="truncate">{placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="flex items-center space-x-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className=" justify-between">
              <TriggerContent<T> selected={selected} entity={entity} placeholder={placeholder} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[275px]" align="start">
            <SelectionList<T>
              options={options}
              selected={selected}
              onSelect={handleSelect}
              searchPlaceholder={searchPlaceholder}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <TriggerContent<T> selected={selected} placeholder={placeholder} />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{placeholder}</DrawerDescription>
          </DrawerHeader>
          <SelectionList<T>
            options={options}
            selected={selected}
            onSelect={handleSelect}
            searchPlaceholder={searchPlaceholder}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

const ResponsiveMultiSelect = memo(
  ResponsiveMultiSelectComponent
) as typeof ResponsiveMultiSelectComponent;
export default ResponsiveMultiSelect;
