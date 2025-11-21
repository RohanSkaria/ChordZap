import { guitarTabsScraper } from './guitarTabsScraper';

// Re-export types for backward compatibility
export { ChordInfo, TabSection, TabData, SearchResult } from './guitarTabsScraper';

// Export a wrapper that exposes only public methods
export const eChordsScaper = {
  searchTabs: guitarTabsScraper.searchTabs.bind(guitarTabsScraper),
  getTabById: guitarTabsScraper.getTabById.bind(guitarTabsScraper),
  getTabByTitleArtist: guitarTabsScraper.getTabByTitleArtist.bind(guitarTabsScraper),
  findSongByGeneration: guitarTabsScraper.findSongByGeneration.bind(guitarTabsScraper),
  scrapeTabPage: guitarTabsScraper.scrapeTabPage.bind(guitarTabsScraper)
};