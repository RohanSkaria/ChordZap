import axios from 'axios';

// create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 20000, // Increased from 10000ms to 20000ms to prevent premature timeouts
  headers: {
    'Content-Type': 'application/json',
    'X-ChordZap-Client': 'Frontend',
    'X-ChordZap-Version': '2.0',
  },
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('unauthorized access - redirecting to login');
    }
    
    if (error.response?.status >= 500) {
      console.error('server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export const songApi = {
  getSongs: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/api/songs', { params });
    return response.data;
  },

  getSong: async (id: string) => {
    const response = await api.get(`/api/songs/${id}`);
    return response.data;
  },

  createSong: async (songData: any) => {
    const response = await api.post('/api/songs', songData);
    return response.data;
  },

  updateSong: async (id: string, songData: any) => {
    const response = await api.put(`/api/songs/${id}`, songData);
    return response.data;
  },

  deleteSong: async (id: string) => {
    const response = await api.delete(`/api/songs/${id}`);
    return response.data;
  },

  seedPopularSongs: async () => {
    const response = await api.post('/api/songs/seed');
    return response.data;
  },

  getPopularSongs: async (limit?: number) => {
    const response = await api.get('/api/songs/popular', { 
      params: { limit }
    });
    return response.data;
  },

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

  getTabData: async (songId: string) => {
    const response = await api.get(`/api/songs/${songId}/tab-data`);
    return response.data;
  }
};

export const sessionApi = {
  createSession: async (sessionData?: { userId?: string; sessionId?: string }) => {
    const response = await api.post('/api/sessions', sessionData);
    return response.data;
  },

  getSession: async (sessionId: string) => {
    const response = await api.get(`/api/sessions/${sessionId}`);
    return response.data;
  },

  addDetectedSong: async (sessionId: string, songId: string, confidence?: number, audioSource?: string) => {
    const response = await api.post(`/api/sessions/${sessionId}/detect`, {
      songId,
      confidence,
      audioSource
    });
    return response.data;
  },

  endSession: async (sessionId: string) => {
    const response = await api.put(`/api/sessions/${sessionId}/end`);
    return response.data;
  },

  getRecentSessions: async () => {
    const response = await api.get('/api/sessions');
    return response.data;
  }
};

export const healthApi = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export const audioApi = {
  analyze: async (samples: number[], sampleRate?: number) => {
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
    return response.data as { song: any; confidence: number; analyzedFrames: number; sampleRate: number; hasTabData?: boolean };
  }
};

export const tabApi = {
  searchTabs: async (query: string, limit?: number) => {
    const response = await api.get('/api/tabs/search', {
      params: { q: query, limit },
      headers: {
        'X-ChordZap-Action': 'Tab-Search',
        'X-ChordZap-Query': query,
      }
    });
    return response.data as { success: boolean; query: string; totalResults: number; results: any[] };
  },

  getTab: async (tabId: string) => {
    const response = await api.get(`/api/tabs/${tabId}`, {
      headers: {
        'X-ChordZap-Action': 'Tab-Fetch',
        'X-ChordZap-TabId': tabId,
      }
    });
    return response.data as { success: boolean; tab: any };
  },

  suggestTabs: async (title?: string, artist?: string) => {
    const response = await api.post('/api/tabs/suggest', { title, artist }, {
      headers: {
        'X-ChordZap-Action': 'Tab-Suggest',
        'X-ChordZap-Title': title || '',
        'X-ChordZap-Artist': artist || '',
      }
    });
    return response.data as { success: boolean; query: string; suggestions: any[] };
  },

  getTabBySong: async (title: string, artist: string) => {
    const encodedTitle = encodeURIComponent(title);
    const encodedArtist = encodeURIComponent(artist);
    
    const response = await api.get(`/api/tabs/by-song/${encodedTitle}/${encodedArtist}`, {
      headers: {
        'X-ChordZap-Action': 'Tab-Lookup-By-Song',
        'X-ChordZap-Title': title,
        'X-ChordZap-Artist': artist,
      }
    });
    return response.data as { success: boolean; tab: any; isFallback?: boolean };
  },

  healthCheck: async () => {
    const response = await api.get('/api/tabs/health/check');
    return response.data as { success: boolean; scraperStatus: string; timestamp: string };
  }
};

export default api;