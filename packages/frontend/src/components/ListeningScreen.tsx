import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Music, X, Play, Pause, Settings } from 'lucide-react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useSongDetection } from '../hooks/useSongDetection';
import { AudioDeviceSelector } from './audio/AudioDeviceSelector';
import { WaveformVisualizer, FrequencyVisualizer } from './audio/AudioVisualizer';
import React from 'react';

export function ListeningScreen() {
  const navigate = useNavigate();
  const audioCapture = useAudioCapture();
  const songDetection = useSongDetection();
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [isRecordingForDetection, setIsRecordingForDetection] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [showSpotifyNotice, setShowSpotifyNotice] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [currentAudioData, setCurrentAudioData] = useState<Float32Array | null>(null);
  const [lastApiResult, setLastApiResult] = useState<{type: 'api' | 'mock' | 'none', song?: any, timestamp?: Date}>({type: 'none'});
  
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = audioCapture.subscribe((audioData) => {
      setCurrentAudioData(audioData);
    });

    return unsubscribe;
  }, [audioCapture]);

  useEffect(() => {
    songDetection.startSession();
    
    return () => {
      songDetection.endSession();
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, []);

  const handleSongIdentification = async () => {
    setIsDetecting(true);
    setDetectionProgress(0);
    
    console.log('🎤 [DETECTION] Starting song identification...');
    
    detectionIntervalRef.current = setInterval(() => {
      setDetectionProgress(prev => {
        if (prev >= 90) {
          if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
          return 90;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const wavBuffer = audioCapture.getWAVBuffer();
      let detectedSong = null as any;
      
      if (wavBuffer) {
        const bufferSizeKB = wavBuffer.byteLength / 1024;
        console.log(`🎤 [DETECTION] Sending ${bufferSizeKB.toFixed(2)}KB WAV buffer to ACRCloud...`);
        
        // Limit the WAV buffer size to prevent payload size issues
        // ACR Cloud recommends 10 seconds, but we'll limit to 12 seconds max
        const maxBufferSize = 44100 * 2 * 2 * 12; // 44.1kHz, 16-bit, stereo, 12 seconds
        const limitedBuffer = wavBuffer.byteLength > maxBufferSize ? 
          wavBuffer.slice(0, maxBufferSize) : wavBuffer;
        
        console.log(`🎤 [DETECTION] ✅ Sending ${(limitedBuffer.byteLength / 1024).toFixed(2)}KB WAV buffer to ACR API...`);
        console.log(`🎤 [DETECTION] This meets ACR Cloud's 10-second recommendation for optimal recognition`);
        console.log(`🎤 [DETECTION] Limited to 12 seconds to prevent payload size issues`);
        
        detectedSong = await songDetection.detectFromAudio(limitedBuffer);
        
        if (detectedSong && (detectedSong.source === 'API Detection' || detectedSong.source === 'ACRCloud')) {
          console.log('🎤 [DETECTION] ✅ ACRCloud successfully identified the song!');
          setLastApiResult({type: 'api', song: detectedSong, timestamp: new Date()});
        } else if (detectedSong) {
          console.log('🎤 [DETECTION] ℹ️ ACRCloud did not recognize - using fallback');
          setLastApiResult({type: 'mock', song: detectedSong, timestamp: new Date()});
        }
      } else {
        console.log('🎤 [DETECTION] No audio buffer available');
      }

      if (!detectedSong) {
        console.log('🎤 [DETECTION] ACRCloud returned no match - using Wonderwall fallback');
        const mockSongData = {
          title: "Wonderwall",
          artist: "Oasis", 
          album: "(What's the Story) Morning Glory?",
          albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
          duration: "4:18",
          chords: [
            { name: "Em7", fingering: "022030", fret: 0 },
            { name: "G", fingering: "320003", fret: 3 },
            { name: "D", fingering: "xx0232", fret: 2 },
            { name: "C", fingering: "x32010", fret: 0 },
            { name: "Am", fingering: "x02210", fret: 0 },
            { name: "F", fingering: "133211", fret: 1 }
          ],
          tabUrl: "https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-64382",
          source: "Mock Data"
        };
        detectedSong = await songDetection.detectSong(mockSongData);
        setLastApiResult({type: 'mock', song: detectedSong, timestamp: new Date()});
      }
      
      if (detectedSong) {
        console.log(`🎤 [DETECTION] Final result: "${detectedSong.title}" by ${detectedSong.artist}`);
        
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        setDetectionProgress(100);
        
        setTimeout(() => {
          navigate(`/chords/${detectedSong.id}`, { 
            state: detectedSong
          });
        }, 500);
      }
    } catch (error) {
      console.error('🎤 [DETECTION] Error:', error);
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      setIsDetecting(false);
      setDetectionProgress(0);
      setIsRecordingForDetection(false);
    }
  };

  const handleStartJamming = async () => {
    if (audioCapture.state.isRecording || isRecordingForDetection) {
      console.log('🎤 [RECORDING] Stopping recording...');
      
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      
      audioCapture.stopRecording();
      setIsRecordingForDetection(false);
      setIsDetecting(false);
      setRecordingProgress(0);
      setDetectionProgress(0);
    } else {
      console.log('🎤 [RECORDING] Starting 15-second recording for ACRCloud...');
      
      await audioCapture.startRecording();
      setIsRecordingForDetection(true);
      setRecordingProgress(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingProgress(prev => {
          const next = prev + (100 / 15);
          if (next >= 100) {
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            return 100;
          }
          return next;
        });
      }, 1000);
      
      recordingTimerRef.current = setTimeout(() => {
        console.log('🎤 [RECORDING] 15 seconds complete - sending to ACRCloud...');
        setIsRecordingForDetection(false);
        handleSongIdentification();
      }, 15000);
    }
  };

  const recordingTimeRemaining = Math.ceil(15 - (recordingProgress * 15 / 100));

  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {showSpotifyNotice && (
        <div className="bg-spotify/20 border-b border-spotify/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Music className="w-5 h-5 text-spotify" />
                <span className="font-medium text-foreground">
                  <strong>Pro tip:</strong> Connect Spotify to get song info automatically
                </span>
                <Button 
                  size="sm" 
                  className="ml-4 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-xl px-6 py-2 font-semibold shadow-md"
                  onClick={() => navigate('/building')}
                >
                  Connect Spotify
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSpotifyNotice(false)}
                className="rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/')} className="mr-4 rounded-2xl">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Listen for Chords</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAudioSettings(!showAudioSettings)}
            className="rounded-2xl border-2"
          >
            <Settings className="w-4 h-4 mr-2" />
            Audio Settings
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-foreground">
              Ready to jam?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
              Click to record 15 seconds of audio for chord detection
            </p>
          </div>

          {showAudioSettings && (
            <div className="mb-8">
              <AudioDeviceSelector
                state={audioCapture.state}
                onDeviceSelect={audioCapture.selectDevice}
                onRefreshDevices={audioCapture.refreshDevices}
                onStartRecording={audioCapture.startRecording}
                onStopRecording={audioCapture.stopRecording}
                audioData={currentAudioData || undefined}
                className="mx-auto"
              />
            </div>
          )}

          <div className="relative flex items-center justify-center mb-16">
            <div className="relative">
              <div className="w-[500px] h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full indie-shadow-xl flex items-center justify-center">
                <div 
                  className={`vinyl-record w-[400px] h-[400px] cursor-pointer transition-all duration-300 hover:scale-105 ${
                    audioCapture.state.isRecording ? 'vinyl-spinning' : ''
                  } ${isDetecting ? 'vinyl-detecting' : ''}`}
                  onClick={handleStartJamming}
                >
                  <div className="absolute inset-4 rounded-full border border-vinyl-groove opacity-30"></div>
                  <div className="absolute inset-8 rounded-full border border-vinyl-groove opacity-20"></div>
                  <div className="absolute inset-12 rounded-full border border-vinyl-groove opacity-15"></div>
                  <div className="absolute inset-16 rounded-full border border-vinyl-groove opacity-10"></div>
                  
                  <div className="absolute inset-[140px] vinyl-label rounded-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="font-bold text-lg mb-1">ChordZap</div>
                      <div className="text-sm opacity-80">
                        {isRecordingForDetection ? `Recording ${recordingTimeRemaining}s` : 
                         isDetecting ? 'Detecting' :
                         audioCapture.state.isRecording ? 'Recording' : 'Ready'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-[190px] vinyl-hole rounded-full"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-primary/90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                      {!audioCapture.state.isRecording ? (
                        <Play className="w-10 h-10 text-white ml-1" />
                      ) : (
                        <Pause className="w-10 h-10 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={`absolute top-[100px] right-[50px] w-2 h-32 bg-gray-600 rounded-full origin-bottom transition-transform duration-500 ${
                  audioCapture.state.isRecording ? 'rotate-[-20deg]' : 'rotate-[10deg]'
                }`}>
                  <div className="absolute -top-2 -right-1 w-4 h-4 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {audioCapture.state.isRecording && currentAudioData && (
            <div className="mb-8">
              <Card className="max-w-4xl mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-6 text-center">Live Audio Feed</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Waveform</label>
                      <WaveformVisualizer
                        audioData={currentAudioData}
                        isActive={audioCapture.state.isRecording}
                        width={600}
                        height={120}
                        className="w-full bg-muted rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Frequency Spectrum</label>
                      <FrequencyVisualizer
                        audioData={currentAudioData}
                        isActive={audioCapture.state.isRecording}
                        width={600}
                        height={80}
                        className="w-full bg-muted rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="text-center space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                {isDetecting ? 'Identifying song with ACRCloud...' : 
                 isRecordingForDetection ? `Recording... ${recordingTimeRemaining} seconds remaining` :
                 audioCapture.state.isRecording ? 'Click to start chord detection' : 
                 'Ready to jam'}
              </h3>
              <p className="text-muted-foreground text-lg">
                {isDetecting ? 'Analyzing audio and searching for chords...' :
                 isRecordingForDetection ? 'Play your song clearly - ACRCloud needs 10-15 seconds for best results' :
                 audioCapture.state.isRecording ? 'Audio input active - click the vinyl to begin detection' :
                 'Click the vinyl record to record 15 seconds of audio for chord detection'}
              </p>
            </div>

            {isRecordingForDetection && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <Progress value={recordingProgress} className="h-4 rounded-full mb-6" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-foreground mb-2">
                      Recording Audio
                    </p>
                    <p className="text-muted-foreground">
                      {recordingTimeRemaining} seconds remaining
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Make sure your song is playing clearly
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isDetecting && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <Progress value={detectionProgress} className="h-4 rounded-full mb-6" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-foreground mb-2">
                      Detecting Song...
                    </p>
                    <p className="text-muted-foreground">
                      {detectionProgress < 30 && "Sending to ACRCloud API..."}
                      {detectionProgress >= 30 && detectionProgress < 60 && "Analyzing audio fingerprint..."}
                      {detectionProgress >= 60 && detectionProgress < 90 && "Searching music database..."}
                      {detectionProgress >= 90 && "Processing results..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(audioCapture.state.error || songDetection.error) && (
              <Alert className="max-w-md mx-auto border-2 border-destructive/20 bg-destructive/5 rounded-3xl">
                <AlertDescription className="text-lg">
                  {audioCapture.state.error || songDetection.error}
                  {songDetection.error && (
                    <button 
                      onClick={songDetection.clearError}
                      className="ml-2 text-xs underline"
                    >
                      dismiss
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {lastApiResult.type !== 'none' && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow mb-8">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    {lastApiResult.type === 'api' ? '🎉' : 'ℹ️'} Detection Result
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Status:</strong> {lastApiResult.type === 'api' ? '✅ ACRCloud Match Found!' : '⚠️ No Match - Using Fallback'}</p>
                    {lastApiResult.song && (
                      <>
                        <p><strong>Song:</strong> "{lastApiResult.song.title}"</p>
                        <p><strong>Artist:</strong> {lastApiResult.song.artist}</p>
                        <p><strong>Source:</strong> {lastApiResult.song.source}</p>
                      </>
                    )}
                    {lastApiResult.timestamp && (
                      <p><strong>Time:</strong> {lastApiResult.timestamp.toLocaleTimeString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!audioCapture.state.isRecording && !isDetecting && !isRecordingForDetection && (
              <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">15-second recording</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">ACRCloud detection</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Automatic fallback</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}