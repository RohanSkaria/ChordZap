import { useState, useEffect, useCallback, useRef } from 'react';
import { TabScrapingManager, AggregatedResult, SearchFilters } from '../scraping/TabScrapingManager';
import { TabData, ScrapingOptions } from '../scraping/BaseScraper';
import { ScraperInfo } from '../scraping/TabScrapingManager';

export interface TabSearchState {
  isSearching: boolean;
  results: TabData[];
  currentQuery: string;
  totalResults: number;
  searchTime: number;
  sources: string[];
  errors: string[];
  hasSearched: boolean;
}

export interface TabSearchFilters extends SearchFilters {
  sortBy?: 'rating' | 'difficulty' | 'title' | 'source';
  sortOrder?: 'asc' | 'desc';
}

export interface TabSearchOptions extends ScrapingOptions {
  autoSearch?: boolean; 
  debounceMs?: number; 
}

export interface UseTabSearchReturn {

  state: TabSearchState;
  filters: TabSearchFilters;
  scraperInfo: ScraperInfo[];
  

  search: (query: string, options?: TabSearchOptions) => Promise<void>;
  clearResults: () => void;
  setFilters: (filters: Partial<TabSearchFilters>) => void;
  getTab: (source: string, tabId: string) => Promise<TabData | null>;
  
  
  setScraperActive: (scraperName: string, active: boolean) => void;
  refreshScraperInfo: () => void;
  clearCache: () => void;
  
  
  exportResults: () => string;
  getSearchHistory: () => string[];
}

export const useTabSearch = (initialOptions: TabSearchOptions = {}): UseTabSearchReturn => {
  const managerRef = useRef<TabScrapingManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new TabScrapingManager();
  }


  const [state, setState] = useState<TabSearchState>({
    isSearching: false,
    results: [],
    currentQuery: '',
    totalResults: 0,
    searchTime: 0,
    sources: [],
    errors: [],
    hasSearched: false
  });

  const [filters, setFiltersState] = useState<TabSearchFilters>({
    minRating: 3.0,
    maxDifficulty: 'advanced',
    sortBy: 'rating',
    sortOrder: 'desc'
  });

  const [scraperInfo, setScraperInfo] = useState<ScraperInfo[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);


  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  useEffect(() => {
    refreshScraperInfo();
  }, []);

  useEffect(() => {
    if (initialOptions.autoSearch && state.currentQuery.trim().length > 2) {
      const debounceMs = initialOptions.debounceMs || 500;
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        performSearch(state.currentQuery, initialOptions);
      }, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.currentQuery, initialOptions.autoSearch]);


  const search = useCallback(async (query: string, options: TabSearchOptions = {}) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, errors: ['Search query cannot be empty'] }));
      return;
    }

 
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    await performSearch(query, { ...initialOptions, ...options });
  }, [initialOptions]);


  const performSearch = useCallback(async (query: string, options: TabSearchOptions) => {
    if (!managerRef.current) return;

    setState(prev => ({
      ...prev,
      isSearching: true,
      currentQuery: query,
      errors: []
    }));

    try {
      const searchOptions: ScrapingOptions = {
        maxResults: options.maxResults || 20,
        instrumentType: options.instrumentType || 'guitar',
        timeout: options.timeout || 30000,
        retryAttempts: options.retryAttempts || 2
      };

      const result: AggregatedResult = await managerRef.current.searchTabs(
        query, 
        searchOptions, 
        filters
      );


      const sortedResults = applySorting(result.results, filters);

      setState(prev => ({
        ...prev,
        isSearching: false,
        results: sortedResults,
        totalResults: result.totalResults,
        searchTime: result.searchTime,
        sources: result.sources,
        errors: result.errors,
        hasSearched: true
      }));


      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(q => q !== query)].slice(0, 10);
        return newHistory;
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown search error';
      
      setState(prev => ({
        ...prev,
        isSearching: false,
        errors: [errorMessage]
      }));
    }
  }, [filters]);


  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      sources: [],
      errors: [],
      hasSearched: false,
      currentQuery: ''
    }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<TabSearchFilters>) => {
    setFiltersState(prev => {
      const updatedFilters = { ...prev, ...newFilters };
 
      if (state.results.length > 0) {
        const sortedResults = applySorting(state.results, updatedFilters);
        setState(prevState => ({
          ...prevState,
          results: sortedResults
        }));
      }
      
      return updatedFilters;
    });
  }, [state.results]);


  const getTab = useCallback(async (source: string, tabId: string): Promise<TabData | null> => {
    if (!managerRef.current) return null;

    try {
      return await managerRef.current.getTab(source, tabId);
    } catch (error) {
      console.error('Error fetching tab:', error);
      return null;
    }
  }, []);


  const setScraperActive = useCallback((scraperName: string, active: boolean) => {
    if (!managerRef.current) return;
    
    managerRef.current.setScraperActive(scraperName, active);
    refreshScraperInfo();
  }, []);

  const refreshScraperInfo = useCallback(() => {
    if (!managerRef.current) return;
    
    const info = managerRef.current.getScraperInfo();
    setScraperInfo(info);
  }, []);

  const clearCache = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.clearCache();
  }, []);

 
  const exportResults = useCallback((): string => {
    const exportData = {
      query: state.currentQuery,
      timestamp: new Date().toISOString(),
      totalResults: state.totalResults,
      searchTime: state.searchTime,
      sources: state.sources,
      filters,
      results: state.results.map(tab => ({
        title: tab.song.title,
        artist: tab.song.artist,
        source: tab.source,
        rating: tab.rating,
        difficulty: tab.difficulty,
        chords: tab.chords.map(c => ({ name: c.name, fingering: c.fingering })),
        url: tab.sourceUrl
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }, [state, filters]);

  const getSearchHistory = useCallback((): string[] => {
    return [...searchHistory];
  }, [searchHistory]);


  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    filters,
    scraperInfo,
    search,
    clearResults,
    setFilters,
    getTab,
    setScraperActive,
    refreshScraperInfo,
    clearCache,
    exportResults,
    getSearchHistory
  };
};

// Helper function for sorting results
function applySorting(results: TabData[], filters: TabSearchFilters): TabData[] {
  const { sortBy = 'rating', sortOrder = 'desc' } = filters;
  
  return [...results].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'rating':
        comparison = (a.rating || 0) - (b.rating || 0);
        break;
      case 'difficulty':
        const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        comparison = (difficultyOrder[a.difficulty || 'intermediate']) - 
                    (difficultyOrder[b.difficulty || 'intermediate']);
        break;
      case 'title':
        comparison = a.song.title.localeCompare(b.song.title);
        break;
      case 'source':
        comparison = a.source.localeCompare(b.source);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}


export interface UseTabDetailsReturn {
  tab: TabData | null;
  isLoading: boolean;
  error: string | null;
  loadTab: (source: string, tabId: string) => Promise<void>;
  clearTab: () => void;
}

export const useTabDetails = (): UseTabDetailsReturn => {
  const [tab, setTab] = useState<TabData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const managerRef = useRef<TabScrapingManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new TabScrapingManager();
  }

  const loadTab = useCallback(async (source: string, tabId: string) => {
    if (!managerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const tabData = await managerRef.current.getTab(source, tabId);
      
      if (tabData) {
        setTab(tabData);
      } else {
        setError('Tab not found or could not be loaded');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTab = useCallback(() => {
    setTab(null);
    setError(null);
  }, []);

  return {
    tab,
    isLoading,
    error,
    loadTab,
    clearTab
  };
};

export interface SearchSuggestion {
  query: string;
  confidence: number;
  source: 'audio_analysis' | 'search_history' | 'popular';
}

export interface UseSearchSuggestionsReturn {
  suggestions: SearchSuggestion[];
  isGenerating: boolean;
  generateFromAudio: (audioData: Float32Array) => Promise<void>;
  generateFromHistory: () => SearchSuggestion[];
  clearSuggestions: () => void;
}

export const useSearchSuggestions = (): UseSearchSuggestionsReturn => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFromAudio = useCallback(async (audioData: Float32Array) => {
    setIsGenerating(true);
    
    try {
      // audio analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSuggestions: SearchSuggestion[] = [
        { query: 'Wonderwall Oasis', confidence: 0.85, source: 'audio_analysis' },
        { query: 'Champagne Supernova Oasis', confidence: 0.72, source: 'audio_analysis' },
        { query: 'Don\'t Look Back in Anger', confidence: 0.68, source: 'audio_analysis' }
      ];
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error generating audio suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateFromHistory = useCallback((): SearchSuggestion[] => {
    // mock implementation
    const historySuggestions: SearchSuggestion[] = [
      { query: 'Hotel California', confidence: 1.0, source: 'search_history' },
      { query: 'Stairway to Heaven', confidence: 1.0, source: 'search_history' },
      { query: 'Sweet Child O Mine', confidence: 1.0, source: 'search_history' }
    ];
    
    setSuggestions(prev => [...prev, ...historySuggestions]);
    return historySuggestions;
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isGenerating,
    generateFromAudio,
    generateFromHistory,
    clearSuggestions
  };
};