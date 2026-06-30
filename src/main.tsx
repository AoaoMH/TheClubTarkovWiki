import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'

// Hydrate auth state on startup (never throws, fails silently)
useAuth.getState().fetchMe()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
)
