import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Music, X, Play, Pause, Zap, Settings } from 'lucide-react';
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
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [showSpotifyNotice, setShowSpotifyNotice] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [currentAudioData, setCurrentAudioData] = useState<Float32Array | null>(null);
  const [lastApiResult, setLastApiResult] = useState<{type: 'api' | 'mock' | 'none', song?: any, timestamp?: Date}>({type: 'none'});

  // subscribe to audio data updates
  useEffect(() => {
    const unsubscribe = audioCapture.subscribe((audioData) => {
      setCurrentAudioData(audioData);
    });

    return unsubscribe;
  }, [audioCapture]);

  // start session when component mounts
  useEffect(() => {
    songDetection.startSession();
    
    // cleanup: end session when component unmounts
    return () => {
      songDetection.endSession();
    };
  }, []);

  // handles song identification with progress tracking and real api calls
  const handleSongIdentification = async () => {
    setIsDetecting(true);
    setDetectionProgress(0);
    
    console.log('🎤 [DETECTION] Song identification started');
    
    const interval = setInterval(() => {
      setDetectionProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90; // stop at 90%, api call will finish it
        }
        return prev + 2.5;
      });
    }, 120);

    try {
      // prefer real mic detection when audio data is present
      const audioData = audioCapture.getAudioBuffer();
      let detectedSong = null as any;
      
      if (audioData && audioData.length > 44100 * 2) {  // Need at least 2 seconds
        console.log('🎤 [DETECTION] Audio data available - attempting real API detection');
        console.log(`🎤 [DETECTION] Audio buffer: ${audioData.length} samples`);
        console.log(`🎤 [DETECTION] Duration: ${(audioData.length / 44100).toFixed(2)} seconds`);
        
        // send 5-10 seconds to ACR Cloud for better recognition
        const minSamples = 44100 * 5;  // 5 seconds minimum
        const maxSamples = 44100 * 10; // 10 seconds maximum
        const slice = Array.from(audioData.slice(0, Math.min(audioData.length, maxSamples)));
        
        if (slice.length < minSamples) {
          console.log(`🎤 [DETECTION] ⚠️  Audio too short (${(slice.length / 44100).toFixed(2)}s) - need at least 5s for ACR Cloud`);
          console.log('🎤 [DETECTION] Waiting for more audio data...');
          // Don't attempt API call with insufficient data
        } else {
          console.log(`🎤 [DETECTION] ✅ Sending ${slice.length} samples (${(slice.length / 44100).toFixed(2)}s) to ACR API...`);
          detectedSong = await songDetection.detectFromAudio(slice, 44100);
        }
        
        // Update debug status based on API response
        if (detectedSong && detectedSong.source === 'API Detection') {
          setLastApiResult({type: 'api', song: detectedSong, timestamp: new Date()});
        } else if (detectedSong && detectedSong.source === 'Mock Data') {
          setLastApiResult({type: 'mock', song: detectedSong, timestamp: new Date()});
        }
      } else {
        console.log('🎤 [DETECTION] No audio data available - will use mock fallback');
      }

      // fallback to mock if detection could not run
      if (!detectedSong) {
        console.log('🎤 [DETECTION] API detection returned null - using frontend mock fallback');
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
          source: "Frontend Mock"
        };
        detectedSong = await songDetection.detectSong(mockSongData);
      }
      
      if (detectedSong) {
        console.log('🎤 [DETECTION] ✅ Detection complete!');
        console.log(`🎤 [DETECTION] Final song: "${detectedSong.title}" by ${detectedSong.artist}`);
        console.log(`🎤 [DETECTION] Source: ${detectedSong.source}`);
        console.log('🎤 [DETECTION] Navigating to chords page...');
        
        clearInterval(interval);
        setDetectionProgress(100);
        
        // wait a moment then navigate
        setTimeout(() => {
          navigate(`/chords/${detectedSong.id}`, { 
            state: detectedSong
          });
        }, 500);
      }
    } catch (error) {
      console.error('🎤 [DETECTION] ❌ Song detection failed:', error);
      clearInterval(interval);
      setIsDetecting(false);
      setDetectionProgress(0);
    }
  };

  const handleStartJamming = () => {
    if (audioCapture.state.isRecording) {
      // stop current recording session
      audioCapture.stopRecording();
      setIsDetecting(false);
    } else {
      // start recording and trigger auto-detection
      audioCapture.startRecording();
      console.log('🎤 [DETECTION] Started recording - waiting 7 seconds to collect enough audio for ACR Cloud...');
      // wait longer for enough audio to accumulate (5+ seconds needed)
      setTimeout(() => {
        console.log('🎤 [DETECTION] 7 seconds elapsed - attempting song identification...');
        handleSongIdentification();
      }, 7000);  // Wait 7 seconds to ensure we have 5+ seconds of audio
    }
  };

  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {/* Spotify Connection Notice */}
      {showSpotifyNotice && (
        <div className="bg-spotify/10 border-b border-spotify/20">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Music className="w-5 h-5 text-spotify" />
                <span className="font-medium">
                  <strong>Pro tip:</strong> Connect Spotify to get song info automatically
                </span>
                <Button size="sm" className="ml-4 bg-spotify hover:bg-spotify/90 text-white rounded-xl">
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

      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-6xl w-full">
          {/* Title Section */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-foreground">
              Ready to jam?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
              Select your audio input and start listening. Play any song and watch the magic happen.
            </p>
          </div>

          {/* settings stuff */}
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

          {/* vinyl player */}
          <div className="relative flex items-center justify-center mb-16">
            <div className="relative">
              {/* Base Platform */}
              <div className="w-[500px] h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full indie-shadow-xl flex items-center justify-center">
                {/* the record */}
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
                        {audioCapture.state.isRecording ? 'Recording' : 'Ready'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-[190px] vinyl-hole rounded-full"></div>
                  
                  {/* play button */}
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
                
                {/* needle arm thing */}
                <div className={`absolute top-[100px] right-[50px] w-2 h-32 bg-gray-600 rounded-full origin-bottom transition-transform duration-500 ${
                  audioCapture.state.isRecording ? 'rotate-[-20deg]' : 'rotate-[10deg]'
                }`}>
                  <div className="absolute -top-2 -right-1 w-4 h-4 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* audio visuals */}
          {audioCapture.state.isRecording && currentAudioData && (
            <div className="mb-8">
              <Card className="max-w-4xl mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-6 text-center">Live Audio Feed</h3>
                  <div className="space-y-6">
                    {/* waveform display */}
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
                    
                    {/* frequency stuff */}
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

          {/* Status and Controls */}
          <div className="text-center space-y-8">
            {/* Status Text */}
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                {isDetecting ? 'Identifying song and finding chords...' : 
                 audioCapture.state.isRecording ? 'Listening for music...' : 
                 'Ready to jam'}
              </h3>
              <p className="text-muted-foreground text-lg">
                {isDetecting ? 'Searching chord databases from Ultimate Guitar and other sources' :
                 audioCapture.state.isRecording 
                  ? 'Recording audio... Play a song for 5+ seconds for best recognition results' 
                  : 'Click the vinyl record or "Start Jamming" to begin instant chord detection'
                }
              </p>
            </div>

            {/* detection happens automatically now */}

            {/* Detection Progress */}
            {isDetecting && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <Progress value={detectionProgress} className="h-4 rounded-full mb-6" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-foreground mb-2">Finding chords...</p>
                    <p className="text-muted-foreground">
                      {detectionProgress < 30 && "Identifying the song"}
                      {detectionProgress >= 30 && detectionProgress < 60 && "Searching Ultimate Guitar database"}
                      {detectionProgress >= 60 && detectionProgress < 90 && "Retrieving chord tabs and fingerings"}
                      {detectionProgress >= 90 && "Loading chord diagrams!"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
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

            {/* Debug Panel for Iteration 2 */}
          {lastApiResult.type !== 'none' && (
            <Card className="max-w-md mx-auto rounded-3xl indie-shadow mb-8">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center">
                  {lastApiResult.type === 'api' ? '🎉' : 'ℹ️'} API Status (Debug)
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Type:</strong> {lastApiResult.type === 'api' ? '✅ Real ACR Cloud Detection' : '❌ Mock/Fallback Data'}</p>
                  {lastApiResult.song && (
                    <>
                      <p><strong>Song:</strong> "{lastApiResult.song.title}"</p>
                      <p><strong>Artist:</strong> {lastApiResult.song.artist}</p>
                    </>
                  )}
                  {lastApiResult.timestamp && (
                    <p><strong>Time:</strong> {lastApiResult.timestamp.toLocaleTimeString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
            {!audioCapture.state.isRecording && !isDetecting && (
              <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Real-time detection</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Multiple audio sources</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Live audio visualization</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}