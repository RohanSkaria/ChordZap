import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Music, Zap, Guitar, Heart } from 'lucide-react';

export function LandingScreen() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/listen');
  };
  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center indie-shadow rotate-3 indie-bounce">
              <Guitar className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">ChordZap</span>
          </div>
          <nav className="flex items-center gap-8">
            <a 
              href="https://github.com/RohanSkaria/ChordZap" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              About
            </a>
            <button className="text-muted-foreground hover:text-foreground transition-colors font-medium">Contact</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-5xl text-center">
          <div className="mb-12">
            <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 indie-shadow-lg rotate-6 indie-pulse">
              <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center -rotate-6">
                <Zap className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight text-foreground">
              Discover chords<br />
              <span className="text-primary relative">
                instantly
                <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 2 100 1 150 4C200 7 250 8 298 5" stroke="#D97706" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6"/>
                </svg>
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Just play any song, and ChordZap will show you the chords in real-time. 
              Perfect for guitarists who love learning by ear.
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="px-10 py-6 text-lg rounded-2xl indie-shadow-lg hover:indie-shadow transition-all duration-300 hover:scale-105"
              onClick={handleGetStarted}
            >
              <Music className="w-6 h-6 mr-3" />
              Start Listening
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-8">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p className="text-lg">Made with <Heart className="w-4 h-4 inline text-primary" /> for guitarists everywhere</p>
        </div>
      </footer>
    </div>
  );
}