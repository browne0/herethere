import { createApi } from 'unsplash-js';

export class UnsplashClient {
  private static instance: ReturnType<typeof createApi>;

  private constructor() {}

  public static getInstance(): ReturnType<typeof createApi> {
    if (!UnsplashClient.instance) {
      if (!process.env.UNSPLASH_ACCESS_KEY) {
        throw new Error('UNSPLASH_ACCESS_KEY is not set in environment variables');
      }

      UnsplashClient.instance = createApi({
        accessKey: process.env.UNSPLASH_ACCESS_KEY,
      });
    }

    return UnsplashClient.instance;
  }
}
