export interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId: number;
  lookupId: string;
  destinationUrl: string;
  defaultCurrencyCode: string;
  timeZone: string;
  iataCodes: string[];
  countryCallingCode: string;
  languages: string[];
  center: {
    latitude: number;
    longitude: number;
  };
}

interface ProductSearchFiltering {
  destination: string;
  tags?: number[];
  flags?: Array<
    | 'NEW_ON_VIATOR'
    | 'FREE_CANCELLATION'
    | 'SKIP_THE_LINE'
    | 'PRIVATE_TOUR'
    | 'SPECIAL_OFFER'
    | 'LIKELY_TO_SELL_OUT'
  >;
  lowestPrice?: number;
  highestPrice?: number;
  startDate?: string;
  endDate?: string;
  includeAutomaticTranslations?: boolean;
  confirmationType?: 'INSTANT';
  durationInMinutes?: {
    from?: number;
    to?: number;
  };
  rating?: {
    from?: number;
    to?: number;
  };
  attractionId?: number;
}

interface ProductSearchSorting {
  sort: 'TRAVELER_RATING' | 'PRICE' | 'POPULARITY' | 'RELEVANCE';
  order: 'ASCENDING' | 'DESCENDING';
}

interface ProductSearchPagination {
  start: number;
  count: number;
}

interface ProductSearchParams {
  filtering: ProductSearchFiltering;
  sorting?: ProductSearchSorting;
  pagination?: ProductSearchPagination;
  currency: string;
}

export interface ViatorDestinationsResponse {
  destinations: ViatorDestination[];
  totalCount: number;
}

export interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  price: {
    fromPrice: number;
    currencyCode: string;
  };
  duration: {
    duration: number;
    unit: string;
  };
  bookingInfo: {
    confirmationType: string;
    cancellationPolicy?: {
      description: string;
      type: string;
    };
  };
  images: {
    urls: string[];
  };
  reviews: {
    combinedRating: number;
    totalReviews: number;
  };
  inclusions?: string[];
  exclusions?: string[];
  highlights?: string[];
  additionalInfo?: string[];
}

export interface ViatorSearchProductsResponse {
  products: ViatorProduct[];
  totalCount: number;
}

export class ViatorAPI {
  private apiKey: string;
  private baseUrl = 'https://api.sandbox.viator.com/partner';

  constructor() {
    if (!process.env.VIATOR_API_KEY) {
      throw new Error('you need a viator api key');
    }
    this.apiKey = process.env.VIATOR_API_KEY;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'exp-api-key': this.apiKey,
        'Accept-Language': 'en-US',
        Accept: 'application/json;version=2.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`Viator API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getDestinations(): Promise<ViatorDestinationsResponse> {
    return this.request('/destinations', {
      method: 'GET',
    });
  }

  async findDestination(cityName: string): Promise<ViatorDestination | null> {
    const { destinations } = await this.getDestinations();

    // First try exact match
    let match = destinations.find(
      dest =>
        dest.name.toLowerCase() === cityName.toLowerCase() && dest.type.toLowerCase() === 'city'
    );

    // If no exact match, try fuzzy match
    if (!match) {
      match = destinations.find(
        dest =>
          dest.name.toLowerCase().includes(cityName.toLowerCase()) &&
          dest.type.toLowerCase() === 'city'
      );
    }

    return match || null;
  }

  async searchProducts(params: {
    destId: string;
    startDate?: string;
    endDate?: string;
    attractionId?: number;
    sorting?: ProductSearchSorting;
    pagination?: ProductSearchPagination;
  }): Promise<ViatorSearchProductsResponse> {
    const searchParams: ProductSearchParams = {
      filtering: {
        destination: params.destId,
        startDate: params.startDate,
        endDate: params.endDate,
        attractionId: params.attractionId,
        // Default to showing available products with free cancellation
        flags: ['FREE_CANCELLATION'],
        // Default to instant confirmation
        confirmationType: 'INSTANT',
        // Only show well-rated products
        rating: {
          from: 3,
          to: 5,
        },
        includeAutomaticTranslations: true,
      },
      sorting: params.sorting || {
        sort: 'TRAVELER_RATING',
        order: 'DESCENDING',
      },
      pagination: params.pagination || {
        start: 1,
        count: 5,
      },
      currency: 'USD',
    };

    return this.request('/products/search', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    });
  }

  async getProductDetails(productCode: string) {
    return this.request(`/${productCode}`);
  }

  async getAvailability(params: { productCode: string; startDate: string; endDate: string }) {
    return this.request('/availability', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}
