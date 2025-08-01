import express, { Request, Response } from 'express';
import { Song } from '../models/Song';
import { body, validationResult, param, query } from 'express-validator';

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
  body('source').optional().isIn(['Ultimate Guitar', 'Songsterr', 'Manual', 'API Detection'])
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
      return res.status(409).json({ message: 'song already exists' });
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
  body('source').optional().isIn(['Ultimate Guitar', 'Songsterr', 'Manual', 'API Detection'])
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