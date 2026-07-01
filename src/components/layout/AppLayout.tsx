import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { CategorySidebar, CategorySidebarMobile } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { SearchCommand } from '@/components/search/SearchCommand'
import { PanelLeft } from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Show sidebar only on item-related pages
  const categoryMatch = useMatch('/category/:id')
  const itemMatch = useMatch('/item/:id')
  const forgeMatch = useMatch('/forge/:gunId')
  const showSidebar = !!categoryMatch || !!itemMatch

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <Header onSearchClick={() => setSearchOpen(true)} />
        <div className="flex flex-1">
          {/* Desktop sidebar */}
          {showSidebar && <CategorySidebar />}
          {/* Mobile sidebar drawer */}
          {showSidebar && (
            <CategorySidebarMobile open={sidebarOpen} onOpenChange={setSidebarOpen} />
          )}
          <main className={cn(
            'flex-1 overflow-auto',
            forgeMatch ? 'p-0' : 'p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto w-full'
          )}>
            {/* Mobile sidebar toggle */}
            {showSidebar && (
              <Button
                variant="outline"
                size="sm"
                className="md:hidden mb-3 gap-1.5"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeft className="size-4" />
                分类
              </Button>
            )}
            {children}
          </main>
        </div>
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  )
}
