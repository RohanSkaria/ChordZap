export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
}

export interface AudioAnalysis {
  timestamp: number;
  frequency: number[];
  amplitude: number[];
  detectedChord?: string;
  confidence?: number;
}

export interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  audioData?: Blob;
  analysis?: AudioAnalysis[];
  detectedSongs?: DetectedSong[];
}

export interface DetectedSong {
  id: string;
  title: string;
  artist: string;
  confidence: number;
  timestamp: number;
  duration?: number;
}

export interface ChordProgression {
  chords: string[];
  timestamps: number[];
  key?: string;
  tempo?: number;
}