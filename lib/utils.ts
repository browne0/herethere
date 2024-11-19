import { ComponentProps } from 'react';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Badge } from '@/components/ui/badge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

export function getTripTimingText(
  startDate: Date | undefined,
  endDate: Date | undefined
): { text: string; variant: BadgeVariant } {
  if (!startDate || !endDate) {
    return { text: 'Preview', variant: 'secondary' };
  }
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffHours = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffHours / 24);

  if (now > end) {
    return { text: 'Past trip', variant: 'outline' };
  }

  if (now >= start && now <= end) {
    return { text: 'In progress', variant: 'secondary' };
  }

  if (diffHours <= 24) {
    if (diffHours <= 1) {
      return { text: 'Starting soon', variant: 'secondary' };
    }
    return { text: `In ${diffHours} hours`, variant: 'secondary' };
  }

  if (diffDays === 1) {
    return { text: 'Tomorrow', variant: 'secondary' };
  }

  return { text: `${diffDays} days away`, variant: 'secondary' };
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
