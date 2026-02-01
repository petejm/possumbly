import { Request, Response, NextFunction } from 'express';
import { User } from '../db/schema.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User extends Omit<import('../db/schema.js').User, 'provider'> {
      provider: 'google' | 'github' | 'discord';
    }
  }
}

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

// SECURITY: CSRF protection via Origin/Referer validation
// This supplements SameSite=strict cookies for defense in depth
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Only check state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  // Parse the expected origin from PUBLIC_URL
  let expectedOrigin: string;
  try {
    const url = new URL(PUBLIC_URL);
    expectedOrigin = url.origin;
  } catch {
    console.error('Invalid PUBLIC_URL configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Check Origin header first (preferred)
  if (origin) {
    if (origin !== expectedOrigin) {
      console.warn(`CSRF: Origin mismatch - got ${origin}, expected ${expectedOrigin}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin !== expectedOrigin) {
        console.warn(`CSRF: Referer mismatch - got ${refererUrl.origin}, expected ${expectedOrigin}`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    } catch {
      // Invalid referer URL
      console.warn('CSRF: Invalid referer URL');
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  // In production, require Origin or Referer header
  // In development, allow requests without these headers for easier testing
  if (process.env.NODE_ENV === 'production') {
    console.warn('CSRF: Missing Origin and Referer headers in production');
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

// Check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Check if user has redeemed an invite code
export function hasInvite(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = req.user as User;
  if (user.invite_redeemed || user.role === 'admin') {
    return next();
  }

  res.status(403).json({ error: 'Invite code required', code: 'INVITE_REQUIRED' });
}

// Check if user is an admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = req.user as User;
  if (user.role === 'admin') {
    return next();
  }

  res.status(403).json({ error: 'Admin access required' });
}
