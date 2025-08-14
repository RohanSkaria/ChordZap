import axios from 'axios';

// create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://chordzapcloud.ue.r.appspot.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-ChordZap-Client': 'Frontend',
    'X-ChordZap-Version': '2.0',
  },
});

// request interceptor for adding auth tokens 
api.interceptors.request.use(
  (config) => {
    // could add auth tokens here later
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // handle unauthorized errors
      console.warn('unauthorized access - redirecting to login');
    }
    
    if (error.response?.status >= 500) {
      console.error('server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// song api functions
export const songApi = {
  // get all songs with pagination and search
  getSongs: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/api/songs', { params });
    return response.data;
  },

  // get single song by id
  getSong: async (id: string) => {
    const response = await api.get(`/api/songs/${id}`);
    return response.data;
  },

  // create new song
  createSong: async (songData: any) => {
    const response = await api.post('/api/songs', songData);
    return response.data;
  },

  // update existing song
  updateSong: async (id: string, songData: any) => {
    const response = await api.put(`/api/songs/${id}`, songData);
    return response.data;
  },

  // delete song
  deleteSong: async (id: string) => {
    const response = await api.delete(`/api/songs/${id}`);
    return response.data;
  },

  // seed database with popular songs
  seedPopularSongs: async () => {
    const response = await api.post('/api/songs/seed');
    return response.data;
  },

  // get popular songs (most detected)
  getPopularSongs: async (limit?: number) => {
    const response = await api.get('/api/songs/popular', { 
      params: { limit }
    });
    return response.data;
  },

  // search songs with autocomplete
  searchSongs: async (query: string, limit: number = 10) => {
    const response = await api.get('/api/songs', {
      params: { 
        search: query,
        limit,
        page: 1
      }
    });
    return response.data;
  },

  // get full tab data for a song with scraping
  getTabData: async (songId: string) => {
    const response = await api.get(`/api/songs/${songId}/tab-data`);
    return response.data;
  }
};

// session api functions
export const sessionApi = {
  // create new session
  createSession: async (sessionData?: { userId?: string; sessionId?: string }) => {
    const response = await api.post('/api/sessions', sessionData);
    return response.data;
  },

  // get session by id
  getSession: async (sessionId: string) => {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  },

  // add detected song to session
  addDetectedSong: async (sessionId: string, songId: string, confidence?: number, audioSource?: string) => {
    const response = await api.post(`/api/sessions/${sessionId}/detect`, {
      songId,
      confidence,
      audioSource
    });
    return response.data;
  },

  // end session
  endSession: async (sessionId: string) => {
    const response = await api.put(`/api/sessions/${sessionId}/end`);
    return response.data;
  },

  // get recent sessions
  getRecentSessions: async () => {
    const response = await api.get('/api/sessions');
    return response.data;
  }
};

// health check
export const healthApi = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// audio analysis api
export const audioApi = {
  analyze: async (samples: number[], sampleRate?: number) => {
    console.log('🌐 [NETWORK] Making API request to /api/audio/analyze');
    console.log('🌐 [NETWORK] Check Network tab in DevTools for this request');
    
    const response = await api.post('/api/audio/analyze', 
      { samples, sampleRate },
      {
        headers: {
          'X-ChordZap-Action': 'Audio-Analysis',
          'X-ChordZap-Samples': samples.length.toString(),
          'X-ChordZap-SampleRate': (sampleRate || 44100).toString(),
        }
      }
    );
    
    console.log('🌐 [NETWORK] API response received');
    return response.data as { song: any; confidence: number; analyzedFrames: number; sampleRate: number; hasTabData?: boolean };
  }
};

// tab api functions
export const tabApi = {
  // search for tabs
  searchTabs: async (query: string, limit?: number) => {
    console.log('🌐 [NETWORK] Making API request to /api/tabs/search');
    console.log(`🌐 [NETWORK] Searching for: "${query}"`);
    
    const response = await api.get('/api/tabs/search', {
      params: { q: query, limit },
      headers: {
        'X-ChordZap-Action': 'Tab-Search',
        'X-ChordZap-Query': query,
      }
    });
    
    console.log('🌐 [NETWORK] Tab search response received');
    return response.data as { success: boolean; query: string; totalResults: number; results: any[] };
  },

  // get specific tab by id
  getTab: async (tabId: string) => {
    console.log('🌐 [NETWORK] Making API request to /api/tabs/:id');
    console.log(`🌐 [NETWORK] Fetching tab: ${tabId}`);
    
    const response = await api.get(`/api/tabs/${tabId}`, {
      headers: {
        'X-ChordZap-Action': 'Tab-Fetch',
        'X-ChordZap-TabId': tabId,
      }
    });
    
    console.log('🌐 [NETWORK] Tab fetch response received');
    return response.data as { success: boolean; tab: any };
  },

  // get tab suggestions for a song
  suggestTabs: async (title?: string, artist?: string) => {
    console.log('🌐 [NETWORK] Making API request to /api/tabs/suggest');
    console.log(`🌐 [NETWORK] Getting suggestions for: "${title}" by ${artist}`);
    
    const response = await api.post('/api/tabs/suggest', { title, artist }, {
      headers: {
        'X-ChordZap-Action': 'Tab-Suggest',
        'X-ChordZap-Title': title || '',
        'X-ChordZap-Artist': artist || '',
      }
    });
    
    console.log('🌐 [NETWORK] Tab suggestions response received');
    return response.data as { success: boolean; query: string; suggestions: any[] };
  },

  // get tab by song title and artist with fallback to Wonderwall
  getTabBySong: async (title: string, artist: string) => {
    console.log('🌐 [NETWORK] Making API request to /api/tabs/by-song');
    console.log(`🌐 [NETWORK] Looking up: "${title}" by ${artist}`);
    
    const encodedTitle = encodeURIComponent(title);
    const encodedArtist = encodeURIComponent(artist);
    
    const response = await api.get(`/api/tabs/by-song/${encodedTitle}/${encodedArtist}`, {
      headers: {
        'X-ChordZap-Action': 'Tab-Lookup-By-Song',
        'X-ChordZap-Title': title,
        'X-ChordZap-Artist': artist,
      }
    });
    
    console.log('🌐 [NETWORK] Tab lookup by song response received');
    return response.data as { success: boolean; tab: any; isFallback?: boolean };
  },

  // health check for scraper
  healthCheck: async () => {
    const response = await api.get('/api/tabs/health/check');
    return response.data as { success: boolean; scraperStatus: string; timestamp: string };
  }
};

export default api;