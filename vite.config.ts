import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'connectkit',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'ethers',
      'recharts',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
    // @lifi/widget pulls in @mysten/dapp-kit which has a broken ESM export
    // in this version of @mysten/sui — exclude from pre-bundling so esbuild
    // doesn't choke on it; Vite will still serve the module lazily at runtime.
    exclude: ['@mysten/dapp-kit', '@mysten/sui'],
  },
  server: {
    allowedHosts: true,
    cors: true,
  },
  // Allow BAVI Finance env vars to be read by the frontend
  envPrefix: ['VITE_'],
})
