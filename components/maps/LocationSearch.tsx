'use client';

import { useEffect, useRef, useState } from 'react';

import { useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';
import { Search } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Location, ActivitySearchType } from '@/lib/types';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  defaultValue?: string;
  searchType?: ActivitySearchType;
}

export function LocationSearch({
  onLocationSelect,
  defaultValue,
  searchType,
}: LocationSearchProps) {
  const [searchInput, setSearchInput] = useState(defaultValue || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      const dummyDiv = document.createElement('div');
      placesService.current = new google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  const handleSearch = async (value: string) => {
    setSearchInput(value);
    if (!value.trim() || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await autocompleteService.current.getPlacePredictions({ input: value });
      setSuggestions(response?.predictions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      },
      (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
          const location: Location = {
            address: result.formatted_address || suggestion.description,
            latitude: result.geometry.location.lat(),
            longitude: result.geometry.location.lng(),
            placeId: result.place_id,
            name: result.name,
          };

          setSearchInput(location.address);
          setSuggestions([]);
          onLocationSelect(location);
        }
      }
    );
  };

  if (loadError) return <div>Error loading Google Maps</div>;

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <Input
          type="text"
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search for a location"
          className="pl-10"
        />
      </div>

      {suggestions.length > 0 && (
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
