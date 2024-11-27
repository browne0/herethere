'use client';
import React from 'react';

import { MapPin, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export const Hero = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/signup');
  };

  const featuredDestinations = [
    { name: 'New York', country: 'USA' },
    { name: 'Paris', country: 'France' },
    { name: 'Tokyo', country: 'Japan' },
    { name: 'London', country: 'UK' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center py-20">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute transform rotate-45 -left-1/4 -top-1/4 w-full h-full bg-indigo-100/50 rounded-full" />
        <div className="absolute transform -rotate-45 -right-1/4 -bottom-1/4 w-full h-full bg-purple-100/50 rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Primary CTA Section */}
        <div className="mb-8">
          <h1 className="inline-block text-5xl md:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">
            Your Personalized NYC Trip,
            <br />
            Planned in Minutes.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Forget the research and planning—just pack and go.
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            Start Planning Your Trip
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Popular Destinations */}
        <div className="mt-12">
          <div className="flex flex-wrap justify-center gap-3">
            {featuredDestinations.map(destination => (
              <div
                key={destination.name}
                className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100"
              >
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-gray-700">{destination.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 text-sm">{destination.country}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {[
            { value: '50k+', label: 'Trips Planned' },
            { value: '150+', label: 'Cities' },
            { value: '4.9/5', label: 'User Rating' },
            { value: '2min', label: 'Avg. Planning Time' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-bold text-3xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {stat.value}
              </div>
              <div className="text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
