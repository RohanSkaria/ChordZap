import mongoose, { Document, Schema } from 'mongoose';

export interface IChord {
  name: string;
  fingering: string;
  fret: number;
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
  createdAt: Date;
  updatedAt: Date;
}

const ChordSchema = new Schema<IChord>({
  name: { type: String, required: true },
  fingering: { type: String, required: true },
  fret: { type: Number, default: 0 }
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SongSchema.index({ title: 1, artist: 1 });
SongSchema.index({ artist: 1 });
SongSchema.index({ createdAt: -1 });

// not used for iter1
SongSchema.virtual('searchString').get(function() {
  return `${this.title} ${this.artist} ${this.album || ''}`.toLowerCase();
});

export const Song = mongoose.model<ISong>('Song', SongSchema);