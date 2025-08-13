import { guitarTabsScraper } from './guitarTabsScraper';

// Re-export types and scraper instance for backward compatibility
export { ChordInfo, TabSection, TabData, SearchResult } from './guitarTabsScraper';

// Export the main scraper instance
export const eChordsScaper = guitarTabsScraper;