/**
 * Canonical BondedTontine Factory & Oracle Configuration per chain (T4)
 * Single source of truth for BondedTontineFactory and BTC/USD Oracle addresses.
 */

import { USDC_ADDRESS, CIRBTC_ADDRESS } from "./arc-constants.ts";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;

export { USDC_ADDRESS as BONDED_USDC_ADDRESS, CIRBTC_ADDRESS as BONDED_CIRBTC_ADDRESS };

export const ARC_TESTNET_MOCK_FEED =
  "0x9c0866b4D6dB662038f805563b8f4CdECA626525" as const;
export const ARC_TESTNET_BONDED_FACTORY =
  "0x8cE12D62b0bD565c92164aC7c847620Bfe710eb0" as const;
export const ARC_TESTNET_DEFAULT_BONDED_CLUB =
  "0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b" as const;

export interface ChainOracleInfo {
  feedAddress?: `0x${string}`;
  isMock: boolean;
  description: string;
  maxPriceAge: number;
}

export const CANONICAL_FACTORY: Record<number, `0x${string}` | undefined> = {
  [ARC_TESTNET_CHAIN_ID]: ARC_TESTNET_BONDED_FACTORY,
  [ARC_MAINNET_CHAIN_ID]: undefined,
};

export const DEFAULT_BONDED_CLUB_BY_CHAIN: Record<number, `0x${string}` | undefined> = {
  [ARC_TESTNET_CHAIN_ID]: ARC_TESTNET_DEFAULT_BONDED_CLUB,
  [ARC_MAINNET_CHAIN_ID]: undefined,
};

export const ORACLE_INFO: Record<number, ChainOracleInfo> = {
  [ARC_TESTNET_CHAIN_ID]: {
    feedAddress: ARC_TESTNET_MOCK_FEED,
    isMock: true,
    description: "MOCK BTC / USD",
    maxPriceAge: 3600,
  },
  [ARC_MAINNET_CHAIN_ID]: {
    feedAddress: undefined,
    isMock: false,
    description: "BTC / USD",
    maxPriceAge: 90_000, // 25 hours (Chainlink 24h heartbeat + 1h buffer)
  },
};

/**
 * Audited mainnet oracle allowlist.
 * Must be populated from official Chainlink Price Feed Contract Addresses for Arc Mainnet before mainnet deployment.
 */
export const MAINNET_ORACLE_ALLOWLIST: Record<number, readonly `0x${string}`[]> = {
  [ARC_MAINNET_CHAIN_ID]: [],
};

export const BONDED_DISCLOSURE_COPY = {
  vi: "Chủ hụi vay trong hạn mức cọc; ai cũng kích hoạt được thanh lý; rủi ro còn lại gồm giá CirBTC giảm nhanh hơn thanh lý, CirBTC lệch giá so với BTC, và rủi ro nhà phát hành token",
  en: "Club owner borrows within collateral limit; anyone can trigger liquidation; remaining risks include CirBTC price dropping faster than liquidation, CirBTC depeg vs BTC, and token issuer risk",
} as const;

export const MOCK_ORACLE_WARNING_COPY = {
  vi: "Giá thử nghiệm, không phải giá thị trường",
  en: "Test price, not market price",
} as const;

