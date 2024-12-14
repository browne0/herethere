'use client';
import React, { useState, useEffect } from 'react';

import { GoogleMap, LoadScript, Rectangle, Circle } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';

const SAMPLE_CITIES = [
  {
    name: 'Manhattan',
    bounds: {
      north: 40.8845,
      south: 40.6829,
      east: -73.9071,
      west: -74.0479,
    },
    center: { lat: 40.7831, lng: -73.9712 },
  },
  {
    name: 'Central Paris',
    bounds: {
      north: 48.9021,
      south: 48.8156,
      east: 2.4699,
      west: 2.2241,
    },
    center: { lat: 48.8566, lng: 2.3522 },
  },
];

const BoundsVisualizer = () => {
  const [selectedCity, setSelectedCity] = useState(SAMPLE_CITIES[0]);
  const [showGrid, setShowGrid] = useState(true);
  const [cellSize, setCellSize] = useState(0.015); // ~1.5km
  const [overlap, setOverlap] = useState(0.3); // 30% overlap
  const [searchAreas, setSearchAreas] = useState([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useGoogleMapsStatus();

  useEffect(() => {
    if (showGrid) {
      const cells = generateGridCells(selectedCity.bounds, cellSize, overlap);
      setSearchAreas(cells);
    }
  }, [selectedCity, cellSize, overlap, showGrid]);

  const generateGridCells = (bounds, cellSize, overlap) => {
    const cells = [];
    const effectiveCellSize = cellSize * (1 - overlap);

    const latSpan = bounds.north - bounds.south;
    const lngSpan = bounds.east - bounds.west;

    const numRows = Math.ceil(latSpan / effectiveCellSize);
    const numCols = Math.ceil(lngSpan / effectiveCellSize);

    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        const lat = bounds.south + i * effectiveCellSize + cellSize / 2;
        const lng = bounds.west + j * effectiveCellSize + cellSize / 2;

        cells.push({
          center: { lat, lng },
          radius: (cellSize * 111000) / 2, // Convert degrees to meters (approximately)
          id: `${i}-${j}`,
        });
      }
    }

    return cells;
  };

  const mapOptions = {
    mapTypeId: 'terrain',
    mapTypeControl: true,
    zoomControl: true,
    streetViewControl: false,
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-destructive/10">
        <p className="text-destructive">Failed to load map</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex gap-4 items-center p-4 bg-white shadow rounded">
        <select
          className="p-2 border rounded"
          value={selectedCity.name}
          onChange={e => setSelectedCity(SAMPLE_CITIES.find(c => c.name === e.target.value))}
        >
          {SAMPLE_CITIES.map(city => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
          Show Search Grid
        </label>

        <div className="flex items-center gap-2">
          <label>Cell Size (km):</label>
          <input
            type="range"
            min="0.005"
            max="0.03"
            step="0.001"
            value={cellSize}
            onChange={e => setCellSize(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>{(cellSize * 111).toFixed(1)}km</span>
        </div>

        <div className="flex items-center gap-2">
          <label>Overlap:</label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={overlap}
            onChange={e => setOverlap(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>{(overlap * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex-1 h-96">
        <GoogleMap
          mapContainerClassName="w-full h-full"
          center={selectedCity.center}
          zoom={12}
          options={mapOptions}
        >
          <Rectangle
            bounds={selectedCity.bounds}
            options={{
              fillColor: '#000000',
              fillOpacity: 0.05,
              strokeColor: '#000000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />

          {showGrid &&
            searchAreas.map(area => (
              <Circle
                key={area.id}
                center={area.center}
                radius={area.radius}
                options={{
                  fillColor: '#0088FF',
                  fillOpacity: 0.1,
                  strokeColor: '#0088FF',
                  strokeOpacity: 0.8,
                  strokeWeight: 1,
                }}
              />
            ))}
        </GoogleMap>
      </div>

      <div className="p-4 bg-gray-100 rounded">
        <h3 className="font-semibold">Coverage Statistics:</h3>
        <ul className="mt-2">
          <li>Number of search areas: {searchAreas.length}</li>
          <li>Average area size: {(cellSize * 111).toFixed(1)}km</li>
          <li>Overlap: {(overlap * 100).toFixed(0)}%</li>
        </ul>
      </div>
    </div>
  );
};

export default BoundsVisualizer;
