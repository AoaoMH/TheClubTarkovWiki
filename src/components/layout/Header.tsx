import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Globe, Settings, LogOut } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { AdminPanel } from '@/components/admin/AdminPanel'

export function Header({ onSearchClick }: { onSearchClick: () => void }) {
  const { i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [adminOpen, setAdminOpen] = useState(false)

  const toggleLang = (lng: 'zh' | 'en') => {
    i18n.changeLanguage(lng)
  }

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3 px-4 py-2 lg:px-6">
        <SidebarTrigger className="lg:hidden" />

        <Button
          variant="outline"
          onClick={onSearchClick}
          className="flex-1 max-w-xl justify-start text-muted-foreground"
        >
          <Search className="size-4 mr-2" />
          <span className="flex-1 text-left">
            {i18n.language === 'zh' ? '搜索道具...' : 'Search items...'}
          </span>
          <Kbd className="ml-auto">Ctrl K</Kbd>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Globe className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toggleLang('zh')}>
              中文{i18n.language === 'zh' ? ' ✓' : ''}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleLang('en')}>
              English{i18n.language === 'en' ? ' ✓' : ''}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin settings button (admin only) */}
        {user?.role === 'admin' && (
          <Button variant="outline" size="icon" onClick={() => setAdminOpen(true)}>
            <Settings className="size-4" />
          </Button>
        )}

        {/* Login / User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <span className="max-w-[80px] truncate">{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="size-4 mr-2" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login">
            <Button variant="outline" size="sm">登录</Button>
          </Link>
        )}
      </div>

      {/* Admin panel sheet */}
      <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />
    </header>
  )
}
