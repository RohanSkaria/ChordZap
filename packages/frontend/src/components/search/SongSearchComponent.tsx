import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Clock, User } from 'lucide-react';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { songApi } from '../../services/api';

interface Song {
  _id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  albumArt?: string;
  chords: Array<{
    name: string;
    fingering: string;
    fret: number;
  }>;
  detectionCount: number;
  source?: string;
}

interface SongSearchComponentProps {
  onSongSelect: (song: Song) => void;
  placeholder?: string;
  className?: string;
}

export function SongSearchComponent({ 
  onSongSelect, 
  placeholder = "Search for songs...",
  className = ""
}: SongSearchComponentProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await songApi.searchSongs(query, 8);
        setResults(response.songs || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSongSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSongSelect = (song: Song) => {
    setQuery(`${song.title} - ${song.artist}`);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSongSelect(song);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">{part}</span> : 
        part
    );
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="pl-10 pr-4"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto border shadow-lg">
          <CardContent className="p-0">
            {results.map((song, index) => (
              <div
                key={song._id}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted ${
                  index === selectedIndex ? 'bg-muted' : ''
                } ${index !== results.length - 1 ? 'border-b' : ''}`}
                onClick={() => handleSongSelect(song)}
              >
                <div className="flex-shrink-0">
                  {song.albumArt ? (
                    <img 
                      src={song.albumArt} 
                      alt={`${song.album} cover`}
                      className="h-10 w-10 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`flex h-10 w-10 items-center justify-center rounded bg-muted ${song.albumArt ? 'hidden' : ''}`}>
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {highlightMatch(song.title, query)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {highlightMatch(song.artist, query)}
                    </span>
                    {song.duration && (
                      <>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{song.duration}</span>
                      </>
                    )}
                  </div>
                  {song.album && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {highlightMatch(song.album, query)}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {song.chords.length} chords
                  </Badge>
                  {song.detectionCount > 1 && (
                    <div className="text-xs text-muted-foreground">
                      {song.detectionCount} plays
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 border shadow-lg">
          <CardContent className="p-4 text-center text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No songs found for "{query}"</p>
            <p className="text-xs mt-1">Try searching for a different song or artist</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SongSearchComponent;