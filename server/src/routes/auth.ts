/**
 * Auth routes: login, logout, me
 */
import { Router } from 'express'
import { db } from '../db.js'
import {
  verifyPassword,
  createSession,
  revokeSession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_NAME,
} from '../auth.js'
import type { UserRow } from '../db.js'

export const authRouter = Router()

// Public user info (no sensitive fields)
function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, role: u.role }
}

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' })
    return
  }

  if (!verifyPassword(password, user.password_hash, user.salt)) {
    res.status(401).json({ error: '用户名或密码错误' })
    return
  }

  const token = createSession(user.id)
  setSessionCookie(res, token)
  res.json({ user: publicUser(user) })
})

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  const cookieHeader = req.headers.cookie
  if (cookieHeader) {
    const cookies: Record<string, string> = {}
    for (const cookie of cookieHeader.split(';')) {
      const [name, ...value] = cookie.trim().split('=')
      if (name) cookies[name.trim()] = value.join('=').trim()
    }
    const token = cookies[COOKIE_NAME]
    if (token) revokeSession(token)
  }
  clearSessionCookie(res)
  res.json({ ok: true })
})

// GET /api/auth/me — returns user or null (never 401)
authRouter.get('/me', (req, res) => {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) {
    res.json({ user: null })
    return
  }

  const cookies: Record<string, string> = {}
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...value] = cookie.trim().split('=')
    if (name) cookies[name.trim()] = value.join('=').trim()
  }

  const token = cookies[COOKIE_NAME]
  if (!token) {
    res.json({ user: null })
    return
  }

  const user = getSessionUser(token)
  if (!user) {
    clearSessionCookie(res)
    res.json({ user: null })
    return
  }

  res.json({ user: publicUser(user) })
})
