import { Router } from 'express';
import passport from '../config/passport.js';
import { isAuthenticated } from '../middleware/auth.js';
import { User } from '../db/schema.js';
import { authAudit } from '../lib/audit.js';

const router = Router();

const FRONTEND_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const user = req.user as User;
    authAudit.login(req, user.id, 'google');
    if (!user.invite_redeemed && user.role !== 'admin') {
      res.redirect(`${FRONTEND_URL}/redeem-invite`);
    } else {
      res.redirect(`${FRONTEND_URL}/`);
    }
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/login?error=github_failed` }),
  (req, res) => {
    const user = req.user as User;
    authAudit.login(req, user.id, 'github');
    if (!user.invite_redeemed && user.role !== 'admin') {
      res.redirect(`${FRONTEND_URL}/redeem-invite`);
    } else {
      res.redirect(`${FRONTEND_URL}/`);
    }
  }
);

// Discord OAuth
router.get('/discord', passport.authenticate('discord'));

router.get(
  '/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: `${FRONTEND_URL}/login?error=discord_failed`,
  }),
  (req, res) => {
    const user = req.user as User;
    authAudit.login(req, user.id, 'discord');
    if (!user.invite_redeemed && user.role !== 'admin') {
      res.redirect(`${FRONTEND_URL}/redeem-invite`);
    } else {
      res.redirect(`${FRONTEND_URL}/`);
    }
  }
);

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
  const user = req.user as User;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    provider: user.provider,
    role: user.role,
    invite_redeemed: !!user.invite_redeemed,
  });
});

// Logout
router.post('/logout', (req, res, next) => {
  // Log before destroying session (while we still have user info)
  authAudit.logout(req);

  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      // SECURITY: Clear the correct session cookie
      res.clearCookie('possumbly.sid');
      res.json({ success: true });
    });
  });
});

// Check auth status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as User;
    res.json({
      authenticated: true,
      inviteRedeemed: !!user.invite_redeemed || user.role === 'admin',
    });
  } else {
    res.json({ authenticated: false, inviteRedeemed: false });
  }
});

export default router;
