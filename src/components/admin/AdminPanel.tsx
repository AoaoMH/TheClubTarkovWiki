/**
 * Admin panel for user management.
 * Displayed in a Sheet (right-side drawer) from Header.
 * Admin can: list users, create accounts, delete accounts, change passwords, change roles.
 */
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { forgeConfig } from '@/lib/forgeConfig'
import { apiFetch } from '@/lib/apiFetch'

const apiBase = () => forgeConfig.API_BASE

interface AdminUser {
  id: number
  username: string
  role: 'admin' | 'user'
  createdAt: number
}

interface AdminPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)

  // Create form state
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')
  const [creating, setCreating] = useState(false)

  // Change password state
  const [passwordEdits, setPasswordEdits] = useState<Record<number, string>>({})

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/users`, {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchUsers()
  }, [open, fetchUsers])

  // Create account
  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword) return
    setCreating(true)
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '创建失败')
        return
      }
      toast.success(`账号 "${newUsername.trim()}" 创建成功`)
      setNewUsername('')
      setNewPassword('')
      setNewRole('user')
      await fetchUsers()
    } catch {
      toast.error('网络错误')
    } finally {
      setCreating(false)
    }
  }

  // Delete account
  const handleDelete = async () => {
    if (!deleteTarget) return
    const { id, username } = deleteTarget
    setDeleteTarget(null)
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除失败')
        return
      }
      toast.success(`账号 "${username}" 已删除`)
      await fetchUsers()
    } catch {
      toast.error('网络错误')
    }
  }

  // Change password
  const handleChangePassword = async (userId: number) => {
    const password = passwordEdits[userId]
    if (!password) return
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '修改失败')
        return
      }
      toast.success('密码已修改')
      setPasswordEdits((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } catch {
      toast.error('网络错误')
    }
  }

  // Change role
  const handleToggleRole = async (userId: number, currentRole: 'admin' | 'user') => {
    const newRoleVal = currentRole === 'admin' ? 'user' : 'admin'
    try {
      const res = await apiFetch(`${apiBase()}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRoleVal }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '修改失败')
        return
      }
      toast.success('角色已修改')
      await fetchUsers()
    } catch {
      toast.error('网络错误')
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>账号管理</SheetTitle>
            <SheetDescription>创建、删除账号或修改密码</SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4 space-y-6">
            {/* Create Account */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">创建新账号</h3>
              <Input
                type="text"
                placeholder="用户名"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as 'admin' | 'user')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newUsername.trim() || !newPassword}
                  size="sm"
                >
                  {creating ? '创建中...' : '创建'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* User List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                用户列表
                {loading && <span className="ml-2 text-xs text-muted-foreground">加载中...</span>}
              </h3>
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-md border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{u.username}</span>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </Badge>
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">(你)</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={u.id === currentUser?.id}
                        >
                          {u.role === 'admin' ? '降为用户' : '升为管理员'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: u.id, username: u.username })}
                          disabled={u.id === currentUser?.id}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                    {/* Change password */}
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="新密码..."
                        value={passwordEdits[u.id] || ''}
                        onChange={(e) =>
                          setPasswordEdits((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="h-8 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleChangePassword(u.id)}
                        disabled={!passwordEdits[u.id]}
                      >
                        改密
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除账号</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除账号 "{deleteTarget?.username}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
