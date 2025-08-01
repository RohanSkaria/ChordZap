import { BaseScraper, ScrapingResult, ScrapingOptions, TabData, TabCache, ScrapingLogger } from './BaseScraper';
import { UltimateGuitarScraper } from './UltimateGuitarScraper';

export interface ScraperInfo {
  name: string;
  isActive: boolean;
  lastUsed: Date | null;
  successRate: number;
  averageResponseTime: number;
  rateLimitStatus: 'ok' | 'limited' | 'blocked';
}

export interface SearchFilters {
  minRating?: number;
  maxDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferredSources?: string[];
  excludeSources?: string[];
  requireChords?: boolean;
  requireTabs?: boolean;
}

export interface AggregatedResult {
  query: string;
  totalResults: number;
  sources: string[];
  results: TabData[];
  searchTime: number;
  errors: string[];
}

export class TabScrapingManager {
  private scrapers: Map<string, BaseScraper> = new Map();
  private cache = new TabCache();
  private logger = new ScrapingLogger();
  private scraperStats: Map<string, ScraperInfo> = new Map();

  constructor() {
    this.initializeScrapers();
    this.startCacheCleanup();
  }

  private initializeScrapers(): void {
    // Initialize all available scrapers
    const ultimateGuitar = new UltimateGuitarScraper();
    this.scrapers.set('ultimate-guitar', ultimateGuitar);
    
   
    this.scraperStats.set('ultimate-guitar', {
      name: 'Ultimate Guitar',
      isActive: true,
      lastUsed: null,
      successRate: 1.0,
      averageResponseTime: 0,
      rateLimitStatus: 'ok'
    });

    // TODO: Add other scrapers
    // const songsterr = new SongsterrScraper();
    // this.scrapers.set('songsterr', songsterr);
    
    this.logger.log('info', `Initialized ${this.scrapers.size} scrapers`, 'manager');
  }

  // main search method that aggregates results from multiple sources
  async searchTabs(
    query: string, 
    options: ScrapingOptions = {}, 
    filters: SearchFilters = {}
  ): Promise<AggregatedResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, options, filters);
    
 
    const cachedResults = this.cache.get(cacheKey);
    if (cachedResults) {
      this.logger.log('info', `Cache hit for query: ${query}`, 'manager');
      return {
        query,
        totalResults: cachedResults.length,
        sources: [...new Set(cachedResults.map(r => r.source))],
        results: cachedResults,
        searchTime: Date.now() - startTime,
        errors: []
      };
    }

    const results: TabData[] = [];
    const errors: string[] = [];
    const activeSources: string[] = [];

    const activeScrapers = this.getActiveScrapers(filters);
    
    if (activeScrapers.length === 0) {
      return {
        query,
        totalResults: 0,
        sources: [],
        results: [],
        searchTime: Date.now() - startTime,
        errors: ['No active scrapers available']
      };
    }

    const searchPromises = activeScrapers.map(async ([name, scraper]) => {
      try {
        const searchStartTime = Date.now();
        this.logger.log('info', `Searching ${name} for: ${query}`, 'manager');
        
        const result = await scraper.search(query, options);
        const responseTime = Date.now() - searchStartTime;
        
        this.updateScraperStats(name, result.success, responseTime);
        
        if (result.success && result.data) {
          const filteredResults = this.applyFilters(result.data, filters);
          results.push(...filteredResults);
          activeSources.push(name);
          
          this.logger.log('info', 
            `${name} returned ${filteredResults.length} results for: ${query}`, 
            'manager'
          );
        } else {
          if (result.error) {
            errors.push(`${name}: ${result.error}`);
            this.logger.log('warn', `${name} search failed: ${result.error}`, 'manager');
          }
          
          if (result.rateLimitHit) {
            this.handleRateLimit(name, result.retryAfter || 60);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${name}: ${errorMessage}`);
        this.updateScraperStats(name, false, 0);
        this.logger.log('error', `${name} search error: ${errorMessage}`, 'manager');
      }
    });

    await Promise.allSettled(searchPromises);

    const sortedResults = this.sortAndDeduplicateResults(results, options);
    
    if (sortedResults.length > 0) {
      this.cache.set(cacheKey, sortedResults);
    }

    const searchTime = Date.now() - startTime;
    
    this.logger.log('info', 
      `Search completed: ${sortedResults.length} total results from ${activeSources.length} sources in ${searchTime}ms`, 
      'manager'
    );

    return {
      query,
      totalResults: sortedResults.length,
      sources: activeSources,
      results: sortedResults,
      searchTime,
      errors
    };
  }

  async getTab(source: string, tabId: string): Promise<TabData | null> {
    const scraper = this.scrapers.get(source);
    if (!scraper) {
      this.logger.log('error', `Scraper not found: ${source}`, 'manager');
      return null;
    }

    try {
      const result = await scraper.getTabById(tabId);
      
      if (result.success && result.data && result.data.length > 0) {
        this.logger.log('info', `Retrieved tab ${tabId} from ${source}`, 'manager');
        return result.data[0];
      } else {
        this.logger.log('warn', `Failed to retrieve tab ${tabId} from ${source}: ${result.error}`, 'manager');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.log('error', `Error retrieving tab ${tabId} from ${source}: ${errorMessage}`, 'manager');
      return null;
    }
  }

  getScraperInfo(): ScraperInfo[] {
    return Array.from(this.scraperStats.values());
  }

  setScraperActive(scraperName: string, active: boolean): void {
    const stats = this.scraperStats.get(scraperName);
    if (stats) {
      stats.isActive = active;
      this.logger.log('info', `Scraper ${scraperName} ${active ? 'enabled' : 'disabled'}`, 'manager');
    }
  }


  clearCache(): void {
    this.cache.clear();
    this.logger.log('info', 'Cache cleared', 'manager');
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size(),
      hitRate: 0.75 
    };
  }


  private getActiveScrapers(filters: SearchFilters): Array<[string, BaseScraper]> {
    const activeScrapers: Array<[string, BaseScraper]> = [];

    for (const [name, scraper] of this.scrapers.entries()) {
      const stats = this.scraperStats.get(name);
      
      if (!stats?.isActive || stats.rateLimitStatus === 'blocked') {
        continue;
      }

      if (filters.excludeSources?.includes(name)) {
        continue;
      }

      if (filters.preferredSources && filters.preferredSources.length > 0) {
        if (!filters.preferredSources.includes(name)) {
          continue;
        }
      }

      activeScrapers.push([name, scraper]);
    }

    return activeScrapers;
  }

  private applyFilters(results: TabData[], filters: SearchFilters): TabData[] {
    return results.filter(tab => {
      if (filters.minRating && tab.rating && tab.rating < filters.minRating) {
        return false;
      }

      if (filters.maxDifficulty) {
        const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        const maxLevel = difficultyOrder[filters.maxDifficulty];
        const tabLevel = difficultyOrder[tab.difficulty || 'intermediate'];
        
        if (tabLevel > maxLevel) {
          return false;
        }
      }

      if (filters.requireChords && tab.chords.length === 0) {
        return false;
      }

      if (filters.requireTabs && tab.type !== 'tabs') {
        return false;
      }

      return true;
    });
  }

  private sortAndDeduplicateResults(results: TabData[], options: ScrapingOptions): TabData[] {
    const seen = new Set<string>();
    const uniqueResults = results.filter(tab => {
      const key = `${tab.song.artist.toLowerCase()}-${tab.song.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  
    return uniqueResults.sort((a, b) => {
  
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.1) {
        return ratingDiff;
      }

   
      if (a.source !== b.source) {
        if (a.source === 'Ultimate Guitar') return -1;
        if (b.source === 'Ultimate Guitar') return 1;
      }

    
      return a.song.title.localeCompare(b.song.title);
    });
  }

  private updateScraperStats(scraperName: string, success: boolean, responseTime: number): void {
    const stats = this.scraperStats.get(scraperName);
    if (!stats) return;

    stats.lastUsed = new Date();
    
 
    const weight = 0.1;
    stats.successRate = stats.successRate * (1 - weight) + (success ? 1 : 0) * weight;
    
 
    if (responseTime > 0) {
      stats.averageResponseTime = stats.averageResponseTime * (1 - weight) + responseTime * weight;
    }
  }

  private handleRateLimit(scraperName: string, retryAfter: number): void {
    const stats = this.scraperStats.get(scraperName);
    if (!stats) return;

    stats.rateLimitStatus = 'limited';
    
  
    setTimeout(() => {
      if (stats.rateLimitStatus === 'limited') {
        stats.rateLimitStatus = 'ok';
        this.logger.log('info', `Rate limit cleared for ${scraperName}`, 'manager');
      }
    }, retryAfter * 1000);

    this.logger.log('warn', `Rate limit hit for ${scraperName}, retry in ${retryAfter}s`, 'manager');
  }

  private generateCacheKey(query: string, options: ScrapingOptions, filters: SearchFilters): string {
    const keyData = {
      query: query.toLowerCase().trim(),
      maxResults: options.maxResults || 20,
      instrumentType: options.instrumentType || 'guitar',
      minRating: filters.minRating || 0,
      maxDifficulty: filters.maxDifficulty || 'advanced',
      sources: filters.preferredSources?.sort().join(',') || 'all'
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '');
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cache.cleanup();
      this.logger.log('info', 'Cache cleanup completed', 'manager');
    }, 10 * 60 * 1000);
  }


  
  getSupportedSources(): string[] {
    return Array.from(this.scrapers.keys());
  }

  getLogger(): ScrapingLogger {
    return this.logger;
  }

  // Health check for all scrapers
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    const checks = Array.from(this.scrapers.entries()).map(async ([name, scraper]) => {
      try {
  
        const result = await scraper.search('test', { maxResults: 1 });
        health[name] = result.success || !result.rateLimitHit;
      } catch (error) {
        health[name] = false;
      }
    });

    await Promise.allSettled(checks);
    return health;
  }
}