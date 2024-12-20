'use client';
import React from 'react';

import { usePathname } from 'next/navigation';

const steps = [
  { label: 'City', path: '/trips/new' },
  { label: 'Dates', path: '/trips/new/dates' },
  { label: 'Budget', path: '/trips/new/budget' },
  { label: 'Activities', path: '/trips/new/activities' },
  { label: 'Food', path: '/trips/new/food' },
  { label: 'Review', path: '/trips/new/review' },
];

export default function NewTripLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex(step => step.path === pathname);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col pt-12">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex-1">
        <div className="relative mb-12">
          <div className="h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className={`flex flex-col items-center ${
                  currentStepIndex > idx ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full -mt-[1.15rem] transition-colors duration-300 ${
                    currentStepIndex >= idx ? 'bg-indigo-600' : 'bg-gray-200'
                  } ${currentStepIndex === idx ? 'ring-4 ring-indigo-100' : ''}`}
                />
                <span className="text-xs mt-1 font-medium">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
