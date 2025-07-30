import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Music, X, Settings, Headphones, Play, Pause } from 'lucide-react';

interface ListeningScreenProps {
  onSongDetected: (song: any) => void;
  onBack: () => void;
}

export function ListeningScreen({ onSongDetected, onBack }: ListeningScreenProps) {
  const [isListening, setIsListening] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showSpotifyNotice, setShowSpotifyNotice] = useState(true);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('default');
  const [showMicSettings, setShowMicSettings] = useState(false);

  // Mock microphone devices
  const mockMicrophones = [
    { id: 'default', name: 'Default Microphone' },
    { id: 'built-in', name: 'Built-in Microphone' },
    { id: 'usb-mic', name: 'USB Microphone' },
    { id: 'headset', name: 'Headset Microphone' }
  ];

  const requestMicrophoneAccess = async () => {
    try {
      setHasPermission(true);
      setIsListening(true);
      
      setTimeout(() => {
        if (Math.random() > 0.3) {
          handleDetection();
        }
      }, 3000);
    } catch (error) {
      setHasPermission(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsDetecting(false);
    setProgress(0);
  };

  const handleDetection = () => {
    setIsDetecting(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDetecting(false);
          setIsListening(false);
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
            onClick={() => setShowMicSettings(!showMicSettings)}
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
              Click the record to start listening. Play any song and watch the magic happen.
            </p>
          </div>

          {/* Microphone Settings */}
          {showMicSettings && (
            <Card className="mb-8 rounded-3xl indie-shadow max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="font-semibold mb-6 text-xl flex items-center gap-3">
                  <Headphones className="w-6 h-6 text-primary" />
                  Audio Input Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-3 block">Choose your microphone</label>
                    <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                      <SelectTrigger className="rounded-2xl border-2">
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockMicrophones.map((mic) => (
                          <SelectItem key={mic.id} value={mic.id}>
                            {mic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permission Alert */}
          {hasPermission === false && (
            <Alert className="mb-8 border-2 border-destructive/20 bg-destructive/5 rounded-3xl max-w-2xl mx-auto">
              <AlertDescription className="text-lg">
                Microphone access is required for chord detection. Please allow access and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Vinyl Record Player */}
          <div className="relative flex items-center justify-center mb-16">
            {/* Turntable Base */}
            <div className="relative">
              {/* Base Platform */}
              <div className="w-[500px] h-[500px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full indie-shadow-xl flex items-center justify-center">
                {/* Vinyl Record */}
                <div 
                  className={`vinyl-record w-[400px] h-[400px] cursor-pointer transition-all duration-300 hover:scale-105 ${
                    isListening ? 'vinyl-spinning' : ''
                  } ${isDetecting ? 'vinyl-detecting' : ''}`}
                  onClick={!isListening ? requestMicrophoneAccess : stopListening}
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
                      <div className="text-sm opacity-80">Chord Detection</div>
                    </div>
                  </div>
                  
                  {/* Center Hole */}
                  <div className="absolute inset-[190px] vinyl-hole rounded-full"></div>
                  
                  {/* Play/Pause Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-primary/90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                      {!isListening ? (
                        <Play className="w-10 h-10 text-white ml-1" />
                      ) : (
                        <Pause className="w-10 h-10 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tonearm */}
                <div className={`absolute top-[100px] right-[50px] w-2 h-32 bg-gray-600 rounded-full origin-bottom transition-transform duration-500 ${
                  isListening ? 'rotate-[-20deg]' : 'rotate-[10deg]'
                }`}>
                  <div className="absolute -top-2 -right-1 w-4 h-4 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Controls */}
          <div className="text-center space-y-8">
            {/* Status Text */}
            <div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">
                {isListening ? 'Listening for music...' : 'Ready to detect chords'}
              </h3>
              <p className="text-muted-foreground text-lg">
                {isListening 
                  ? 'Play a song and I\'ll identify the chord progression' 
                  : 'Click the vinyl record above to start listening'
                }
              </p>
            </div>

            {/* Detection Progress */}
            {isDetecting && (
              <Card className="max-w-md mx-auto rounded-3xl indie-shadow">
                <CardContent className="p-8">
                  <Progress value={progress} className="h-4 rounded-full mb-6" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-foreground mb-2">Analyzing audio...</p>
                    <p className="text-muted-foreground">
                      {progress < 30 && "Listening to the music"}
                      {progress >= 30 && progress < 60 && "Detecting chord patterns"}
                      {progress >= 60 && progress < 90 && "Matching with chord library"}
                      {progress >= 90 && "Almost there!"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            {!isListening && !isDetecting && (
              <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Real-time detection</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Any audio source works</span>
                </div>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-lg">Instant chord identification</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}