import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

import { PlaceCategory } from '@/constants';

interface SyncStats {
  processed: number;
  added: number;
  updated: number;
  errors: number;
  byType: Record<PlaceCategory, number>;
  byArea: Record<string, number>;
  apiCalls: {
    searchNearby: number;
  };
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

  stats(stats: SyncStats): void {
    const messages = [
      '\nSync Statistics:',
      '-'.repeat(30),
      `Total processed: ${stats.processed}`,
      `Added: ${stats.added}`,
      `Updated: ${stats.updated}`,
      `Errors: ${stats.errors}`,
      `API Calls (searchNearby): ${stats.apiCalls.searchNearby}`,
      '\nBy Type:',
      ...Object.entries(stats.byType)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `${type}: ${count}`),
      '\nBy Area:',
      ...Object.entries(stats.byArea)
        .sort(([, a], [, b]) => b - a)
        .map(([area, count]) => `${area}: ${count}`),
    ];

    messages.forEach(message => {
      console.log(message);
      this.writeToFile(message);
    });
  }
}
