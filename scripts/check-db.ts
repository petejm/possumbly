import initSqlJs from 'sql.js';
import fs from 'fs';

async function main() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync('./data/possumbly.db');
  const db = new SQL.Database(buffer);

  const result = db.exec('SELECT COUNT(*) as count FROM templates');
  console.log('Templates in DB:', result[0]?.values[0]?.[0] || 0);

  const templates = db.exec('SELECT id, name FROM templates LIMIT 5');
  console.log('Sample templates:', templates[0]?.values || 'none');

  db.close();
}

main().catch(console.error);
