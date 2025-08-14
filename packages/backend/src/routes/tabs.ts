import express, { Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { eChordsScaper } from '../services/tabScraper';

const router: express.Router = express.Router();

// Search for tabs
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt().withMessage('Limit must be between 1 and 50')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const searchQuery = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`🎸 [API] Tab search request: "${searchQuery}" (limit: ${limit})`);

    const result = await eChordsScaper.searchTabs(searchQuery, limit);

    if (result.success) {
      console.log(`🎸 [API] Found ${result.data?.length || 0} tabs for "${searchQuery}"`);
      return res.json({
        success: true,
        query: searchQuery,
        totalResults: result.totalResults || 0,
        results: result.data || []
      });
    } else {
      console.error(`🎸 [API] Tab search failed: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to search tabs'
      });
    }
  } catch (error) {
    console.error('🎸 [API] Tab search error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during tab search' 
    });
  }
});

// Get specific tab by ID
router.get('/:tabId', [
  param('tabId').notEmpty().withMessage('Tab ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tabId = req.params.tabId;
    console.log(`🎸 [API] Tab fetch request: ${tabId}`);

    const tab = await eChordsScaper.getTabById(tabId);

    if (tab) {
      console.log(`🎸 [API] Successfully fetched tab: "${tab.title}" by ${tab.artist}`);
      return res.json({
        success: true,
        tab
      });
    } else {
      console.log(`🎸 [API] Tab not found: ${tabId}`);
      return res.status(404).json({
        success: false,
        error: 'Tab not found'
      });
    }
  } catch (error) {
    console.error('🎸 [API] Tab fetch error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during tab fetch' 
    });
  }
});

// Get tab suggestions based on song info
router.post('/suggest', [
  query('title').optional().isString(),
  query('artist').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const { title, artist } = req.body;
    
    if (!title && !artist) {
      return res.status(400).json({
        success: false,
        error: 'Either title or artist is required'
      });
    }

    const searchQuery = `${title || ''} ${artist || ''}`.trim();
    console.log(`🎸 [API] Tab suggestion request: "${searchQuery}"`);

    const result = await eChordsScaper.searchTabs(searchQuery, 10);

    if (result.success) {
      // Filter results to match the song more closely
      let suggestions = result.data || [];
      
      if (title && artist) {
        suggestions = suggestions.filter(tab => 
          tab.title.toLowerCase().includes(title.toLowerCase()) ||
          tab.artist.toLowerCase().includes(artist.toLowerCase())
        );
      }

      console.log(`🎸 [API] Found ${suggestions.length} tab suggestions for "${searchQuery}"`);
      return res.json({
        success: true,
        query: searchQuery,
        suggestions: suggestions.slice(0, 5) // Return top 5 suggestions
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to get tab suggestions'
      });
    }
  } catch (error) {
    console.error('🎸 [API] Tab suggestion error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during tab suggestion' 
    });
  }
});

// Get tab by song info with fallback to Wonderwall
router.get('/by-song/:title/:artist', [
  param('title').notEmpty().withMessage('Song title is required'),
  param('artist').notEmpty().withMessage('Artist is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const title = decodeURIComponent(req.params.title);
    const artist = decodeURIComponent(req.params.artist);
    
    console.log(`🎸 [API] Tab lookup by song: "${title}" by ${artist}`);

    // First try to find the exact song
    let tab = await eChordsScaper.getTabByTitleArtist(title, artist);

    if (!tab) {
      console.log(`🎸 [API] Tab not found for "${title}" by ${artist}, trying fallback to Wonderwall`);
      
      // Fallback to Wonderwall if the song is not found
      tab = await eChordsScaper.getTabByTitleArtist('Wonderwall', 'Oasis');
      
      if (!tab) {
        console.log(`🎸 [API] Wonderwall fallback also failed, searching database`);
        
        // If still no tab, try a broader search in the database
        const searchResult = await eChordsScaper.searchTabs('Wonderwall Oasis', 1);
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          tab = searchResult.data[0];
        }
      }
    }

    if (tab) {
      console.log(`🎸 [API] Successfully found tab: "${tab.title}" by ${tab.artist}`);
      return res.json({
        success: true,
        tab,
        isFallback: (tab.title.toLowerCase() === 'wonderwall' && tab.artist.toLowerCase() === 'oasis' && 
                    !(title.toLowerCase() === 'wonderwall' && artist.toLowerCase() === 'oasis'))
      });
    } else {
      console.log(`🎸 [API] No tab found even with fallback`);
      return res.status(404).json({
        success: false,
        error: 'No tab data available'
      });
    }
  } catch (error) {
    console.error('🎸 [API] Tab lookup error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during tab lookup' 
    });
  }
});

// Health check for scraper service
router.get('/health/check', async (req: Request, res: Response) => {
  try {
    console.log('🎸 [API] Scraper health check');
    
    // Test with a simple search
    const testResult = await eChordsScaper.searchTabs('test', 1);
    
    return res.json({
      success: true,
      scraperStatus: testResult.success ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🎸 [API] Scraper health check error:', error);
    return res.status(500).json({
      success: false,
      scraperStatus: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;