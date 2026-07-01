import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CategorySidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { SearchCommand } from '@/components/search/SearchCommand'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

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
          {showSidebar && <CategorySidebar />}
          <main className={cn(
            'flex-1 overflow-auto',
            forgeMatch ? 'p-0' : 'p-4 lg:p-6 max-w-6xl mx-auto w-full'
          )}>
            {children}
          </main>
        </div>
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  )
}
