import { ARC_CHAIN_ID, ARC_CHAIN_NAME, ARC_RPC, ARC_EXPLORER, ARC_NATIVE_SYMBOL, USDC_NATIVE_DECIMALS, USDC_ERC20_DECIMALS, USDC_ADDRESS } from './arc-constants';
import { type Chain } from 'viem';

export const arcTestnet = {
  id: Number(ARC_CHAIN_ID),
  name: ARC_CHAIN_NAME,
  nativeCurrency: {
    decimals: USDC_NATIVE_DECIMALS,
    name: ARC_NATIVE_SYMBOL,
    symbol: ARC_NATIVE_SYMBOL,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC],
    },
    public: {
      http: [ARC_RPC],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: ARC_EXPLORER },
  },
  testnet: true,
} as const satisfies Chain;

export const ARC_GAS_TOKEN_DECIMALS = USDC_NATIVE_DECIMALS;
export const ARC_ERC20_TOKEN_DECIMALS = USDC_ERC20_DECIMALS;

/**
 * USDC on Arc Testnet.
 * This address acts as BOTH the native gas token AND an ERC-20.
 * - Use ARC_GAS_TOKEN_DECIMALS (18) for msg.value / native balance reads.
 * - Use ARC_ERC20_TOKEN_DECIMALS (6) for approve/transferFrom/vault deposits/escrow budgets.
 * Prefer importing from arc-constants.ts (TOKEN_ADDRESSES, TOKEN_DECIMALS) in new code.
 */
export const ARC_USDC_ADDRESS = USDC_ADDRESS;
