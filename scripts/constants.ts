interface SearchArea {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
}

export const PREDEFINED_CITY_AREAS: Record<string, SearchArea[]> = {
  'New York': [
    {
      name: 'Midtown Manhattan',
      location: { lat: 40.7549, lng: -73.984 },
      radius: 2000,
    },
    {
      name: 'Lower Manhattan',
      location: { lat: 40.7128, lng: -74.006 },
      radius: 2000,
    },
    {
      name: 'Upper East Side',
      location: { lat: 40.7736, lng: -73.9566 },
      radius: 2000,
    },
    {
      name: 'Upper West Side',
      location: { lat: 40.787, lng: -73.9754 },
      radius: 2000,
    },
    {
      name: 'Harlem',
      location: { lat: 40.8116, lng: -73.9465 },
      radius: 2000,
    },
    {
      name: 'East Harlem',
      location: { lat: 40.7957, lng: -73.9389 },
      radius: 1500,
    },
    {
      name: 'Washington Heights',
      location: { lat: 40.8417, lng: -73.9394 },
      radius: 2000,
    },
    {
      name: 'Chelsea',
      location: { lat: 40.7465, lng: -74.0014 },
      radius: 1500,
    },
    {
      name: 'Greenwich Village',
      location: { lat: 40.7336, lng: -74.0027 },
      radius: 1500,
    },
    {
      name: 'SoHo',
      location: { lat: 40.7243, lng: -74.0018 },
      radius: 1500,
    },
    {
      name: 'Tribeca',
      location: { lat: 40.7163, lng: -74.0086 },
      radius: 1500,
    },
    {
      name: 'Financial District',
      location: { lat: 40.7075, lng: -74.0113 },
      radius: 1500,
    },
    {
      name: 'Chinatown',
      location: { lat: 40.7158, lng: -73.997 },
      radius: 1000,
    },
    {
      name: 'Little Italy',
      location: { lat: 40.7191, lng: -73.9973 },
      radius: 1000,
    },
    {
      name: 'Flatiron District',
      location: { lat: 40.7401, lng: -73.9903 },
      radius: 1500,
    },
    {
      name: 'Hells Kitchen',
      location: { lat: 40.7638, lng: -73.9918 },
      radius: 1500,
    },
    {
      name: 'Battery Park City',
      location: { lat: 40.7115, lng: -74.0156 },
      radius: 1000,
    },
  ],
  // Add more cities as needed
};
