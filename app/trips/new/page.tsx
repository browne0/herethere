'use client';

import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { CitySearch } from '@/components/maps/CitySearch';
import { Button } from '@/components/ui/button';
import { useTripStore } from '@/lib/stores/tripStore';
import { popularDestinations } from '@/lib/trips';
import type { City } from '@/lib/types';

export default function CitySelectionPage() {
  const router = useRouter();
  const { city, setCity } = useTripStore();

  const handleCitySelect = (selectedCity: City) => {
    setCity(selectedCity);
    handleNext();
  };

  const handleNext = () => {
    if (city) {
      router.push('/trips/new/dates');
    }
  };

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Where would you like to explore?
      </h1>

      <div className="space-y-6">
        <CitySearch value={city} onCitySelect={handleCitySelect} />
        <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
          {popularDestinations.map(destination => (
            <button
              key={destination.placeId}
              onClick={() =>
                handleCitySelect({
                  name: destination.name,
                  address: `${destination.name}, ${destination.country}`,
                  placeId: destination.placeId,
                  latitude: destination.location.lat,
                  longitude: destination.location.lng,
                })
              }
              className="group h-9 px-3 rounded-full bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 shadow-sm border border-gray-100 flex items-center gap-1.5 text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" />
              <span className="font-medium">{destination.name}</span>
              <span className="text-gray-400 text-xs">·</span>
              <span className="text-gray-400 text-xs">{destination.country}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <Button
            onClick={handleNext}
            disabled={!city}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
            size="sm"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
