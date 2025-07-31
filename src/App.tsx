import React, { useState } from 'react';
import { LandingScreen } from './components/LandingScreen.tsx';
import { ListeningScreen } from './components/ListeningScreen.tsx';
import { ChordDisplayScreen } from './components/ChordDisplayScreen.tsx';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'listening' | 'chords'>('landing');
  const [detectedSong, setDetectedSong] = useState<any>(null);

  const handleScreenChange = (screen: 'landing' | 'listening' | 'chords') => {
    setCurrentScreen(screen);
  };

  const handleSongDetected = (song: any) => {
    setDetectedSong(song);
    setCurrentScreen('chords');
  };

  return (
    <div className="min-h-screen bg-background">
      {currentScreen === 'landing' && (
        <LandingScreen onGetStarted={() => handleScreenChange('listening')} />
      )}
      {currentScreen === 'listening' && (
        <ListeningScreen 
          onSongDetected={handleSongDetected}
          onBack={() => handleScreenChange('landing')}
        />
      )}
      {currentScreen === 'chords' && (
        <ChordDisplayScreen 
          song={detectedSong}
          onBack={() => handleScreenChange('listening')}
        />
      )}
    </div>
  );
}