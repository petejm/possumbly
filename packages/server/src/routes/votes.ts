import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { memeQueries, voteQueries, User } from '../db/schema.js';
import { hasInvite } from '../middleware/auth.js';

const router = Router();

// Rate limiting for voting
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 votes per 15 minutes per IP
  message: { error: 'Too many vote requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate ID format
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// Get vote counts and user's vote for a meme
router.get('/:memeId', hasInvite, (req, res) => {
  try {
    const { memeId } = req.params;
    const user = req.user as User;

    if (!isValidId(memeId)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(memeId);
    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    // Users can view votes for public memes or their own memes
    if (!meme.is_public && meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this meme' });
    }

    const { upvotes, downvotes, score } = voteQueries.getVoteCounts(memeId);
    const userVote = voteQueries.findByMemeAndUser(memeId, user.id);

    res.json({
      upvotes,
      downvotes,
      score,
      userVote: userVote?.vote_type || null,
    });
  } catch (err) {
    console.error('Error getting vote counts:', err);
    res.status(500).json({ error: 'Failed to get vote counts' });
  }
});

// Cast a vote
router.post('/:memeId', hasInvite, voteLimiter, (req, res) => {
  try {
    const { memeId } = req.params;
    const user = req.user as User;
    const { vote } = req.body;

    if (!isValidId(memeId)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    // Validate vote type
    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ error: 'Vote must be 1 (upvote) or -1 (downvote)' });
    }

    const meme = memeQueries.findById(memeId);
    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    // Users can only vote on public memes
    if (!meme.is_public) {
      return res.status(403).json({ error: 'Can only vote on public memes' });
    }

    // Check if user already voted
    const existingVote = voteQueries.findByMemeAndUser(memeId, user.id);

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote_type === vote) {
        // Same vote, do nothing
        const { upvotes, downvotes, score } = voteQueries.getVoteCounts(memeId);
        return res.json({ upvotes, downvotes, score, userVote: vote });
      }
      voteQueries.update(vote, memeId, user.id);
    } else {
      // Create new vote
      const id = nanoid();
      voteQueries.create(id, memeId, user.id, vote, Date.now());
    }

    const { upvotes, downvotes, score } = voteQueries.getVoteCounts(memeId);
    res.json({ upvotes, downvotes, score, userVote: vote });
  } catch (err) {
    console.error('Error casting vote:', err);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

// Remove a vote
router.delete('/:memeId', hasInvite, voteLimiter, (req, res) => {
  try {
    const { memeId } = req.params;
    const user = req.user as User;

    if (!isValidId(memeId)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(memeId);
    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    // Delete the vote if it exists
    voteQueries.delete(memeId, user.id);

    const { upvotes, downvotes, score } = voteQueries.getVoteCounts(memeId);
    res.json({ upvotes, downvotes, score, userVote: null });
  } catch (err) {
    console.error('Error removing vote:', err);
    res.status(500).json({ error: 'Failed to remove vote' });
  }
});

export default router;
