import { useState } from 'react';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Badge } from './ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.tsx';
import { Switch } from './ui/switch.tsx';
import { Label } from './ui/label.tsx';
import { ArrowLeft, Download, Share, Play, Music, Star, Guitar, Clock, Hash } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback.tsx';
import React from 'react';

interface ChordDisplayScreenProps {
  song: any;
  onBack: () => void;
}

export function ChordDisplayScreen({ song, onBack }: ChordDisplayScreenProps) {
  const [showTabs, setShowTabs] = useState(false);
  const [selectedChord, setSelectedChord] = useState(0);

  // generates chord diagrams from fingering patterns
  const getChordDiagram = (fingering: string, chordName: string) => {
    const strings = 6;
    const frets = 4;
    const positions = fingering.split('').map(pos => pos === 'x' ? null : parseInt(pos));
    
    return (
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 min-w-[140px] indie-shadow">
        <div className="text-center font-bold mb-4 text-black text-lg">{chordName}</div>
        <div className="relative">
          {/* guitar frets */}
          {Array.from({ length: frets + 1 }).map((_, fret) => (
            <div key={fret} className="border-t-2 border-black h-8 relative">
              {/* strings */}
              {Array.from({ length: strings }).map((_, string) => (
                <div key={string} className="absolute border-l-2 border-black h-8 top-0" 
                     style={{ left: `${string * 18}px` }}>
                  {/* finger dots */}
                  {positions[string] === fret && fret > 0 && (
                    <div className="w-4 h-4 chord-dot rounded-full -translate-x-2 -translate-y-2 absolute top-1/2" />
                  )}
                  {positions[string] === 0 && fret === 0 && (
                    <div className="w-3 h-3 border-2 border-primary rounded-full -translate-x-1.5 -translate-y-6 absolute bg-white" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4 rounded-2xl">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Chord Analysis Results</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="rounded-2xl border-2">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button size="sm" className="rounded-2xl">
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* song info */}
          <Card className="mb-8 rounded-3xl indie-shadow-lg overflow-hidden">
            <CardContent className="p-10">
              <div className="flex items-start gap-10">
                <div className="w-40 h-40 rounded-2xl overflow-hidden bg-muted flex-shrink-0 indie-shadow">
                  <ImageWithFallback
                    src={song.albumArt}
                    alt={`${song.album} album cover`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-3 text-foreground">{song.title}</h2>
                  <p className="text-2xl text-muted-foreground mb-6">by {song.artist}</p>
                  <p className="text-muted-foreground mb-6 text-lg">Album: {song.album}</p>
                  <div className="flex items-center gap-6 flex-wrap">
                    <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                      <Clock className="w-4 h-4 mr-2" />
                      {song.duration}
                    </Badge>
                    <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                      <Guitar className="w-4 h-4 mr-2" />
                      {song.chords.length} Chords
                    </Badge>
                    <Button variant="outline" size="sm" className="rounded-2xl border-2">
                      <Play className="w-4 h-4 mr-2" />
                      Play Preview
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* toggle options */}
          <Card className="mb-8 rounded-3xl indie-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Guitar className="w-6 h-6 text-primary" />
                  Display Options
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="tabs-mode"
                      checked={showTabs}
                      onCheckedChange={setShowTabs}
                    />
                    <Label htmlFor="tabs-mode" className="text-base">
                      {showTabs ? 'Tabs View' : 'Chords View'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="chords" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-2 h-14">
              <TabsTrigger value="chords" className="rounded-xl text-base">Chord Progression</TabsTrigger>
              <TabsTrigger value="diagram" className="rounded-xl text-base">Interactive Diagrams</TabsTrigger>
              <TabsTrigger value="sheet" className="rounded-xl text-base">Sheet Music</TabsTrigger>
            </TabsList>

            <TabsContent value="chords" className="space-y-8">
              {/* chord buttons */}
              <Card className="rounded-3xl indie-shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Star className="w-6 h-6 text-primary" />
                    Detected Chords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {song.chords.map((chord: any, index: number) => (
                      <Button
                        key={index}
                        variant={selectedChord === index ? "default" : "outline"}
                        className={`h-24 flex flex-col items-center justify-center transition-all duration-300 rounded-2xl border-2 ${
                          selectedChord === index 
                            ? 'bg-chord-selected scale-105 indie-shadow-lg' 
                            : 'hover:border-primary/50 hover:scale-102'
                        }`}
                        onClick={() => setSelectedChord(index)}
                      >
                        <span className="font-bold text-xl">{chord.name}</span>
                        <span className="text-xs opacity-70 font-mono">{chord.fingering}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* song structure */}
              <Card className="rounded-3xl indie-shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Song Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* verse chords */}
                    <div>
                      <h4 className="font-semibold mb-4 text-xl text-foreground flex items-center gap-2">
                        <Music className="w-5 h-5" />
                        Verse
                      </h4>
                      <div className="flex gap-4 flex-wrap">
                        {['Em7', 'G', 'D', 'C'].map((chord, index) => (
                          <Badge 
                            key={index} 
                            className="text-lg px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold"
                          >
                            {chord}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {/* chorus chords */}
                    <div>
                      <h4 className="font-semibold mb-4 text-xl text-foreground flex items-center gap-2">
                        <Hash className="w-5 h-5" />
                        Chorus
                      </h4>
                      <div className="flex gap-4 flex-wrap">
                        {['C', 'D', 'G', 'Em7', 'C', 'D', 'G'].map((chord, index) => (
                          <Badge 
                            key={index} 
                            className="text-lg px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-semibold"
                          >
                            {chord}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagram" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-10">
                {/* big chord diagram */}
                <Card className="rounded-3xl indie-shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <Guitar className="w-6 h-6" />
                      {song.chords[selectedChord]?.name} Chord
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center py-10">
                    <div className="scale-125">
                      {getChordDiagram(song.chords[selectedChord]?.fingering, song.chords[selectedChord]?.name)}
                    </div>
                  </CardContent>
                </Card>

                {/* chord details */}
                <Card className="rounded-3xl indie-shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">Chord Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div>
                      <Label className="text-lg font-medium">Fingering Position</Label>
                      <p className="text-4xl font-mono font-bold mt-3 text-foreground">
                        {song.chords[selectedChord]?.fingering}
                      </p>
                    </div>
                    <div>
                      <Label className="text-lg font-medium">Difficulty Level</Label>
                      <div className="mt-3">
                        <Badge className="bg-accent text-accent-foreground text-base px-4 py-2 rounded-xl">
                          <Star className="w-4 h-4 mr-2" />
                          Beginner Friendly
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-lg font-medium">Alternative Positions</Label>
                      <div className="flex gap-3 mt-3">
                        <Badge variant="outline" className="text-base px-4 py-2 rounded-xl border-2">320003</Badge>
                        <Badge variant="outline" className="text-base px-4 py-2 rounded-xl border-2">355433</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-lg font-medium">Practice Tips</Label>
                      <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                        Keep your thumb behind the neck and curve your fingers nicely. 
                        Practice the chord change slowly at first, then gradually speed up.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* all chords */}
              <Card className="rounded-3xl indie-shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Guitar className="w-6 h-6" />
                    All Chord Diagrams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {song.chords.map((chord: any, index: number) => (
                      <div
                        key={index}
                        className={`cursor-pointer transition-all duration-300 rounded-2xl ${
                          selectedChord === index ? 'ring-4 ring-primary/30 scale-105' : 'hover:ring-2 hover:ring-primary/20 hover:scale-102'
                        }`}
                        onClick={() => setSelectedChord(index)}
                      >
                        {getChordDiagram(chord.fingering, chord.name)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sheet">
              <Card className="rounded-3xl indie-shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Music className="w-6 h-6" />
                    Sheet Music
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-20">
                  <div className="indie-pulse">
                    <Music className="w-20 h-20 mx-auto mb-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-2xl text-muted-foreground mb-4">
                    Sheet music coming soon
                  </p>
                  <p className="text-muted-foreground text-lg">
                    We're working on beautiful sheet music generation for your chord progressions
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}