'use client';
import React, { useState, useEffect } from 'react';

import { GoogleMap, Rectangle, Circle, Polygon } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';

// Manhattan's polygon coordinates
const MANHATTAN_POLYGON = [
  { lat: 40.6829, lng: -74.0479 }, // Battery Park
  { lat: 40.7077, lng: -74.0134 }, // West Village
  { lat: 40.7489, lng: -73.9973 }, // Chelsea
  { lat: 40.7831, lng: -73.9876 }, // Upper West Side
  { lat: 40.8845, lng: -73.9233 }, // Inwood
  { lat: 40.8785, lng: -73.9071 }, // Harlem River
  { lat: 40.7941, lng: -73.931 }, // East Harlem
  { lat: 40.7569, lng: -73.9666 }, // Midtown East
  { lat: 40.7073, lng: -73.9776 }, // East Village
  { lat: 40.6829, lng: -74.0479 }, // Back to Battery Park
];

const isPointInPolygon = (
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
) => {
  const x = point.lng,
    y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

const INITIAL_CENTER = { lat: 40.7831, lng: -73.9712 };

const BoundsVisualizer = () => {
  const [showGrid, setShowGrid] = useState(true);
  const [cellSize, setCellSize] = useState(0.015); // ~1.5km
  const [overlap, setOverlap] = useState(0.3); // 30% overlap
  const [searchAreas, setSearchAreas] = useState<
    Array<{
      center: { lat: number; lng: number };
      radius: number;
      id: string;
      isInManhattan: boolean;
    }>
  >([]);

  const { isLoaded, loadError } = useGoogleMapsStatus();

  useEffect(() => {
    if (showGrid) {
      const cells = generateGridCells(cellSize, overlap);
      setSearchAreas(cells);
    }
  }, [cellSize, overlap, showGrid]);

  const generateGridCells = (cellSize: number, overlap: number) => {
    const bounds = {
      north: 40.8845,
      south: 40.6829,
      east: -73.9071,
      west: -74.0479,
    };

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

        const center = { lat, lng };
        const isInManhattan = isPointInPolygon(center, MANHATTAN_POLYGON);

        cells.push({
          center,
          radius: (cellSize * 111000) / 2, // Convert degrees to meters (approximately)
          id: `${i}-${j}`,
          isInManhattan,
        });
      }
    }

    return cells;
  };

  const mapOptions: google.maps.MapOptions = {
    mapTypeId: 'terrain',
    mapTypeControl: true,
    zoomControl: true,
    streetViewControl: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-destructive/10">
        <Card>
          <CardContent>
            <p className="text-destructive">Failed to load map</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validSearchAreas = searchAreas.filter(area => area.isInManhattan);

  return (
    <div className="w-full h-screen flex flex-col gap-4">
      <div className="flex gap-4 items-center p-4 bg-white shadow rounded">
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

      <div className="relative flex-1">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute' }}
          center={INITIAL_CENTER}
          zoom={12}
          options={mapOptions}
        >
          {/* Manhattan boundary */}
          <Polygon
            paths={MANHATTAN_POLYGON}
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
                  fillColor: area.isInManhattan ? '#0088FF' : '#FF0000',
                  fillOpacity: area.isInManhattan ? 0.2 : 0.1,
                  strokeColor: area.isInManhattan ? '#0088FF' : '#FF0000',
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
          <li>Total search areas: {searchAreas.length}</li>
          <li>Valid Manhattan areas: {validSearchAreas.length}</li>
          <li>Area size: {(cellSize * 111).toFixed(1)}km</li>
          <li>Overlap: {(overlap * 100).toFixed(0)}%</li>
        </ul>
      </div>
    </div>
  );
};

export default BoundsVisualizer;
