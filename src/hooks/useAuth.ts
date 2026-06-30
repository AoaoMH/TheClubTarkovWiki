/**
 * Auth store (zustand).
 * Never blocks rendering: fetchMe fails silently with user=null.
 * Only preset saving and admin settings require login.
 */
import { create } from 'zustand'
import { forgeConfig } from '@/lib/forgeConfig'

const apiBase = () => forgeConfig.API_BASE

export interface AuthUser {
  id: number
  username: string
  role: 'admin' | 'user'
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username: string, password: string) => {
    try {
      const res = await fetch(`${apiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error || '登录失败' }
      }
      set({ user: data.user })
      return { ok: true }
    } catch {
      return { ok: false, error: '网络错误，请检查后端服务是否运行' }
    }
  },

  logout: async () => {
    try {
      await fetch(`${apiBase()}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore network errors on logout
    }
    set({ user: null })
  },

  fetchMe: async () => {
    try {
      const res = await fetch(`${apiBase()}/api/auth/me`, {
        credentials: 'include',
      })
      const data = await res.json()
      set({ user: data.user || null, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
