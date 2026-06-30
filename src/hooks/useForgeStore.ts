/**
 * Forge workbench state management.
 * Adapted from EFTForge frontend/modules/state.js
 */
import { create } from 'zustand'
import type { GunInitData, BuildStats, GunSlot } from '@/lib/forgeApi'

interface ForgeState {
  // Gun
  gunId: string | null
  gunData: GunInitData | null
  loading: boolean
  error: string | null

  // Build state: slotPath -> itemId
  // Top-level slots use slot name as key (e.g. "mod_pistol_grip")
  // Nested slots use parentSlotPath:childSlotName (e.g. "mod_handguard:mod_foregrip")
  installedAttachments: Record<string, string>

  // Child slots of installed items: parentSlotPath -> GunSlot[]
  childSlotsMap: Record<string, GunSlot[]>

  // UI
  view: 'grid' | 'list'
  lang: 'zh' | 'en'

  // Stats
  stats: BuildStats | null

  // Actions
  setGunId: (gunId: string) => void
  setGunData: (data: GunInitData) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setView: (view: 'grid' | 'list') => void
  setStats: (stats: BuildStats) => void
  installAttachment: (slotPath: string, itemId: string) => void
  removeAttachment: (slotPath: string) => void
  setChildSlots: (parentSlotPath: string, slots: GunSlot[]) => void
  removeChildSlots: (parentSlotPath: string) => void
  reset: () => void
}

const initialState = {
  gunId: null,
  gunData: null,
  loading: false,
  error: null,
  installedAttachments: {} as Record<string, string>,
  childSlotsMap: {} as Record<string, GunSlot[]>,
  view: 'grid' as 'grid' | 'list',
  lang: 'zh' as 'zh' | 'en',
  stats: null,
}

export const useForgeStore = create<ForgeState>((set) => ({
  ...initialState,

  setGunId: (gunId) => set({ gunId }),
  setGunData: (gunData) => set({ gunData }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setView: (view) => set({ view }),
  setStats: (stats) => set({ stats }),

  installAttachment: (slotPath, itemId) =>
    set((state) => ({
      installedAttachments: { ...state.installedAttachments, [slotPath]: itemId },
    })),

  removeAttachment: (slotPath) =>
    set((state) => {
      const next = { ...state.installedAttachments }
      // Remove this slot and all nested children
      for (const key of Object.keys(next)) {
        if (key === slotPath || key.startsWith(slotPath + ':')) {
          delete next[key]
        }
      }
      // Also remove child slots
      const nextChildSlots = { ...state.childSlotsMap }
      for (const key of Object.keys(nextChildSlots)) {
        if (key === slotPath || key.startsWith(slotPath + ':')) {
          delete nextChildSlots[key]
        }
      }
      return { installedAttachments: next, childSlotsMap: nextChildSlots }
    }),

  setChildSlots: (parentSlotPath, slots) =>
    set((state) => ({
      childSlotsMap: { ...state.childSlotsMap, [parentSlotPath]: slots },
    })),

  removeChildSlots: (parentSlotPath) =>
    set((state) => {
      const next = { ...state.childSlotsMap }
      delete next[parentSlotPath]
      return { childSlotsMap: next }
    }),

  reset: () => set(initialState),
}))
