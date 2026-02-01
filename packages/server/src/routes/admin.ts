import { Router } from 'express';
import { userQueries, inviteQueries, User } from '../db/schema.js';
import { isAdmin } from '../middleware/auth.js';

const router = Router();

// SECURITY: Validate ID format
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// Get all users (admin only)
router.get('/users', isAdmin, (_req, res) => {
  try {
    const users = userQueries.getAll();

    // SECURITY: Remove sensitive info, only return necessary fields
    const safeUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      provider: user.provider,
      role: user.role,
      invite_redeemed: !!user.invite_redeemed,
      created_at: user.created_at,
    }));

    res.json(safeUsers);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Update user role (admin only)
router.patch('/users/:id/role', isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUser = req.user as User;

    // SECURITY: Validate ID format
    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // SECURITY: Strict role validation
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    const user = userQueries.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // SECURITY: Prevent self-demotion
    if (currentUser.id === id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    userQueries.setRole(role, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get stats (admin only)
router.get('/stats', isAdmin, (_req, res) => {
  try {
    const users = userQueries.getAll();
    const invites = inviteQueries.getAll();

    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter((u) => u.role === 'admin').length,
      activeUsers: users.filter((u) => u.invite_redeemed || u.role === 'admin').length,
      pendingUsers: users.filter((u) => !u.invite_redeemed && u.role !== 'admin').length,
      totalInvites: invites.length,
      usedInvites: invites.filter((i) => i.used_by).length,
      availableInvites: invites.filter((i) => !i.used_by).length,
    };

    res.json(stats);
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Create first admin (only works if no admins exist)
router.post('/bootstrap', (req, res) => {
  try {
    const users = userQueries.getAll();
    const admins = users.filter((u) => u.role === 'admin');

    // SECURITY: Only allow bootstrap if no admins exist
    if (admins.length > 0) {
      return res.status(403).json({ error: 'Admin already exists' });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Must be authenticated to bootstrap admin' });
    }

    const user = req.user as User;
    userQueries.setRole('admin', user.id);
    userQueries.updateInviteRedeemed(user.id);

    res.json({ success: true, message: 'You are now an admin' });
  } catch (err) {
    console.error('Error bootstrapping admin:', err);
    res.status(500).json({ error: 'Failed to bootstrap admin' });
  }
});

export default router;
