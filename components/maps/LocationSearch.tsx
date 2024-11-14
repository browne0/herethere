'use client';

import { useEffect, useRef, useState } from 'react';

import { useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';
import { Search, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Location, CityBounds } from '@/lib/types';
import { ACTIVITY_CATEGORIES, ActivityCategory } from '@/lib/types/activities';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  defaultValue?: string;
  searchType?: ActivityCategory;
  cityBounds?: CityBounds;
  cityPlaceId?: string;
}

export function LocationSearch({
  onLocationSelect,
  defaultValue,
  searchType,
  cityBounds,
}: LocationSearchProps) {
  const [searchInput, setSearchInput] = useState(defaultValue || '');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      try {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(dummyDiv);
      } catch (err) {
        setError('Failed to initialize location search');
        console.error('Places service initialization error:', err);
      }
    }
  }, [isLoaded]);

  const getPlaceTypes = (category?: ActivityCategory): string[] | undefined => {
    if (!category) return ['establishment'];

    const categoryKey = category.toUpperCase() as keyof typeof ACTIVITY_CATEGORIES;
    const activityCategory = ACTIVITY_CATEGORIES[categoryKey];

    // Return establishment if no specific category types
    return activityCategory?.googlePlaceTypes || ['establishment'];
  };

  const handleSearch = async (value: string) => {
    setSearchInput(value);
    setError('');

    if (!value.trim() || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const searchOptions: google.maps.places.AutocompletionRequest = {
        input: value,
        types: getPlaceTypes(searchType),
      };

      if (cityBounds) {
        const bounds = new google.maps.LatLngBounds(
          { lat: cityBounds.sw.lat, lng: cityBounds.sw.lng },
          { lat: cityBounds.ne.lat, lng: cityBounds.ne.lng }
        );
        searchOptions.locationRestriction = bounds;
      }

      const response = await autocompleteService.current.getPlacePredictions(searchOptions);
      setSuggestions(response?.predictions || []);

      // Show a message if no results found
      if (response?.predictions.length === 0) {
        setError('No locations found. Try a different search.');
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setError('Unable to search locations. Please try again.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) {
      setError('Location service unavailable');
      return;
    }

    setLoading(true);
    setError('');

    placesService.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types'],
      },
      (result, status) => {
        setLoading(false);

        if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
          const location: Location = {
            address: result.formatted_address || suggestion.description,
            latitude: result.geometry.location.lat(),
            longitude: result.geometry.location.lng(),
            placeId: result.place_id,
            name: result.name,
            types: result.types,
          };

          setSearchInput(location.address);
          setSuggestions([]);
          onLocationSelect(location);
        } else {
          setError('Failed to get location details. Please try again.');
          console.error('Places service error:', status);
        }
      }
    );
  };

  // Handle Google Maps loading error
  if (loadError) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md">
        Unable to load location search. Please refresh the page or try again later.
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
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
          className={`pl-10 ${error ? 'border-red-300' : ''}`}
          disabled={!isLoaded}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-gray-400"
            size={20}
          />
        )}
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

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
