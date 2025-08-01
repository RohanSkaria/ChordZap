import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingScreen } from './components/LandingScreen.tsx';
import { ListeningScreen } from './components/ListeningScreen.tsx';
import { ChordDisplayScreen } from './components/ChordDisplayScreen.tsx';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/listen" element={<ListeningScreen />} />
          <Route path="/chords/:songId?" element={<ChordDisplayScreen />} />
        </Routes>
      </div>
    </Router>
  );
}