/**
 * Forge workbench utilities.
 * Share links, favorites, undo/redo.
 */
import LZString from 'lz-string'

// --- Share Links (LZ-String compression) ---

export interface SharedBuild {
  gunId: string
  attachments: Record<string, string> // slotPath -> itemId
}

/** Serialize build state to compressed URL parameter */
export function encodeBuild(gunId: string, attachments: Record<string, string>): string {
  const build: SharedBuild = { gunId, attachments }
  const json = JSON.stringify(build)
  return LZString.compressToEncodedURIComponent(json)
}

/** Parse build state from URL parameter */
export function decodeBuild(encoded: string): SharedBuild | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const build = JSON.parse(json) as SharedBuild
    if (!build.gunId || typeof build.attachments !== 'object') return null
    return build
  } catch {
    return null
  }
}

/** Get share URL for current build */
export function getShareUrl(gunId: string, attachments: Record<string, string>): string {
  const encoded = encodeBuild(gunId, attachments)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#/forge/${gunId}?build=${encoded}`
}

// --- Favorites (localStorage) ---

const FAVORITES_KEY = 'forge-favorites'

/** Get all favorited item IDs */
export function getFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

/** Toggle favorite status for an item */
export function toggleFavorite(itemId: string): boolean {
  const favs = getFavorites()
  if (favs.has(itemId)) {
    favs.delete(itemId)
  } else {
    favs.add(itemId)
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]))
  return favs.has(itemId)
}

// --- Undo/Redo History ---

const MAX_HISTORY = 50

interface HistoryState {
  attachments: Record<string, string>
}

export class BuildHistory {
  private undoStack: HistoryState[] = []
  private redoStack: HistoryState[] = []

  /** Record current state before a change */
  pushState(attachments: Record<string, string>) {
    // Deep copy to prevent mutation
    const snapshot: HistoryState = {
      attachments: { ...attachments },
    }
    this.undoStack.push(snapshot)
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift()
    }
    // Clear redo stack on new action
    this.redoStack = []
  }

  /** Undo: return previous state, push current to redo */
  undo(current: Record<string, string>): Record<string, string> | null {
    if (this.undoStack.length === 0) return null
    const prev = this.undoStack.pop()!
    this.redoStack.push({ attachments: { ...current } })
    return prev.attachments
  }

  /** Redo: return next state, push current to undo */
  redo(current: Record<string, string>): Record<string, string> | null {
    if (this.redoStack.length === 0) return null
    const next = this.redoStack.pop()!
    this.undoStack.push({ attachments: { ...current } })
    return next.attachments
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}

// --- Preset Save (localStorage) ---

export interface SavedPreset {
  id: string
  name: string
  gunId: string
  gunName: string
  attachments: Record<string, string>
  createdAt: number
}

const PRESETS_KEY = 'forge-presets'

export function getPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedPreset[]
  } catch {
    return []
  }
}

export function savePreset(name: string, gunId: string, gunName: string, attachments: Record<string, string>): SavedPreset {
  const presets = getPresets()
  const preset: SavedPreset = {
    id: `preset-${Date.now()}`,
    name,
    gunId,
    gunName,
    attachments: { ...attachments },
    createdAt: Date.now(),
  }
  presets.unshift(preset)
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  return preset
}

export function deletePreset(id: string) {
  const presets = getPresets().filter(p => p.id !== id)
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

export function getPresetsForGun(gunId: string): SavedPreset[] {
  return getPresets().filter(p => p.gunId === gunId)
}
