'use client';

import { useEffect, useRef, useState } from 'react';

import { Prisma } from '@prisma/client';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useGoogleMapsStatus } from './GoogleMapsProvider';

interface CitySearchProps {
  onCitySelect: (city: Prisma.CityCreateInput) => void;
  defaultValue?: string;
  value?: Prisma.CityCreateInput | null;
  onChange?: (value: string) => void;
}

export function CitySearch({ onCitySelect, defaultValue, value }: CitySearchProps) {
  const [searchInput, setSearchInput] = useState(defaultValue || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useGoogleMapsStatus();

  useEffect(() => {
    if (isLoaded && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (value) {
      setSearchInput(value.name);
    }
  }, [value]);

  const handleSearch = async (value: string) => {
    setSearchInput(value);
    if (!value.trim() || !autocompleteRef.current) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await autocompleteRef.current.getPlacePredictions({
        input: value,
        types: ['(cities)'], // Restrict to cities only
      });

      setSuggestions(response?.predictions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      },
      (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry) {
          const city: Prisma.CityCreateInput = {
            name: suggestion.structured_formatting.main_text,
            latitude: result.geometry.location!.lat(),
            longitude: result.geometry.location!.lng(),
            placeId: result.place_id!,
            countryCode: result.address_components ? result.address_components[0].short_name : 'US',
          };

          setSearchInput(city.name);
          setSuggestions([]);
          setShowSuggestions(false);
          onCitySelect(city);
        }
      }
    );
  };

  const handleClear = () => {
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  if (loadError) {
    return <div className="text-red-500">Error loading Google Maps</div>;
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <Input
          type="text"
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search for a city"
          className="pl-10 pr-10"
          disabled
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-gray-400" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 overflow-hidden">
          <ul className="py-2 max-h-64 overflow-auto">
            {suggestions.map(suggestion => (
              <button
                key={suggestion.place_id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                <div className="text-sm text-gray-500">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </button>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
