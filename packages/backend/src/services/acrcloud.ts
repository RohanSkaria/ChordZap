import crypto from 'crypto';

export interface ACRIdentifyResult {
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  albumArt?: string;
  confidence?: number;
  spotify?: {
    id?: string;
    url?: string;
  };
}

function buildStringToSign(
  method: string, 
  uri: string, 
  accessKey: string, 
  dataType: string, 
  signatureVersion: string, 
  timestamp: number
): string {
  return [method, uri, accessKey, dataType, signatureVersion, String(timestamp)].join('\n');
}

function signString(stringToSign: string, accessSecret: string): string {
  return crypto
    .createHmac('sha1', accessSecret)
    .update(Buffer.from(stringToSign, 'utf-8'))
    .digest('base64');
}

export async function identifyByBuffer(audioBuffer: Buffer): Promise<ACRIdentifyResult | null> {
  const host = process.env.ACR_HOST;
  const accessKey = process.env.ACR_ACCESS_KEY;
  const accessSecret = process.env.ACR_ACCESS_SECRET;

  if (!host || !accessKey || !accessSecret) {
    console.error('🎵 [ACR API] Missing required environment variables');
    console.error('ACR_HOST:', host ? '✓' : '✗');
    console.error('ACR_ACCESS_KEY:', accessKey ? '✓' : '✗');
    console.error('ACR_ACCESS_SECRET:', accessSecret ? '✓' : '✗');
    throw new Error('ACRCloud configuration missing. Please set ACR_HOST, ACR_ACCESS_KEY, and ACR_ACCESS_SECRET environment variables.');
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    console.error('🎵 [ACR API] Invalid audio buffer: empty or null');
    return null;
  }

  console.log('🎵 [ACR API] Starting audio identification');
  console.log(`🎵 [ACR API] Audio buffer size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

  const OPTIMAL_SEGMENT_SIZE = 1764000;
  const MAX_SEGMENT_SIZE = 5 * 1024 * 1024;
  
  const segments = [];
  
  if (audioBuffer.length <= OPTIMAL_SEGMENT_SIZE) {
    segments.push({ start: 0, end: audioBuffer.length, number: 1 });
  } else {
    const segmentCount = Math.min(3, Math.ceil(audioBuffer.length / OPTIMAL_SEGMENT_SIZE));
    
    if (segmentCount === 1) {
      segments.push({ start: 0, end: Math.min(audioBuffer.length, MAX_SEGMENT_SIZE), number: 1 });
    } else if (segmentCount === 2) {
      segments.push({ start: 0, end: Math.min(OPTIMAL_SEGMENT_SIZE, audioBuffer.length), number: 1 });
      const endStart = Math.max(audioBuffer.length - OPTIMAL_SEGMENT_SIZE, OPTIMAL_SEGMENT_SIZE);
      segments.push({ start: endStart, end: audioBuffer.length, number: 2 });
    } else {
      segments.push({ start: 0, end: OPTIMAL_SEGMENT_SIZE, number: 1 });
      
      const middleStart = Math.floor((audioBuffer.length - OPTIMAL_SEGMENT_SIZE) / 2);
      segments.push({ start: middleStart, end: middleStart + OPTIMAL_SEGMENT_SIZE, number: 2 });
      
      const endStart = audioBuffer.length - OPTIMAL_SEGMENT_SIZE;
      segments.push({ start: endStart, end: audioBuffer.length, number: 3 });
    }
  }

  console.log(`🎵 [ACR API] Will try ${segments.length} segment(s) for recognition`);

  for (const segment of segments) {
    const segmentBuffer = audioBuffer.slice(segment.start, segment.end);
    console.log(`🎵 [ACR API] Trying segment ${segment.number}/${segments.length} (${(segmentBuffer.length / 1024).toFixed(2)} KB)`);
    
    try {
      const result = await identifySegment(
        segmentBuffer, 
        host, 
        accessKey, 
        accessSecret, 
        segment.number
      );
      
      if (result) {
        console.log(`🎵 [ACR API] ✅ Successfully identified song in segment ${segment.number}`);
        return result;
      }
      
      console.log(`🎵 [ACR API] Segment ${segment.number} - no match found`);
    } catch (error) {
      console.error(`🎵 [ACR API] Segment ${segment.number} failed:`, error);
    }
  }

  console.log('🎵 [ACR API] ❌ Could not identify song from any segment');
  return null;
}

async function identifySegment(
  segmentBuffer: Buffer,
  host: string,
  accessKey: string,
  accessSecret: string,
  segmentNumber: number
): Promise<ACRIdentifyResult | null> {
  const endpoint = `https://${host}/v1/identify`;
  const method = 'POST';
  const httpUri = '/v1/identify';
  const dataType = 'audio';
  const signatureVersion = '1';
  const timestamp = Math.floor(Date.now() / 1000);

  const stringToSign = buildStringToSign(
    method,
    httpUri,
    accessKey,
    dataType,
    signatureVersion,
    timestamp
  );
  const signature = signString(stringToSign, accessSecret);

  try {
    const form = new FormData();
    
    form.append('access_key', accessKey);
    form.append('data_type', dataType);
    form.append('signature_version', signatureVersion);
    form.append('signature', signature);
    form.append('timestamp', String(timestamp));
    
    const audioBlob = new Blob([new Uint8Array(segmentBuffer)], { type: 'audio/wav' });
    form.append('sample', audioBlob, 'recording.wav');
    form.append('sample_bytes', String(segmentBuffer.length));

    console.log(`🎵 [ACR API] Sending request to ${host}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🎵 [ACR API] HTTP Error ${response.status}: ${errorText}`);
      return null;
    }

    const json = await response.json();
    
    const status = json?.status;
    if (status?.code !== 0) {
      if (status?.code === 1001) {
        console.log(`🎵 [ACR API] No match found in segment ${segmentNumber}`);
      } else {
        console.log(`🎵 [ACR API] Recognition failed. Code: ${status?.code}, Message: ${status?.msg}`);
      }
      return null;
    }

    const music = json?.metadata?.music?.[0];
    if (!music) {
      console.log(`🎵 [ACR API] No music metadata in response`);
      return null;
    }

    const result: ACRIdentifyResult = {
      title: music.title,
      artist: music.artists?.[0]?.name,
      album: music.album?.name,
      confidence: music.score,
    };

    if (music.album?.covers?.length > 0) {
      result.albumArt = music.album.covers[0].url;
    } else if (music.external_metadata?.spotify?.album?.images?.length > 0) {
      result.albumArt = music.external_metadata.spotify.album.images[0].url;
    }

    if (music.external_metadata?.spotify?.track) {
      result.spotify = {
        id: music.external_metadata.spotify.track.id,
        url: `https://open.spotify.com/track/${music.external_metadata.spotify.track.id}`
      };
    }

    if (music.duration_ms) {
      const minutes = Math.floor(music.duration_ms / 60000);
      const seconds = Math.floor((music.duration_ms % 60000) / 1000);
      result.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    console.log('🎵 [ACR API] ✅ Song identified successfully');
    console.log(`🎵 [ACR API] Title: "${result.title}"`);
    console.log(`🎵 [ACR API] Artist: "${result.artist}"`);
    console.log(`🎵 [ACR API] Album: "${result.album}"`);
    if (result.confidence) {
      console.log(`🎵 [ACR API] Confidence: ${result.confidence}%`);
    }

    return result;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`🎵 [ACR API] Request timeout - took longer than 15 seconds`);
      } else {
        console.error(`🎵 [ACR API] Request failed:`, error.message);
      }
    } else {
      console.error(`🎵 [ACR API] Unknown error:`, error);
    }
    return null;
  }
}

export function validateAudioBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  if (buffer.length > 4) {
    const header = buffer.slice(0, 4).toString('ascii');
    if (header === 'RIFF') {
      console.log('🎵 [ACR API] Detected WAV format audio');
      return true;
    }
  }

  if (buffer.length > 3) {
    const id3 = buffer.slice(0, 3).toString('ascii');
    if (id3 === 'ID3') {
      console.log('🎵 [ACR API] Detected MP3 format audio');
      return true;
    }
  }

  console.log('🎵 [ACR API] Audio format not detected, assuming raw PCM');
  return true;
}

export function getACRConfig() {
  return {
    host: process.env.ACR_HOST || '',
    accessKey: process.env.ACR_ACCESS_KEY || '',
    accessSecret: process.env.ACR_ACCESS_SECRET || '',
    isConfigured: !!(process.env.ACR_HOST && process.env.ACR_ACCESS_KEY && process.env.ACR_ACCESS_SECRET)
  };
}