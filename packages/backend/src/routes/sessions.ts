import express, { Request, Response } from 'express';
import { Session } from '../models/Session';
import { Song } from '../models/Song';
import { body, validationResult, param } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const router: express.Router = express.Router();

// create new session
router.post('/', [
  body('userId').optional().isString(),
  body('sessionId').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sessionId = req.body.sessionId || uuidv4();
    
    // check if session already exists
    const existingSession = await Session.findOne({ sessionId });
    if (existingSession) {
      return res.json(existingSession);
    }

    const session = new Session({
      sessionId,
      userId: req.body.userId || null,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      detectedSongs: []
    });

    await session.save();
    return res.status(201).json(session);
  } catch (error) {
    console.error('error creating session:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// get session by id
router.get('/:sessionId', [
  param('sessionId').notEmpty().withMessage('session id is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await Session.findOne({ sessionId: req.params.sessionId })
      .populate('detectedSongs.songId');

    if (!session) {
      return res.status(404).json({ message: 'session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('error fetching session:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// add detected song to session
router.post('/:sessionId/detect', [
  param('sessionId').notEmpty().withMessage('session id is required'),
  body('songId').isMongoId().withMessage('valid song id is required'),
  body('confidence').optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body('audioSource').optional().isIn(['microphone', 'system-audio', 'file-upload'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ message: 'session not found' });
    }

    // verify song exists
    const song = await Song.findById(req.body.songId);
    if (!song) {
      return res.status(404).json({ message: 'song not found' });
    }

    // add detected song to session
    session.detectedSongs.push({
      songId: req.body.songId,
      detectedAt: new Date(),
      confidence: req.body.confidence || 0.8,
      audioSource: req.body.audioSource || 'microphone'
    });
    await session.save();

    const updatedSession = await Session.findOne({ sessionId: req.params.sessionId })
      .populate('detectedSongs.songId');

    return res.json(updatedSession);
  } catch (error) {
    console.error('error adding detected song:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// end session
router.put('/:sessionId/end', [
  param('sessionId').notEmpty().withMessage('session id is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ message: 'session not found' });
    }

    if (session.sessionEnd) {
      return res.status(400).json({ message: 'session already ended' });
    }

    session.sessionEnd = new Date();
    await session.save();
    return res.json(session);
  } catch (error) {
    console.error('error ending session:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

// get recent sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await Session.find()
      .sort({ sessionStart: -1 })
      .limit(20)
      .populate('detectedSongs.songId');

    return res.json(sessions);
  } catch (error) {
    console.error('error fetching sessions:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

export default router;