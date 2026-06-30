/**
 * Authentication utilities and middleware.
 * Uses Node built-in crypto.scrypt for password hashing (no extra deps).
 * Session-based auth with httpOnly cookies.
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { db, type UserRow } from './db.js'

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
const COOKIE_NAME = 'session_token'

// --- Cookie parsing (avoid cookie-parser dependency) ---

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return {}
  const cookies: Record<string, string> = {}
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...value] = cookie.trim().split('=')
    if (name) cookies[name.trim()] = value.join('=').trim()
  }
  return cookies
}

// --- Password hashing (scrypt) ---

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = scryptSync(password, salt, 64)
  const realHash = Buffer.from(hash, 'hex')
  if (testHash.length !== realHash.length) return false
  return timingSafeEqual(testHash, realHash)
}

// --- Session management ---

export function createSession(userId: number): string {
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + SESSION_TTL
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt)
  return token
}

export function revokeSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function getSessionUser(token: string): UserRow | null {
  const session = db.prepare(`
    SELECT s.*, u.* FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now()) as (UserRow & { token: string }) | undefined

  if (!session) return null
  return session
}

// --- Express middleware ---

// Augment Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow
    }
  }
}

/** Require authentication: reads session cookie, injects req.user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = getSessionUser(token)
  if (!user) {
    res.clearCookie(COOKIE_NAME)
    res.status(401).json({ error: 'Session expired' })
    return
  }

  req.user = user
  next()
}

/** Require admin role (must be used after requireAuth) */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

/** Set session cookie on response */
export function setSessionCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_TTL,
  })
}

/** Clear session cookie on response */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export { COOKIE_NAME }
