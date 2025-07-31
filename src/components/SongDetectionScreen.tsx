import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { ArrowLeft, Play, Pause, Volume2, Zap } from 'lucide-react';
import React from 'react';

interface SongDetectionScreenProps {
  source: 'spotify' | 'file' | null;
  onSongDetected: (song: any) => void;
  onBack: () => void;
}

export function SongDetectionScreen({ source, onSongDetected, onBack }: SongDetectionScreenProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleDetection = () => {
    setIsDetecting(true);
    setProgress(0);
    
    // simulate detection progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDetecting(false);
          // simulate detected song
          onSongDetected({
            title: "Wonderwall",
            artist: "Oasis",
            album: "(What's the Story) Morning Glory?",
            albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
            duration: "4:18",
            chords: [
              { name: "Em7", fingering: "022030", type: "chord" },
              { name: "G", fingering: "320003", type: "chord" },
              { name: "D", fingering: "xx0232", type: "chord" },
              { name: "C", fingering: "x32010", type: "chord" },
              { name: "Am", fingering: "x02210", type: "chord" },
              { name: "F", fingering: "133211", type: "chord" }
            ]
          });
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  // generate mock waveform data
  const waveformData = Array.from({ length: 200 }, (_, i) => 
    Math.sin(i * 0.1) * 50 + Math.random() * 30 - 15
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* header */}
      <header className="border-b border-border px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Song Detection</h1>
        </div>
      </header>

      {/* main content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              {source === 'spotify' ? 'Ready to analyze from Spotify' : 'Ready to analyze your audio file'}
            </h2>
            <p className="text-xl text-muted-foreground">
              Click the detection button below to start analyzing the audio for chord progressions
            </p>
          </div>

          {/* audio player mockup */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Volume2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {source === 'spotify' ? 'Spotify Track Ready' : 'Audio File Loaded'}
                  </h3>
                  <p className="text-muted-foreground">Duration: 4:18</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>

              {/* waveform visualization */}
              <div className="relative h-24 bg-muted rounded-lg p-4 overflow-hidden">
                <div className="flex items-center justify-center h-full gap-1">
                  {waveformData.map((height, index) => (
                    <div
                      key={index}
                      className="bg-primary/60 w-1 rounded-full transition-all"
                      style={{ 
                        height: `${Math.abs(height) + 10}px`,
                        opacity: isPlaying ? Math.random() * 0.5 + 0.5 : 0.3
                      }}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-0.5 h-full bg-accent opacity-50" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* detection button */}
          <div className="text-center">
            <Button
              size="lg"
              className="w-64 h-20 text-xl font-semibold rounded-2xl"
              onClick={handleDetection}
              disabled={isDetecting}
            >
              <Zap className="w-8 h-8 mr-3" />
              {isDetecting ? 'Detecting...' : 'Detect Chords'}
            </Button>

            {isDetecting && (
              <div className="mt-8 max-w-md mx-auto space-y-4">
                <Progress value={progress} className="h-3" />
                <div className="text-center">
                  <p className="text-lg font-medium">Analyzing audio...</p>
                  <p className="text-muted-foreground">
                    {progress < 30 && "Preprocessing audio data"}
                    {progress >= 30 && progress < 60 && "Detecting chord progressions"}
                    {progress >= 60 && progress < 90 && "Matching with chord database"}
                    {progress >= 90 && "Finalizing results"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {!isDetecting && (
            <div className="mt-12 text-center space-y-4">
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Advanced AI analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>High accuracy detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Guitar-optimized results</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}