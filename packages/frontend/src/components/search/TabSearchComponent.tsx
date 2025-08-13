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
import { useBackendTabSearch } from '../../hooks/useBackendTabSearch';
import { useSearchSuggestions } from '../../hooks/useTabSearch';
import { TabData } from '../../scraping/BaseScraper';
import { tabApi } from '../../services/api';

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

  const tabSearch = useBackendTabSearch();

  const suggestions = useSearchSuggestions();

  useEffect(() => {
    if (autoGenerateSuggestions && audioData && isListening) {
      suggestions.generateFromAudio(audioData);
    }
  }, [audioData, isListening, autoGenerateSuggestions]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await tabSearch.searchTabs(searchQuery, 50);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    tabSearch.searchTabs(suggestion, 50);
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
            {tabSearch.state.hasSearched && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{tabSearch.state.totalResults} results found</span>
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
            <Card key={tab.id} className="rounded-3xl indie-shadow hover:indie-shadow-lg transition-all duration-300 cursor-pointer" onClick={() => onTabSelect?.(tab as any)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{tab.title}</h3>
                      <Badge variant="outline" className="text-xs px-2 py-1 rounded-lg">
                        {tab.source}
                      </Badge>
                    </div>
                    
                    <p className="text-lg text-muted-foreground mb-3">by {tab.artist}</p>
                    
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
                        onTabSelect?.(tab as any);
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
              <Button onClick={() => tabSearch.searchTabs('wonderwall', 10)}>
                Try "Wonderwall"
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