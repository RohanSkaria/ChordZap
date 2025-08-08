import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { encodeWav } from '../utils/wav';
import { identifyByBuffer } from '../services/acrcloud';

const router: express.Router = express.Router();

// simple audio analysis
router.post('/analyze', [
  body('samples').isArray({ min: 1 }).withMessage('audio samples array is required'),
  body('sampleRate').optional().isInt({ min: 8000, max: 96000 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const samples: number[] = req.body.samples;
    const sampleRate: number = req.body.sampleRate || 44100;

    // try external recognition via acrcloud if env is present
    const wavBuffer = encodeWav(samples, sampleRate);
    let recognized = null;
    
    console.log('🎵 [ACR API] Starting song identification...');
    console.log(`🎵 [ACR API] Audio buffer size: ${wavBuffer.length} bytes`);
    console.log(`🎵 [ACR API] Sample rate: ${sampleRate}Hz`);
    console.log(`🎵 [ACR API] Duration: ~${(samples.length / sampleRate).toFixed(2)} seconds`);
    
    const startTime = Date.now();
    try {
      recognized = await identifyByBuffer(wavBuffer);
      const endTime = Date.now();
      
      if (recognized && recognized.title && recognized.artist) {
        console.log('🎵 [ACR API] ✅ SUCCESS! Song recognized:');
        console.log(`🎵 [ACR API] Title: "${recognized.title}"`);
        console.log(`🎵 [ACR API] Artist: "${recognized.artist}"`);
        console.log(`🎵 [ACR API] Album: "${recognized.album || 'Unknown'}"`);
        console.log(`🎵 [ACR API] Duration: ${recognized.duration || 'Unknown'}`);
        console.log(`🎵 [ACR API] Album Art: ${recognized.albumArt ? 'Available' : 'None'}`);
        console.log(`🎵 [ACR API] Response time: ${endTime - startTime}ms`);
      } else {
        console.log('🎵 [ACR API] ❌ No match found');
        console.log(`🎵 [ACR API] Response time: ${endTime - startTime}ms`);
        console.log('🎵 [ACR API] Response data:', recognized);
      }
    } catch (e) {
      const endTime = Date.now();
      console.error('🎵 [ACR API] ❌ ERROR occurred:');
      console.error(`🎵 [ACR API] Error: ${(e as Error).message}`);
      console.error(`🎵 [ACR API] Response time: ${endTime - startTime}ms`);
      console.error('🎵 [ACR API] Full error:', e);
      console.log('🎵 [ACR API] Falling back to mock data...');
    }

    if (recognized && recognized.title && recognized.artist) {
      const apiResponse = {
        song: {
          title: recognized.title,
          artist: recognized.artist,
          album: recognized.album,
          albumArt: recognized.albumArt,
          duration: recognized.duration,
          chords: [], // chords are populated later from scraping/db
          source: 'API Detection'
        },
        confidence: 0.9,
        sampleRate,
        analyzedFrames: Math.min(samples.length, 4096)
      };
      
      console.log('🎵 [ACR API] 📤 Sending REAL song data to frontend:');
      console.log(`🎵 [ACR API] Song: "${apiResponse.song.title}" by ${apiResponse.song.artist}`);
      console.log('🎵 [ACR API] Source: API Detection (not mock data)');
      
      return res.json(apiResponse);
    }

    // fallback: deterministic mock for iter 2
    console.log('🎵 [ACR API] 📤 API did not recognize song - sending MOCK data to frontend');
    console.log('🎵 [ACR API] Mock Song: "Wonderwall" by Oasis');
    console.log('🎵 [ACR API] Source: Mock/Fallback (not real detection)');
    
    const energy = samples.slice(0, Math.min(samples.length, 4096)).reduce((acc, v) => acc + Math.abs(v), 0) / Math.min(samples.length, 4096);
    const confidence = Math.max(0.6, Math.min(0.98, 0.7 + (energy % 0.28)));
    
    const mockResponse = {
      song: {
        title: 'Wonderwall',
        artist: 'Oasis',
        album: "(What's the Story) Morning Glory?",
        albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
        duration: '4:18',
        chords: [
          { name: 'Em7', fingering: '022030', fret: 0 },
          { name: 'G', fingering: '320003', fret: 3 },
          { name: 'D', fingering: 'xx0232', fret: 2 },
          { name: 'C', fingering: 'x32010', fret: 0 },
          { name: 'Am', fingering: 'x02210', fret: 0 },
          { name: 'F', fingering: '133211', fret: 1 }
        ],
        tabUrl: 'https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-64382',
        source: 'Mock Data'
      },
      confidence,
      sampleRate,
      analyzedFrames: Math.min(samples.length, 4096)
    };
    
    return res.json(mockResponse);
  } catch (error) {
    console.error('error analyzing audio:', error);
    return res.status(500).json({ message: 'server error' });
  }
});

export default router;

