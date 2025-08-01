import mongoose, { Document, Schema } from 'mongoose';

export interface IDetectedSong {
  songId: mongoose.Types.ObjectId;
  detectedAt: Date;
  confidence: number;
  audioSource: 'microphone' | 'system-audio' | 'file-upload';
}

export interface ISession extends Document {
  userId?: string; // for spotify user identification - maybe
  sessionId: string; 
  detectedSongs: IDetectedSong[];
  sessionStart: Date;
  sessionEnd?: Date;
  userAgent?: string;
  ipAddress?: string;
  totalDetections: number;
}

const DetectedSongSchema = new Schema<IDetectedSong>({
  songId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Song',
    required: true 
  },
  detectedAt: { 
    type: Date, 
    default: Date.now 
  },
  confidence: { 
    type: Number, 
    min: 0, 
    max: 1,
    default: 0.8 
  },
  audioSource: { 
    type: String, 
    enum: ['microphone', 'system-audio', 'file-upload'],
    default: 'microphone'
  }
}, { _id: false });

const SessionSchema = new Schema<ISession>({
  userId: { 
    type: String,
    default: null 
  },
  sessionId: { 
    type: String, 
    required: true,
    unique: true,
    index: true
  },
  detectedSongs: [DetectedSongSchema],
  sessionStart: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  sessionEnd: { 
    type: Date 
  },
  userAgent: { 
    type: String 
  },
  ipAddress: { 
    type: String 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


SessionSchema.virtual('totalDetections').get(function() {
  return this.detectedSongs.length;
});


SessionSchema.virtual('sessionDuration').get(function() {
  if (!this.sessionEnd) return null;
  return Math.round((this.sessionEnd.getTime() - this.sessionStart.getTime()) / (1000 * 60));
});


SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ userId: 1, sessionStart: -1 });
SessionSchema.index({ sessionStart: -1 });


export interface ISessionMethods {
  addDetectedSong(songId: string, confidence?: number, audioSource?: string): Promise<ISession>;
  endSession(): Promise<ISession>;
}


export interface ISessionDocument extends ISession, ISessionMethods {}


SessionSchema.methods.addDetectedSong = function(songId: string, confidence: number = 0.8, audioSource: string = 'microphone') {
  this.detectedSongs.push({
    songId,
    detectedAt: new Date(),
    confidence,
    audioSource
  });
  return this.save();
};

SessionSchema.methods.endSession = function() {
  this.sessionEnd = new Date();
  return this.save();
};

export const Session = mongoose.model<ISession>('Session', SessionSchema);