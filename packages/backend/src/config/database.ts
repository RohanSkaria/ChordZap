import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ChordZapDB';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`mongodb connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('mongodb connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('mongoose connected to mongodb');
});

mongoose.connection.on('error', (err) => {
  console.error('mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('mongoose disconnected from mongodb');
});


process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('mongodb connection closed through app termination');
  process.exit(0);
});