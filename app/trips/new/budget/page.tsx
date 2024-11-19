'use client';
import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useTripStore } from '@/lib/stores/tripStore';

const budgetOptions = [
  {
    level: 'budget',
    icon: '💰',
    title: 'Budget-Friendly',
    description: 'Value-focused options with smart money-saving choices',
    examples: 'Hostels, street food, public transport',
  },
  {
    level: 'moderate',
    icon: '💰💰',
    title: 'Moderate',
    description: 'Balanced comfort without excessive spending',
    examples: '3-star hotels, casual restaurants, mix of transport options',
  },
  {
    level: 'luxury',
    icon: '💰💰💰',
    title: 'Luxury',
    description: 'Premium experiences with high-end accommodations',
    examples: '4-5 star hotels, fine dining, private transfers',
  },
] as const;

export default function BudgetPage() {
  const router = useRouter();
  const { city, dates, budget, setBudget } = useTripStore();

  // Only redirect if previous steps are missing
  useEffect(() => {
    if (!city) {
      router.push('/trips/new');
    } else if (!dates?.from || !dates?.to) {
      router.push('/trips/new/dates');
    }
  }, [city, dates, router]);

  const handleBudgetSelect = (level: (typeof budgetOptions)[number]['level']) => {
    setBudget(level);
  };

  const handleNext = () => {
    if (budget) {
      router.push('/trips/new/activities');
    }
  };

  const handleBack = () => {
    router.push('/trips/new/dates');
  };

  if (!city || !dates) return null;

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        What's your budget level for {city.name}?
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {budgetOptions.map(option => (
          <button
            key={option.level}
            onClick={() => handleBudgetSelect(option.level)}
            className={`group p-6 rounded-xl border transition-all duration-300 ${
              budget === option.level
                ? 'border-indigo-600 bg-indigo-50/50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
            }`}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                {option.icon}
              </span>
              <span className="font-medium text-gray-900">{option.title}</span>
              <span className="text-sm text-gray-600">{option.description}</span>
              <span className="text-xs text-gray-500 italic">Example: {option.examples}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!budget}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
