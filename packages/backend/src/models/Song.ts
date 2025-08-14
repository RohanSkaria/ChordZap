import mongoose, { Document, Schema } from 'mongoose';

export interface IChord {
  name: string;
  fingering: string;
  fret: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ISong extends Document {
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  albumArt?: string;
  chords: IChord[];
  tabUrl?: string;
  source?: string;
  detectionCount: number;
  lastDetected: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChordSchema = new Schema<IChord>({
  name: { type: String, required: true },
  fingering: { type: String, required: true },
  fret: { type: Number, default: 0 },
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'] 
  }
}, { _id: false });

const SongSchema = new Schema<ISong>({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  artist: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  album: { 
    type: String, 
    trim: true,
    maxlength: 200
  },
  duration: { 
    type: String,
    match: /^\d{1,2}:\d{2}$/  // format: "4:18"
  },
  albumArt: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'album art must be a valid url'
    }
  },
  chords: [ChordSchema],
  tabUrl: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'tab url must be a valid url'
    }
  },
  source: { 
    type: String,
    enum: ['Ultimate Guitar', 'Songsterr', 'Manual', 'API Detection', 'Mock Data', 'Frontend Mock'],
    default: 'Manual'
  },
  detectionCount: {
    type: Number,
    default: 1,
    min: 0
  },
  lastDetected: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SongSchema.index({ title: 1, artist: 1 });
SongSchema.index({ artist: 1 });
SongSchema.index({ createdAt: -1 });
SongSchema.index({ detectionCount: -1 });
SongSchema.index({ lastDetected: -1 });

// Virtual for search functionality
SongSchema.virtual('searchString').get(function() {
  return `${this.title} ${this.artist} ${this.album || ''}`.toLowerCase();
});

// Method to increment detection count
SongSchema.methods.incrementDetection = function() {
  this.detectionCount += 1;
  this.lastDetected = new Date();
  return this.save();
};

// Static method to find or create a song
SongSchema.statics.findOrCreate = async function(songData: Partial<ISong>) {
  const existingSong = await this.findOne({
    title: new RegExp(`^${songData.title}$`, 'i'),
    artist: new RegExp(`^${songData.artist}$`, 'i')
  });

  if (existingSong) {
    // Update detection count and last detected
    existingSong.detectionCount += 1;
    existingSong.lastDetected = new Date();
    
    // Update other fields if they're provided and not already set
    if (songData.album && !existingSong.album) existingSong.album = songData.album;
    if (songData.albumArt && !existingSong.albumArt) existingSong.albumArt = songData.albumArt;
    if (songData.duration && !existingSong.duration) existingSong.duration = songData.duration;
    if (songData.chords && songData.chords.length > 0) existingSong.chords = songData.chords;
    if (songData.tabUrl && !existingSong.tabUrl) existingSong.tabUrl = songData.tabUrl;
    
    await existingSong.save();
    return existingSong;
  } else {
    return await this.create(songData);
  }
};

// Static method to get popular songs
SongSchema.statics.getPopular = function(limit: number = 10) {
  return this.find({})
    .sort({ detectionCount: -1, lastDetected: -1 })
    .limit(limit);
};

export const Song = mongoose.model<ISong>('Song', SongSchema);