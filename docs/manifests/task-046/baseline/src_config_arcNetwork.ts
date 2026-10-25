import { type Chain } from 'viem';

export const arcTestnet = {
  id: 5042002,
  name: 'Build on Arc',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.io'],
    },
    public: {
      http: ['https://rpc.testnet.arc.io'],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
} as const satisfies Chain;

export const ARC_GAS_TOKEN_DECIMALS = 18;
export const ARC_ERC20_TOKEN_DECIMALS = 6;

/**
 * USDC on Arc Testnet.
 * This address acts as BOTH the native gas token AND an ERC-20.
 * - Use ARC_GAS_TOKEN_DECIMALS (18) for msg.value / native balance reads.
 * - Use ARC_ERC20_TOKEN_DECIMALS (6) for approve/transferFrom/vault deposits/escrow budgets.
 * Prefer importing from arc-constants.ts (TOKEN_ADDRESSES, TOKEN_DECIMALS) in new code.
 */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
