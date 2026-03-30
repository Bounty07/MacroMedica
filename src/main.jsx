import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import ToastViewport from './components/common/ToastViewport'

import { Toaster } from 'sonner'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <App />
        <ToastViewport />
        <Toaster position="top-right" richColors closeButton />
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
)
