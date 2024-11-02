interface Coordinates {
  latitude: number;
  longitude: number;
}

export function getGoogleMapsDirectionsUrl(destination: Coordinates, origin?: Coordinates) {
  const destinationParam = `${destination.latitude},${destination.longitude}`;
  const originParam = origin ? `${origin.latitude},${origin.longitude}` : 'current+location';

  return `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&origin=${originParam}`;
}
