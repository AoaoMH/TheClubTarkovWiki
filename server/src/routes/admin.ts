/**
 * Admin routes: user management (admin only).
 * Create accounts, delete accounts, change passwords.
 */
import { Router } from 'express'
import { db, type UserRow } from '../db.js'
import { requireAuth, requireAdmin, hashPassword } from '../auth.js'

export const adminRouter = Router()

// All admin routes require auth + admin role
adminRouter.use(requireAuth, requireAdmin)

// Public user info (no sensitive fields)
function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, role: u.role, createdAt: u.created_at }
}

// GET /api/admin/users — list all users
adminRouter.get('/users', (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[]
  res.json({ users: rows.map(publicUser) })
})

// POST /api/admin/users — create a new account
adminRouter.post('/users', (req, res) => {
  const { username, password, role } = req.body as {
    username?: string
    password?: string
    role?: string
  }

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' })
    return
  }

  if (role && role !== 'admin' && role !== 'user') {
    res.status(400).json({ error: '角色必须是 admin 或 user' })
    return
  }

  // Check if username already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined
  if (existing) {
    res.status(409).json({ error: '用户名已存在' })
    return
  }

  const { hash, salt } = hashPassword(password)
  const userRole = role || 'user'

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, salt, role)
    VALUES (?, ?, ?, ?)
  `).run(username, hash, salt, userRole)

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as UserRow
  res.status(201).json({ user: publicUser(newUser) })
})

// DELETE /api/admin/users/:id — delete account (cannot delete self)
adminRouter.delete('/users/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10)
  const currentUserId = req.user!.id

  if (targetId === currentUserId) {
    res.status(400).json({ error: '不能删除自己的账号' })
    return
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(targetId)
  if (result.changes === 0) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  res.json({ ok: true })
})

// PUT /api/admin/users/:id/password — change password
adminRouter.put('/users/:id/password', (req, res) => {
  const targetId = parseInt(req.params.id, 10)
  const { password } = req.body as { password?: string }

  if (!password) {
    res.status(400).json({ error: '密码不能为空' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId) as { id: number } | undefined
  if (!existing) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  const { hash, salt } = hashPassword(password)
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, targetId)

  res.json({ ok: true })
})

// PUT /api/admin/users/:id/role — change role
adminRouter.put('/users/:id/role', (req, res) => {
  const targetId = parseInt(req.params.id, 10)
  const { role } = req.body as { role?: string }

  if (!role || (role !== 'admin' && role !== 'user')) {
    res.status(400).json({ error: '角色必须是 admin 或 user' })
    return
  }

  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId)
  if (result.changes === 0) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  res.json({ ok: true })
})
