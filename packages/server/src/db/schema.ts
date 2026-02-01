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
      created_at INTEGER NOT NULL
    );
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_templates_uploaded_by ON templates(uploaded_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_memes_created_by ON memes(created_by)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_memes_template_id ON memes(template_id)`);

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
  created_at: number;
}

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
  delete: (id: string) => {
    getDb().run('DELETE FROM memes WHERE id = ?', [id]);
    save();
  },
  getAll: (): Meme[] => {
    const result = getDb().exec('SELECT * FROM memes ORDER BY created_at DESC');
    return resultToArray<Meme>(result);
  },
};
