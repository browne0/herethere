export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  label?: string;
  required?: boolean;
  className?: string;
}

export interface LocationMapProps {
  location: Location;
  zoom?: number;
  className?: string;
  interactive?: boolean;
}
