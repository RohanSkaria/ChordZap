import express, { Request, Response } from 'express';
import { Song } from '../models/Song';
import { body, validationResult, param, query } from 'express-validator';
import { seedPopularSongs } from '../scripts/seedPopularSongs';
import { guitarTabsScraper } from '../services/guitarTabsScraper';

const router: express.Router = express.Router();

// get all songs with pagination and search
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { artist: { $regex: search, $options: 'i' } },
          { album: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [songs, total] = await Promise.all([
      Song.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Song.countDocuments(searchQuery)
    ]);

    return res.json({
      songs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('error fetching songs:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// get popular songs (most detected) - must be before /:id route
router.get('/popular', [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = Number(req.query.limit) || 10;
    
    const popularSongs = await Song.find({})
      .sort({ detectionCount: -1, lastDetected: -1 })
      .limit(limit)
      .lean();

    return res.json({
      songs: popularSongs,
      count: popularSongs.length
    });
  } catch (error) {
    console.error('error fetching popular songs:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// seed database with popular songs - must be before /:id route
router.post('/seed', async (req: Request, res: Response) => {
  try {
    console.log('🌱 [API] Starting database seeding...');
    await seedPopularSongs();
    
    // Get count of songs after seeding
    const songCount = await Song.countDocuments();
    
    return res.json({
      message: 'Database seeded successfully with popular songs',
      totalSongs: songCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🌱 [API] Seeding error:', error);
    return res.status(500).json({ 
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id', [
  param('id').isMongoId().withMessage('invalid song id')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'song not found' });
    }

    return res.json(song);
  } catch (error) {
    console.error('error fetching song:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// get full tab data for a song with scraping
router.get('/:id/tab-data', [
  param('id').isMongoId().withMessage('invalid song id')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'song not found' });
    }

    console.log(`🎸 [API] Scraping tab data for: "${song.title}" by ${song.artist}`);

    // Try to scrape tab data
    let tabData = null;
    
    if (song.tabUrl) {
      try {
        console.log(`🎸 [API] Using existing tab URL: ${song.tabUrl}`);
        tabData = await guitarTabsScraper.scrapeTabPage(song.tabUrl);
      } catch (scrapeError) {
        console.warn(`🎸 [API] Error scraping existing URL:`, scrapeError);
      }
    }

    // If no existing URL or scraping failed, try URL generation method
    if (!tabData) {
      try {
        console.log(`🎸 [API] Trying URL generation for: "${song.title}" by ${song.artist}`);
        tabData = await guitarTabsScraper.findSongByGeneration(song.title, song.artist);
        
        if (tabData) {
          console.log(`🎸 [API] Found tab data using URL generation`);
        }
      } catch (generationError) {
        console.warn(`🎸 [API] Error with URL generation:`, generationError);
      }
    }

    // If URL generation failed, try search as fallback
    if (!tabData) {
      try {
        console.log(`🎸 [API] Fallback: Searching for tabs for: "${song.title}" by ${song.artist}`);
        const searchResults = await guitarTabsScraper.searchTabs(`${song.title} ${song.artist}`, 1);
        
        if (searchResults.success && searchResults.data && searchResults.data.length > 0) {
          tabData = searchResults.data[0];
          console.log(`🎸 [API] Found tab data from search`);
        }
      } catch (searchError) {
        console.warn(`🎸 [API] Error searching for tabs:`, searchError);
      }
    }

    if (tabData) {
      return res.json({
        song: song,
        tabData: tabData,
        success: true
      });
    } else {
      // Return song with basic info if no tab data found
      return res.json({
        song: song,
        tabData: {
          id: song._id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          chords: song.chords,
          sections: [{
            name: 'Main',
            content: `Chords for ${song.title} by ${song.artist}`,
            chords: song.chords
          }],
          tabContent: `No detailed tab content available for ${song.title}`,
          source: song.source || 'Database',
          sourceUrl: song.tabUrl || ''
        },
        success: true,
        fallback: true
      });
    }
  } catch (error) {
    console.error('error fetching tab data:', error);
    return res.status(500).json({ message: 'server error' });
  }
});


router.post('/', [
  body('title').notEmpty().trim().withMessage('title is required'),
  body('artist').notEmpty().trim().withMessage('artist is required'),
  body('album').optional().trim(),
  body('duration').optional().matches(/^\d{1,2}:\d{2}$/).withMessage('duration must be in format mm:ss'),
  body('albumArt').optional().isURL().withMessage('album art must be a valid url'),
  body('chords').isArray().withMessage('chords must be an array'),
  body('chords.*.name').notEmpty().withMessage('chord name is required'),
  body('chords.*.fingering').notEmpty().withMessage('chord fingering is required'),
  body('chords.*.fret').optional().isInt({ min: 0, max: 12 }).toInt(),
  body('tabUrl').optional().isURL().withMessage('tab url must be valid'),
  body('source').optional().isIn(['Ultimate Guitar', 'Songsterr', 'Manual', 'API Detection', 'Mock Data', 'Frontend Mock'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }


    const existingSong = await Song.findOne({
      title: { $regex: new RegExp(`^${req.body.title}$`, 'i') },
      artist: { $regex: new RegExp(`^${req.body.artist}$`, 'i') }
    });

    if (existingSong) {
      // return the existing song instead of throwing an error
      return res.status(200).json(existingSong);
    }

    const song = new Song(req.body);
    await song.save();

    return res.status(201).json(song);
  } catch (error) {
    console.error('error creating song:', error);
    return res.status(500).json({ message: 'server error' });
  }
});


router.put('/:id', [
  param('id').isMongoId().withMessage('invalid song id'),
  body('title').optional().notEmpty().trim(),
  body('artist').optional().notEmpty().trim(),
  body('album').optional().trim(),
  body('duration').optional().matches(/^\d{1,2}:\d{2}$/),
  body('albumArt').optional().isURL(),
  body('chords').optional().isArray(),
  body('tabUrl').optional().isURL(),
  body('source').optional().isIn(['Ultimate Guitar', 'Songsterr', 'Manual', 'API Detection', 'Mock Data', 'Frontend Mock'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!song) {
      return res.status(404).json({ message: 'song not found' });
    }

    return res.json(song);
  } catch (error) {
    console.error('error updating song:', error);
    return res.status(500).json({ message: 'server error' });
  }
});


router.delete('/:id', [
  param('id').isMongoId().withMessage('invalid song id')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'song not found' });
    }

    return res.json({ message: 'song deleted successfully' });
  } catch (error) {
    console.error('error deleting song:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

export default router;