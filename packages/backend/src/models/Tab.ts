import mongoose, { Document, Schema } from 'mongoose';
import { IChord } from './Song';

export interface ITabSection {
  name: string;
  content: string;
  chords: IChord[];
  timestamp?: number;
}

export interface ITab extends Document {
  title: string;
  artist: string;
  album?: string;
  rating?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tuning?: string;
  capo?: number;
  type: 'chords' | 'tabs' | 'bass' | 'ukulele';
  chords: IChord[];
  sections: ITabSection[];
  tabContent: string;
  source: string;
  sourceUrl: string;
  originalId?: string;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TabSectionSchema = new Schema<ITabSection>({
  name: { type: String, required: true },
  content: { type: String, required: true },
  chords: [{ 
    name: { type: String, required: true },
    fingering: { type: String, required: true },
    fret: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
  }],
  timestamp: { type: Number }
}, { _id: false });

const TabSchema = new Schema<ITab>({
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
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  tuning: {
    type: String,
    default: 'Standard (E A D G B E)'
  },
  capo: {
    type: Number,
    min: 0,
    max: 12,
    default: 0
  },
  type: {
    type: String,
    enum: ['chords', 'tabs', 'bass', 'ukulele'],
    required: true,
    default: 'chords'
  },
  chords: [{ 
    name: { type: String, required: true },
    fingering: { type: String, required: true },
    fret: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
  }],
  sections: [TabSectionSchema],
  tabContent: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['Ultimate Guitar', 'Songsterr', 'ChordPro', 'Manual', 'GuitarTabs.cc', 'Other']
  },
  sourceUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Source URL must be a valid URL'
    }
  },
  originalId: {
    type: String,
    index: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
TabSchema.index({ title: 1, artist: 1 });
TabSchema.index({ artist: 1 });
TabSchema.index({ source: 1, originalId: 1 });
TabSchema.index({ difficulty: 1 });
TabSchema.index({ rating: -1 });
TabSchema.index({ scrapedAt: -1 });

// Compound index for common searches
TabSchema.index({ title: 1, artist: 1, source: 1 });

// Virtual for search functionality
TabSchema.virtual('searchString').get(function() {
  return `${this.title} ${this.artist} ${this.album || ''}`.toLowerCase();
});

// Method to check if tab data is fresh
TabSchema.methods.isFresh = function(): boolean {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return this.scrapedAt > oneWeekAgo;
};

// Static method to find tabs by song
TabSchema.statics.findBySong = function(title: string, artist: string) {
  return this.find({
    title: new RegExp(title, 'i'),
    artist: new RegExp(artist, 'i')
  }).sort({ rating: -1, scrapedAt: -1 });
};

// Static method to find best tab for a song
TabSchema.statics.findBestTab = function(title: string, artist: string) {
  return this.findOne({
    title: new RegExp(title, 'i'),
    artist: new RegExp(artist, 'i')
  }).sort({ rating: -1, scrapedAt: -1 });
};

export const Tab = mongoose.model<ITab>('Tab', TabSchema);