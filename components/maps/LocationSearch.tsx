'use client';

import { useEffect, useRef, useState } from 'react';

import { useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';
import { Search, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Location, ActivitySearchType, CityBounds } from '@/lib/types';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  defaultValue?: string;
  searchType?: ActivitySearchType;
  cityBounds?: CityBounds;
  cityPlaceId?: string;
  variant?: 'default' | 'hero';
}

export function LocationSearch({
  onLocationSelect,
  defaultValue,
  searchType,
  cityBounds,
  cityPlaceId,
  variant = 'default',
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

  const getTypeRestrictions = (searchType: string | undefined): string[] | undefined => {
    if (!searchType) return undefined;
    switch (searchType) {
      case 'address':
        return ['address'];
      case 'establishment':
        return ['establishment'];
      case 'regions':
        return ['(regions)'];
      case 'cities':
        return ['(regions)'];
      default:
        return undefined;
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSuggestions([]);
    setError('');
  };

  const getInputClassName = () => {
    if (variant === 'hero') {
      return cn(
        'w-full h-14 px-12 text-lg',
        'rounded-full border-2 border-indigo-100',
        'bg-white shadow-lg',
        'placeholder:text-gray-400',
        'focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50',
        'animate-fade-in-delayed',
        error ? 'border-red-300' : ''
      );
    }
    return cn('pl-10', error ? 'border-red-300' : '');
  };

  const getCardClassName = () => {
    if (variant === 'hero') {
      return 'absolute z-50 w-full mt-2 overflow-hidden rounded-xl shadow-lg border-0';
    }
    return 'absolute z-50 w-full mt-1 overflow-hidden';
  };

  const handleSearch = async (value: string) => {
    setSearchInput(value);
    setError(''); // Clear any previous errors

    if (!value.trim() || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      const searchOptions: google.maps.places.AutocompletionRequest = {
        input: value,
        types: getTypeRestrictions(searchType),
      };

      if (cityBounds) {
        const bounds = new google.maps.LatLngBounds(
          { lat: cityBounds.sw.lat, lng: cityBounds.sw.lng },
          { lat: cityBounds.ne.lat, lng: cityBounds.ne.lng }
        );
        searchOptions.locationRestriction = bounds;
      }

      const response = await autocompleteService.current.getPlacePredictions(searchOptions);
      const filteredPredictions = response?.predictions || [];
      setSuggestions(filteredPredictions);

      // Show a message if no results found
      if (filteredPredictions.length === 0) {
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
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
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
      <div className={cn('relative', variant === 'hero' ? 'animate-fade-in-delayed' : '')}>
        <Search
          className={cn(
            'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10',
            variant === 'hero' ? 'h-6 w-6' : 'h-5 w-5'
          )}
        />

        <input
          type="text"
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Where would you like to explore?"
          className={getInputClassName()}
          disabled={!isLoaded}
        />

        <div
          className={cn(
            'absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10',
            variant === 'hero' ? 'h-6' : 'h-5'
          )}
        >
          {loading && (
            <Loader2 className="animate-spin text-gray-400" size={variant === 'hero' ? 24 : 20} />
          )}
          {searchInput && !loading && (
            <button
              onClick={() => clearSearch()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {suggestions.length > 0 && (
        <div className="absolute w-full z-50">
          <Card
            className={cn(
              'relative w-full overflow-hidden',
              variant === 'hero' ? 'mt-2 rounded-xl shadow-xl border-0' : 'mt-1'
            )}
          >
            <ul className="py-2 max-h-64 overflow-auto">
              {suggestions.map(suggestion => (
                <li
                  key={suggestion.place_id}
                  className={cn(
                    'px-4 py-3 cursor-pointer',
                    variant === 'hero'
                      ? 'hover:bg-indigo-50 transition-colors duration-200'
                      : 'hover:bg-gray-100'
                  )}
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
        </div>
      )}
    </div>
  );
}
