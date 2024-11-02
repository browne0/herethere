// components/trips/DirectionsButton.tsx
'use client';

import React from 'react';

import { Activity } from '@prisma/client';
import { Navigation } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { Accommodation } from '@/lib/trips';

interface DirectionsButtonProps {
  currentActivity: Activity;
  nextActivity?: Activity;
  previousActivity?: Activity;
  accommodation?: Accommodation;
  label?: string;
  variant?: 'default' | 'link' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isFirstActivity?: boolean;
  isLastActivity?: boolean;
}

export function DirectionsButton({
  currentActivity,
  nextActivity,
  previousActivity,
  accommodation,
  label = 'Directions',
  variant = 'ghost',
  size = 'sm',
  isFirstActivity,
  isLastActivity,
}: DirectionsButtonProps) {
  if (!currentActivity.latitude || !currentActivity.longitude) return null;

  const transportModes = [
    { name: 'Driving', mode: 'driving' as const, icon: '🚗' },
    { name: 'Walking', mode: 'walking' as const, icon: '🚶' },
    { name: 'Transit', mode: 'transit' as const, icon: '🚇' },
    { name: 'Bicycling', mode: 'bicycling' as const, icon: '🚲' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Navigation className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* From Previous Location */}
        {previousActivity && previousActivity.latitude && previousActivity.longitude && (
          <>
            <DropdownMenuItem asChild className="flex-col items-start">
              <a
                href={getGoogleMapsDirectionsUrl(
                  { latitude: currentActivity.latitude, longitude: currentActivity.longitude },
                  { latitude: previousActivity.latitude, longitude: previousActivity.longitude }
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <div className="font-medium">From: {previousActivity.name}</div>
                <div className="text-xs text-muted-foreground">Previous activity</div>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* From Accommodation (if first activity) */}
        {isFirstActivity && accommodation && (
          <>
            <DropdownMenuItem asChild className="flex-col items-start">
              <a
                href={getGoogleMapsDirectionsUrl(
                  { latitude: currentActivity.latitude, longitude: currentActivity.longitude },
                  { latitude: accommodation.latitude, longitude: accommodation.longitude }
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <div className="font-medium">From: {accommodation.name}</div>
                <div className="text-xs text-muted-foreground">Your accommodation</div>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* To Next Location */}
        {nextActivity && nextActivity.latitude && nextActivity.longitude && (
          <>
            <DropdownMenuItem asChild className="flex-col items-start">
              <a
                href={getGoogleMapsDirectionsUrl(
                  { latitude: nextActivity.latitude, longitude: nextActivity.longitude },
                  { latitude: currentActivity.latitude, longitude: currentActivity.longitude }
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <div className="font-medium">To: {nextActivity.name}</div>
                <div className="text-xs text-muted-foreground">Next activity</div>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* To Accommodation (if last activity) */}
        {isLastActivity && accommodation && (
          <>
            <DropdownMenuItem asChild className="flex-col items-start">
              <a
                href={getGoogleMapsDirectionsUrl(
                  { latitude: accommodation.latitude, longitude: accommodation.longitude },
                  { latitude: currentActivity.latitude, longitude: currentActivity.longitude }
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <div className="font-medium">To: {accommodation.name}</div>
                <div className="text-xs text-muted-foreground">Return to accommodation</div>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* From Current Location */}
        <DropdownMenuItem asChild className="flex-col items-start">
          <a
            href={getGoogleMapsDirectionsUrl({
              latitude: currentActivity.latitude,
              longitude: currentActivity.longitude,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <div className="font-medium">From: Current Location</div>
            <div className="text-xs text-muted-foreground">Using your location</div>
          </a>
        </DropdownMenuItem>

        {/* Transport Mode Selector */}
        <DropdownMenuSeparator />
        <div className="p-2">
          <div className="text-xs text-muted-foreground mb-2">Travel Mode</div>
          <div className="grid grid-cols-2 gap-1">
            {transportModes.map(({ name, mode, icon }) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  // Default to directions from current location with selected mode
                  window.open(
                    getGoogleMapsDirectionsUrl(
                      {
                        latitude: currentActivity.latitude!,
                        longitude: currentActivity.longitude!,
                      },
                      undefined
                    ),
                    '_blank'
                  );
                }}
              >
                <span className="mr-2">{icon}</span>
                {name}
              </Button>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
