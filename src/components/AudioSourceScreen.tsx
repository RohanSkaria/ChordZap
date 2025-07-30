import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Upload, Music2, Music } from 'lucide-react';

interface AudioSourceScreenProps {
  onSourceSelect: (source: 'spotify' | 'file') => void;
  onBack: () => void;
}

export function AudioSourceScreen({ onSourceSelect, onBack }: AudioSourceScreenProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Choose Audio Source</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How would you like to analyze your music?</h2>
            <p className="text-xl text-muted-foreground">
              Choose your preferred audio source to get started with chord detection
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Spotify Option */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary/20"
              onClick={() => onSourceSelect('spotify')}
            >
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-spotify rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Music className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">Connect Spotify</CardTitle>
                <CardDescription className="text-lg">
                  Analyze songs directly from your Spotify playlists and library
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-3 text-muted-foreground mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-spotify rounded-full"></div>
                    <span>Access your playlists</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-spotify rounded-full"></div>
                    <span>High-quality audio analysis</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-spotify rounded-full"></div>
                    <span>Instant song identification</span>
                  </div>
                </div>
                <Button className="w-full bg-spotify hover:bg-spotify/90 text-white" size="lg">
                  <Music2 className="w-5 h-5 mr-2" />
                  Connect to Spotify
                </Button>
              </CardContent>
            </Card>

            {/* File Upload Option */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary/20"
              onClick={() => onSourceSelect('file')}
            >
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Upload Audio File</CardTitle>
                <CardDescription className="text-lg">
                  Upload MP3, WAV, or other audio files from your computer
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-3 text-muted-foreground mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Support for MP3, WAV, FLAC</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Local file processing</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Privacy focused</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" size="lg">
                  <Upload className="w-5 h-5 mr-2" />
                  Choose File
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Both options provide the same high-quality chord detection experience
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}