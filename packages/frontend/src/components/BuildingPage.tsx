import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ArrowLeft, Music, Wrench, Coffee, Zap } from 'lucide-react';

export function BuildingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4 rounded-2xl">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Feature Under Construction</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-2xl text-center">
          <div className="mb-12">
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 indie-shadow-lg rotate-6 indie-pulse">
              <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center -rotate-6">
                <Wrench className="w-14 h-14 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-foreground">
              Still Building<br />
              <span className="text-primary relative">
                this feature
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 2 100 1 150 4C200 7 250 8 298 5" stroke="#D97706" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6"/>
                </svg>
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              We're working hard to bring you Spotify integration. Stay tuned for updates!
            </p>
          </div>

          <Card className="mb-12 rounded-3xl indie-shadow-lg overflow-hidden">
            <CardContent className="p-10">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-spotify/10 rounded-2xl flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-spotify" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Spotify Connect</h3>
                  <p className="text-muted-foreground text-sm">
                    Link your Spotify account for seamless song detection
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Real-time Sync</h3>
                  <p className="text-muted-foreground text-sm">
                    Get chord progressions as your Spotify tracks play
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <Coffee className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground text-sm">
                    We're brewing something special for you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg rounded-2xl indie-shadow-lg hover:indie-shadow transition-all duration-300 hover:scale-105"
              onClick={() => navigate('/listen')}
            >
              <Music className="w-6 h-6 mr-3" />
              Continue Listening
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="px-8 py-6 text-lg rounded-2xl border-2"
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}