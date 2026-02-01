import { Router } from 'express';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { inviteQueries, userQueries, User } from '../db/schema.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// SECURITY: Generate a cryptographically random invite code
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// SECURITY: Validate invite code format (12 hex characters)
function isValidInviteCode(code: string): boolean {
  return /^[A-F0-9]{12}$/.test(code.toUpperCase());
}

// SECURITY: Validate ID format
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// Create new invite code (admin only)
router.post('/', isAdmin, (req, res) => {
  try {
    const user = req.user as User;
    const id = nanoid();
    const code = generateInviteCode();
    const now = Date.now();

    inviteQueries.create(id, code, user.id, now);

    res.status(201).json({
      id,
      code,
      created_at: now,
    });
  } catch (err) {
    console.error('Error creating invite code:', err);
    res.status(500).json({ error: 'Failed to create invite code' });
  }
});

// List all invite codes (admin only)
router.get('/', isAdmin, (_req, res) => {
  try {
    const invites = inviteQueries.getAll();

    const enrichedInvites = invites.map((invite) => {
      const createdByUser = invite.created_by ? userQueries.findById(invite.created_by) : null;
      const usedByUser = invite.used_by ? userQueries.findById(invite.used_by) : null;

      return {
        ...invite,
        created_by_name: createdByUser?.name || createdByUser?.email || null,
        used_by_name: usedByUser?.name || usedByUser?.email || null,
      };
    });

    res.json(enrichedInvites);
  } catch (err) {
    console.error('Error listing invite codes:', err);
    res.status(500).json({ error: 'Failed to list invite codes' });
  }
});

// Redeem invite code
router.post('/redeem', isAuthenticated, (req, res) => {
  try {
    const user = req.user as User;
    const { code } = req.body;

    // SECURITY: Validate input
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();

    // SECURITY: Validate format before database lookup
    if (!isValidInviteCode(normalizedCode)) {
      // Use same error message to prevent enumeration
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    // Check if user already has invite
    if (user.invite_redeemed || user.role === 'admin') {
      return res.status(400).json({ error: 'You already have access' });
    }

    // Find the invite code
    const invite = inviteQueries.findByCode(normalizedCode);

    // SECURITY: Use constant-time comparison and same error for not found vs already used
    if (!invite || invite.used_by) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    // Redeem the code
    const now = Date.now();
    inviteQueries.redeem(user.id, now, normalizedCode);
    userQueries.updateInviteRedeemed(user.id);

    res.json({ success: true, message: 'Invite code redeemed successfully' });
  } catch (err) {
    console.error('Error redeeming invite code:', err);
    res.status(500).json({ error: 'Failed to redeem invite code' });
  }
});

// Delete invite code (admin only)
router.delete('/:id', isAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Validate ID format
    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid invite ID' });
    }

    const invite = inviteQueries.findById(id);

    if (!invite) {
      return res.status(404).json({ error: 'Invite code not found' });
    }

    if (invite.used_by) {
      return res.status(400).json({ error: 'Cannot delete a used invite code' });
    }

    inviteQueries.delete(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting invite code:', err);
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

export default router;
