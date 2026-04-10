import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import './index.css'
import { App } from './pages/App'
import { AppDataProvider } from './core/AppDataContext'
import { AuthProvider } from './core/AuthContext'
import { queryClient } from './core/queryClient'
import { ErrorBoundary } from './common/components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppDataProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AppDataProvider>
          <Toaster position="bottom-right" theme="dark" richColors />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

