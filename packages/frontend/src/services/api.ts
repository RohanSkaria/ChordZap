import axios from 'axios';
import { API_ENDPOINTS } from '@monorepo/shared';

// create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
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

export default api;