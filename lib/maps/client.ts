import { Client } from '@googlemaps/google-maps-services-js';

export class GoogleMapsClient {
  private static instance: Client;
  private static initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor to prevent direct construction calls with 'new'
  }

  public static async getInstance(): Promise<Client> {
    // If we don't have an instance yet, create one
    if (!this.instance) {
      // If we're not already initializing, start initialization
      if (!this.initializationPromise) {
        this.initializationPromise = new Promise<void>(resolve => {
          this.instance = new Client();
          resolve();
        });
      }
      // Wait for initialization to complete
      await this.initializationPromise;
    }
    return this.instance;
  }
}
