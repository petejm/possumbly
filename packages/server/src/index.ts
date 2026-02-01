import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (three levels up from src/index.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import passport, { configurePassport } from './config/passport.js';
import { initializeDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invites.js';
import templateRoutes from './routes/templates.js';
import memeRoutes from './routes/memes.js';
import adminRoutes from './routes/admin.js';
import voteRoutes from './routes/votes.js';
import galleryRoutes from './routes/gallery.js';
import { isAuthenticated, csrfProtection } from './middleware/auth.js';

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const UPLOADS_PATH = process.env.UPLOADS_PATH || './data/uploads';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

// SECURITY: Require session secret in production
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: SESSION_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('WARNING: Using default session secret. Set SESSION_SECRET in production!');
}

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

async function main() {
  // Initialize database
  await initializeDatabase();

  // Configure passport after database is ready
  configurePassport();

  const app = express();

  // Trust proxy for secure cookies behind reverse proxy
  app.set('trust proxy', 1);

  // SECURITY: Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow loading images
    })
  );

  // SECURITY: Global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  // SECURITY: Strict rate limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 auth attempts per window
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // SECURITY: Strict rate limiter for invite redemption (prevent brute force)
  const inviteRedeemLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: { error: 'Too many invite code attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // CORS configuration
  app.use(
    cors({
      origin: PUBLIC_URL,
      credentials: true,
    })
  );

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' })); // Reduced from 50mb
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // SECURITY: CSRF protection for API routes
  app.use('/api', csrfProtection);

  // Session configuration with memory store
  const MemoryStore = createMemoryStore(session);

  const sessionConfig: session.SessionOptions = {
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: SESSION_SECRET || 'dev-secret-insecure',
    name: 'possumbly.sid', // Custom cookie name (don't reveal tech stack)
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (reduced from 30)
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  };

  app.use(session(sessionConfig));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // SECURITY: Protect uploads with authentication
  app.use('/uploads', isAuthenticated, (req, res, next) => {
    // Set security headers for uploaded files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    next();
  }, express.static(UPLOADS_PATH));

  // API routes with rate limiting
  app.use('/auth', authLimiter, authRoutes);
  app.use('/api/invites/redeem', inviteRedeemLimiter); // Extra protection for redeem
  app.use('/api/invites', inviteRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/memes', memeRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/votes', voteRoutes);
  app.use('/api/gallery', galleryRoutes);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' }); // Don't expose timestamp
  });

  // Serve static frontend in production
  if (process.env.NODE_ENV === 'production') {
    const webDistPath = path.join(__dirname, '../../web/dist');
    if (fs.existsSync(webDistPath)) {
      app.use(express.static(webDistPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(webDistPath, 'index.html'));
      });
    }
  }

  // Error handling middleware - don't expose internal errors
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  );

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public URL: ${PUBLIC_URL}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
