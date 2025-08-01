export const APP_CONFIG = {
  NAME: 'MERN Stack Music App',
  VERSION: '1.0.0',
  DESCRIPTION: 'Music chord detection and tab scraping application',
} as const;

export const AUDIO_CONFIG = {
  SAMPLE_RATE: 44100,
  BUFFER_SIZE: 2048,
  MAX_RECORDING_DURATION: 300000, 
} as const;

export const SCRAPING_CONFIG = {
  MAX_RESULTS: 50,
  TIMEOUT: 10000, 
  SUPPORTED_SITES: ['ultimate-guitar.com', 'songsterr.com'],
} as const;