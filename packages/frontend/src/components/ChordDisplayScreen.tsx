import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ArrowLeft, Download, Share, Play, Music, Star, Guitar, Hash, Loader2, AlertCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { tabApi } from '../services/api';
import React from 'react';

interface TabData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  rating?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tuning?: string;
  capo?: number;
  type: 'chords' | 'tabs' | 'bass' | 'ukulele';
  chords: Array<{
    name: string;
    fingering: string;
    fret?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }>;
  sections: Array<{
    name: string;
    content: string;
    chords: Array<{
      name: string;
      fingering: string;
      fret?: number;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
    }>;
  }>;
  tabContent: string;
  source: string;
  sourceUrl: string;
}

export function ChordDisplayScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { songId } = useParams();
  
  // State management for real API data
  const [tabData, setTabData] = useState<TabData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTabs, setShowTabs] = useState(false);
  const [selectedChord, setSelectedChord] = useState(0);

  // Defensive check for chord data
  const hasChords = tabData?.chords && tabData.chords.length > 0;
  const safeSelectedChord = hasChords ? Math.min(selectedChord, tabData.chords.length - 1) : 0;

  // Fetch tab data from API
  useEffect(() => {
    const fetchTabData = async () => {
      if (!songId) {
        // Try to get data from navigation state as fallback
        const locationData = location.state;
        if (locationData && locationData.id) {
          try {
            setIsLoading(true);
            setError(null);
            const response = await tabApi.getTab(locationData.id);
            if (response.success && response.tab) {
              setTabData(response.tab);
            } else {
              setError('Failed to load tab data');
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tab data');
          } finally {
            setIsLoading(false);
          }
        } else {
          setError('No song ID or data provided');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await tabApi.getTab(songId);
        if (response.success && response.tab) {
          setTabData(response.tab);
        } else {
          setError('Tab not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tab data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTabData();
  }, [songId, location.state]);

  // generates chord diagrams from fingering patterns
  const getChordDiagram = (fingering: string, chordName: string) => {
    const strings = 6;
    const frets = 4;
    const positions = fingering.split('').map(pos => pos === 'x' ? null : parseInt(pos));
    const stringSpacing = 20;
    const fretHeight = 32;
    
    return (
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 w-[160px] indie-shadow">
        <div className="text-center font-bold mb-3 text-black text-base">{chordName}</div>
        <div className="relative mx-auto" style={{ width: `${(strings - 1) * stringSpacing + 4}px`, height: `${frets * fretHeight + 20}px` }}>
          
          {/* Fret lines */}
          {Array.from({ length: frets + 1 }).map((_, fret) => (
            <div 
              key={`fret-${fret}`} 
              className="absolute border-t-2 border-black w-full"
              style={{ 
                top: `${fret * fretHeight}px`,
                borderTopWidth: fret === 0 ? '3px' : '2px'
              }}
            />
          ))}
          
          {/* String lines */}
          {Array.from({ length: strings }).map((_, string) => (
            <div 
              key={`string-${string}`}
              className="absolute border-l-2 border-gray-600 h-full"
              style={{ 
                left: `${string * stringSpacing}px`,
                top: '0px',
                height: `${frets * fretHeight}px`
              }}
            />
          ))}
          
          {/* Finger positions and markers */}
          {positions.map((position, string) => {
            if (position === null) {
              // X marker for muted strings
              return (
                <div
                  key={`muted-${string}`}
                  className="absolute text-red-500 font-bold text-lg"
                  style={{
                    left: `${string * stringSpacing - 6}px`,
                    top: '-24px'
                  }}
                >
                  ×
                </div>
              );
            } else if (position === 0) {
              // Open string marker
              return (
                <div
                  key={`open-${string}`}
                  className="absolute w-4 h-4 border-2 border-green-600 bg-white rounded-full"
                  style={{
                    left: `${string * stringSpacing - 8}px`,
                    top: '-26px'
                  }}
                />
              );
            } else {
              // Finger dot on fret
              return (
                <div
                  key={`fret-${string}-${position}`}
                  className="absolute w-5 h-5 chord-dot rounded-full"
                  style={{
                    left: `${string * stringSpacing - 10}px`,
                    top: `${position * fretHeight - fretHeight/2 - 10}px`
                  }}
                />
              );
            }
          })}
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col indie-gradient">
        <header className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate('/listen')} className="mr-4 rounded-2xl">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Loading Tab...</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-xl text-muted-foreground">Loading chord data...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !tabData) {
    return (
      <div className="min-h-screen flex flex-col indie-gradient">
        <header className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate('/listen')} className="mr-4 rounded-2xl">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Error Loading Tab</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-xl text-foreground mb-2">Failed to load tab data</p>
            <p className="text-muted-foreground mb-6">{error || 'Tab not found'}</p>
            <Button onClick={() => navigate('/listen')} className="rounded-2xl">
              Go Back to Search
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col indie-gradient">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/listen')} className="mr-4 rounded-2xl">
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
                    src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center"
                    alt={`${tabData.album || 'Album'} cover`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl font-bold mb-3 text-foreground">{tabData.title}</h2>
                  <p className="text-2xl text-muted-foreground mb-6">by {tabData.artist}</p>
                  {tabData.album && <p className="text-muted-foreground mb-6 text-lg">Album: {tabData.album}</p>}
                  <div className="flex items-center gap-6 flex-wrap">
                    {tabData.rating && (
                      <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                        <Star className="w-4 h-4 mr-2" />
                        {tabData.rating.toFixed(1)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                      <Guitar className="w-4 h-4 mr-2" />
                      {hasChords ? `${tabData.chords.length} Chords` : 'No Chords'}
                    </Badge>
                    {tabData.difficulty && (
                      <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                        <Hash className="w-4 h-4 mr-2" />
                        {tabData.difficulty}
                      </Badge>
                    )}
                    {tabData.capo && tabData.capo > 0 && (
                      <Badge variant="secondary" className="text-base px-4 py-2 rounded-xl">
                        <Music className="w-4 h-4 mr-2" />
                        Capo {tabData.capo}
                      </Badge>
                    )}
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
                  {hasChords ? (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                      {tabData.chords.map((chord: any, index: number) => (
                        <Button
                          key={index}
                          variant={safeSelectedChord === index ? "default" : "outline"}
                          className={`h-24 flex flex-col items-center justify-center transition-all duration-300 rounded-2xl border-2 ${
                            safeSelectedChord === index 
                              ? 'bg-chord-selected scale-105 indie-shadow-lg' 
                              : 'hover:border-primary/50 hover:scale-102'
                          }`}
                          onClick={() => setSelectedChord(index)}
                        >
                          <span className="font-bold text-xl">{chord.name || 'Unknown'}</span>
                          <span className="text-xs opacity-70 font-mono">{chord.fingering || 'N/A'}</span>
                          {chord.difficulty && (
                            <span className="text-xs text-muted-foreground mt-1 capitalize">
                              {chord.difficulty}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Guitar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-xl text-muted-foreground mb-2">No chords detected</p>
                      <p className="text-muted-foreground">This tab may not contain chord information</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* song structure */}
              {tabData.sections && tabData.sections.length > 0 && (
                <Card className="rounded-3xl indie-shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">Song Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {tabData.sections.map((section, sectionIndex) => (
                        <div key={sectionIndex}>
                          <h4 className="font-semibold mb-4 text-xl text-foreground flex items-center gap-2">
                            <Music className="w-5 h-5" />
                            {section.name}
                          </h4>
                          <div className="flex gap-3 flex-wrap">
                            {section.chords.map((chord, chordIndex) => (
                              <Badge 
                                key={chordIndex} 
                                className="text-base px-4 py-2 bg-primary text-primary-foreground rounded-2xl font-semibold cursor-pointer hover:bg-primary/90 transition-colors"
                                onClick={() => {
                                  const mainChordIndex = tabData.chords.findIndex(c => c.name === chord.name);
                                  if (mainChordIndex !== -1) setSelectedChord(mainChordIndex);
                                }}
                              >
                                {chord.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="diagram" className="space-y-6">
              {hasChords ? (
                <>
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* big chord diagram */}
                    <Card className="rounded-3xl indie-shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-3">
                          <Guitar className="w-5 h-5" />
                          {tabData.chords[safeSelectedChord]?.name || 'Unknown'} Chord
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex justify-center py-8">
                        <div className="scale-150 transform">
                          {getChordDiagram(tabData.chords[safeSelectedChord]?.fingering || 'x32010', tabData.chords[safeSelectedChord]?.name || 'Unknown')}
                        </div>
                      </CardContent>
                    </Card>

                    {/* chord details */}
                    <Card className="rounded-3xl indie-shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl">Chord Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <Label className="text-base font-medium">Fingering Position</Label>
                          <p className="text-3xl font-mono font-bold mt-2 text-foreground">
                            {tabData.chords[safeSelectedChord]?.fingering || 'N/A'}
                          </p>
                        </div>
                        {tabData.chords[safeSelectedChord]?.difficulty && (
                          <div>
                            <Label className="text-base font-medium">Difficulty Level</Label>
                            <div className="mt-2">
                              <Badge 
                                className={`text-sm px-3 py-1 rounded-xl ${
                                  tabData.chords[safeSelectedChord]?.difficulty === 'beginner' 
                                    ? 'bg-green-100 text-green-800' 
                                    : tabData.chords[safeSelectedChord]?.difficulty === 'intermediate'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <Star className="w-3 h-3 mr-1" />
                                {tabData.chords[safeSelectedChord]?.difficulty}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {tabData.chords[safeSelectedChord]?.fret && (
                          <div>
                            <Label className="text-base font-medium">Starting Fret</Label>
                            <p className="text-lg mt-2 text-muted-foreground">
                              Fret {tabData.chords[safeSelectedChord]?.fret}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-base font-medium">Practice Tips</Label>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
                      <CardTitle className="text-xl flex items-center gap-3">
                        <Guitar className="w-5 h-5" />
                        All Chord Diagrams ({tabData.chords.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {tabData.chords.map((chord: any, index: number) => (
                          <div
                            key={index}
                            className={`cursor-pointer transition-all duration-300 rounded-2xl ${
                              safeSelectedChord === index ? 'ring-4 ring-primary/30 scale-105' : 'hover:ring-2 hover:ring-primary/20 hover:scale-102'
                            }`}
                            onClick={() => setSelectedChord(index)}
                          >
                            {getChordDiagram(chord.fingering || 'x32010', chord.name || 'Unknown')}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-20">
                  <Guitar className="w-20 h-20 mx-auto mb-6 text-muted-foreground/50" />
                  <p className="text-2xl text-muted-foreground mb-4">No chord diagrams available</p>
                  <p className="text-muted-foreground">This tab doesn't contain chord fingering information</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sheet">
              <Card className="rounded-3xl indie-shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <Music className="w-6 h-6" />
                    Sheet Music
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tabData.tabContent ? (
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 max-h-96 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none text-black"
                        dangerouslySetInnerHTML={{ __html: tabData.tabContent }}
                        style={{
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="indie-pulse">
                        <Music className="w-20 h-20 mx-auto mb-6 text-muted-foreground/60" />
                      </div>
                      <p className="text-2xl text-muted-foreground mb-4">
                        No sheet music available
                      </p>
                      <p className="text-muted-foreground text-lg">
                        Sheet music content not found for this tab
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}