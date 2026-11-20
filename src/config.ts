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

// Wallet-facing chain metadata keeps viem's official Arc Testnet RPC. wagmi's switchChain falls back to
// wallet_addEthereumChain with these rpcUrls; overriding them with a different endpoint made wallets
// such as OKX register a second RPC for chain 5042002 and ask "Select RPC" on every transaction.
// App reads still go through arcRpcUrl via the transport below.
export const arcTestnetWithRpc = arcTestnet

export const config = createConfig({
  chains: [arcTestnetWithRpc, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcRpcUrl),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})

