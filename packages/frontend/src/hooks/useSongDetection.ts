import { useState, useCallback } from 'react';
import { songApi, sessionApi, audioApi } from '../services/api';

interface DetectedSong {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: string;
  chords: Array<{
    name: string;
    fingering: string;
    fret: number;
  }>;
  tabUrl?: string;
  source?: string;
}

interface UseSongDetectionReturn {
  currentSession: any;
  isDetecting: boolean;
  error: string | null;
  detectedSongs: DetectedSong[];
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  detectSong: (mockSongData: DetectedSong) => Promise<DetectedSong | null>;
  detectFromAudio: (samples: number[], sampleRate?: number) => Promise<DetectedSong | null>;
  clearError: () => void;
}

export function useSongDetection(): UseSongDetectionReturn {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedSongs, setDetectedSongs] = useState<DetectedSong[]>([]);

  const startSession = useCallback(async () => {
    try {
      setError(null);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = await sessionApi.createSession({ sessionId });
      setCurrentSession(session);
      console.log('session started:', session.sessionId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'failed to start session');
      console.error('session start error:', err);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      await sessionApi.endSession(currentSession.sessionId);
      setCurrentSession(null);
      console.log('session ended');
    } catch (err: any) {
      setError(err.response?.data?.message || 'failed to end session');
      console.error('session end error:', err);
    }
  }, [currentSession]);

  const detectSong = useCallback(async (mockSongData: DetectedSong): Promise<DetectedSong | null> => {
    if (!currentSession) {
      setError('no active session - please start session first');
      return null;
    }

    try {
      setIsDetecting(true);
      setError(null);

      // first, save the song to database
      const savedSong = await songApi.createSong({
        title: mockSongData.title,
        artist: mockSongData.artist,
        album: mockSongData.album,
        albumArt: mockSongData.albumArt,
        duration: mockSongData.duration,
        chords: mockSongData.chords,
        tabUrl: mockSongData.tabUrl,
        source: mockSongData.source || 'Manual'
      });

      // then add it to the current session
      await sessionApi.addDetectedSong(
        currentSession.sessionId,
        savedSong._id,
        0.8, // mock confidence
        'microphone'
      );

      // update local state
      const songWithId = { ...mockSongData, id: savedSong._id };
      setDetectedSongs(prev => [songWithId, ...prev]);

      console.log('song detected and saved:', savedSong.title);
      return songWithId;

    } catch (err: any) {
      // if song already exists, that's okay add to session
      if (err.response?.status === 409) {
        try {
          // try to find existing song
          const existingSongs = await songApi.getSongs({ 
            search: `${mockSongData.title} ${mockSongData.artist}`,
            limit: 1
          });
          
          if (existingSongs.songs.length > 0) {
            const existingSong = existingSongs.songs[0];
            await sessionApi.addDetectedSong(
              currentSession.sessionId,
              existingSong._id,
              0.8,
              'microphone'
            );
            
            const songWithId = { ...mockSongData, id: existingSong._id };
            setDetectedSongs(prev => [songWithId, ...prev]);
            return songWithId;
          }
        } catch (findError) {
          console.error('error finding existing song:', findError);
        }
      }
      
      setError(err.response?.data?.message || 'failed to detect song');
      console.error('song detection error:', err);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [currentSession]);

  const detectFromAudio = useCallback(async (samples: number[], sampleRate?: number): Promise<DetectedSong | null> => {
    if (!currentSession) {
      setError('no active session - please start session first');
      return null;
    }

    try {
      setIsDetecting(true);
      setError(null);

      console.log('🎧 [FRONTEND] Starting audio detection...');
      console.log(`🎧 [FRONTEND] Sending ${samples.length} samples at ${sampleRate}Hz to backend`);
      
      // call backend audio analysis (acrcloud or local)
      const analysis = await audioApi.analyze(samples, sampleRate);
      const result = analysis.song;
      
      console.log('🎧 [FRONTEND] ✅ Received response from backend:');
      console.log(`🎧 [FRONTEND] Song: "${result.title}" by ${result.artist}`);
      console.log(`🎧 [FRONTEND] Source: ${result.source}`);
      console.log(`🎧 [FRONTEND] Confidence: ${analysis.confidence}`);
      
      if (result.source === 'API Detection') {
        console.log('🎧 [FRONTEND] 🎉 THIS IS REAL API DATA! ACR Cloud successfully identified the song!');
      } else if (result.source === 'Mock Data') {
        console.log('🎧 [FRONTEND] ℹ️  This is mock/fallback data - ACR API did not recognize the song');
      }

      // ensure chords array exists for UI
      const chords = Array.isArray(result.chords) ? result.chords : [];

      // save or upsert song in db
      const savedSong = await songApi.createSong({
        title: result.title,
        artist: result.artist,
        album: result.album,
        albumArt: result.albumArt,
        duration: result.duration,
        chords,
        tabUrl: result.tabUrl,
        source: result.source || 'API Detection'
      });

      await sessionApi.addDetectedSong(
        currentSession.sessionId,
        savedSong._id,
        analysis.confidence || 0.85,
        'microphone'
      );

      const songWithId: DetectedSong = {
        id: savedSong._id,
        title: savedSong.title,
        artist: savedSong.artist,
        album: savedSong.album,
        albumArt: savedSong.albumArt,
        duration: savedSong.duration,
        chords: savedSong.chords,
        tabUrl: savedSong.tabUrl,
        source: savedSong.source
      };

      setDetectedSongs(prev => [songWithId, ...prev]);
      return songWithId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'failed to detect from audio');
      console.error('audio detection error:', err);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [currentSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentSession,
    isDetecting,
    error,
    detectedSongs,
    startSession,
    endSession,
    detectSong,
    detectFromAudio,
    clearError
  };
}