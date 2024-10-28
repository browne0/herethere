'use client';

import { useEffect, useRef, useState } from 'react';

import { useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { City } from '@/lib/types';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface CitySearchProps {
  onCitySelect: (city: City) => void;
  defaultValue?: string;
}

export function CitySearch({ onCitySelect, defaultValue }: CitySearchProps) {
  const [searchInput, setSearchInput] = useState(defaultValue || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

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
          const city: City = {
            name: suggestion.structured_formatting.main_text,
            address: result.formatted_address || suggestion.description,
            latitude: result.geometry.location!.lat(),
            longitude: result.geometry.location!.lng(),
            placeId: result.place_id!,
            bounds: result.geometry.viewport
              ? {
                  ne: {
                    lat: result.geometry.viewport.getNorthEast().lat(),
                    lng: result.geometry.viewport.getNorthEast().lng(),
                  },
                  sw: {
                    lat: result.geometry.viewport.getSouthWest().lat(),
                    lng: result.geometry.viewport.getSouthWest().lng(),
                  },
                }
              : undefined,
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
              <li
                key={suggestion.place_id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                <div className="text-sm text-gray-500">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
