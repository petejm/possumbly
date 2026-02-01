import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { templateQueries, User } from '../db/schema.js';
import { hasInvite } from '../middleware/auth.js';
import { templateAudit } from '../lib/audit.js';

const router = Router();

// SECURITY: Rate limiting for resource-intensive operations
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour per IP
  message: { error: 'Too many uploads. Please try again later.' },
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
const TEMPLATES_PATH = path.join(UPLOADS_PATH, 'templates');

// SECURITY: Allowed extensions (whitelist)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_NAME_LENGTH = 100;

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_PATH)) {
  fs.mkdirSync(TEMPLATES_PATH, { recursive: true });
}

// SECURITY: Sanitize template name - escape HTML entities
function sanitizeName(name: string): string {
  return name
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Configure multer for template uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMPLATES_PATH);
  },
  filename: (_req, file, cb) => {
    // SECURITY: Generate safe filename, ignore user-provided extension
    const id = nanoid();
    // Get extension from MIME type, not from user input
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    const ext = mimeToExt[file.mimetype] || '.jpg';
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1, // Only 1 file at a time
  },
  fileFilter: (_req, file, cb) => {
    // SECURITY: Strict MIME type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
      return;
    }

    // SECURITY: Also check extension as secondary validation
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new Error('Invalid file extension.'));
      return;
    }

    cb(null, true);
  },
});

// Get all templates
router.get('/', hasInvite, (_req, res) => {
  try {
    const templates = templateQueries.getAll();
    res.json(templates);
  } catch (err) {
    console.error('Error listing templates:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Get single template
router.get('/:id', hasInvite, (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Validate ID format (nanoid is alphanumeric)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = templateQueries.findById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error('Error getting template:', err);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Upload new template
router.post('/', hasInvite, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = req.user as User;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (name.length > MAX_NAME_LENGTH) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Template name must be ${MAX_NAME_LENGTH} characters or less` });
    }

    // SECURITY: Verify file is actually an image using sharp
    let metadata;
    try {
      metadata = await sharp(req.file.path).metadata();
    } catch {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid image file' });
    }

    if (!metadata.width || !metadata.height) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not read image dimensions' });
    }

    // SECURITY: Reasonable dimension limits
    if (metadata.width > 4096 || metadata.height > 4096) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Image dimensions too large (max 4096x4096)' });
    }

    const id = nanoid();
    const now = Date.now();

    // SECURITY: Sanitize the name before storing
    const sanitizedName = sanitizeName(name);

    templateQueries.create(
      id,
      sanitizedName,
      req.file.filename,
      metadata.width,
      metadata.height,
      user.id,
      now
    );
    templateAudit.created(req, id, sanitizedName);

    const template = templateQueries.findById(id);
    res.status(201).json(template);
  } catch (err) {
    console.error('Error uploading template:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload template' });
  }
});

// Delete template (admin or uploader)
router.delete('/:id', hasInvite, deleteLimiter, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as User;

    // SECURITY: Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = templateQueries.findById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check permission
    if (template.uploaded_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    // SECURITY: Validate filename before path operations
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/.test(template.filename)) {
      console.error('Invalid filename in database:', template.filename);
      return res.status(500).json({ error: 'Invalid template data' });
    }

    // Delete file
    const filePath = path.join(TEMPLATES_PATH, template.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    templateQueries.delete(id);
    templateAudit.deleted(req, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
