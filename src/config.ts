/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import { requireChain } from './onchain-facts'

const arcRpcUrl = requireChain(arcTestnet.id).rpcUrls[0]
if (!arcRpcUrl) throw new Error('Arc Testnet RPC is not configured')

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcRpcUrl)

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const rawStore = window.localStorage.getItem('wagmi.store')
    const match = rawStore?.match(/"accounts":\s*\[\s*"(0x[a-fA-F0-9]{40})"/)
    if (match?.[1]) {
      window.localStorage.setItem('hui_last_connected_account', match[1].toLowerCase())
    }
  } catch {
    // ignore storage errors
  }
}

export const arcTestnetWithRpc = {
  ...arcTestnet,
  rpcUrls: {
    ...arcTestnet.rpcUrls,
    default: {
      http: [arcRpcUrl],
    },
    public: {
      http: [arcRpcUrl],
    },
  },
} as const

export const config = createConfig({
  chains: [arcTestnetWithRpc, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcRpcUrl),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})

