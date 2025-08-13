import { useState, useCallback } from 'react';
import { tabApi } from '../services/api';

export interface TabSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  rating?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tuning?: string;
  capo?: number;
  type: 'chords' | 'tabs' | 'bass' | 'ukulele';
  chords: Array<{
    name: string;
    fingering: string;
    fret?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }>;
  sections: Array<{
    name: string;
    content: string;
    chords: any[];
  }>;
  tabContent: string;
  source: string;
  sourceUrl: string;
}

export interface TabSearchState {
  isSearching: boolean;
  results: TabSearchResult[];
  currentQuery: string;
  totalResults: number;
  errors: string[];
  hasSearched: boolean;
}

export interface UseBackendTabSearchReturn {
  state: TabSearchState;
  searchTabs: (query: string, limit?: number) => Promise<void>;
  getTab: (tabId: string) => Promise<TabSearchResult | null>;
  suggestTabs: (title?: string, artist?: string) => Promise<TabSearchResult[]>;
  clearResults: () => void;
  clearErrors: () => void;
}

export const useBackendTabSearch = (): UseBackendTabSearchReturn => {
  const [state, setState] = useState<TabSearchState>({
    isSearching: false,
    results: [],
    currentQuery: '',
    totalResults: 0,
    errors: [],
    hasSearched: false
  });

  const searchTabs = useCallback(async (query: string, limit: number = 20) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, errors: ['Search query cannot be empty'] }));
      return;
    }

    setState(prev => ({
      ...prev,
      isSearching: true,
      currentQuery: query,
      errors: []
    }));

    try {
      console.log(`🔍 [FRONTEND] Searching backend for tabs: "${query}"`);
      const response = await tabApi.searchTabs(query, limit);

      if (response.success) {
        console.log(`🔍 [FRONTEND] ✅ Found ${response.totalResults} tabs for "${query}"`);
        setState(prev => ({
          ...prev,
          isSearching: false,
          results: response.results,
          totalResults: response.totalResults,
          hasSearched: true
        }));
      } else {
        console.error(`🔍 [FRONTEND] ❌ Tab search failed`);
        setState(prev => ({
          ...prev,
          isSearching: false,
          errors: ['Failed to search tabs'],
          hasSearched: true
        }));
      }
    } catch (error) {
      console.error('🔍 [FRONTEND] Tab search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown search error';
      setState(prev => ({
        ...prev,
        isSearching: false,
        errors: [errorMessage],
        hasSearched: true
      }));
    }
  }, []);

  const getTab = useCallback(async (tabId: string): Promise<TabSearchResult | null> => {
    try {
      console.log(`🔍 [FRONTEND] Fetching tab: ${tabId}`);
      const response = await tabApi.getTab(tabId);

      if (response.success && response.tab) {
        console.log(`🔍 [FRONTEND] ✅ Fetched tab: "${response.tab.title}"`);
        return response.tab;
      } else {
        console.error(`🔍 [FRONTEND] ❌ Tab fetch failed`);
        return null;
      }
    } catch (error) {
      console.error('🔍 [FRONTEND] Tab fetch error:', error);
      return null;
    }
  }, []);

  const suggestTabs = useCallback(async (title?: string, artist?: string): Promise<TabSearchResult[]> => {
    try {
      console.log(`🔍 [FRONTEND] Getting tab suggestions for: "${title}" by ${artist}`);
      const response = await tabApi.suggestTabs(title, artist);

      if (response.success) {
        console.log(`🔍 [FRONTEND] ✅ Found ${response.suggestions.length} tab suggestions`);
        return response.suggestions;
      } else {
        console.error(`🔍 [FRONTEND] ❌ Tab suggestion failed`);
        return [];
      }
    } catch (error) {
      console.error('🔍 [FRONTEND] Tab suggestion error:', error);
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      errors: [],
      hasSearched: false,
      currentQuery: ''
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  return {
    state,
    searchTabs,
    getTab,
    suggestTabs,
    clearResults,
    clearErrors
  };
};