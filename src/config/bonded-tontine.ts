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

export const KNOWN_BONDED_TONTINE_CLUBS: readonly `0x${string}`[] = [
  "0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b",
  "0xe74069717317dbB86d423439fb9c219A5c5bf812",
  "0xF9469568ebb287275009fcE3Db224a16273C5d05",
] as const;

export const KNOWN_BONDED_CLUB_MEMBERS: Record<string, readonly `0x${string}`[]> = {
  "0x3d35e830fe5ba48ff5b36dbba9ecebd3a7bad59b": [
    "0x3f2416F9782c069cD8cA40a3648B141578CFe460",
    "0xb59b2C4efDAe4a9d9eb497E435cF25b65001D224",
  ],
};

/**
 * Historical demo clubs excluded from public directory list to prevent confusion.
 */
export const HIDDEN_DEMO_CLUBS: readonly `0x${string}`[] = [
  "0xe74069717317dbB86d423439fb9c219A5c5bf812", // Completed E2E demo club
  "0xF9469568ebb287275009fcE3Db224a16273C5d05", // Defaulted/Liquidated E2E demo club
  "0xe9ccfe9f2d53a5479a17d795635e0795e84d9130", // Old testnet demo club
] as const;

/**
 * Legacy test club addresses across tests and directories.
 */
export const LEGACY_TEST_CLUB_ADDRESS = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b" as const;
export const LEGACY_TEST_CLUB_ADDRESSES: readonly `0x${string}`[] = [
  LEGACY_TEST_CLUB_ADDRESS,
] as const;

// Shared BondedTontine configuration presets
export const DEFAULT_SAFETY_RATIO_BPS = 20000; // 200% recommended default (design)
export const DEFAULT_LIQUIDATION_RATIO_BPS = 12000; // 120%
export const DEFAULT_INTEREST_RATE_BPS = 50; // 0.5% per round
export const TESTNET_MAX_PRICE_AGE = 3600; // 1 hour testnet heartbeat

export const BONDED_SAFETY_RATIO_PRESETS = [
  { label: "150% (Minimum)", value: 15000 },
  { label: "175%", value: 17500 },
  { label: "200% (Recommended)", value: 20000 },
  { label: "250%", value: 25000 },
] as const;

export const BONDED_ROUND_DURATION_PRESETS = [
  { labelVi: "1 giờ", labelEn: "1 hour", value: 3600, hintVi: "Thử nghiệm nhanh", hintEn: "Quick test" },
  { labelVi: "1 ngày", labelEn: "1 day", value: 86400, hintVi: "Tiêu chuẩn", hintEn: "Standard" },
  { labelVi: "3 ngày", labelEn: "3 days", value: 259200, hintVi: "Vừa phải", hintEn: "Moderate" },
  { labelVi: "7 ngày", labelEn: "7 days", value: 604800, hintVi: "1 tuần", hintEn: "1 week" },
] as const;

const runtimeBondedClubSet = new Set<string>(
  KNOWN_BONDED_TONTINE_CLUBS.map((a) => a.toLowerCase())
);

export function registerRuntimeBondedClub(address?: string | null): void {
  if (address && address.startsWith("0x")) {
    runtimeBondedClubSet.add(address.toLowerCase());
  }
}

export function isKnownBondedClubAddress(address?: string | null): boolean {
  if (!address) return false;
  return runtimeBondedClubSet.has(address.toLowerCase());
}

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
    maxPriceAge: TESTNET_MAX_PRICE_AGE,
  },
  [ARC_MAINNET_CHAIN_ID]: {
    feedAddress: undefined,
    isMock: false,
    description: "BTC / USD",
    maxPriceAge: 90_000, // 25 hours (Chainlink 24h heartbeat + 1h buffer)
  },
};

/**
 * Mainnet oracle allowlist.
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
