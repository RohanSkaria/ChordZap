import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { ArrowLeft, Share, Play, Music, Star, Guitar, Hash, Loader2, AlertCircle, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { tabApi, songApi } from '../services/api';
import { SongSearchComponent } from './search/SongSearchComponent';

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
  const [selectedChord, setSelectedChord] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);

  // Defensive check for chord data
  const hasChords = tabData?.chords && tabData.chords.length > 0;
  const safeSelectedChord = hasChords ? Math.min(selectedChord, tabData.chords.length - 1) : 0;

  // Fetch tab data from API
  useEffect(() => {
    const fetchTabData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let title = 'Unknown Song';
        let artist = 'Unknown Artist';

        // Try to get song info from navigation state first
        const locationData = location.state;
        if (locationData && locationData.title && locationData.artist) {
          title = locationData.title;
          artist = locationData.artist;
        } else if (songId) {
          title = 'Wonderwall';
          artist = 'Oasis';
        } else {
          title = 'Wonderwall';
          artist = 'Oasis';
        }

        // Use the new API to get tab by song title and artist (with Wonderwall fallback)
        const response = await tabApi.getTabBySong(title, artist);
        
        if (response.success && response.tab) {
          setTabData(response.tab);
          
          if (response.isFallback) {
            console.log(`Using Wonderwall fallback data instead of "${title}" by ${artist}`);
          }
        } else {
          setError('No tab data available');
        }
      } catch (err) {
        console.error('🎵 [CHORD DISPLAY] Error loading tab data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tab data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTabData();
  }, [songId, location.state]);

  // Load popular songs for quick access
  useEffect(() => {
    const loadPopularSongs = async () => {
      try {
        const response = await songApi.getPopularSongs(5);
        setPopularSongs(response.songs || []);
      } catch (error) {
        console.error('Failed to load popular songs:', error);
      }
    };

    loadPopularSongs();
  }, []);

  // Handle song selection from search
  const handleSongSelect = async (song: any) => {
    console.log(`🎵 [CHORD DISPLAY] Song selected: "${song.title}" by ${song.artist}`);
    
    setIsLoading(true);
    setShowSearch(false);
    setError(null);

    try {
      console.log(`🎸 [CHORD DISPLAY] Fetching full tab data for song ID: ${song._id}`);
      
      // Get full tab data with scraping
      const tabResponse = await songApi.getTabData(song._id);
      
      if (tabResponse.success && tabResponse.tabData) {
        const scrapedData = tabResponse.tabData;
        
        // Convert scraped tab data to TabData format
        const convertedTabData: TabData = {
          id: song._id,
          title: scrapedData.title || song.title,
          artist: scrapedData.artist || song.artist,
          album: scrapedData.album || song.album,
          rating: scrapedData.rating || 4.0,
          difficulty: scrapedData.difficulty || 'intermediate',
          tuning: scrapedData.tuning || 'Standard (E A D G B E)',
          capo: scrapedData.capo || 0,
          type: scrapedData.type || 'chords',
          chords: scrapedData.chords || song.chords || [],
          sections: scrapedData.sections || [{
            name: 'Main',
            content: scrapedData.tabContent || `Chords for ${song.title} by ${song.artist}`,
            chords: scrapedData.chords || song.chords || []
          }],
          tabContent: scrapedData.tabContent || `Chords for ${song.title} by ${song.artist}`,
          source: scrapedData.source || song.source || 'Database',
          sourceUrl: scrapedData.sourceUrl || song.tabUrl || ''
        };

        setTabData(convertedTabData);
        
        if (tabResponse.fallback) {
          console.log(`🎸 [CHORD DISPLAY] ⚠️ Using fallback data for "${song.title}"`);
        } else {
          console.log(`🎸 [CHORD DISPLAY] ✅ Successfully loaded tab data for "${song.title}"`);
        }
      } else {
        throw new Error('Failed to load tab data');
      }
    } catch (error) {
      console.error(`🎸 [CHORD DISPLAY] Error loading tab data:`, error);
      setError('Failed to load detailed tab information');
      
      // Fallback to basic song data
      const basicTabData: TabData = {
        id: song._id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        rating: 4.0,
        difficulty: 'intermediate',
        tuning: 'Standard (E A D G B E)',
        capo: 0,
        type: 'chords',
        chords: song.chords || [],
        sections: [{
          name: 'Main',
          content: `Basic chords for ${song.title} by ${song.artist}`,
          chords: song.chords || []
        }],
        tabContent: `Basic chords for ${song.title} by ${song.artist}`,
        source: song.source || 'Database',
        sourceUrl: song.tabUrl || ''
      };
      
      setTabData(basicTabData);
    } finally {
      setIsLoading(false);
    }
  };

  // Share current URL to clipboard
  const handleShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      alert('Failed to copy URL to clipboard');
    }
  };

  // generates chord diagrams from fingering patterns
  const getChordDiagram = (fingering: string, chordName: string) => {
    const strings = 6;
    const frets = 4;
    const positions = fingering.split('').map(pos => pos === 'x' ? null : parseInt(pos));
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 w-[140px] shadow-sm hover:shadow-md transition-shadow">
        <div className="text-center font-semibold mb-2 text-gray-800 text-sm">{chordName}</div>
        
        {/* X's and O's below the chord label */}
        <div className="flex justify-center mb-4" style={{ width: '80px', margin: '0 auto' }}>
          {positions.map((position, string) => (
            <div 
              key={`indicator-${string}`} 
              className="text-xs font-bold"
              style={{ 
                width: '14px',
                textAlign: 'center',
                color: position === null ? '#dc2626' : position === 0 ? '#16a34a' : 'transparent'
              }}
            >
              {position === null ? '×' : position === 0 ? 'O' : ''}
            </div>
          ))}
        </div>
        
        <div className="relative mx-auto" style={{ width: '80px', height: '100px' }}>
          
          {/* Fret lines */}
          {Array.from({ length: frets + 1 }).map((_, fret) => (
            <div 
              key={`fret-${fret}`} 
              className="absolute border-t border-gray-300 w-full"
              style={{ 
                top: `${fret * 25}px`,
                borderTopWidth: fret === 0 ? '2px' : '1px'
              }}
            />
          ))}
          
          {/* String lines */}
          {Array.from({ length: strings }).map((_, string) => (
            <div 
              key={`string-${string}`}
              className="absolute border-l border-gray-300 h-full"
              style={{ 
                left: `${string * 14}px`,
                top: '0px',
                height: '100px'
              }}
            />
          ))}
          
          {/* Finger positions - only dots on frets, no X's or O's above */}
          {positions.map((position, string) => {
            // Only render finger dots for positions 1 and above
            if (position !== null && position > 0) {
              return (
                <div
                  key={`fret-${string}-${position}`}
                  className="absolute w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center"
                  style={{
                    left: `${string * 14 - 10}px`,
                    top: `${position * 25 - 25/2 - 10}px`
                  }}
                >
                  <span className="text-white text-xs font-bold">{position}</span>
                </div>
              );
            }
            return null;
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
            <p className="text-xl text-foreground mb-2">Scraping tab data...</p>
            <p className="text-muted-foreground">Fetching chord progressions and sheet music from the web</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Music className="w-4 h-4" />
              <span>This may take a few seconds</span>
            </div>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-2xl border-2 px-20 min-w-[400px]"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-4 h-4 mr-2" />
              Find Song
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-2xl border-2"
              onClick={handleShareUrl}
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Search Interface */}
      {showSearch && (
        <div className="px-8 py-4 bg-muted/30 border-b">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Search for Songs</h3>
              <SongSearchComponent 
                onSongSelect={handleSongSelect}
                placeholder="Search by song title or artist..."
                className="max-w-2xl w-full"
              />
            </div>
            
            {popularSongs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Popular Songs:</h4>
                <div className="flex flex-wrap gap-2">
                  {popularSongs.map((song) => (
                    <Button
                      key={song._id}
                      variant="outline"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => handleSongSelect(song)}
                    >
                      {song.title} - {song.artist}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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


          <Tabs defaultValue="sheet" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-2 h-14">
              <TabsTrigger value="sheet" className="rounded-xl text-base">Sheet Music</TabsTrigger>
              <TabsTrigger value="diagram" className="rounded-xl text-base">Interactive Diagrams</TabsTrigger>
              <TabsTrigger value="chords" className="rounded-xl text-base">Chord Progression</TabsTrigger>
            </TabsList>

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
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 min-h-[600px] max-h-[800px] overflow-y-auto">
                      <pre className="text-black text-sm leading-relaxed whitespace-pre-wrap font-mono">
                        {tabData.tabContent}
                      </pre>
                      {tabData.sourceUrl && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Source:</p>
                          <a 
                            href={tabData.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            {tabData.sourceUrl}
                          </a>
                        </div>
                      )}
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
                      <CardContent className="flex justify-center py-12">
                        <div className="scale-125 transform">
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {tabData.chords.map((chord: any, index: number) => (
                          <div
                            key={index}
                            className={`cursor-pointer transition-all duration-300 rounded-xl p-3 ${
                              safeSelectedChord === index 
                                ? 'ring-2 ring-orange-500 bg-orange-50 scale-105' 
                                : 'hover:ring-2 hover:ring-orange-200 hover:bg-orange-25 hover:scale-102'
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}