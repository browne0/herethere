import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export class Logger {
  private logFile: string;
  private logDir: string = './logs';

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

  private writeToFile(message: string) {
    appendFileSync(this.logFile, message + '\n', 'utf8');
  }

  info(message: string | object) {
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    console.log(formattedMessage);
    this.writeToFile(`[INFO] ${formattedMessage}`);
  }

  error(message: string | object, error?: Error) {
    const formattedMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    const errorDetails = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';

    console.error(formattedMessage + errorDetails);
    this.writeToFile(`[ERROR] ${formattedMessage}${errorDetails}`);
  }

  success(message: string) {
    const formattedMessage = `✅ ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[SUCCESS] ${message}`);
  }

  warn(message: string) {
    const formattedMessage = `⚠️ ${message}`;
    console.warn(formattedMessage);
    this.writeToFile(`[WARNING] ${message}`);
  }

  skip(message: string) {
    const formattedMessage = `⏭️ ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[SKIP] ${message}`);
  }

  progress(message: string) {
    const formattedMessage = `🔄 ${message}`;
    console.log(formattedMessage);
    this.writeToFile(`[PROGRESS] ${message}`);
  }

  stats(stats: Record<string, any>) {
    const messages = [
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
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `${type}: ${count}`),
      '\nBy Area:',
      ...Object.entries(stats.byArea)
        .sort(([, a], [, b]) => b - a)
        .map(([area, count]) => `${area}: ${count}`),
    ];

    if (stats.byType.RESTAURANT > 0) {
      messages.push(
        '\nRestaurant Types:',
        `Upscale: ${stats.restaurantSubtypes.upscale}`,
        `Standard: ${stats.restaurantSubtypes.standard}`,
        '\nCuisine Types:',
        ...Object.entries(stats.restaurantSubtypes.byType)
          .sort(([, a], [, b]) => b - a)
          .map(([cuisine, count]) => `${cuisine}: ${count}`)
      );
    }

    messages.forEach(message => {
      console.log(message);
      this.writeToFile(message);
    });
  }
}
