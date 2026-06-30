/**
 * Preset routes: CRUD for weapon build presets.
 * All routes require authentication. Users can only access their own presets.
 */
import { Router } from 'express'
import { randomUUID } from 'crypto'
import { db, type PresetRow } from '../db.js'
import { requireAuth } from '../auth.js'

export const presetsRouter = Router()

// All preset routes require auth
presetsRouter.use(requireAuth)

// GET /api/presets?gunId=xxx — list presets for current user (optionally filtered by gunId)
presetsRouter.get('/', (req, res) => {
  const userId = req.user!.id
  const gunId = req.query.gunId as string | undefined

  const rows = gunId
    ? db.prepare('SELECT * FROM presets WHERE user_id = ? AND gun_id = ? ORDER BY updated_at DESC').all(userId, gunId) as PresetRow[]
    : db.prepare('SELECT * FROM presets WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as PresetRow[]

  const presets = rows.map(r => ({
    id: r.id,
    name: r.name,
    gunId: r.gun_id,
    gunName: r.gun_name,
    attachments: JSON.parse(r.attachments_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  res.json({ presets })
})

// POST /api/presets — create or overwrite (upsert by user_id + name)
presetsRouter.post('/', (req, res) => {
  const userId = req.user!.id
  const { name, gunId, gunName, attachments } = req.body as {
    name?: string
    gunId?: string
    gunName?: string
    attachments?: Record<string, string>
  }

  if (!name || !gunId || !gunName || !attachments) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }

  const id = randomUUID()
  const attachmentsJson = JSON.stringify(attachments)

  try {
    // Try insert
    db.prepare(`
      INSERT INTO presets (id, user_id, gun_id, gun_name, name, attachments_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, gunId, gunName, name, attachmentsJson)
  } catch {
    // Name already exists for this user → overwrite
    const existing = db.prepare(`
      SELECT id FROM presets WHERE user_id = ? AND name = ?
    `).get(userId, name) as { id: string } | undefined

    if (!existing) {
      res.status(500).json({ error: '保存失败' })
      return
    }

    db.prepare(`
      UPDATE presets SET gun_id = ?, gun_name = ?, attachments_json = ?, updated_at = unixepoch()
      WHERE id = ? AND user_id = ?
    `).run(gunId, gunName, attachmentsJson, existing.id, userId)

    return res.json({
      preset: {
        id: existing.id,
        name,
        gunId,
        gunName,
        attachments,
        updatedAt: Math.floor(Date.now() / 1000),
      }
    })
  }

  res.json({
    preset: {
      id,
      name,
      gunId,
      gunName,
      attachments,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    }
  })
})

// PUT /api/presets/:id — overwrite specific preset's attachments
presetsRouter.put('/:id', (req, res) => {
  const userId = req.user!.id
  const presetId = req.params.id
  const { attachments } = req.body as { attachments?: Record<string, string> }

  if (!attachments) {
    res.status(400).json({ error: '缺少配件数据' })
    return
  }

  const existing = db.prepare('SELECT * FROM presets WHERE id = ? AND user_id = ?').get(presetId, userId) as PresetRow | undefined
  if (!existing) {
    res.status(404).json({ error: '预设不存在' })
    return
  }

  db.prepare(`
    UPDATE presets SET attachments_json = ?, updated_at = unixepoch()
    WHERE id = ? AND user_id = ?
  `).run(JSON.stringify(attachments), presetId, userId)

  res.json({ ok: true })
})

// DELETE /api/presets/:id — own presets always deletable; admin can delete any
presetsRouter.delete('/:id', (req, res) => {
  const userId = req.user!.id
  const isAdmin = req.user!.role === 'admin'
  const presetId = req.params.id

  const result = isAdmin
    ? db.prepare('DELETE FROM presets WHERE id = ?').run(presetId)
    : db.prepare('DELETE FROM presets WHERE id = ? AND user_id = ?').run(presetId, userId)
  if (result.changes === 0) {
    res.status(404).json({ error: '预设不存在' })
    return
  }

  res.json({ ok: true })
})
