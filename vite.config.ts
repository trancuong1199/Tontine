import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const sharedCancelVotes = new Map<string, Set<string>>()

function cancelVotesSyncPlugin(): Plugin {
  return {
    name: 'cancel-votes-sync',
    configureServer(server) {
      server.middlewares.use('/__api/cancel-votes', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const url = new URL(req.url || '/', 'http://localhost')
        const club = (url.searchParams.get('club') || '').toLowerCase()
        if (req.method === 'GET') {
          const set = sharedCancelVotes.get(club) ?? new Set<string>()
          res.end(JSON.stringify({ votes: Array.from(set) }))
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}')
              const targetClub = String(payload.club || club || '').toLowerCase()
              const current = sharedCancelVotes.get(targetClub) ?? new Set<string>()
              if (Array.isArray(payload.syncVotes)) {
                for (const v of payload.syncVotes) {
                  if (typeof v === 'string' && /^0x[a-f0-9]{40}$/i.test(v)) {
                    current.add(v.toLowerCase())
                  }
                }
              }
              if (typeof payload.toggleVoter === 'string' && /^0x[a-f0-9]{40}$/i.test(payload.toggleVoter)) {
                const voter = payload.toggleVoter.toLowerCase()
                if (current.has(voter)) {
                  current.delete(voter)
                } else {
                  current.add(voter)
                }
              }
              sharedCancelVotes.set(targetClub, current)
              res.end(JSON.stringify({ votes: Array.from(current) }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ votes: [] }))
            }
          })
          return
        }
        res.end(JSON.stringify({ votes: [] }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), nodePolyfills(), cancelVotesSyncPlugin()],
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
