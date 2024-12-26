import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

interface APICallStats {
  searchNearby: number;
  placeDetails: number;
}

interface RestaurantSubtypes {
  upscale: number;
  standard: number;
  byType: Record<string, number>;
}

interface LoggerStats {
  processed: number;
  added: number;
  skipped: number;
  errors: number;
  imageErrors: number;
  apiCalls: APICallStats;
  byType: Record<string, number>;
  byArea: Record<string, number>;
  restaurantSubtypes: RestaurantSubtypes;
}

export class Logger {
  private readonly logFile: string;
  private readonly logDir: string = './logs';

  constructor(filename: string) {
    // Ensure logs directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir);
    }

    this.logFile = path.join(this.logDir, filename);

    // Initialize log file with timestamp
    this.info('='.repeat(50));
    this.info(`Log started at ${new Date().toISOString()}`);
    this.info('='.repeat(50));
  }

  private writeToFile(message: string): void {
    appendFileSync(this.logFile, message + '\n', 'utf8');
  }

  private formatMessage(message: string | object): string {
    return typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  }

  info(message: string | object): void {
    const formattedMessage = this.formatMessage(message);
    console.log(formattedMessage);
    this.writeToFile(`[INFO] ${formattedMessage}`);
  }

  error(message: string | object, error?: Error): void {
    const formattedMessage = this.formatMessage(message);
    const errorDetails = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';

    console.error(formattedMessage + errorDetails);
    this.writeToFile(`[ERROR] ${formattedMessage}${errorDetails}`);
  }

  success(message: string): void {
    const formattedMessage = `✅ ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[SUCCESS] ${message}`);
  }

  warn(message: string): void {
    const formattedMessage = `⚠️ ${message}`;
    console.warn(formattedMessage);
    this.writeToFile(`[WARNING] ${message}`);
  }

  skip(message: string): void {
    const formattedMessage = `⏭️ ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[SKIP] ${message}`);
  }

  progress(message: string): void {
    const formattedMessage = `🔄 ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[PROGRESS] ${message}`);
  }

  stats(stats: LoggerStats): void {
    const messages: string[] = [
      '\nSync Statistics:',
      '-'.repeat(30),
      `Total processed: ${stats.processed}`,
      `Added/Updated: ${stats.added}`,
      `Skipped: ${stats.skipped}`,
      `Errors: ${stats.errors}`,
      `Image Upload Errors: ${stats.imageErrors}`,
      '\nAPI Calls:',
      `Search Nearby: ${stats.apiCalls.searchNearby}`,
      `Place Details: ${stats.apiCalls.placeDetails}`,
      '\nBy Type:',
      ...Object.entries(stats.byType)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([type, count]) => `${type}: ${count}`),
      '\nBy Area:',
      ...Object.entries(stats.byArea)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([area, count]) => `${area}: ${count}`),
    ];

    if ((stats.byType.RESTAURANT ?? 0) > 0) {
      messages.push(
        '\nRestaurant Types:',
        `Upscale: ${stats.restaurantSubtypes.upscale}`,
        `Standard: ${stats.restaurantSubtypes.standard}`,
        '\nCuisine Types:',
        ...Object.entries(stats.restaurantSubtypes.byType)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([cuisine, count]) => `${cuisine}: ${count}`)
      );
    }

    messages.forEach(message => {
      console.log(message);
      this.writeToFile(message);
    });
  }
}
