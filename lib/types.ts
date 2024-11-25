export type BudgetLevel = 'budget' | 'moderate' | 'luxury';
export interface DateRangeType {
  from: Date | null;
  to: Date | null;
}

export interface UserPreferences {
  interests: string[]; // e.g., ['history', 'food', 'outdoors']
  pricePreference?: number; // 1-4, matching Google's price_level
  physicalLevel?: number; // 1-3 (easy, moderate, challenging)
  pacePreference?: string; // 'relaxed' | 'moderate' | 'active'
  dietaryRestrictions?: string[];
  tripStyle?: string[]; // e.g., ['local', 'touristy', 'luxury']
}

export interface ScoringFactors {
  baseScore: number; // Initial score based on ratings/reviews
  interestMatch: number; // How well it matches user interests
  priceMatch: number; // Price level compatibility
  bookable: number; // Bonus for Viator-bookable activities
  popularity: number; // Based on review count and ratings
  locationScore: number; // Proximity to other interests/accommodation
}
