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
  spotify?: {
    id?: string;
    url?: string;
  };
  confidence?: number;
}

interface UseSongDetectionReturn {
  currentSession: any;
  isDetecting: boolean;
  error: string | null;
  detectedSongs: DetectedSong[];
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  detectSong: (mockSongData: DetectedSong) => Promise<DetectedSong | null>;
  detectFromAudio: (audioBuffer: ArrayBuffer) => Promise<DetectedSong | null>;
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
      console.log('🎵 Session started:', session.sessionId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start session');
      console.error('Session start error:', err);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      await sessionApi.endSession(currentSession.sessionId);
      setCurrentSession(null);
      console.log('🎵 Session ended');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to end session');
      console.error('Session end error:', err);
    }
  }, [currentSession]);

  const detectSong = useCallback(async (mockSongData: DetectedSong): Promise<DetectedSong | null> => {
    if (!currentSession) {
      setError('No active session - please start session first');
      return null;
    }

    try {
      setIsDetecting(true);
      setError(null);

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

      await sessionApi.addDetectedSong(
        currentSession.sessionId,
        savedSong._id,
        mockSongData.confidence || 0.8,
        'microphone'
      );

      const songWithId = { ...mockSongData, id: savedSong._id };
      setDetectedSongs(prev => [songWithId, ...prev]);

      console.log('🎵 Song detected and saved:', savedSong.title);
      return songWithId;

    } catch (err: any) {
      if (err.response?.status === 409) {
        try {
          const existingSongs = await songApi.getSongs({ 
            search: `${mockSongData.title} ${mockSongData.artist}`,
            limit: 1
          });
          
          if (existingSongs.songs.length > 0) {
            const existingSong = existingSongs.songs[0];
            await sessionApi.addDetectedSong(
              currentSession.sessionId,
              existingSong._id,
              mockSongData.confidence || 0.8,
              'microphone'
            );
            
            const songWithId = { ...mockSongData, id: existingSong._id };
            setDetectedSongs(prev => [songWithId, ...prev]);
            return songWithId;
          }
        } catch (findError) {
          console.error('Error finding existing song:', findError);
        }
      }
      
      setError(err.response?.data?.message || 'Failed to detect song');
      console.error('Song detection error:', err);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [currentSession]);

  const detectFromAudio = useCallback(async (audioBuffer: ArrayBuffer): Promise<DetectedSong | null> => {
    if (!currentSession) {
      setError('No active session - please start session first');
      return null;
    }

    try {
      setIsDetecting(true);
      setError(null);

      console.log('🎵 [DETECTION] Starting audio detection...');
      console.log(`🎵 [DETECTION] Sending ${(audioBuffer.byteLength / 1024).toFixed(2)}KB WAV buffer to backend`);
      
      // Extract audio samples from WAV ArrayBuffer
      // WAV format: 44-byte header + 16-bit PCM samples
      const view = new DataView(audioBuffer);
      const samples: number[] = [];
      
      // Skip 44-byte WAV header and read 16-bit samples
      for (let i = 44; i < audioBuffer.byteLength; i += 2) {
        const sample = view.getInt16(i, true) / 32767; // Convert to float -1.0 to 1.0
        samples.push(sample);
      }
      
      console.log(`🎵 [DETECTION] Extracted ${samples.length} audio samples from WAV buffer`);
      const analysis = await audioApi.analyze(samples, 44100);
      const result = analysis.song;

      console.log('🎵 [DETECTION] ✅ Received response from backend:');
      console.log(`🎵 [DETECTION] Song: "${result.title}" by ${result.artist}`);
      console.log(`🎵 [DETECTION] Source: ${result.source}`);
      console.log(`🎵 [DETECTION] Confidence: ${analysis.confidence}%`);
      
      if (result.source === 'ACRCloud' || result.source === 'API Detection') {
        console.log('🎵 [DETECTION] 🎉 Real ACRCloud detection - song identified!');
      } else {
        console.log('🎵 [DETECTION] ℹ️ Mock/fallback data - ACRCloud did not recognize the song');
      }

      const chords = Array.isArray(result.chords) ? result.chords : [];

      const savedSong = await songApi.createSong({
        title: result.title,
        artist: result.artist,
        album: result.album,
        albumArt: result.albumArt,
        duration: result.duration,
        chords,
        tabUrl: result.tabUrl,
        source: result.source || 'ACRCloud'
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
        source: savedSong.source,
        spotify: result.spotify,
        confidence: analysis.confidence
      };

      setDetectedSongs(prev => [songWithId, ...prev]);
      return songWithId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to detect from audio');
      console.error('Audio detection error:', err);
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