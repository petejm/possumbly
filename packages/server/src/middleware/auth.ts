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
