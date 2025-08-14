import { connectDB } from '../config/database';
import { Song } from '../models/Song';
import { guitarTabsScraper } from '../services/guitarTabsScraper';

interface SeedSongData {
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  albumArt?: string;
}

interface SeedSongDataWithUrl extends SeedSongData {
  tabUrl?: string;
}

const popularSongs: SeedSongDataWithUrl[] = [
  {
    title: "Livin' On A Prayer",
    artist: "Bon Jovi",
    album: "Slippery When Wet",
    duration: "4:09",
    albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center",
    tabUrl: "https://www.guitartabs.cc/tabs/b/bon_jovi/livin_on_a_prayer_crd_ver_2.html"
  },
  {
    title: "Never Grow Up",
    artist: "Taylor Swift",
    album: "Speak Now",
    duration: "4:50",
    albumArt: "https://images.unsplash.com/photo-1471895302488-5ce17588e2ad?w=400&h=400&fit=crop&crop=center",
    tabUrl: "https://www.guitartabs.cc/tabs/t/taylor_swift/never_grow_up_crd_ver_5.html"
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    album: "(What's the Story) Morning Glory?",
    duration: "4:18",
    albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center"
  },
  {
    title: "Hotel California",
    artist: "Eagles",
    album: "Hotel California",
    duration: "6:31",
    albumArt: "https://images.unsplash.com/photo-1484755560615-676d3cc3dfad?w=400&h=400&fit=crop&crop=center"
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    album: "Appetite for Destruction",
    duration: "5:03",
    albumArt: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center"
  },
  {
    title: "Stairway to Heaven",
    artist: "Led Zeppelin",
    album: "Led Zeppelin IV",
    duration: "8:02",
    albumArt: "https://images.unsplash.com/photo-1515552726023-7125c8d07fb3?w=400&h=400&fit=crop&crop=center"
  },
  {
    title: "Blackbird",
    artist: "The Beatles",
    album: "The Beatles (White Album)",
    duration: "2:18",
    albumArt: "https://images.unsplash.com/photo-1574115906251-7d75b5fb4c1b?w=400&h=400&fit=crop&crop=center"
  },
  {
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    album: "Wish You Were Here",
    duration: "5:34",
    albumArt: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=400&h=400&fit=crop&crop=center"
  }
];

async function seedPopularSongs(): Promise<void> {
  try {
    console.log('🌱 [SEED] Starting to seed popular songs...');
    
    // Connect to database
    await connectDB();
    console.log('🌱 [SEED] Connected to database');

    let songsCreated = 0;
    let songsSkipped = 0;
    let songsWithChords = 0;

    for (const songData of popularSongs) {
      try {
        console.log(`🌱 [SEED] Processing: "${songData.title}" by ${songData.artist}`);
        
        // Check if song already exists
        const existingSong = await Song.findOne({
          title: new RegExp(`^${songData.title}$`, 'i'),
          artist: new RegExp(`^${songData.artist}$`, 'i')
        });

        if (existingSong) {
          console.log(`🌱 [SEED] ⏭️  Song already exists: "${songData.title}" by ${songData.artist}`);
          songsSkipped++;
          continue;
        }

        // Try to scrape chord data using direct URL pattern or search
        let chords: any[] = [];
        let tabUrl: string | undefined = undefined;
        
        try {
          console.log(`🎸 [SEED] Searching for tabs for: "${songData.title}" by ${songData.artist}`);
          
          // If specific URL provided, try that first
          if (songData.tabUrl) {
            console.log(`🎸 [SEED] Using specific URL: ${songData.tabUrl}`);
            const directResult = await guitarTabsScraper.scrapeTabPage(songData.tabUrl);
            if (directResult && directResult.chords.length > 0) {
              chords = directResult.chords.map(chord => ({
                name: chord.name,
                fingering: chord.fingering,
                fret: chord.fret || 0,
                difficulty: chord.difficulty
              }));
              tabUrl = songData.tabUrl;
              songsWithChords++;
              console.log(`🎸 [SEED] ✅ Found ${chords.length} chords from direct URL for "${songData.title}"`);
            }
          } else {
            // Fallback to search
            const searchQuery = `${songData.title} ${songData.artist}`;
            const tabResults = await guitarTabsScraper.searchTabs(searchQuery, 1);
            
            if (tabResults.success && tabResults.data && tabResults.data.length > 0) {
              const tabData = tabResults.data[0];
              chords = tabData.chords.map(chord => ({
                name: chord.name,
                fingering: chord.fingering,
                fret: chord.fret || 0,
                difficulty: chord.difficulty
              }));
              tabUrl = tabData.sourceUrl;
              songsWithChords++;
              console.log(`🎸 [SEED] ✅ Found ${chords.length} chords for "${songData.title}"`);
            } else {
              console.log(`🎸 [SEED] ⚠️  No tab data found for "${songData.title}"`);
            }
          }
        } catch (tabError) {
          console.warn(`🎸 [SEED] ⚠️  Error scraping tabs for "${songData.title}":`, tabError);
        }

        // Fallback to basic chords if none found
        if (chords.length === 0) {
          chords = [
            { name: 'C', fingering: 'x32010', fret: 0, difficulty: 'beginner' },
            { name: 'G', fingering: '320003', fret: 3, difficulty: 'beginner' },
            { name: 'Am', fingering: 'x02210', fret: 0, difficulty: 'beginner' },
            { name: 'F', fingering: '133211', fret: 1, difficulty: 'intermediate' }
          ];
          console.log(`🎸 [SEED] 🔧 Using fallback chords for "${songData.title}"`);
        }

        // Create song in database
        const newSong = await Song.create({
          title: songData.title,
          artist: songData.artist,
          album: songData.album,
          duration: songData.duration,
          albumArt: songData.albumArt,
          chords: chords,
          tabUrl: tabUrl,
          source: 'Manual',
          detectionCount: 1
        });

        console.log(`🌱 [SEED] ✅ Created song: "${newSong.title}" by ${newSong.artist} (ID: ${newSong._id})`);
        songsCreated++;

        // Add small delay to avoid overwhelming the scraper
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (songError) {
        console.error(`🌱 [SEED] ❌ Error processing "${songData.title}":`, songError);
      }
    }

    console.log('🌱 [SEED] ✅ Seeding completed!');
    console.log(`🌱 [SEED] 📊 Summary:`);
    console.log(`   - Songs created: ${songsCreated}`);
    console.log(`   - Songs skipped (already exist): ${songsSkipped}`);
    console.log(`   - Songs with chord data: ${songsWithChords}`);
    console.log(`   - Total processed: ${popularSongs.length}`);

  } catch (error) {
    console.error('🌱 [SEED] ❌ Fatal error during seeding:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  seedPopularSongs()
    .then(() => {
      console.log('🌱 [SEED] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🌱 [SEED] Script failed:', error);
      process.exit(1);
    });
}

export { seedPopularSongs };