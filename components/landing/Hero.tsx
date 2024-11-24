'use client';
import React from 'react';

import { Prisma } from '@prisma/client';
import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { popularDestinations } from '@/lib/trips';

import { CitySearch } from '../maps/CitySearch';

export function Hero() {
  const router = useRouter();

  const handleCitySelect = (city: Prisma.CityCreateInput) => {
    // Encode the city data in the URL to pass it to the preferences page
    const cityData = encodeURIComponent(
      JSON.stringify({
        name: city.name,
        placeId: city.placeId,
        location: {
          lat: city.latitude,
          lng: city.longitude,
        },
      })
    );

    router.push(`/demo/trip/preferences?city=${cityData}`);
  };

  const handlePopularCityClick = (popularCity: (typeof popularDestinations)[0]) => {
    // Create a simplified City object for popular destinations
    const city: Prisma.CityCreateInput = {
      name: popularCity.name,
      placeId: popularCity.placeId,
      latitude: popularCity.location.lat,
      longitude: popularCity.location.lng,
      countryCode: popularCity.countryCode,
    };

    handleCitySelect(city);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center py-20">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute transform rotate-45 -left-1/4 -top-1/4 w-full h-full bg-indigo-100/50 rounded-full" />
        <div className="absolute transform -rotate-45 -right-1/4 -bottom-1/4 w-full h-full bg-purple-100/50 rounded-full" />
      </div>

      {/* Floating cards */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="absolute top-1/4 -left-4 w-64 h-40 bg-white rounded-lg shadow-xl transform -rotate-12 opacity-60" />
        <div className="absolute bottom-1/4 -right-4 w-64 h-40 bg-white rounded-lg shadow-xl transform rotate-12 opacity-60" />
      </div>

      {/* Main content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6">
          <h1 className="inline-block text-4xl md:text-5xl font-bold leading-tight md:leading-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 animate-fade-in px-4">
            Your Personalized Trip, Planned in Minutes.
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto animate-fade-in-delayed">
          Forget the research and planning—just pack and go.
        </p>

        <div className="relative z-30 max-w-2xl mx-auto animate-fade-in-delayed">
          <CitySearch onCitySelect={handleCitySelect} />

          <div className="relative z-0 mt-6">
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
        </div>

        {/* Trust indicators */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-gray-600 animate-fade-in-delayed">
          {[
            { label: 'Cities', value: '150+' },
            { label: 'Countries', value: '50+' },
            { label: 'Happy Travelers', value: '10k+' },
            { label: 'Restaurants', value: '5k+' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-bold text-2xl text-indigo-600">{stat.value}</div>
              <div className="text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
