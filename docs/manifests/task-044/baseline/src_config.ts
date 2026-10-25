/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, 'https://rpc.testnet.arc.io')

export const arcTestnetWithRpc = {
  ...arcTestnet,
  rpcUrls: {
    ...arcTestnet.rpcUrls,
    default: {
      http: ['https://rpc.testnet.arc.io'],
    },
    public: {
      http: ['https://rpc.testnet.arc.io'],
    },
  },
} as const

export const config = createConfig({
  chains: [arcTestnetWithRpc, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.io'),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})

