export interface TabSource {
  name: string;
  url: string;
  priority: number;
}

export interface ScrapedTab {
  id: string;
  songId: string;
  title: string;
  artist: string;
  source: TabSource;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tuning: string;
  capo?: number;
  rating?: number;
  scrapedAt: Date;
}

export interface ScrapingJob {
  id: string;
  songTitle: string;
  artistName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: ScrapedTab[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ScrapingConfig {
  maxResults: number;
  timeout: number;
  retryAttempts: number;
  supportedSites: string[];
}

export interface SearchQuery {
  query: string;
  artist?: string;
  song?: string;
  instrument?: 'guitar' | 'bass' | 'ukulele' | 'piano';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ScrapingResult {
  success: boolean;
  tabs: ScrapedTab[];
  totalFound: number;
  timeElapsed: number;
  errors?: string[];
}