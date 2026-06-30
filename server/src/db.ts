/**
 * SQLite database initialization.
 * Uses better-sqlite3 (already installed, synchronous API).
 * Tables: users, sessions, presets
 */
import Database from 'better-sqlite3'
import { scryptSync, randomBytes } from 'crypto'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.resolve(import.meta.dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'app.db')
export const db: Database.Database = new Database(dbPath)

// Enable WAL mode for concurrent read support
db.pragma('journal_mode = WAL')

// --- Create tables ---

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token     TEXT PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS presets (
    id              TEXT PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gun_id          TEXT NOT NULL,
    gun_name        TEXT NOT NULL,
    name            TEXT NOT NULL,
    attachments_json TEXT NOT NULL,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, name)
  );
  CREATE INDEX IF NOT EXISTS idx_presets_user_gun ON presets(user_id, gun_id);
`)

// --- Seed initial admin if users table is empty ---

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }

if (userCount.count === 0) {
  const adminUser = process.env.BOOTSTRAP_ADMIN_USER || 'AoaoMH'
  const adminPass = process.env.BOOTSTRAP_ADMIN_PASS || '846279513qQ'

  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(adminPass, salt, 64).toString('hex')

  db.prepare(`
    INSERT INTO users (username, password_hash, salt, role)
    VALUES (?, ?, ?, 'admin')
  `).run(adminUser, hash, salt)

  console.log(`[DB] Seeded initial admin user: "${adminUser}". Please change the password after first login.`)
}

// --- Types ---

export interface UserRow {
  id: number
  username: string
  password_hash: string
  salt: string
  role: 'admin' | 'user'
  created_at: number
}

export interface SessionRow {
  token: string
  user_id: number
  expires_at: number
  created_at: number
}

export interface PresetRow {
  id: string
  user_id: number
  gun_id: string
  gun_name: string
  name: string
  attachments_json: string
  created_at: number
  updated_at: number
}
