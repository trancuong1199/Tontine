/**
 * arc-constants.ts
 * Single source of truth for all Arc Testnet addresses, decimals, and contract addresses.
 * Import from here — never hardcode addresses or decimals inline.
 *
 * Arc native USDC quirk:
 *   - Native gas view  → 18 decimals  (msg.value, gas fees, native balance)
 *   - ERC-20 view      →  6 decimals  (transferFrom, approve, vault deposit, escrow budget)
 * Always use ERC20_DECIMALS when calling ERC-20 methods on any token.
 */

// ─── Chain ───────────────────────────────────────────────────────────────────
export const ARC_CHAIN_ID = 5042002n;
export const ARC_CHAIN_ID_HEX = '0x4cef52';
export const ARC_RPC = 'https://rpc.testnet.arc.io';
export const ARC_EXPLORER = 'https://explorer.testnet.arc.io';

// ─── Token addresses ─────────────────────────────────────────────────────────
/** USDC on Arc — acts as BOTH the native gas token AND an ERC-20. */
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
export const CIRBTC_ADDRESS = '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF';

/** Wrapped USDC used by the UnitFlow V3 swap router. */
export const WUSDC_ADDRESS = '0x911b4000D3422F482F4062a913885f7b035382Df';

// ─── Token decimals ───────────────────────────────────────────────────────────
/** Use for ERC-20 calls: approve, transferFrom, vault deposit, escrow budget. */
export const USDC_ERC20_DECIMALS = 6;
export const EURC_DECIMALS = 6;
export const CIRBTC_DECIMALS = 8;

/** Use ONLY for native gas (msg.value, gas estimation). NOT for ERC-20 calls. */
export const USDC_NATIVE_DECIMALS = 18;

// ─── Convenience map: token symbol → ERC-20 decimals ─────────────────────────
export const TOKEN_DECIMALS: Record<string, number> = {
  USDC: USDC_ERC20_DECIMALS,
  EURC: EURC_DECIMALS,
  cirBTC: CIRBTC_DECIMALS,
};

// ─── Convenience map: token symbol → ERC-20 address ──────────────────────────
export const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: USDC_ADDRESS,
  EURC: EURC_ADDRESS,
  cirBTC: CIRBTC_ADDRESS,
};

// ─── Deployed vault contracts ─────────────────────────────────────────────────
export const VAULT_ADDRESSES: Record<string, string> = {
  USDC: '0x428266f0Fc0a3B0926a6E81D4ba53203104F0E26',
  EURC: '0x66fe48c23b5f5363ea73f860e7671adbc62b3d04',
  cirBTC: '0xf592f76a4e08c7efb394bd222b2580a2da39805e',
};

// ─── Protocol contracts ───────────────────────────────────────────────────────
export const ARC_SWAP_ROUTER = '0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01';
export const AGENTIC_COMMERCE_CONTRACT = '0x0747EEf0706327138c69792bF28Cd525089e4583';

// ─── Explorer helpers ─────────────────────────────────────────────────────────
export const txUrl = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`;
export const addrUrl = (addr: string) => `${ARC_EXPLORER}/address/${addr}`;
