import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config } from './config'
import { Toaster } from 'sonner'

// Polyfill BigInt serialization to prevent "Do not know how to serialize a BigInt" errors globally
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as unknown as Record<string, unknown>).toJSON) {
  (BigInt.prototype as unknown as Record<string, () => string>).toJSON = function () {
    return this.toString();
  };
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="dark"
          customTheme={{
            '--ck-font-family': "'DM Sans', sans-serif",
            '--ck-primary-button-background': '#3b82f6',
            '--ck-primary-button-hover-background': '#2563eb',
            '--ck-border-radius': '12px',
          }}
        >
          <App />
          <Toaster position="top-center" richColors closeButton duration={2000} theme="dark" />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
