'use client';
import React, { useState } from 'react';

import { ArrowLeft, ArrowRight, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

import DateRangePicker from '@/components/DateRangePicker';
import { ActivityPreferencesStep } from '@/components/landing/ActivityPreferencesStep';
import { CitySearch } from '@/components/maps/CitySearch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { dietaryOptions, popularDestinations } from '@/lib/trips';
import type { City, DateRangeType, TripPreferences } from '@/lib/types';

const NewTripFlow = () => {
  const [step, setStep] = useState(1);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [preferences, setPreferences] = useState<TripPreferences>({
    dates: {
      from: new Date(),
      to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    dietary: [],
    tripVibe: 50,
    budget: 'moderate',
    pace: 3,
    activities: [],
    customInterests: '',
    city: null,
    walkingComfort: undefined,
  });

  const router = useRouter();

  const updatePreferences = <K extends keyof TripPreferences>(
    key: K,
    value: TripPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePopularCityClick = (popularCity: (typeof popularDestinations)[0]) => {
    // Create a simplified City object for popular destinations
    const city: City = {
      name: popularCity.name,
      address: `${popularCity.name}, ${popularCity.country}`,
      placeId: popularCity.placeId,
      latitude: popularCity.location.lat,
      longitude: popularCity.location.lng,
    };

    setSelectedCity(city);
    setStep(prev => Math.min(6, prev + 1));
  };

  const canProceedToNext = () => {
    switch (step) {
      case 1:
        return selectedCity !== null;
      case 2:
        return preferences.dates?.from && preferences.dates?.to;
      case 3:
        return true; // Can proceed even if no dietary restrictions are selected
      case 4:
        return preferences.activities.length > 0;
      case 5:
        return preferences.budget && preferences.tripVibe >= 0;
      case 6:
        return preferences.pace >= 1 && preferences.pace <= 5;
      default:
        return false;
    }
  };

  const onSubmit = async (preferences: TripPreferences) => {
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Trip to ${selectedCity?.name}`,
          preferences,
          latitude: selectedCity?.latitude,
          longitude: selectedCity?.longitude,
          placeId: selectedCity?.placeId,
          destination: selectedCity?.name,
          startDate: preferences.dates?.from,
          endDate: preferences.dates?.to,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate trip');
      }

      const {
        trip: { id },
      } = await response.json();
      router.push(`/trips/${id}`);
    } catch (error) {
      console.error('Error generating trip:', error);
      throw new Error('Failed to generate trip. Please try again.');
    }
  };

  const handleSubmit = () => {
    onSubmit(preferences);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (canProceedToNext()) {
      setStep(prev => Math.min(6, prev + 1));
    }
  };

  const stepHeaders = {
    1: 'Where would you like to explore?',
    2: `When would you like to visit?`,
    3: 'Any dietary preferences?',
    4: `What activities interest you in?`,
    5: "What's your travel style?",
    6: 'How do you like to pace your days?',
  } as const;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col pt-12">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex-1">
        {/* Consistent heading style */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          {stepHeaders[step as keyof typeof stepHeaders]}
        </h1>
        {/* Progress bar */}
        <div className="relative mb-12">
          <div className="h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {['City', 'Dates', 'Diet', 'Activities', 'Vibe', 'Pace'].map((label, idx) => (
              <div
                key={label}
                className={`flex flex-col items-center ${
                  step > idx + 1 ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full -mt-[1.15rem] transition-colors duration-300 ${
                    step > idx ? 'bg-indigo-600' : 'bg-gray-200'
                  } ${step === idx + 1 ? 'ring-4 ring-indigo-100' : ''}`}
                />
                <span className="text-xs mt-1 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content container */}
        <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent animate-fade-in">
          {step === 1 && (
            <div className="space-y-6">
              <CitySearch
                value={selectedCity}
                onCitySelect={(city: City) => {
                  setSelectedCity(city);
                  handleNext();
                }}
              />
              <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
                {popularDestinations.map(destination => (
                  <button
                    key={destination.placeId}
                    onClick={() => handlePopularCityClick(destination)}
                    className="group h-9 px-3 rounded-full bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 shadow-sm border border-gray-100 flex items-center gap-1.5 text-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" />
                    <span className="font-medium">{destination.name}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-400 text-xs">{destination.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <DateRangePicker
              dates={preferences.dates as DateRangeType}
              onSelect={dates => updatePreferences('dates', dates)}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                Any dietary preferences?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dietaryOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      const newDietary = preferences.dietary.includes(option.id)
                        ? preferences.dietary.filter(d => d !== option.id)
                        : [...preferences.dietary, option.id];
                      updatePreferences('dietary', newDietary);
                    }}
                    className={`group p-4 rounded-xl border transition-all duration-300
                    ${
                      preferences.dietary.includes(option.id)
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                        {option.icon}
                      </span>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <ActivityPreferencesStep
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          )}

          {step === 5 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  How many activities do you prefer per day?
                </label>
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-4">
                    <span className="text-xs sm:text-sm font-medium text-indigo-600">
                      1-2 main activities
                      <br />
                      <span className="text-gray-500 text-xs">Relaxed pace</span>
                    </span>
                    <Slider
                      value={[preferences.tripVibe]}
                      onValueChange={([value]) => updatePreferences('tripVibe', value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs sm:text-sm font-medium text-purple-600">
                      4-5 activities
                      <br />
                      <span className="text-gray-500 text-xs">Action-packed</span>
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600 mt-2">
                  {preferences.tripVibe <= 33 &&
                    'Perfect for savoring each location and taking your time'}
                  {preferences.tripVibe > 33 &&
                    preferences.tripVibe <= 66 &&
                    'A balanced mix of activities with time to rest'}
                  {preferences.tripVibe > 66 && 'Great for seeing as much as possible in your time'}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  How much walking are you comfortable with?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => updatePreferences('walkingComfort', 'minimal')}
                    className={`group p-4 rounded-xl border transition-all duration-300 ${
                      preferences.walkingComfort === 'minimal'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                        🚗
                      </span>
                      <span className="font-medium text-gray-900">Minimal Walking</span>
                      <span className="text-xs text-gray-500">Prefer transport between places</span>
                    </div>
                  </button>

                  <button
                    onClick={() => updatePreferences('walkingComfort', 'moderate')}
                    className={`group p-4 rounded-xl border transition-all duration-300 ${
                      preferences.walkingComfort === 'moderate'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                        🚶
                      </span>
                      <span className="font-medium text-gray-900">Moderate Walking</span>
                      <span className="text-xs text-gray-500">2-3 miles per day</span>
                    </div>
                  </button>

                  <button
                    onClick={() => updatePreferences('walkingComfort', 'lots')}
                    className={`group p-4 rounded-xl border transition-all duration-300 ${
                      preferences.walkingComfort === 'lots'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                        🏃
                      </span>
                      <span className="font-medium text-gray-900">Lots of Walking</span>
                      <span className="text-xs text-gray-500">5+ miles per day</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                How do you like to pace your days?
              </h2>

              <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                    <Slider
                      value={[preferences.pace]}
                      onValueChange={([value]) => updatePreferences('pace', value)}
                      max={5}
                      step={1}
                      className="flex-1 mx-4 sm:mx-6"
                    />
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm font-medium">
                    <span className="text-indigo-600">Leisurely</span>
                    <span className="text-gray-600">Balanced</span>
                    <span className="text-purple-600">Fast-paced</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs sm:text-sm text-gray-600">
                <p>We&apos;ll optimize your daily schedule based on your preferred pace</p>
              </div>
            </div>
          )}
          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className={`transition-opacity duration-300 ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={step === 6 ? handleSubmit : handleNext}
              className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 ${
                !canProceedToNext() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!canProceedToNext()}
              size="sm"
            >
              {step === 6 ? (
                'Generate My Trip'
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTripFlow;
