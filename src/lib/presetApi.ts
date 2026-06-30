/**
 * Preset API client.
 * Mirrors old forgeUtils.ts preset function signatures, but uses server-side storage.
 * All requests include credentials for cookie-based auth.
 */
import { forgeConfig } from './forgeConfig'
import { apiFetch } from './apiFetch'

const apiBase = () => forgeConfig.API_BASE

export interface SavedPreset {
  id: string
  name: string
  gunId: string
  gunName: string
  attachments: Record<string, string>
  createdAt?: number
  updatedAt?: number
}

/** Get presets for a specific gun (current user only) */
export async function getPresetsForGun(gunId: string): Promise<SavedPreset[]> {
  const res = await apiFetch(`${apiBase()}/api/presets?gunId=${encodeURIComponent(gunId)}`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.presets || []
}

/** Save a new preset (or overwrite if name exists) */
export async function savePreset(
  name: string,
  gunId: string,
  gunName: string,
  attachments: Record<string, string>,
): Promise<SavedPreset> {
  const res = await apiFetch(`${apiBase()}/api/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, gunId, gunName, attachments }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '保存失败')
  return data.preset
}

/** Overwrite a specific preset's attachments */
export async function overwritePreset(
  id: string,
  attachments: Record<string, string>,
): Promise<void> {
  const res = await apiFetch(`${apiBase()}/api/presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ attachments }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '覆盖失败')
  }
}

/** Delete a preset by id */
export async function deletePreset(id: string): Promise<void> {
  const res = await apiFetch(`${apiBase()}/api/presets/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '删除失败')
  }
}
