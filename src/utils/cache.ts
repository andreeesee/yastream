import { Logger } from "./logger.js";

type CacheValue = {
  value: any;
  size: number;
  timeout: NodeJS.Timeout;
};

class GlobalCache {
  private logger = new Logger("CACHE");
  private cache = new Map<string, CacheValue>();
  private MAX_BYTES = 1000 * 1024 * 1024; // 1GB
  private currentByteSize = 0;

  /**
   * @param key Unique identifier (e.g., episode ID)
   * @param value The decrypted subtitle string
   * @param ttlMs Time to live in miliseconds (default 2 hour)
   */
  set(key: string, value: any, ttlMs: number = 2 * 60 * 60 * 1000): void {
    // 1. Calculate size of the new value (approx 2 bytes per char for UTF-16)
    const newSize = JSON.stringify(value).length * 2;

    // 2. Clear old entry if it exists
    this.delete(key);

    // 3. EVICTION LOGIC: If adding this exceeds the limit, delete the oldest
    while (
      this.currentByteSize + newSize > this.MAX_BYTES &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value || ""; // Maps iterate in insertion order
      this.logger.log(`Memory Limit. Evicting oldest | ${oldestKey}`);
      this.delete(oldestKey);
    }

    // 4. Set the new item
    const timeout = setTimeout(() => this.delete(key), ttlMs);
    this.logger.log(`Set ${ttlMs}ms | ${key}`);
    this.cache.set(key, { value, size: newSize, timeout });
    this.currentByteSize += newSize;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.logger.log(`Miss | ${key}`);
      return null;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
      this.currentByteSize -= entry.size;
      this.cache.delete(key);
    }
  }

  getDebugData() {
    return {
      itemCount: this.cache.size,
      memoryUsed: (this.currentByteSize / (1024 * 1024)).toFixed(2),
      maxLimit: (this.MAX_BYTES / (1024 * 1024)).toFixed(2),
      usagePercent: ((this.currentByteSize / this.MAX_BYTES) * 100).toFixed(1),
      keys: Array.from(this.cache.keys()),
    };
  }

  clearAll() {
    for (const [key, entry] of this.cache.entries()) {
      clearTimeout(entry.timeout);
    }
    this.cache.clear();
    this.currentByteSize = 0;
  }
}

// Export a single instance to be used globally
export const cache = new GlobalCache();
