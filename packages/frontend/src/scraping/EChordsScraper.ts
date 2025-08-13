import { BaseScraper, ScrapingResult, ScrapingOptions, TabData, SongInfo, ChordInfo, TabSection } from './BaseScraper';

export class EChordsScraper extends BaseScraper {
  private readonly searchUrl = 'https://www.e-chords.com/search';
  private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor() {
    super('E-Chords', 'https://www.e-chords.com', 15); // 15 requests per minute
  }

  async search(query: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    try {
      return await this.queueRequest(() => this.performSearch(query, options));
    } catch (error) {
      return this.handleScrapingError(error, 'search');
    }
  }

  async getTabById(id: string): Promise<ScrapingResult> {
    try {
      return await this.queueRequest(() => this.performGetTab(id));
    } catch (error) {
      return this.handleScrapingError(error, 'getTabById');
    }
  }

  private async performSearch(query: string, options: ScrapingOptions): Promise<ScrapingResult> {
    try {
      // E-Chords search is more permissive than Ultimate Guitar
      console.log(`🎸 [E-CHORDS] Searching for: ${query}`);
      
      const searchParams = new URLSearchParams({
        'query': query.trim(),
        'type': 'song'
      });

      // For demo purposes, providing enhanced mock data that simulates E-Chords results
      // In a real implementation, you would make HTTP requests to e-chords.com
      const mockResults = await this.generateEChordsResults(query, options);
      
      return {
        success: true,
        data: mockResults
      };
    } catch (error) {
      console.error('🎸 [E-CHORDS] Search error:', error);
      return this.handleScrapingError(error, 'search');
    }
  }

  private async performGetTab(id: string): Promise<ScrapingResult> {
    try {
      const tabData = await this.getEChordsTabData(id);
      
      return {
        success: true,
        data: tabData ? [tabData] : []
      };
    } catch (error) {
      return this.handleScrapingError(error, 'getTabById');
    }
  }

  private async generateEChordsResults(query: string, options: ScrapingOptions): Promise<TabData[]> {
    // Simulate network delay
    await this.sleep(400 + Math.random() * 800);

    const eChordsLibrary = [
      { title: "Wonderwall", artist: "Oasis", album: "(What's the Story) Morning Glory?", rating: 4.7, difficulty: 'beginner' },
      { title: "Stairway to Heaven", artist: "Led Zeppelin", album: "Led Zeppelin IV", rating: 4.9, difficulty: 'intermediate' },
      { title: "Hotel California", artist: "Eagles", album: "Hotel California", rating: 4.8, difficulty: 'advanced' },
      { title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: "Appetite for Destruction", rating: 4.6, difficulty: 'advanced' },
      { title: "Blackbird", artist: "The Beatles", album: "The Beatles (White Album)", rating: 4.8, difficulty: 'intermediate' },
      { title: "Tears in Heaven", artist: "Eric Clapton", album: "Rush (Soundtrack)", rating: 4.5, difficulty: 'beginner' },
      { title: "Wish You Were Here", artist: "Pink Floyd", album: "Wish You Were Here", rating: 4.7, difficulty: 'intermediate' },
      { title: "Good Riddance (Time of Your Life)", artist: "Green Day", album: "Nimrod", rating: 4.4, difficulty: 'beginner' },
      { title: "More Than Words", artist: "Extreme", album: "Pornograffitti", rating: 4.6, difficulty: 'intermediate' },
      { title: "Dust in the Wind", artist: "Kansas", album: "Point of Know Return", rating: 4.3, difficulty: 'intermediate' },
      { title: "Hallelujah", artist: "Leonard Cohen", album: "Various Positions", rating: 4.9, difficulty: 'beginner' },
      { title: "Mad World", artist: "Gary Jules", album: "Donnie Darko Soundtrack", rating: 4.4, difficulty: 'beginner' },
      { title: "Hurt", artist: "Johnny Cash", album: "American IV: The Man Comes Around", rating: 4.7, difficulty: 'beginner' },
      { title: "Zombie", artist: "The Cranberries", album: "No Need to Argue", rating: 4.5, difficulty: 'intermediate' },
      { title: "Creep", artist: "Radiohead", album: "Pablo Honey", rating: 4.6, difficulty: 'beginner' }
    ];

    // Filter based on query
    let filteredSongs = eChordsLibrary;
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      filteredSongs = eChordsLibrary.filter(song => 
        song.title.toLowerCase().includes(queryLower) ||
        song.artist.toLowerCase().includes(queryLower)
      );
    }

    const maxResults = options.maxResults || 20;
    return filteredSongs.slice(0, maxResults).map((song, index) => {
      const id = `echords_${song.artist.replace(/\s+/g, '_').toLowerCase()}_${song.title.replace(/\s+/g, '_').toLowerCase()}_${index}`;
      const chords = this.getEChordsProgression(song.title);
      
      return {
        id,
        song: {
          title: song.title,
          artist: song.artist,
          album: song.album
        },
        chords,
        sections: this.generateEChordsSections(song.title, chords),
        tabContent: this.generateEChordsTabContent(song.title, song.artist, chords),
        source: this.siteName,
        sourceUrl: `${this.baseUrl}/chords/${song.artist.replace(/\s+/g, '-').toLowerCase()}/${song.title.replace(/\s+/g, '-').toLowerCase()}`,
        rating: song.rating,
        difficulty: song.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tuning: 'Standard (E A D G B E)',
        capo: this.getEChordsCapo(song.title),
        type: 'chords',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
  }

  private async getEChordsTabData(id: string): Promise<TabData | null> {
    // Simulate API delay
    await this.sleep(300 + Math.random() * 500);

    // Extract song info from ID
    const [, artist, title] = id.split('_');
    
    if (!artist || !title) return null;

    const songTitle = title.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const songArtist = artist.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const chords = this.getEChordsProgression(songTitle);

    return {
      id,
      song: {
        title: songTitle,
        artist: songArtist,
        album: "Sample Album"
      },
      chords,
      sections: this.generateEChordsSections(songTitle, chords),
      tabContent: this.generateEChordsTabContent(songTitle, songArtist, chords),
      source: this.siteName,
      sourceUrl: `${this.baseUrl}/chords/${songArtist.toLowerCase()}/${songTitle.toLowerCase()}`,
      rating: 4.2 + Math.random() * 0.6,
      difficulty: this.getEChordsDifficulty(songTitle),
      tuning: 'Standard (E A D G B E)',
      capo: this.getEChordsCapo(songTitle),
      type: 'chords',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getEChordsProgression(songTitle: string): ChordInfo[] {
    const eChordsProgressions: Record<string, string[]> = {
      'Wonderwall': ['Em7', 'G', 'D', 'C', 'Am7', 'F'],
      'Stairway to Heaven': ['Am', 'C', 'D', 'F', 'G', 'Em', 'Dm'],
      'Hotel California': ['Em', 'B7', 'D', 'A', 'C', 'G', 'Am', 'F'],
      'Sweet Child O\' Mine': ['D', 'C', 'G', 'F', 'A', 'Bb', 'Dm'],
      'Blackbird': ['G', 'Am', 'Em', 'D', 'C', 'F', 'Bb'],
      'Tears in Heaven': ['A', 'E', 'F#m', 'D', 'Dm', 'C', 'G'],
      'Wish You Were Here': ['G', 'Em', 'A', 'C', 'D', 'Am', 'F'],
      'Good Riddance (Time of Your Life)': ['G', 'C', 'D', 'Em', 'Am'],
      'More Than Words': ['G', 'C', 'Am', 'D', 'Em', 'F', 'B7'],
      'Dust in the Wind': ['C', 'Am', 'F', 'G', 'Dm', 'Em'],
      'Hallelujah': ['C', 'Am', 'F', 'G', 'Em', 'Dm'],
      'Mad World': ['Em', 'A', 'Em', 'C', 'G', 'D'],
      'Hurt': ['Am', 'C', 'D', 'G', 'F', 'Em'],
      'Zombie': ['Em', 'C', 'G', 'D', 'Am'],
      'Creep': ['G', 'B', 'C', 'Cm', 'D']
    };

    const chordNames = eChordsProgressions[songTitle] || ['G', 'C', 'D', 'Em'];
    
    return chordNames.map(name => ({
      name,
      fingering: this.getDefaultFingering(name),
      difficulty: this.getChordDifficulty(name)
    }));
  }

  private getEChordsDifficulty(songTitle: string): 'beginner' | 'intermediate' | 'advanced' {
    const difficulties: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'Wonderwall': 'beginner',
      'Good Riddance (Time of Your Life)': 'beginner',
      'Tears in Heaven': 'beginner',
      'Hallelujah': 'beginner',
      'Mad World': 'beginner',
      'Hurt': 'beginner',
      'Creep': 'beginner',
      'Dust in the Wind': 'intermediate',
      'Stairway to Heaven': 'intermediate',
      'Blackbird': 'intermediate',
      'Wish You Were Here': 'intermediate',
      'More Than Words': 'intermediate',
      'Zombie': 'intermediate',
      'Sweet Child O\' Mine': 'advanced',
      'Hotel California': 'advanced'
    };
    
    return difficulties[songTitle] || 'intermediate';
  }

  private getEChordsCapo(songTitle: string): number {
    const capoPositions: Record<string, number> = {
      'Wonderwall': 2,
      'Tears in Heaven': 3,
      'Hallelujah': 0,
      'Mad World': 0,
      'Hurt': 0,
      'Dust in the Wind': 3,
      'Good Riddance (Time of Your Life)': 0,
      'Creep': 7
    };
    
    return capoPositions[songTitle] || 0;
  }

  private getChordDifficulty(chordName: string): 'beginner' | 'intermediate' | 'advanced' {
    const beginnerChords = ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em'];
    const intermediateChords = ['F', 'B', 'Gm', 'C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Em7', 'Am7', 'F#m'];
    
    if (beginnerChords.includes(chordName)) return 'beginner';
    if (intermediateChords.includes(chordName)) return 'intermediate';
    return 'advanced';
  }

  private generateEChordsSections(title: string, chords: ChordInfo[]): TabSection[] {
    return [
      {
        name: 'Intro',
        content: chords.slice(0, 2).map(c => c.name).join(' - '),
        chords: chords.slice(0, 2)
      },
      {
        name: 'Verse',
        content: chords.slice(0, 4).map(c => c.name).join(' - '),
        chords: chords.slice(0, 4)
      },
      {
        name: 'Chorus',
        content: chords.map(c => c.name).join(' - '),
        chords: chords
      },
      {
        name: 'Bridge',
        content: chords.slice(2, 6).map(c => c.name).join(' - '),
        chords: chords.slice(2, 6)
      }
    ];
  }

  private generateEChordsTabContent(title: string, artist: string, chords: ChordInfo[]): string {
    const lyricsMap: Record<string, { verse: string, chorus: string }> = {
      'Wonderwall': {
        verse: 'Today is gonna be the day that they\'re gonna throw it back to you',
        chorus: 'Because maybe, you\'re gonna be the one that saves me'
      },
      'Hallelujah': {
        verse: 'I\'ve heard there was a secret chord, that David played and it pleased the Lord',
        chorus: 'Hallelujah, Hallelujah, Hallelujah, Hallelujah'
      },
      'Mad World': {
        verse: 'All around me are familiar faces, worn out places, worn out faces',
        chorus: 'Mad world, mad world, mad world'
      }
    };

    const lyrics = lyricsMap[title] || {
      verse: `Sample verse lyrics for ${title} by ${artist}`,
      chorus: `Sample chorus lyrics for ${title}`
    };

    return `[Intro]
${chords.slice(0, 2).map(c => c.name).join('    ')}

[Verse 1]
${chords.slice(0, 4).map(c => c.name).join('    ')}
${lyrics.verse}
${chords.slice(0, 4).map(c => c.name).join('    ')}
More verse lyrics here

[Chorus]
${chords.map(c => c.name).join('  ')}
${lyrics.chorus}
${chords.map(c => c.name).join('  ')}
Chorus continuation

[Chord Diagrams]
${chords.map(chord => `${chord.name}: ${chord.fingering}`).join('\n')}

[Song Info]
Artist: ${artist}
Song: ${title}
Source: E-Chords.com
Tuning: Standard (E A D G B E)${this.getEChordsCapo(title) > 0 ? `\nCapo: ${this.getEChordsCapo(title)}` : ''}`;
  }

  // E-Chords specific rate limiting
  protected async enforceRateLimit(): Promise<void> {
    await super.enforceRateLimit();
    // E-Chords is more lenient, but still be respectful
    await this.sleep(50 + Math.random() * 100);
  }
}