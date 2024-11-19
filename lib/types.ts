export interface City {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

export type BudgetLevel = 'budget' | 'moderate' | 'luxury';
export interface DateRangeType {
  from: Date | null;
  to: Date | null;
}
