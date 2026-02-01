import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { memeQueries, templateQueries, voteQueries, User } from '../db/schema.js';
import { hasInvite } from '../middleware/auth.js';

const router = Router();

// SECURITY: Rate limiting for resource-intensive operations
const renderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 renders per 15 minutes per IP
  message: { error: 'Too many render requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 deletes per 15 minutes per IP
  message: { error: 'Too many delete requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const UPLOADS_PATH = process.env.UPLOADS_PATH || './data/uploads';
const MEMES_PATH = path.join(UPLOADS_PATH, 'memes');

// SECURITY: Limits
const MAX_EDITOR_STATE_SIZE = 100 * 1024; // 100KB max for editor state
const MAX_TEXT_BOXES = 50;
const MAX_TEXT_LENGTH = 1000;

// Ensure memes directory exists
if (!fs.existsSync(MEMES_PATH)) {
  fs.mkdirSync(MEMES_PATH, { recursive: true });
}

// SECURITY: Validate editor state structure
function validateEditorState(state: unknown): { valid: boolean; error?: string } {
  if (!state || typeof state !== 'object') {
    return { valid: false, error: 'Editor state must be an object' };
  }

  const editorState = state as Record<string, unknown>;

  if (!Array.isArray(editorState.textBoxes)) {
    return { valid: false, error: 'Editor state must contain textBoxes array' };
  }

  if (editorState.textBoxes.length > MAX_TEXT_BOXES) {
    return { valid: false, error: `Maximum ${MAX_TEXT_BOXES} text boxes allowed` };
  }

  for (const box of editorState.textBoxes) {
    if (typeof box !== 'object' || box === null) {
      return { valid: false, error: 'Invalid text box format' };
    }

    const textBox = box as Record<string, unknown>;

    if (typeof textBox.text === 'string' && textBox.text.length > MAX_TEXT_LENGTH) {
      return { valid: false, error: `Text must be ${MAX_TEXT_LENGTH} characters or less` };
    }

    // Validate numeric fields are numbers
    const numericFields = ['x', 'y', 'width', 'fontSize', 'strokeWidth', 'rotation'];
    for (const field of numericFields) {
      if (textBox[field] !== undefined && typeof textBox[field] !== 'number') {
        return { valid: false, error: `${field} must be a number` };
      }
    }
  }

  // Check total size
  const stateJson = JSON.stringify(state);
  if (stateJson.length > MAX_EDITOR_STATE_SIZE) {
    return { valid: false, error: 'Editor state too large' };
  }

  return { valid: true };
}

// SECURITY: Validate ID format
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// SECURITY: Safe JSON parsing with fallback
function safeParseEditorState(jsonString: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return { textBoxes: [] };
  } catch {
    console.error('Failed to parse editor state, using empty state');
    return { textBoxes: [] };
  }
}

// Get all memes for current user
router.get('/', hasInvite, (req, res) => {
  try {
    const user = req.user as User;
    const memes = memeQueries.findByUser(user.id);

    const enrichedMemes = memes.map((meme) => {
      const template = templateQueries.findById(meme.template_id);
      const { upvotes, downvotes, score } = voteQueries.getVoteCounts(meme.id);
      return {
        ...meme,
        editor_state: safeParseEditorState(meme.editor_state),
        template_name: template?.name || null,
        template_filename: template?.filename || null,
        upvotes,
        downvotes,
        score,
      };
    });

    res.json(enrichedMemes);
  } catch (err) {
    console.error('Error listing memes:', err);
    res.status(500).json({ error: 'Failed to list memes' });
  }
});

// Get single meme
router.get('/:id', hasInvite, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(id);

    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    if (meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this meme' });
    }

    const template = templateQueries.findById(meme.template_id);

    res.json({
      ...meme,
      editor_state: safeParseEditorState(meme.editor_state),
      template_name: template?.name || null,
      template_filename: template?.filename || null,
      template_width: template?.width || null,
      template_height: template?.height || null,
    });
  } catch (err) {
    console.error('Error getting meme:', err);
    res.status(500).json({ error: 'Failed to get meme' });
  }
});

// Create new meme
router.post('/', hasInvite, (req, res) => {
  try {
    const user = req.user as User;
    const { template_id, editor_state } = req.body;

    if (!template_id || typeof template_id !== 'string') {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    if (!isValidId(template_id)) {
      return res.status(400).json({ error: 'Invalid template ID format' });
    }

    // SECURITY: Validate editor state
    const validation = validateEditorState(editor_state);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const template = templateQueries.findById(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const id = nanoid();
    const now = Date.now();

    memeQueries.create(id, template_id, user.id, JSON.stringify(editor_state), null, now);

    const meme = memeQueries.findById(id);
    res.status(201).json({
      ...meme,
      editor_state: safeParseEditorState(meme!.editor_state),
    });
  } catch (err) {
    console.error('Error creating meme:', err);
    res.status(500).json({ error: 'Failed to create meme' });
  }
});

// Update meme
router.put('/:id', hasInvite, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;
    const { editor_state } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(id);

    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    if (meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this meme' });
    }

    // SECURITY: Validate editor state
    const validation = validateEditorState(editor_state);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    memeQueries.update(JSON.stringify(editor_state), meme.output_filename, id);

    const updatedMeme = memeQueries.findById(id);
    res.json({
      ...updatedMeme,
      editor_state: safeParseEditorState(updatedMeme!.editor_state),
    });
  } catch (err) {
    console.error('Error updating meme:', err);
    res.status(500).json({ error: 'Failed to update meme' });
  }
});

// Save rendered meme image
router.post('/:id/render', hasInvite, renderLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;
    const { imageData } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(id);

    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    if (meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to save this meme' });
    }

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // SECURITY: Validate base64 image data format
    const matches = imageData.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    const [, format, base64Data] = matches;

    // SECURITY: Limit base64 size (roughly 10MB decoded)
    if (base64Data.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image data too large' });
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // SECURITY: Verify it's actually an image using sharp
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        return res.status(400).json({ error: 'Invalid image data' });
      }
      if (metadata.width > 4096 || metadata.height > 4096) {
        return res.status(400).json({ error: 'Image dimensions too large' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    const filename = `${id}.${format}`;
    const filePath = path.join(MEMES_PATH, filename);

    // Delete old file if exists
    if (meme.output_filename && /^[a-zA-Z0-9_-]+\.(png|jpeg|webp)$/.test(meme.output_filename)) {
      const oldPath = path.join(MEMES_PATH, meme.output_filename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Write new file
    fs.writeFileSync(filePath, buffer);

    // Update database
    memeQueries.update(meme.editor_state, filename, id);

    res.json({ success: true, filename });
  } catch (err) {
    console.error('Error saving rendered meme:', err);
    res.status(500).json({ error: 'Failed to save rendered meme' });
  }
});

// Toggle meme visibility (public/private)
router.patch('/:id/visibility', hasInvite, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;
    const { is_public } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    if (typeof is_public !== 'boolean') {
      return res.status(400).json({ error: 'is_public must be a boolean' });
    }

    const meme = memeQueries.findById(id);

    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    if (meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this meme' });
    }

    memeQueries.setPublic(id, is_public);

    const updatedMeme = memeQueries.findById(id);
    const { upvotes, downvotes, score } = voteQueries.getVoteCounts(id);

    res.json({
      ...updatedMeme,
      editor_state: safeParseEditorState(updatedMeme!.editor_state),
      upvotes,
      downvotes,
      score,
    });
  } catch (err) {
    console.error('Error updating meme visibility:', err);
    res.status(500).json({ error: 'Failed to update meme visibility' });
  }
});

// Delete meme
router.delete('/:id', hasInvite, deleteLimiter, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid meme ID' });
    }

    const meme = memeQueries.findById(id);

    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    if (meme.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this meme' });
    }

    // Delete file if exists (with validation)
    if (meme.output_filename && /^[a-zA-Z0-9_-]+\.(png|jpeg|webp)$/.test(meme.output_filename)) {
      const filePath = path.join(MEMES_PATH, meme.output_filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete associated votes
    voteQueries.deleteByMeme(id);

    memeQueries.delete(id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting meme:', err);
    res.status(500).json({ error: 'Failed to delete meme' });
  }
});

export default router;
