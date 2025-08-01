import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import songsRouter from './routes/songs';
import sessionsRouter from './routes/sessions';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 5001;

// connect to mongodb
connectDB();

// middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// trust proxy for accurate ip addresses
app.set('trust proxy', true);

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// api routes - for iter 1 to see that the testing is working
app.get('/api', (req, res) => {
  res.json({ 
    message: 'chord detection api is running',
    version: '1.0.0',
    endpoints: {
      songs: '/api/songs',
      sessions: '/api/sessions',
      health: '/health'
    }
  });
});

// api routes
app.use('/api/songs', songsRouter);
app.use('/api/sessions', sessionsRouter);

// error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('unhandled error:', err);
  

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    return res.status(400).json({ message: 'validation error', errors });
  }
  

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'invalid id format' });
  }
  

  if (err.code === 11000) {
    return res.status(409).json({ message: 'duplicate entry' });
  }
  
  return res.status(500).json({ message: 'internal server error' });
});


app.use('*', (req, res) => {
  return res.status(404).json({ message: 'route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
  console.log(`environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`api documentation available at http://localhost:${PORT}/api`);
});


process.on('SIGTERM', () => {
  console.log('sigterm received, shutting down gracefully');
  server.close(() => {
    console.log('server closed');
    process.exit(0);
  });
});

export default app;