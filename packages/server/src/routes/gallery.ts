import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { memeQueries, templateQueries, userQueries, voteQueries, User } from '../db/schema.js';
import { hasInvite, isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Rate limiting for gallery requests
const galleryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: { error: 'Too many gallery requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Time period filters in milliseconds
const TIME_PERIODS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

// Reddit-style hot score algorithm
function getHotScore(upvotes: number, downvotes: number, createdAt: number): number {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  // Using Jan 1, 2024 as epoch for hot score calculation
  const seconds = createdAt / 1000 - 1704067200;
  return sign * order + seconds / 45000;
}

interface GalleryMeme {
  id: string;
  template_id: string;
  created_by: string | null;
  output_filename: string | null;
  is_public: number;
  created_at: number;
  template_name: string | null;
  template_filename: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: number | null;
}

// Get public memes for gallery
router.get('/', galleryLimiter, isAuthenticated, hasInvite, (req, res) => {
  try {
    const user = req.user as User | undefined;
    const {
      period = 'all',
      sort = 'hot',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    // Validate parameters
    const validPeriods = ['7d', '30d', 'year', 'all'];
    const validSorts = ['hot', 'top', 'new'];

    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be 7d, 30d, year, or all' });
    }

    if (!validSorts.includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort. Must be hot, top, or new' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Get all public memes
    const publicMemes = memeQueries.getPublic();

    // Filter by time period
    const now = Date.now();
    const periodMs = TIME_PERIODS[period];
    const filteredMemes = publicMemes.filter((meme) => {
      if (periodMs === Infinity) return true;
      return now - meme.created_at <= periodMs;
    });

    // Enrich memes with vote counts and metadata
    const enrichedMemes: GalleryMeme[] = filteredMemes.map((meme) => {
      const template = templateQueries.findById(meme.template_id);
      const creator = meme.created_by ? userQueries.findById(meme.created_by) : null;
      const { upvotes, downvotes, score } = voteQueries.getVoteCounts(meme.id);
      const userVote = user ? voteQueries.findByMemeAndUser(meme.id, user.id) : null;

      return {
        id: meme.id,
        template_id: meme.template_id,
        created_by: meme.created_by,
        output_filename: meme.output_filename,
        is_public: meme.is_public,
        created_at: meme.created_at,
        template_name: template?.name || null,
        template_filename: template?.filename || null,
        creator_name: creator?.name || null,
        creator_avatar: creator?.avatar_url || null,
        upvotes,
        downvotes,
        score,
        userVote: userVote?.vote_type || null,
      };
    });

    // Sort based on sort parameter
    let sortedMemes: GalleryMeme[];
    switch (sort) {
      case 'hot':
        sortedMemes = [...enrichedMemes].sort((a, b) => {
          const hotA = getHotScore(a.upvotes, a.downvotes, a.created_at);
          const hotB = getHotScore(b.upvotes, b.downvotes, b.created_at);
          return hotB - hotA;
        });
        break;
      case 'top':
        sortedMemes = [...enrichedMemes].sort((a, b) => b.score - a.score);
        break;
      case 'new':
      default:
        sortedMemes = [...enrichedMemes].sort((a, b) => b.created_at - a.created_at);
        break;
    }

    // Paginate
    const total = sortedMemes.length;
    const totalPages = Math.ceil(total / limitNum);
    const offset = (pageNum - 1) * limitNum;
    const paginatedMemes = sortedMemes.slice(offset, offset + limitNum);

    res.json({
      memes: paginatedMemes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    console.error('Error fetching gallery:', err);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

export default router;
