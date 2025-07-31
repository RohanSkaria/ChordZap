import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Music, X, Play, Pause, Zap, Settings } from 'lucide-react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { AudioDeviceSelector } from './audio/AudioDeviceSelector';
import { WaveformVisualizer, FrequencyVisualizer } from './audio/AudioVisualizer';
import React from 'react';

interface ListeningScreenProps {
  onSongDetected: (song: any) => void;
  onBack: () => void;
}

export function ListeningScreen({ onSongDetected, onBack }: ListeningScreenProps) {
  // Audio capture state
  const audioCapture = useAudioCapture();
  
  // Song detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [showSpotifyNotice, setShowSpotifyNotice] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [currentAudioData, setCurrentAudioData] = useState<Float32Array | null>(null);

  // Subscribe to audio data for real-time visualization
  useEffect(() => {
    const unsubscribe = audioCapture.subscribe((audioData) => {
      setCurrentAudioData(audioData);
    });

    return unsubscribe;
  }, [audioCapture]);

  // Mock song detection process
  const handleDetection = () => {
    setIsDetecting(true);
    setDetectionProgress(0);
    
    const interval = setInterval(() => {
      setDetectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDetecting(false);
          
          // Mock detected song
          onSongDetected({
            title: "Wonderwall",
            artist: "Oasis",
            album: "(What's the Story) Morning Glory?",
            albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
            duration: "4:18",
            chords: [
              { name: "Em7", fingering: "022030" },
              { name: "G", fingering: "320003" },
              { name: "D", fingering: "xx0232" },
              { name: "C", fingering: "x32010" },
              { name: "Am", fingering: "x02210" },
              { name: "F", fingering: "133211" }
            ]
          });
          return 100;
        }
        return prev + 3;
      });
    }, 100);
  };

  const handleRecordingToggle = () => {
    if (audioCapture.state.isRecording) {
      audioCapture.stopRecording();
    } else {
      audioCapture.startRecording();
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
            <Button variant="ghost" onClick={onBack} className="mr-4 rounded-2xl">
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

          {/* Audio Settings Panel */}
          {showAudioSettings && (
            <div className="mb-8">
              <AudioDeviceSelector
                state={audioCapture.state}
                onDeviceSelect={audioCapture.selectDevice}
                onRefreshDevices={audioCapture.refreshDevices}
                onStartRecording={audioCapture.startRecording}
                onStopRecording={audioCapture.stopRecording}
                audioData={currentAudioData}
                className="mx-auto"
              />
            </div>
          )}

          {/* Vinyl Record Player with Audio Integration */}
          <div className="relative flex items-center justify-center mb-16">
            <div className="relative">
              {/* Base Platform */}
              <div className="w-[500px] h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full indie-shadow-xl flex items-center justify-center">
                {/* Vinyl Record */}
                <div 
                  className={`vinyl-record w-[400px] h-[400px] cursor-pointer transition-all duration-300 hover:scale-105 ${
                    audioCapture.state.isRecording ? 'vinyl-spinning' : ''
                  } ${isDetecting ? 'vinyl-detecting' : ''}`}
                  onClick={handleRecordingToggle}
                >
                  {/* Record Grooves */}
                  <div className="absolute inset-4 rounded-full border border-vinyl-groove opacity-30"></div>
                  <div className="absolute inset-8 rounded-full border border-vinyl-groove opacity-20"></div>
                  <div className="absolute inset-12 rounded-full border border-vinyl-groove opacity-15"></div>
                  <div className="absolute inset-16 rounded-full border border-vinyl-groove opacity-10"></div>
                  
                  {/* Center Label */}
                  <div className="absolute inset-[140px] vinyl-label rounded-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="font-bold text-lg mb-1">ChordZap</div>
                      <div className="text-sm opacity-80">
                        {audioCapture.state.isRecording ? 'Recording' : 'Ready'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Hole */}
                  <div className="absolute inset-[190px] vinyl-hole rounded-full"></div>
                  
                  {/* Play/Pause Button Overlay */}
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
                
                {/* Tonearm */}
                <div className={`absolute top-[100px] right-[50px] w-2 h-32 bg-gray-600 rounded-full origin-bottom transition-transform duration-500 ${
                  audioCapture.state.isRecording ? 'rotate-[-20deg]' : 'rotate-[10deg]'
                }`}>
                  <div className="absolute -top-2 -right-1 w-4 h-4 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Visualization */}
          {audioCapture.state.isRecording && currentAudioData && (
            <div className="mb-8">
              <Card className="max-w-4xl mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-6 text-center">Live Audio Feed</h3>
                  <div className="space-y-6">
                    {/* Waveform */}
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
                    
                    {/* Frequency Spectrum */}
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
                {audioCapture.state.isRecording ? 'Listening for music...' : 'Ready to detect chords'}
              </h3>
              <p className="text-muted-foreground text-lg">
                {audioCapture.state.isRecording 
                  ? 'Play a song and I\'ll identify the chord progression' 
                  : 'Click the vinyl record above to start listening'
                }
              </p>
            </div>

            {/* Detection Button - Only show when recording */}
            {audioCapture.state.isRecording && !isDetecting && (
              <Button
                size="lg"
                className="px-10 py-6 text-lg rounded-2xl indie-shadow-lg"
                onClick={handleDetection}
              >
                <Zap className="w-6 h-6 mr-3" />
                Detect Chords Now
              </Button>
            )}

            {/* Detection Progress */}
            {isDetecting && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <Progress value={detectionProgress} className="h-4 rounded-full mb-6" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-foreground mb-2">Analyzing audio...</p>
                    <p className="text-muted-foreground">
                      {detectionProgress < 30 && "Listening to the music"}
                      {detectionProgress >= 30 && detectionProgress < 60 && "Detecting chord patterns"}
                      {detectionProgress >= 60 && detectionProgress < 90 && "Matching with chord library"}
                      {detectionProgress >= 90 && "Almost there!"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {audioCapture.state.error && (
              <Alert className="max-w-md mx-auto border-2 border-destructive/20 bg-destructive/5 rounded-3xl">
                <AlertDescription className="text-lg">
                  {audioCapture.state.error}
                </AlertDescription>
              </Alert>
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