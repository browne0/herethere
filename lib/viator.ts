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

export interface ViatorDestinationsResponse {
  destinations: ViatorDestination[];
  totalCount: number;
}

export class ViatorAPI {
  private apiKey: string;
  private baseUrl = 'https://api.viator.com/partner';

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
        Accept: 'application/json',
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

  async searchProducts(params: { destId: string; startDate?: string; endDate?: string }) {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify(params),
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
