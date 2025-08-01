// parent class for all scrapers

export interface SongInfo {
    title: string;
    artist: string;
    album?: string;
    duration?: string;
    year?: number;
    genre?: string;
  }
  
  export interface ChordInfo {
    name: string;
    fingering: string;
    fret?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    alternatives?: string[];
  }
  
  export interface TabSection {
    name: string; // verse, chorus, bridge, etc.
    content: string;
    chords: ChordInfo[];
    timestamp?: number;
  }
  
  export interface TabData {
    id: string;
    song: SongInfo;
    chords: ChordInfo[];
    sections: TabSection[];
    tabContent: string;
    source: string;
    sourceUrl: string;
    rating?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    tuning?: string;
    capo?: number;
    type: 'chords' | 'tabs' | 'bass' | 'ukulele';
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ScrapingResult {
    success: boolean;
    data?: TabData[];
    error?: string;
    retryAfter?: number; 
    rateLimitHit?: boolean;
  }
  
  export interface ScrapingOptions {
    maxResults?: number;
    includeRatings?: boolean;
    preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    instrumentType?: 'guitar' | 'bass' | 'ukulele';
    timeout?: number; // ms
    retryAttempts?: number;
  }
  
 // interface for all scrapers
  export abstract class BaseScraper {
    protected siteName: string;
    protected baseUrl: string;
    protected rateLimit: number; 
    protected lastRequestTime: number = 0;
    protected requestQueue: Array<() => Promise<any>> = [];
    private isProcessingQueue = false;
  
    constructor(siteName: string, baseUrl: string, rateLimit: number = 30) {
      this.siteName = siteName;
      this.baseUrl = baseUrl;
      this.rateLimit = rateLimit;
    }
  

    abstract search(query: string, options?: ScrapingOptions): Promise<ScrapingResult>;
    abstract getTabById(id: string): Promise<ScrapingResult>;
    
    protected async enforceRateLimit(): Promise<void> {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = (60 * 1000) / this.rateLimit; // milliseconds between requests
  
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await this.sleep(waitTime);
      }
  
      this.lastRequestTime = Date.now();
    }
  

    protected async queueRequest<T>(request: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            await this.enforceRateLimit();
            const result = await request();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
  
        this.processQueue();
      });
    }
  
    private async processQueue(): Promise<void> {
      if (this.isProcessingQueue || this.requestQueue.length === 0) {
        return;
      }
  
      this.isProcessingQueue = true;
  
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();
        if (request) {
          try {
            await request();
          } catch (error) {
            console.error(`Error processing request for ${this.siteName}:`, error);
          }
        }
      }
  
      this.isProcessingQueue = false;
    }
  

    protected sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    protected normalizeChordName(chord: string): string {
      return chord
        .trim()
        .replace(/[\[\]]/g, '') 
        .replace(/\s+/g, '') 
        .replace(/([A-G])(#|b)?([^/]*)(\/[A-G](#|b)?)?/, '$1$2$3$4'); 
    }
  
    protected parseChordFromText(text: string): ChordInfo[] {

      const chordRegex = /\b([A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add|\d)*(?:\/[A-G](?:#|b)?)?)\b/g;
      const matches = text.match(chordRegex) || [];
      
      return [...new Set(matches)].map(chord => ({
        name: this.normalizeChordName(chord),
        fingering: this.getDefaultFingering(chord),
      }));
    }
  
    // temporary default fingering for chords
    protected getDefaultFingering(chordName: string): string {
      const basicChords: Record<string, string> = {
        'C': 'x32010',
        'D': 'xx0232',
        'E': '022100',
        'F': '133211',
        'G': '320003',
        'A': 'x02220',
        'B': 'x24442',
        'Am': 'x02210',
        'Dm': 'xx0231',
        'Em': '022000',
        'Fm': '133111',
        'Gm': '355333',
        'C7': 'x32310',
        'D7': 'xx0212',
        'E7': '020100',
        'F7': '131211',
        'G7': '320001',
        'A7': 'x02020',
        'B7': 'x21202',
      };
  
      return basicChords[chordName] || 'x00000';
    }
  
    protected sanitizeHtml(html: string): string {
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    protected extractTextFromElement(element: Element | null): string {
      if (!element) return '';
      return this.sanitizeHtml(element.innerHTML || element.textContent || '');
    }
  
    protected handleScrapingError(error: any, context: string): ScrapingResult {
      console.error(`${this.siteName} scraping error in ${context}:`, error);
  
      if (error.status === 429 || error.message?.includes('rate limit')) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimitHit: true,
          retryAfter: 60 
        };
      }
  
      if (error.status === 403 || error.status === 401) {
        return {
          success: false,
          error: 'Access denied - site may be blocking requests'
        };
      }
  
      if (error.status === 404) {
        return {
          success: false,
          error: 'Content not found'
        };
      }
  
      return {
        success: false,
        error: error.message || 'Unknown scraping error'
      };
    }
  
    getSiteName(): string {
      return this.siteName;
    }
  
    getBaseUrl(): string {
      return this.baseUrl;
    }
  
    getRateLimit(): number {
      return this.rateLimit;
    }
  }
  
  export class TabCache {
    private cache: Map<string, { data: TabData[], timestamp: number }> = new Map();
    private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes
  
    set(key: string, data: TabData[]): void {
      this.cache.set(key, {
        data: [...data], // Create a copy
        timestamp: Date.now()
      });
    }
  
    get(key: string): TabData[] | null {
      const cached = this.cache.get(key);
      
      if (!cached) return null;
      
      if (Date.now() - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        return null;
      }
      
      return [...cached.data];
    }
  
    clear(): void {
      this.cache.clear();
    }
  
    cleanup(): void {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }
  
    size(): number {
      return this.cache.size;
    }
  }
  
// debugging log
  export class ScrapingLogger {
    private logs: Array<{ timestamp: Date; level: string; message: string; context: string }> = [];
    
    log(level: 'info' | 'warn' | 'error', message: string, context: string = 'general'): void {
      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        context
      };
      
      this.logs.push(logEntry);
      console.log(`[${level.toUpperCase()}] ${context}: ${message}`);
      
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
      }
    }
  
    getLogs(level?: string, context?: string): typeof this.logs {
      return this.logs.filter(log => 
        (!level || log.level === level) && 
        (!context || log.context === context)
      );
    }
  
    clearLogs(): void {
      this.logs = [];
    }
  }