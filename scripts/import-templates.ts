import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES = [
  { name: 'Drake Hotline Bling', url: 'https://i.imgflip.com/4/30b1gx.jpg' },
  { name: 'Two Buttons', url: 'https://i.imgflip.com/4/1g8my4.jpg' },
  { name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/4/1ur9b0.jpg' },
  { name: 'Bernie I Am Once Again Asking', url: 'https://i.imgflip.com/4/3oevdk.jpg' },
  { name: 'UNO Draw 25 Cards', url: 'https://i.imgflip.com/4/3lmzyx.jpg' },
  { name: 'Left Exit 12 Off Ramp', url: 'https://i.imgflip.com/4/22bdq6.jpg' },
  { name: 'Running Away Balloon', url: 'https://i.imgflip.com/4/261o3j.jpg' },
  { name: 'Always Has Been', url: 'https://i.imgflip.com/4/46e43q.jpg' },
  { name: 'Epic Handshake', url: 'https://i.imgflip.com/4/28j0te.jpg' },
  { name: 'Marked Safe From', url: 'https://i.imgflip.com/4/2odckz.jpg' },
  { name: 'Disaster Girl', url: 'https://i.imgflip.com/4/23ls.jpg' },
  { name: "Gru's Plan", url: 'https://i.imgflip.com/4/26jxvz.jpg' },
  { name: 'Sad Pablo Escobar', url: 'https://i.imgflip.com/4/1c1uej.jpg' },
  { name: 'Anakin Padme 4 Panel', url: 'https://i.imgflip.com/4/5c7lwq.jpg' },
  { name: 'Change My Mind', url: 'https://i.imgflip.com/4/24y43o.jpg' },
  { name: 'Waiting Skeleton', url: 'https://i.imgflip.com/4/2fm6x.jpg' },
  { name: 'Mocking Spongebob', url: 'https://i.imgflip.com/4/1otk96.jpg' },
  { name: 'Batman Slapping Robin', url: 'https://i.imgflip.com/4/9ehk.jpg' },
  { name: 'Trade Offer', url: 'https://i.imgflip.com/4/54hjww.jpg' },
  { name: "Y'all Got Any More Of That", url: 'https://i.imgflip.com/4/21uy0f.jpg' },
  { name: 'Woman Yelling At Cat', url: 'https://i.imgflip.com/4/345v97.jpg' },
  { name: 'X, X Everywhere', url: 'https://i.imgflip.com/4/1ihzfe.jpg' },
  { name: 'Buff Doge vs Cheems', url: 'https://i.imgflip.com/4/43a45p.jpg' },
  { name: 'Success Kid', url: 'https://i.imgflip.com/4/1bhk.jpg' },
  { name: 'One Does Not Simply', url: 'https://i.imgflip.com/4/1bij.jpg' },
  { name: 'Tuxedo Winnie The Pooh', url: 'https://i.imgflip.com/4/2ybua0.jpg' },
  { name: 'Is This A Pigeon', url: 'https://i.imgflip.com/4/1o00in.jpg' },
  { name: 'Ancient Aliens', url: 'https://i.imgflip.com/4/26am.jpg' },
  { name: 'Expanding Brain', url: 'https://i.imgflip.com/4/1jwhww.jpg' },
  { name: "They're The Same Picture", url: 'https://i.imgflip.com/4/2za3u1.jpg' },
  { name: 'Bike Fall', url: 'https://i.imgflip.com/4/1b42wl.jpg' },
  { name: 'Kid Drowning In Pool', url: 'https://i.imgflip.com/4/46hhvr.jpg' },
  { name: 'You Guys Are Getting Paid', url: 'https://i.imgflip.com/4/2xscjb.jpg' },
  { name: 'Megamind Peeking', url: 'https://i.imgflip.com/4/64sz4u.jpg' },
  { name: "I Bet He's Thinking About Other Women", url: 'https://i.imgflip.com/4/1tl71a.jpg' },
  { name: 'Monkey Puppet', url: 'https://i.imgflip.com/4/2gnnjh.jpg' },
  { name: 'Absolute Cinema', url: 'https://i.imgflip.com/4/8d317n.jpg' },
  { name: "This Is Where I'd Put My Trophy", url: 'https://i.imgflip.com/4/1wz1x.jpg' },
];

const TEMPLATES_DIR = path.resolve(__dirname, '../data/uploads/templates');
const DB_PATH = path.resolve(__dirname, '../data/possumbly.db');

// Ensure directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function getImageDimensions(filepath: string): Promise<{ width: number; height: number }> {
  // Simple JPEG dimension reader
  const buffer = fs.readFileSync(filepath);

  // Try to find JPEG dimensions
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }

  // Default dimensions if we can't read them
  return { width: 500, height: 500 };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function importTemplates() {
  // Initialize sql.js
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load or create database
  let db;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('Creating new database...');
    db = new SQL.Database();

    // Create tables
    db.run(`
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

      CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        created_by TEXT REFERENCES users(id),
        used_by TEXT REFERENCES users(id),
        created_at INTEGER NOT NULL,
        used_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        uploaded_by TEXT REFERENCES users(id),
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memes (
        id TEXT PRIMARY KEY,
        template_id TEXT REFERENCES templates(id),
        created_by TEXT REFERENCES users(id),
        editor_state TEXT NOT NULL,
        output_filename TEXT,
        created_at INTEGER NOT NULL
      );
    `);
  }

  console.log(`Importing ${TEMPLATES.length} templates...\n`);

  let imported = 0;
  let skipped = 0;

  for (const template of TEMPLATES) {
    const filename = `${generateId()}.jpg`;
    const filepath = path.join(TEMPLATES_DIR, filename);

    try {
      // Check if template with same name already exists
      const existing = db.exec(`SELECT id FROM templates WHERE name = ?`, [template.name]);
      if (existing.length > 0 && existing[0].values.length > 0) {
        console.log(`Skipping "${template.name}" - already exists`);
        skipped++;
        continue;
      }

      console.log(`Downloading "${template.name}"...`);
      await downloadImage(template.url, filepath);

      const { width, height } = await getImageDimensions(filepath);
      const id = generateId();
      const now = Date.now();

      db.run(
        `INSERT INTO templates (id, name, filename, width, height, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, template.name, filename, width, height, null, now]
      );

      console.log(`  ✓ Imported (${width}x${height})`);
      imported++;

      // Small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
      // Clean up partial file
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  }

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log(`\nDone! Imported ${imported} templates, skipped ${skipped}.`);
  db.close();
}

importTemplates().catch(console.error);
