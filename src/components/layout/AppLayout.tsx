import { useState } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { SearchCommand } from '@/components/search/SearchCommand'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header onSearchClick={() => setSearchOpen(true)} />
          <main className="flex-1 p-4 lg:p-6 max-w-6xl mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>
    </TooltipProvider>
  )
}
