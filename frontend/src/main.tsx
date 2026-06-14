import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App'

// TanStack Query client with reasonable defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

import { registerSW } from 'virtual:pwa-register'

// Register PWA service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Could show a toast here in the future
  },
  onOfflineReady() {
    // Ready to work offline
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
