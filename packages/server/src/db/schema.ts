import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/possumbly.db';

let db: SqlJsDatabase;

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDatabase, 30000);

// Save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});
process.on('SIGTERM', () => {
  saveDatabase();
  process.exit();
});

export async function initializeDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    -- Users from OAuth providers
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      avatar_url TEXT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      invite_redeemed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(provider, provider_id)
    );

    -- Invite codes for access control
    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      created_by TEXT REFERENCES users(id),
      used_by TEXT REFERENCES users(id),
      created_at INTEGER NOT NULL,
      used_at INTEGER
    );

    -- Meme templates (uploaded images)
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      uploaded_by TEXT REFERENCES users(id),
      created_at INTEGER NOT NULL
    );

    -- Generated memes (metadata + editor state)
    CREATE TABLE IF NOT EXISTS memes (
      id TEXT PRIMARY KEY,
      template_id TEXT REFERENCES templates(id),
      created_by TEXT REFERENCES users(id),
      editor_state TEXT NOT NULL,
      output_filename TEXT,
      is_public INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- Votes for memes
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      meme_id TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      vote_type INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(meme_id, user_id)
    );

    -- Audit logs for security events
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Migration: Add is_public column if it doesn't exist (must run before indexes)
  try {
    db.exec('SELECT is_public FROM memes LIMIT 1');
  } catch {
    db.run('ALTER TABLE memes ADD COLUMN is_public INTEGER DEFAULT 0');
  }

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_templates_uploaded_by ON templates(uploaded_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_memes_created_by ON memes(created_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_memes_template_id ON memes(template_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_memes_is_public ON memes(is_public)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_votes_meme_id ON votes(meme_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`)

  saveDatabase();
  console.log('Database initialized');

  return db;
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function save() {
  saveDatabase();
}

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: 'google' | 'github' | 'discord';
  provider_id: string;
  role: 'admin' | 'user';
  invite_redeemed: number;
  created_at: number;
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  created_at: number;
  used_at: number | null;
}

export interface Template {
  id: string;
  name: string;
  filename: string;
  width: number;
  height: number;
  uploaded_by: string | null;
  created_at: number;
}

export interface Meme {
  id: string;
  template_id: string;
  created_by: string | null;
  editor_state: string;
  output_filename: string | null;
  is_public: number;
  created_at: number;
}

export interface Vote {
  id: string;
  meme_id: string;
  user_id: string;
  vote_type: number; // 1 = upvote, -1 = downvote
  created_at: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: number;
}

// Audit action types
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'user.created'
  | 'user.role_changed'
  | 'user.invite_redeemed'
  | 'invite.created'
  | 'invite.deleted'
  | 'invite.redeem_failed'
  | 'template.created'
  | 'template.deleted'
  | 'meme.created'
  | 'meme.updated'
  | 'meme.deleted'
  | 'meme.visibility_changed'
  | 'vote.cast'
  | 'vote.removed'
  | 'admin.bootstrap'
  | 'access.denied';

// Helper to convert sql.js result to typed array
function resultToArray<T>(result: initSqlJs.QueryExecResult[]): T[] {
  if (!result.length || !result[0].values.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

function resultToSingle<T>(result: initSqlJs.QueryExecResult[]): T | undefined {
  const arr = resultToArray<T>(result);
  return arr[0];
}

// User queries
export const userQueries = {
  findById: (id: string): User | undefined => {
    const result = getDb().exec('SELECT * FROM users WHERE id = ?', [id]);
    return resultToSingle<User>(result);
  },
  findByProviderId: (provider: string, providerId: string): User | undefined => {
    const result = getDb().exec('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [
      provider,
      providerId,
    ]);
    return resultToSingle<User>(result);
  },
  findByEmail: (email: string): User | undefined => {
    const result = getDb().exec('SELECT * FROM users WHERE email = ?', [email]);
    return resultToSingle<User>(result);
  },
  create: (
    id: string,
    email: string | null,
    name: string | null,
    avatarUrl: string | null,
    provider: string,
    providerId: string,
    createdAt: number
  ) => {
    getDb().run(
      'INSERT INTO users (id, email, name, avatar_url, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, name, avatarUrl, provider, providerId, createdAt]
    );
    save();
  },
  updateInviteRedeemed: (id: string) => {
    getDb().run('UPDATE users SET invite_redeemed = 1 WHERE id = ?', [id]);
    save();
  },
  setRole: (role: string, id: string) => {
    getDb().run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    save();
  },
  getAll: (): User[] => {
    const result = getDb().exec('SELECT * FROM users ORDER BY created_at DESC');
    return resultToArray<User>(result);
  },
};

// Invite code queries
export const inviteQueries = {
  findByCode: (code: string): InviteCode | undefined => {
    const result = getDb().exec('SELECT * FROM invite_codes WHERE code = ?', [code]);
    return resultToSingle<InviteCode>(result);
  },
  findById: (id: string): InviteCode | undefined => {
    const result = getDb().exec('SELECT * FROM invite_codes WHERE id = ?', [id]);
    return resultToSingle<InviteCode>(result);
  },
  create: (id: string, code: string, createdBy: string, createdAt: number) => {
    getDb().run(
      'INSERT INTO invite_codes (id, code, created_by, created_at) VALUES (?, ?, ?, ?)',
      [id, code, createdBy, createdAt]
    );
    save();
  },
  redeem: (usedBy: string, usedAt: number, code: string) => {
    getDb().run('UPDATE invite_codes SET used_by = ?, used_at = ? WHERE code = ?', [
      usedBy,
      usedAt,
      code,
    ]);
    save();
  },
  getAll: (): InviteCode[] => {
    const result = getDb().exec('SELECT * FROM invite_codes ORDER BY created_at DESC');
    return resultToArray<InviteCode>(result);
  },
  delete: (id: string) => {
    getDb().run('DELETE FROM invite_codes WHERE id = ?', [id]);
    save();
  },
};

// Template queries
export const templateQueries = {
  findById: (id: string): Template | undefined => {
    const result = getDb().exec('SELECT * FROM templates WHERE id = ?', [id]);
    return resultToSingle<Template>(result);
  },
  create: (
    id: string,
    name: string,
    filename: string,
    width: number,
    height: number,
    uploadedBy: string,
    createdAt: number
  ) => {
    getDb().run(
      'INSERT INTO templates (id, name, filename, width, height, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, filename, width, height, uploadedBy, createdAt]
    );
    save();
  },
  getAll: (): Template[] => {
    const result = getDb().exec('SELECT * FROM templates ORDER BY created_at DESC');
    return resultToArray<Template>(result);
  },
  delete: (id: string) => {
    getDb().run('DELETE FROM templates WHERE id = ?', [id]);
    save();
  },
};

// Meme queries
export const memeQueries = {
  findById: (id: string): Meme | undefined => {
    const result = getDb().exec('SELECT * FROM memes WHERE id = ?', [id]);
    return resultToSingle<Meme>(result);
  },
  findByUser: (userId: string): Meme[] => {
    const result = getDb().exec(
      'SELECT * FROM memes WHERE created_by = ? ORDER BY created_at DESC',
      [userId]
    );
    return resultToArray<Meme>(result);
  },
  create: (
    id: string,
    templateId: string,
    createdBy: string,
    editorState: string,
    outputFilename: string | null,
    createdAt: number
  ) => {
    getDb().run(
      'INSERT INTO memes (id, template_id, created_by, editor_state, output_filename, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, templateId, createdBy, editorState, outputFilename, createdAt]
    );
    save();
  },
  update: (editorState: string, outputFilename: string | null, id: string) => {
    getDb().run('UPDATE memes SET editor_state = ?, output_filename = ? WHERE id = ?', [
      editorState,
      outputFilename,
      id,
    ]);
    save();
  },
  setPublic: (id: string, isPublic: boolean) => {
    getDb().run('UPDATE memes SET is_public = ? WHERE id = ?', [isPublic ? 1 : 0, id]);
    save();
  },
  delete: (id: string) => {
    getDb().run('DELETE FROM memes WHERE id = ?', [id]);
    save();
  },
  getAll: (): Meme[] => {
    const result = getDb().exec('SELECT * FROM memes ORDER BY created_at DESC');
    return resultToArray<Meme>(result);
  },
  getPublic: (): Meme[] => {
    const result = getDb().exec('SELECT * FROM memes WHERE is_public = 1 ORDER BY created_at DESC');
    return resultToArray<Meme>(result);
  },
};

// Vote queries
export const voteQueries = {
  findById: (id: string): Vote | undefined => {
    const result = getDb().exec('SELECT * FROM votes WHERE id = ?', [id]);
    return resultToSingle<Vote>(result);
  },
  findByMemeAndUser: (memeId: string, userId: string): Vote | undefined => {
    const result = getDb().exec('SELECT * FROM votes WHERE meme_id = ? AND user_id = ?', [
      memeId,
      userId,
    ]);
    return resultToSingle<Vote>(result);
  },
  findByMeme: (memeId: string): Vote[] => {
    const result = getDb().exec('SELECT * FROM votes WHERE meme_id = ?', [memeId]);
    return resultToArray<Vote>(result);
  },
  getVoteCounts: (memeId: string): { upvotes: number; downvotes: number; score: number } => {
    const upResult = getDb().exec(
      'SELECT COUNT(*) as count FROM votes WHERE meme_id = ? AND vote_type = 1',
      [memeId]
    );
    const downResult = getDb().exec(
      'SELECT COUNT(*) as count FROM votes WHERE meme_id = ? AND vote_type = -1',
      [memeId]
    );
    const upvotes = upResult.length && upResult[0].values.length ? (upResult[0].values[0][0] as number) : 0;
    const downvotes = downResult.length && downResult[0].values.length ? (downResult[0].values[0][0] as number) : 0;
    return { upvotes, downvotes, score: upvotes - downvotes };
  },
  create: (id: string, memeId: string, userId: string, voteType: number, createdAt: number) => {
    getDb().run(
      'INSERT INTO votes (id, meme_id, user_id, vote_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, memeId, userId, voteType, createdAt]
    );
    save();
  },
  update: (voteType: number, memeId: string, userId: string) => {
    getDb().run('UPDATE votes SET vote_type = ? WHERE meme_id = ? AND user_id = ?', [
      voteType,
      memeId,
      userId,
    ]);
    save();
  },
  delete: (memeId: string, userId: string) => {
    getDb().run('DELETE FROM votes WHERE meme_id = ? AND user_id = ?', [memeId, userId]);
    save();
  },
  deleteByMeme: (memeId: string) => {
    getDb().run('DELETE FROM votes WHERE meme_id = ?', [memeId]);
    save();
  },
};

// Audit log queries
export const auditQueries = {
  create: (
    id: string,
    action: AuditAction,
    options: {
      userId?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
      details?: Record<string, unknown> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      success?: boolean;
    } = {}
  ) => {
    const {
      userId = null,
      resourceType = null,
      resourceId = null,
      details = null,
      ipAddress = null,
      userAgent = null,
      success = true,
    } = options;

    getDb().run(
      `INSERT INTO audit_logs (id, timestamp, user_id, action, resource_type, resource_id, details, ip_address, user_agent, success)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        Date.now(),
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        success ? 1 : 0,
      ]
    );
    // Don't save immediately - let the periodic save handle it for performance
  },

  findByUser: (userId: string, limit = 100): AuditLog[] => {
    const result = getDb().exec(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return resultToArray<AuditLog>(result);
  },

  findByAction: (action: string, limit = 100): AuditLog[] => {
    const result = getDb().exec(
      'SELECT * FROM audit_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ?',
      [action, limit]
    );
    return resultToArray<AuditLog>(result);
  },

  findByResource: (resourceType: string, resourceId: string, limit = 100): AuditLog[] => {
    const result = getDb().exec(
      'SELECT * FROM audit_logs WHERE resource_type = ? AND resource_id = ? ORDER BY timestamp DESC LIMIT ?',
      [resourceType, resourceId, limit]
    );
    return resultToArray<AuditLog>(result);
  },

  getRecent: (limit = 100): AuditLog[] => {
    const result = getDb().exec(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
    return resultToArray<AuditLog>(result);
  },

  getSecurityEvents: (limit = 100): AuditLog[] => {
    const result = getDb().exec(
      `SELECT * FROM audit_logs
       WHERE action IN ('auth.login', 'auth.logout', 'auth.login_failed', 'user.role_changed', 'admin.bootstrap', 'access.denied')
       ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return resultToArray<AuditLog>(result);
  },

  // Cleanup old logs (keep last 30 days by default)
  cleanup: (olderThanMs = 30 * 24 * 60 * 60 * 1000) => {
    const cutoff = Date.now() - olderThanMs;
    getDb().run('DELETE FROM audit_logs WHERE timestamp < ?', [cutoff]);
    save();
  },
};
