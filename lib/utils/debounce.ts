export function debounce<T extends (...args: any[]) => Promise<any>>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  let pendingPromise: Promise<any> | null = null;

  return ((...args: Parameters<T>) => {
    if (pendingPromise) return pendingPromise;

    pendingPromise = new Promise(resolve => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(async () => {
        const result = await func(...args);
        pendingPromise = null;
        resolve(result);
      }, wait);
    });

    return pendingPromise;
  }) as T;
}
