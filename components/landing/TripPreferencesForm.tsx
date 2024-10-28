import React, { useState } from 'react';

import { Clock, ArrowRight, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { DemoTripPreferences } from '@/lib/types';

import { ActivityPreferencesStep } from './ActivityPreferencesStep';

interface TripPreferencesFormProps {
  city: string;
  onSubmit: (preferences: DemoTripPreferences) => void;
}

const dietaryOptions = [
  { id: 'vegetarian' as const, label: 'Vegetarian', icon: '🥗' },
  { id: 'vegan' as const, label: 'Vegan', icon: '🌱' },
  { id: 'halal' as const, label: 'Halal', icon: '🥩' },
  { id: 'kosher' as const, label: 'Kosher', icon: '✡️' },
  { id: 'gluten-free' as const, label: 'Gluten Free', icon: '🌾' },
  { id: 'none' as const, label: 'No Restrictions', icon: '🍽️' },
];

const budgetOptions = [
  {
    id: 'budget' as const,
    label: 'Budget Friendly',
    icon: '💰',
    description: 'Affordable adventures',
  },
  { id: 'moderate' as const, label: 'Moderate', icon: '💰💰', description: 'Balanced spending' },
  { id: 'luxury' as const, label: 'Luxury', icon: '💰💰💰', description: 'Premium experiences' },
];

export function TripPreferencesForm({ city, onSubmit }: TripPreferencesFormProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<DemoTripPreferences>({
    dates: undefined,
    dietary: [],
    tripVibe: 50,
    budget: 'moderate',
    pace: 3,
    activities: [],
    customInterests: '',
  });

  const updatePreferences = <K extends keyof DemoTripPreferences>(
    key: K,
    value: DemoTripPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const canProceedToNext = () => {
    switch (step) {
      case 1:
        return preferences.dates?.from && preferences.dates?.to;
      case 2:
        return true; // Can proceed even if no dietary restrictions are selected

      case 3:
        return preferences.activities.length > 0;
      case 4:
        return preferences.budget && preferences.tripVibe >= 0;
      case 5:
        return preferences.pace >= 1 && preferences.pace <= 5;
      default:
        return false;
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
      setStep(prev => Math.min(4, prev + 1));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col pt-12">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex-1">
        {/* Heading with gradient text */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Plan Your {city} Adventure
        </h1>

        {/* Progress bar */}
        <div className="relative mb-12">
          <div className="h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {['Dates', 'Diet', 'Activities', 'Style', 'Pace'].map((label, idx) => (
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

        {/* Content container with gradient border */}
        <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent animate-fade-in overflow-hidden">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                When would you like to visit?
              </h2>
              <div className="flex justify-center">
                <Calendar
                  mode="range"
                  selected={preferences.dates}
                  onSelect={range => updatePreferences('dates', range)}
                  className="rounded-lg border shadow-lg bg-white w-full sm:w-auto"
                  disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  fromDate={new Date()}
                />
              </div>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
            <ActivityPreferencesStep
              preferences={preferences}
              updatePreferences={updatePreferences}
            />
          )}

          {step === 4 && (
            <div className="space-y-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
                What&apos;s your travel style?
              </h2>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Adventure Level</label>
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-4">
                    <span className="text-xs sm:text-sm font-medium text-indigo-600">Relaxed</span>
                    <Slider
                      value={[preferences.tripVibe]}
                      onValueChange={([value]) => updatePreferences('tripVibe', value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs sm:text-sm font-medium text-purple-600">
                      Adventurous
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Budget Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {budgetOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => updatePreferences('budget', option.id)}
                      className={`group p-4 rounded-xl border transition-all duration-300 ${
                        preferences.budget === option.id
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                          {option.icon}
                        </span>
                        <span className="font-medium text-gray-900">{option.label}</span>
                        <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
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
              onClick={step === 4 ? handleSubmit : handleNext}
              className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 ${
                !canProceedToNext() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!canProceedToNext()}
              size="sm"
            >
              {step === 4 ? (
                'Create My Trip'
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
}
