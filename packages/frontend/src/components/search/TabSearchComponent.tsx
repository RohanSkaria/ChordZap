import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Search, 
  Music, 
  Guitar, 
  Star, 
  Clock, 
  Filter, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Zap,
  ExternalLink
} from 'lucide-react';
import { cn } from '../ui/utils';
import { useTabSearch, useSearchSuggestions } from '../../hooks/useTabSearch';
import { TabData } from '../../scraping/BaseScraper';

interface TabSearchComponentProps {
  className?: string;
  onTabSelect?: (tab: TabData) => void;
  audioData?: Float32Array;
  isListening?: boolean;
  autoGenerateSuggestions?: boolean;
}

export const TabSearchComponent: React.FC<TabSearchComponentProps> = ({
  className,
  onTabSelect,
  audioData,
  isListening = false,
  autoGenerateSuggestions = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showScraperSettings, setShowScraperSettings] = useState(false);

  const tabSearch = useTabSearch({
    maxResults: 50,
    instrumentType: 'guitar',
    timeout: 30000
  });

  const suggestions = useSearchSuggestions();

  useEffect(() => {
    if (autoGenerateSuggestions && audioData && isListening) {
      suggestions.generateFromAudio(audioData);
    }
  }, [audioData, isListening, autoGenerateSuggestions]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await tabSearch.search(searchQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    tabSearch.search(suggestion);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return null;
    
    const stars = Math.round(rating);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-4 h-4",
              i < stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className={cn("w-full max-w-6xl mx-auto space-y-6", className)}>
      {/* Search Header */}
      <Card className="rounded-3xl indie-shadow">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Music className="w-6 h-6 text-primary" />
            Find Guitar Tabs & Chords
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for songs, artists, or chord progressions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 rounded-2xl border-2"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={tabSearch.state.isSearching || !searchQuery.trim()}
              className="rounded-2xl"
              size="lg"
            >
              {tabSearch.state.isSearching ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Audio Suggestions */}
          {suggestions.suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  {suggestions.isGenerating ? 'Analyzing audio...' : 'Suggested searches'}
                </Label>
                {suggestions.isGenerating && (
                  <Zap className="w-4 h-4 text-primary animate-pulse" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion.query)}
                    className="rounded-xl border-2"
                  >
                    {suggestion.query}
                    <Badge 
                      variant="secondary" 
                      className="ml-2 text-xs px-2"
                    >
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-2xl border-2"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScraperSettings(!showScraperSettings)}
                className="rounded-2xl border-2"
              >
                <Settings className="w-4 h-4 mr-2" />
                Sources
              </Button>
            </div>
            
            {tabSearch.state.hasSearched && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{tabSearch.state.totalResults} results</span>
                <span>in {tabSearch.state.searchTime}ms</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={tabSearch.clearResults}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="rounded-3xl indie-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Minimum Rating</Label>
                <Select
                  value={String(tabSearch.filters.minRating || 0)}
                  onValueChange={(value) => tabSearch.setFilters({ minRating: Number(value) })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Max Difficulty</Label>
                <Select
                  value={tabSearch.filters.maxDifficulty || 'advanced'}
                  onValueChange={(value: any) => tabSearch.setFilters({ maxDifficulty: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner only</SelectItem>
                    <SelectItem value="intermediate">Up to Intermediate</SelectItem>
                    <SelectItem value="advanced">All levels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                <Select
                  value={tabSearch.filters.sortBy || 'rating'}
                  onValueChange={(value: any) => tabSearch.setFilters({ sortBy: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Order</Label>
                <Select
                  value={tabSearch.filters.sortOrder || 'desc'}
                  onValueChange={(value: any) => tabSearch.setFilters({ sortOrder: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-chords"
                  checked={tabSearch.filters.requireChords || false}
                  onCheckedChange={(checked) => tabSearch.setFilters({ requireChords: checked })}
                />
                <Label htmlFor="require-chords">Must have chords</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="require-tabs"
                  checked={tabSearch.filters.requireTabs || false}
                  onCheckedChange={(checked) => tabSearch.setFilters({ requireTabs: checked })}
                />
                <Label htmlFor="require-tabs">Must have tabs</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scraper Settings */}
      {showScraperSettings && (
        <Card className="rounded-3xl indie-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Tab Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tabSearch.scraperInfo.map((scraper) => (
                <div key={scraper.name} className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={scraper.isActive}
                      onCheckedChange={(checked) => tabSearch.setScraperActive(scraper.name.toLowerCase().replace(' ', '-'), checked)}
                    />
                    <div>
                      <div className="font-medium">{scraper.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Success rate: {Math.round(scraper.successRate * 100)}% • 
                        Avg response: {Math.round(scraper.averageResponseTime)}ms
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={scraper.rateLimitStatus === 'ok' ? 'default' : 'destructive'}
                      className="rounded-xl"
                    >
                      {scraper.rateLimitStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {tabSearch.state.isSearching && (
        <Card className="rounded-3xl indie-shadow">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Searching for tabs...</h3>
              <p className="text-muted-foreground">
                Searching across multiple sources for "{tabSearch.state.currentQuery}"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {tabSearch.state.errors.length > 0 && (
        <Alert className="border-2 border-destructive/20 bg-destructive/5 rounded-3xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {tabSearch.state.errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {tabSearch.state.results.length > 0 && (
        <div className="space-y-4">
          {tabSearch.state.results.map((tab, index) => (
            <Card key={tab.id} className="rounded-3xl indie-shadow hover:indie-shadow-lg transition-all duration-300 cursor-pointer" onClick={() => onTabSelect?.(tab)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{tab.song.title}</h3>
                      <Badge variant="outline" className="text-xs px-2 py-1 rounded-lg">
                        {tab.source}
                      </Badge>
                    </div>
                    
                    <p className="text-lg text-muted-foreground mb-3">by {tab.song.artist}</p>
                    
                    <div className="flex items-center gap-4 mb-4">
                      {renderStarRating(tab.rating)}
                      
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", getDifficultyColor(tab.difficulty))}></div>
                        <span className="text-sm capitalize">{tab.difficulty || 'intermediate'}</span>
                      </div>
                      
                      <Badge variant="secondary" className="text-xs px-3 py-1 rounded-xl">
                        <Guitar className="w-3 h-3 mr-1" />
                        {tab.chords.length} chords
                      </Badge>
                      
                      {tab.capo && tab.capo > 0 && (
                        <Badge variant="secondary" className="text-xs px-3 py-1 rounded-xl">
                          Capo {tab.capo}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {tab.chords.slice(0, 8).map((chord, i) => (
                        <Badge key={i} variant="outline" className="text-xs px-2 py-1 rounded-lg">
                          {chord.name}
                        </Badge>
                      ))}
                      {tab.chords.length > 8 && (
                        <Badge variant="outline" className="text-xs px-2 py-1 rounded-lg">
                          +{tab.chords.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-xl border-2"
                    >
                      <a href={tab.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Original
                      </a>
                    </Button>
                    
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabSelect?.(tab);
                      }}
                    >
                      <Music className="w-4 h-4 mr-2" />
                      View Chords
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {tabSearch.state.hasSearched && tabSearch.state.results.length === 0 && !tabSearch.state.isSearching && (
        <Card className="rounded-3xl indie-shadow">
          <CardContent className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-6 text-muted-foreground/60" />
            <h3 className="text-2xl font-semibold mb-4">No tabs found</h3>
            <p className="text-muted-foreground text-lg mb-6">
              Try searching with different keywords or check your filters
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowFilters(true)}>
                Adjust Filters
              </Button>
              <Button onClick={suggestions.generateFromHistory}>
                Try Popular Songs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};