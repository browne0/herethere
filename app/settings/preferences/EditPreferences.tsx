'use client';
import { useState } from 'react';

import {
  Mountain,
  Bike,
  Utensils,
  Bus,
  Users,
  Palette,
  Music,
  Camera,
  Book,
  Sun,
  Moon,
  User2,
  Car,
  Coffee,
  Sparkles,
  Shuffle,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  usePreferences,
  InterestType,
  TransportMode,
  StartTime,
  DietaryRestriction,
  CrowdPreference,
} from '@/lib/stores/preferences';
import { MealType } from '@/lib/types';

const INTERESTS: Array<{ icon: React.ReactNode; label: string; value: InterestType }> = [
  { icon: <Mountain className="w-6 h-6" />, label: 'Nature & Outdoors', value: 'outdoors' },
  { icon: <Palette className="w-6 h-6" />, label: 'Arts & Culture', value: 'arts' },
  { icon: <Utensils className="w-6 h-6" />, label: 'Food & Dining', value: 'food' },
  { icon: <Music className="w-6 h-6" />, label: 'Entertainment', value: 'entertainment' },
  { icon: <Camera className="w-6 h-6" />, label: 'Photography', value: 'photography' },
  { icon: <Book className="w-6 h-6" />, label: 'History', value: 'history' },
];

const ENERGY_LEVELS = [
  {
    value: 1,
    label: 'Light & Easy',
    description: 'Mostly walking and sightseeing',
    icon: <Bike className="w-6 h-6" />,
  },
  {
    value: 2,
    label: 'Moderate',
    description: 'Mix of walking and activities',
    icon: <Bike className="w-6 h-6" />,
  },
  {
    value: 3,
    label: 'Very Active',
    description: 'Full days of activities and exploration',
    icon: <Bike className="w-6 h-6" />,
  },
];

const START_TIMES = [
  {
    value: 'early',
    label: 'Early Bird',
    description: 'Start days before 8am',
    icon: <Sun className="w-6 h-6" />,
  },
  {
    value: 'mid',
    label: 'Mid-Morning',
    description: 'Start days around 9-10am',
    icon: <Sun className="w-6 h-6" />,
  },
  {
    value: 'late',
    label: 'Later Start',
    description: 'Start days after 10am',
    icon: <Moon className="w-6 h-6" />,
  },
];

const TRANSPORT_PREFERENCES: Array<{ icon: React.ReactNode; label: string; value: TransportMode }> =
  [
    { icon: <User2 className="w-5 h-5" />, label: 'Walking', value: 'walking' },
    { icon: <Bus className="w-5 h-5" />, label: 'Public Transit', value: 'public-transit' },
    { icon: <Car className="w-5 h-5" />, label: 'Taxi/Rideshare', value: 'taxi' },
  ];

const CROWD_PREFERENCES = [
  {
    value: 'popular',
    icon: <Users className="w-6 h-6" />,
    label: 'Popular Spots',
    description: "Major attractions and well-known places - you don't want to miss the must-sees",
  },
  {
    value: 'hidden',
    icon: <Sparkles className="w-6 h-6" />,
    label: 'Hidden Gems',
    description:
      'Off the beaten path places and local favorites - you prefer avoiding tourist crowds',
  },
  {
    value: 'mixed',
    icon: <Shuffle className="w-6 h-6" />,
    label: 'Mix of Both',
    description: 'Balance of famous sites and local discoveries - best of both worlds',
  },
];

export default function EditPreferences() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const preferences = usePreferences();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests: preferences.interests,
          pricePreference: preferences.pricePreference,
          pacePreference: preferences.pacePreference,
          energyLevel: preferences.energyLevel,
          preferredStartTime: preferences.preferredStartTime,
          dietaryRestrictions: preferences.dietaryRestrictions,
          cuisinePreferences: preferences.cuisinePreferences,
          mealImportance: preferences.mealImportance,
          transportPreferences: preferences.transportPreferences,
          crowdPreference: preferences.crowdPreference,
        }),
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      toast.success('Preferences saved successfully');
      router.push('/trips');
    } catch (_error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
          {/* Header Section - Mobile Friendly */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Travel Preferences</h1>
              <p className="text-muted-foreground mt-1">Customize how we plan your trips</p>
            </div>
            <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <Card className="p-3 md:p-6">
            <Tabs defaultValue="interests" className="space-y-4 md:space-y-6">
              {/* Mobile-friendly tabs */}
              <TabsList className="grid grid-cols-3 sm:grid-cols-5 gap-1 md:gap-4 h-auto">
                <TabsTrigger value="interests" className="px-2 py-2 h-auto text-sm md:text-base">
                  <span className="hidden md:inline">Interests</span>
                  <Mountain className="w-4 h-4 md:hidden" />
                </TabsTrigger>
                <TabsTrigger value="pace" className="px-2 py-2 h-auto text-sm md:text-base">
                  <span className="hidden md:inline">Pace & Time</span>
                  <Clock className="w-4 h-4 md:hidden" />
                </TabsTrigger>
                <TabsTrigger value="food" className="px-2 py-2 h-auto text-sm md:text-base">
                  <span className="hidden md:inline">Food</span>
                  <Utensils className="w-4 h-4 md:hidden" />
                </TabsTrigger>
                <TabsTrigger value="transport" className="px-2 py-2 h-auto text-sm md:text-base">
                  <span className="hidden md:inline">Transport</span>
                  <Bus className="w-4 h-4 md:hidden" />
                </TabsTrigger>
                <TabsTrigger value="crowd" className="px-2 py-2 h-auto text-sm md:text-base">
                  <span className="hidden md:inline">Experience</span>
                  <Users className="w-4 h-4 md:hidden" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="interests">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest.value}
                      onClick={() => {
                        preferences.setInterests(
                          preferences.interests.includes(interest.value)
                            ? preferences.interests.filter(i => i !== interest.value)
                            : [...preferences.interests, interest.value]
                        );
                      }}
                      className={`p-3 md:p-4 rounded-lg border transition-all relative ${
                        preferences.interests.includes(interest.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-600">{interest.icon}</div>
                        <span className="font-medium text-sm md:text-base">{interest.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pace">
                <div className="space-y-6">
                  <div className="space-y-3 md:space-y-4">
                    <h2 className="font-semibold text-base md:text-lg">Energy Level</h2>
                    {ENERGY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => preferences.setEnergyLevel(level.value as 1 | 2 | 3)}
                        className={`w-full p-3 md:p-4 rounded-lg border transition-all ${
                          preferences.energyLevel === level.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-600">{level.icon}</div>
                          <div className="text-left">
                            <div className="font-medium text-sm md:text-base">{level.label}</div>
                            <div className="text-xs md:text-sm text-gray-500">
                              {level.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <h2 className="font-semibold text-base md:text-lg">
                      When do you like to start your day?
                    </h2>
                    {START_TIMES.map(time => (
                      <button
                        key={time.value}
                        onClick={() => preferences.setPreferredStartTime(time.value as StartTime)}
                        className={`w-full p-3 md:p-4 rounded-lg border transition-all ${
                          preferences.preferredStartTime === time.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-600">{time.icon}</div>
                          <div className="text-left">
                            <div className="font-medium text-sm md:text-base">{time.label}</div>
                            <div className="text-xs md:text-sm text-gray-500">
                              {time.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="food">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-semibold text-base md:text-lg mb-3 md:mb-4">
                      Important Meals
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['breakfast', 'lunch', 'dinner'].map(meal => (
                        <button
                          key={meal}
                          onClick={() => {
                            preferences.setMealImportance({
                              ...preferences.mealImportance,
                              [meal]: !preferences.mealImportance[meal as MealType],
                            });
                          }}
                          className={`p-3 rounded-lg border transition-all flex items-center gap-2 justify-center
                              ${preferences.mealImportance[meal as MealType] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          {meal === 'breakfast' ? (
                            <Coffee className="w-4 h-4" />
                          ) : (
                            <Utensils className="w-4 h-4" />
                          )}
                          <span className="capitalize text-sm md:text-base">{meal}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="font-semibold text-base md:text-lg mb-3 md:mb-4">
                      Dietary Restrictions
                    </h2>
                    <div className="space-y-2">
                      {(['none', 'vegetarian', 'vegan'] as DietaryRestriction[]).map(
                        restriction => (
                          <button
                            key={restriction}
                            onClick={() => {
                              if (restriction === 'none') {
                                preferences.setDietaryRestrictions(['none']);
                              } else {
                                preferences.setDietaryRestrictions(
                                  preferences.dietaryRestrictions.includes(restriction)
                                    ? preferences.dietaryRestrictions.filter(r => r !== restriction)
                                    : [
                                        ...preferences.dietaryRestrictions.filter(
                                          r => r !== 'none'
                                        ),
                                        restriction,
                                      ]
                                );
                              }
                            }}
                            className={`w-full p-3 md:p-4 rounded-lg border transition-all ${
                              preferences.dietaryRestrictions.includes(restriction)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-left">
                              <div className="font-medium text-sm md:text-base capitalize">
                                {restriction === 'none' ? 'No restrictions' : restriction}
                              </div>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transport">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TRANSPORT_PREFERENCES.map(transport => (
                    <button
                      key={transport.value}
                      onClick={() => {
                        preferences.setTransportPreferences(
                          preferences.transportPreferences.includes(transport.value)
                            ? preferences.transportPreferences.filter(t => t !== transport.value)
                            : [...preferences.transportPreferences, transport.value]
                        );
                      }}
                      className={`p-3 md:p-4 rounded-lg border transition-all flex items-center space-x-3 ${
                        preferences.transportPreferences.includes(transport.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-gray-600">{transport.icon}</span>
                      <span className="text-sm md:text-base">{transport.label}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="crowd">
                <div className="space-y-3 md:space-y-4">
                  {CROWD_PREFERENCES.map(preference => (
                    <button
                      key={preference.value}
                      onClick={() =>
                        preferences.setCrowdPreference(preference.value as CrowdPreference)
                      }
                      className={`w-full p-3 md:p-4 rounded-lg border transition-all ${
                        preferences.crowdPreference === preference.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-600">{preference.icon}</div>
                        <div className="text-left">
                          <div className="font-medium text-sm md:text-base">{preference.label}</div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {preference.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
