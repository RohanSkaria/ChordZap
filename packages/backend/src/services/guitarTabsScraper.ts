import axios from 'axios';
import * as cheerio from 'cheerio';
import { Tab, ITab } from '../models/Tab';
import { IChord } from '../models/Song';

export interface ChordInfo {
  name: string;
  fingering: string;
  fret?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface TabSection {
  name: string;
  content: string;
  chords: ChordInfo[];
}

export interface TabData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  rating?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tuning?: string;
  capo?: number;
  type: 'chords' | 'tabs' | 'bass' | 'ukulele';
  chords: ChordInfo[];
  sections: TabSection[];
  tabContent: string;
  source: string;
  sourceUrl: string;
}

export interface SearchResult {
  success: boolean;
  data?: TabData[];
  error?: string;
  totalResults?: number;
}

class GuitarTabsScraper {
  private readonly baseUrl = 'https://www.guitartabs.cc';
  private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private readonly requestDelay = 1000; // 1 second between requests

  // Basic chord fingerings
  private readonly basicChords: Record<string, string> = {
    'C': 'x32010',
    'D': 'xx0232',
    'E': '022100',
    'F': '133211',
    'G': '320003',
    'A': 'x02220',
    'B': 'x24442',
    'Am': 'x02210',
    'Dm': 'xx0231',
    'Em': '022000',
    'Fm': '133111',
    'Gm': '355333',
    'C7': 'x32310',
    'D7': 'xx0212',
    'E7': '020100',
    'F7': '131211',
    'G7': '320001',
    'A7': 'x02020',
    'B7': 'x21202',
    'Em7': '022030',
    'Am7': 'x02010',
    'Dm7': 'xx0211'
  };

  async searchTabs(query: string, maxResults: number = 20): Promise<SearchResult> {
    try {
      console.log(`🎸 [SCRAPER] Searching for: ${query}`);
      
      // First check database for existing tabs
      const existingTabs = await this.searchDatabase(query);
      if (existingTabs.length > 0) {
        console.log(`🎸 [SCRAPER] Found ${existingTabs.length} results in database`);
        return {
          success: true,
          data: existingTabs.slice(0, maxResults),
          totalResults: existingTabs.length
        };
      }

      // If not in database, scrape from GuitarTabs.cc
      console.log(`🎸 [SCRAPER] Not found in database, scraping GuitarTabs.cc...`);
      const scrapedResults = await this.scrapeFromWebsite(query);
      
      // Save scraped results to database
      if (scrapedResults.data && scrapedResults.data.length > 0) {
        await this.saveToDatabase(scrapedResults.data);
      }

      return scrapedResults;
    } catch (error) {
      console.error('🎸 [SCRAPER] Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  async getTabById(tabId: string): Promise<TabData | null> {
    try {
      console.log(`🎸 [SCRAPER] Fetching tab: ${tabId}`);
      
      // Check database first
      const dbTab = await Tab.findById(tabId);
      if (dbTab) {
        console.log(`🎸 [SCRAPER] Found tab in database: ${dbTab.title} by ${dbTab.artist}`);
        return this.convertDbTabToTabData(dbTab);
      }

      console.log(`🎸 [SCRAPER] Tab not found in database: ${tabId}`);
      return null;
    } catch (error) {
      console.error('🎸 [SCRAPER] Tab fetch error:', error);
      return null;
    }
  }

  async getTabByTitleArtist(title: string, artist: string): Promise<TabData | null> {
    try {
      console.log(`🎸 [SCRAPER] Looking up tab: "${title}" by ${artist}`);
      
      // Search database for matching title and artist
      const dbTab = await Tab.findOne({
        title: new RegExp(title, 'i'),
        artist: new RegExp(artist, 'i')
      }).sort({ rating: -1, scrapedAt: -1 });

      if (dbTab) {
        console.log(`🎸 [SCRAPER] Found tab in database: ${dbTab.title} by ${dbTab.artist}`);
        return this.convertDbTabToTabData(dbTab);
      }

      console.log(`🎸 [SCRAPER] Tab not found in database for "${title}" by ${artist}`);
      return null;
    } catch (error) {
      console.error('🎸 [SCRAPER] Tab lookup error:', error);
      return null;
    }
  }

  private async searchDatabase(query: string): Promise<TabData[]> {
    try {
      const searchTerms = query.toLowerCase().split(' ');
      const titleTerm = searchTerms.join('.*');
      
      const tabs = await Tab.find({
        $or: [
          { title: { $regex: titleTerm, $options: 'i' } },
          { artist: { $regex: titleTerm, $options: 'i' } },
          { 
            $and: [
              { title: { $regex: searchTerms[0], $options: 'i' } },
              { artist: { $regex: searchTerms.slice(1).join(' '), $options: 'i' } }
            ]
          }
        ]
      }).sort({ rating: -1, scrapedAt: -1 }).limit(20);

      return tabs.map(tab => this.convertDbTabToTabData(tab));
    } catch (error) {
      console.error('🎸 [SCRAPER] Database search error:', error);
      return [];
    }
  }

  private async scrapeFromWebsite(query: string): Promise<SearchResult> {
    try {
      const searchTerms = query.toLowerCase().split(' ');
      let artist = '';
      let title = '';
      
      if (searchTerms.length >= 2) {
        if (searchTerms.length >= 3) {
          artist = searchTerms.slice(0, 2).join(' ');
          title = searchTerms.slice(2).join(' ');
        } else {
          artist = searchTerms[0];
          title = searchTerms[1];
        }
      } else {
        title = query;
      }

      const urlPatterns = [
        `${this.baseUrl}/tabs/${artist.charAt(0)}/${artist.replace(/\s+/g, '_')}/${title.replace(/\s+/g, '_')}_crd.html`,
        `${this.baseUrl}/tabs/${title.charAt(0)}/${title.replace(/\s+/g, '_')}_crd.html`,
      ];

      for (const url of urlPatterns) {
        try {
          await this.sleep(this.requestDelay);
          const tabData = await this.scrapeTabPage(url);
          if (tabData) {
            console.log(`🎸 [SCRAPER] Successfully scraped: ${tabData.title} by ${tabData.artist}`);
            return {
              success: true,
              data: [tabData],
              totalResults: 1
            };
          }
        } catch (error) {
          console.log(`🎸 [SCRAPER] Failed to scrape ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return await this.performWebSearch(query);
    } catch (error) {
      console.error('🎸 [SCRAPER] Website scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed'
      };
    }
  }

  private async performWebSearch(query: string): Promise<SearchResult> {
    try {
      console.log(`🎸 [SCRAPER] Performing web search for: ${query}`);
      
      return {
        success: true,
        data: [],
        totalResults: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private generatePossibleUrls(title: string, artist: string): string[] {
    const cleanTitle = this.cleanForUrl(title);
    const cleanArtist = this.cleanForUrl(artist);
    const artistFirstLetter = cleanArtist.charAt(0).toLowerCase();
    
    const urls: string[] = [];
    
    urls.push(`https://www.guitartabs.cc/tabs/${artistFirstLetter}/${cleanArtist}/${cleanTitle}_crd.html`);
    urls.push(`https://www.guitartabs.cc/tabs/${artistFirstLetter}/${cleanArtist}/${cleanTitle}_crd_ver_2.html`);
    urls.push(`https://www.guitartabs.cc/tabs/${artistFirstLetter}/${cleanArtist}/${cleanTitle}_crd_ver_3.html`);
    
    const altTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    const altArtist = artist.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    urls.push(`https://www.guitartabs.cc/tabs/${artistFirstLetter}/${altArtist}/${altTitle}_crd.html`);
    
    return urls;
  }

  private cleanForUrl(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async findSongByGeneration(title: string, artist: string): Promise<TabData | null> {
    const possibleUrls = this.generatePossibleUrls(title, artist);
    
    console.log(`🎸 [SCRAPER] Trying ${possibleUrls.length} possible URLs for "${title}" by ${artist}`);
    
    for (const url of possibleUrls) {
      try {
        console.log(`🎸 [SCRAPER] Attempting: ${url}`);
        const result = await this.scrapeTabPage(url);
        if (result) {
          console.log(`🎸 [SCRAPER] ✅ Success with URL: ${url}`);
          return result;
        }
      } catch (error) {
        console.log(`🎸 [SCRAPER] ❌ Failed: ${url}`);

      }
    }
    
    console.log(`🎸 [SCRAPER] No valid URLs found for "${title}" by ${artist}`);
    return null;
  }

  async scrapeTabPage(url: string): Promise<TabData | null> {
    try {
      console.log(`🎸 [SCRAPER] Scraping URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.parseTabPage(response.data, url);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`🎸 [SCRAPER] Tab not found at: ${url}`);
        return null;
      }
      throw error;
    }
  }

  private parseTabPage(html: string, sourceUrl: string): TabData | null {
    try {
      const $ = cheerio.load(html);
      
      // Extract title and artist from page title or meta tags
      const pageTitle = $('title').text().trim();
      const titleMatch = pageTitle.match(/(.+?)\s*-\s*(.+?)\s*(Chords|Tab)/i);
      
      if (!titleMatch) {
        console.warn('🎸 [SCRAPER] Could not parse song title and artist from page');
        return null;
      }

      const artist = titleMatch[1].trim();
      const title = titleMatch[2].trim();
      
      // Find the main tab content
      const tabContent = this.extractTabContent($);
      if (!tabContent) {
        console.warn('🎸 [SCRAPER] Could not find tab content on page');
        return null;
      }

      // Extract chords from HTML chord links
      const chords = this.extractChordsFromHtml($);
      
      // Determine capo position
      const capo = this.extractCapoInfo(tabContent);
      
      // Extract tuning information
      const tuning = this.extractTuning(tabContent) || 'Standard (E A D G B E)';
      
      // Create sections from the content
      const sections = this.createSectionsFromContent(tabContent, chords);

      const tabData: TabData = {
        id: `guitartabs_${artist.replace(/\s+/g, '_').toLowerCase()}_${title.replace(/\s+/g, '_').toLowerCase()}`,
        title,
        artist,
        rating: 4.0, // Default rating since GuitarTabs.cc doesn't always show ratings
        difficulty: this.determineDifficulty(chords),
        tuning,
        capo,
        type: 'chords',
        chords,
        sections,
        tabContent,
        source: 'GuitarTabs.cc',
        sourceUrl
      };

      console.log(`🎸 [SCRAPER] Parsed tab: "${title}" by ${artist} with ${chords.length} chords`);
      return tabData;
    } catch (error) {
      console.error('🎸 [SCRAPER] Error parsing tab page:', error);
      return null;
    }
  }

  private extractTabContent($: cheerio.CheerioAPI): string | null {
    // Look for common tab content containers
    const selectors = [
      'pre',
      '.tab-content',
      '.chord-content',
      'div[style*="font-family: monospace"]',
      'div[style*="courier"]'
    ];

    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content.length > 100) { // Ensure it's substantial content
        return content;
      }
    }

    // If no specific containers found, look for text content that looks like tabs
    const allText = $('body').text();
    const tabLines = allText.split('\n').filter(line => 
      line.includes('|') || 
      line.includes('-') || 
      /[A-G][#b]?(m|maj|min|dim|sus|add|\d)*/.test(line)
    );

    if (tabLines.length > 5) {
      return tabLines.join('\n');
    }

    return null;
  }

  private extractChordsFromContent(content: string): ChordInfo[] {
    const chordRegex = /\b([A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add|\d)*(?:\/[A-G](?:#|b)?)?)\b/g;
    const matches = content.match(chordRegex) || [];
    const uniqueChords = [...new Set(matches)];
    
    return uniqueChords.map(chordName => ({
      name: chordName,
      fingering: this.getChordFingering(chordName),
      fret: 0,
      difficulty: this.getChordDifficulty(chordName)
    }));
  }

  private extractChordsFromHtml($: cheerio.CheerioAPI): ChordInfo[] {
    const chords: ChordInfo[] = [];
    const seenChords = new Set<string>();

    // Find all chord links with class="ch" and extract chord names from onmousemove attribute
    $('a.ch').each((_, element) => {
      const onmousemove = $(element).attr('onmousemove');
      if (onmousemove) {
        // Extract chord name from showAcc("Em",event) format
        const match = onmousemove.match(/showAcc\("([^"]+)"/);
        if (match && match[1]) {
          const chordName = match[1];
          if (!seenChords.has(chordName)) {
            seenChords.add(chordName);
            chords.push({
              name: chordName,
              fingering: this.getChordFingering(chordName),
              fret: this.getChordFret(chordName),
              difficulty: this.getChordDifficulty(chordName)
            });
          }
        }
      }
    });

    // If no chord links found, fall back to text extraction
    if (chords.length === 0) {
      return this.extractChordsFromContent($('body').text());
    }

    console.log(`🎸 [SCRAPER] Extracted ${chords.length} chords from HTML: ${chords.map(c => c.name).join(', ')}`);
    return chords;
  }

  private extractCapoInfo(content: string): number {
    const capoMatch = content.match(/capo[:\s]*(\d+)/i);
    return capoMatch ? parseInt(capoMatch[1]) : 0;
  }

  private extractTuning(content: string): string | null {
    const tuningMatch = content.match(/tuning[:\s]*([ABCDEFG][#b]?\s*){6}/i);
    return tuningMatch ? tuningMatch[0] : null;
  }

  private createSectionsFromContent(content: string, chords: ChordInfo[]): TabSection[] {
    const sections: TabSection[] = [];
    const lines = content.split('\n');
    let currentSection = 'Intro';
    let currentContent = '';

    for (const line of lines) {
      // Check if line indicates a new section
      if (/\[(verse|chorus|bridge|intro|outro|solo)\]/i.test(line)) {
        if (currentContent.trim()) {
          sections.push({
            name: currentSection,
            content: currentContent.trim(),
            chords: chords.filter(chord => currentContent.toLowerCase().includes(chord.name.toLowerCase()))
          });
        }
        currentSection = line.replace(/[\[\]]/g, '');
        currentContent = '';
      } else {
        currentContent += line + '\n';
      }
    }

    // Add the last section
    if (currentContent.trim()) {
      sections.push({
        name: currentSection,
        content: currentContent.trim(),
        chords: this.extractChordsFromContent(currentContent)
      });
    }

    // If no sections were found, create a default one
    if (sections.length === 0) {
      sections.push({
        name: 'Tab',
        content: content,
        chords: chords
      });
    }

    return sections;
  }

  private getChordFingering(chordName: string): string {
    return this.basicChords[chordName] || 'x00000';
  }

  private getChordFret(chordName: string): number {
    // Extract fret number from chord names like F#m, Bm, etc.
    // Most open chords start at fret 0, barre chords usually higher
    const barreChords = ['F', 'Fm', 'F7', 'B', 'Bm', 'B7'];
    if (barreChords.includes(chordName)) {
      return 1; // Most barre chords start at 1st fret
    }
    return 0; // Open chords
  }

  private getChordDifficulty(chordName: string): 'beginner' | 'intermediate' | 'advanced' {
    const beginnerChords = ['C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em'];
    const intermediateChords = ['F', 'B', 'Gm', 'C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Em7', 'Am7'];
    
    if (beginnerChords.includes(chordName)) return 'beginner';
    if (intermediateChords.includes(chordName)) return 'intermediate';
    return 'advanced';
  }

  private determineDifficulty(chords: ChordInfo[]): 'beginner' | 'intermediate' | 'advanced' {
    const difficultyScores = chords.map(chord => {
      switch (chord.difficulty) {
        case 'beginner': return 1;
        case 'intermediate': return 2;
        case 'advanced': return 3;
        default: return 2;
      }
    });

    const averageScore = difficultyScores.reduce((sum, score) => sum + score, 0) / difficultyScores.length;
    
    if (averageScore <= 1.3) return 'beginner';
    if (averageScore <= 2.3) return 'intermediate';
    return 'advanced';
  }

  private async saveToDatabase(tabsData: TabData[]): Promise<void> {
    try {
      for (const tabData of tabsData) {
        const existingTab = await Tab.findOne({
          title: new RegExp(tabData.title, 'i'),
          artist: new RegExp(tabData.artist, 'i'),
          source: tabData.source
        });

        if (!existingTab) {
          const newTab = new Tab({
            title: tabData.title,
            artist: tabData.artist,
            album: tabData.album,
            rating: tabData.rating,
            difficulty: tabData.difficulty,
            tuning: tabData.tuning,
            capo: tabData.capo,
            type: tabData.type,
            chords: tabData.chords,
            sections: tabData.sections,
            tabContent: tabData.tabContent,
            source: tabData.source,
            sourceUrl: tabData.sourceUrl,
            originalId: tabData.id
          });

          await newTab.save();
          console.log(`🎸 [SCRAPER] Saved to database: "${tabData.title}" by ${tabData.artist}`);
        } else {
          console.log(`🎸 [SCRAPER] Tab already exists in database: "${tabData.title}" by ${tabData.artist}`);
        }
      }
    } catch (error) {
      console.error('🎸 [SCRAPER] Error saving to database:', error);
    }
  }

  private convertDbTabToTabData(dbTab: ITab): TabData {
    return {
      id: (dbTab._id as any).toString(),
      title: dbTab.title,
      artist: dbTab.artist,
      album: dbTab.album,
      rating: dbTab.rating,
      difficulty: dbTab.difficulty,
      tuning: dbTab.tuning,
      capo: dbTab.capo,
      type: dbTab.type,
      chords: dbTab.chords,
      sections: dbTab.sections,
      tabContent: dbTab.tabContent,
      source: dbTab.source,
      sourceUrl: dbTab.sourceUrl
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const guitarTabsScraper = new GuitarTabsScraper();