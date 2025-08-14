import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingScreen } from './components/LandingScreen';
import { ListeningScreen } from './components/ListeningScreen';
import { ChordDisplayScreen } from './components/ChordDisplayScreen';
import { BuildingPage } from './components/BuildingPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/listen" element={<ListeningScreen />} />
          <Route path="/chords/:songId?" element={<ChordDisplayScreen />} />
          <Route path="/building" element={<BuildingPage />} />
        </Routes>
      </div>
    </Router>
  );
}