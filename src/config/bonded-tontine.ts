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
  "0xF35490acc81DE12b752C6F02e6d11d203F01A80E" as const; // 9-param createClub (totalRounds), unique names, one borrow per round
export const ARC_TESTNET_DEFAULT_BONDED_CLUB =
  "0xB34d273bC38457Cd6DF88591A982E6581E798959" as const;

export const KNOWN_BONDED_TONTINE_CLUBS: readonly `0x${string}`[] = [
  "0xB34d273bC38457Cd6DF88591A982E6581E798959",
  "0x1995557D5BcA94B92d59194afEF106c5ac86527F",
  "0x6B4edE6eF8bC097E33D8BDC0cC8C619a577d9fB7",
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
  "0xe328f4c30068a728b0f2d75f1cf74c1c6bef4da1", // Cancelled testnet club
] as const;

/**
 * Legacy test club addresses across tests and directories.
 */
export const LEGACY_TEST_CLUB_ADDRESS = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b" as const;
export const LEGACY_TEST_CLUB_ADDRESSES: readonly `0x${string}`[] = [
  LEGACY_TEST_CLUB_ADDRESS,
] as const;

// Shared BondedTontine configuration presets
export const DEFAULT_SAFETY_RATIO_BPS = 12000; // 120% recommended default
export const DEFAULT_INTEREST_RATE_BPS = 50; // 0.5% per round
export const TESTNET_MAX_PRICE_AGE = 3600; // 1 hour testnet heartbeat

export const BONDED_SAFETY_RATIO_PRESETS = [
  { label: "100%", value: 10000 },
  { label: "120% (Recommended)", value: 12000 },
  { label: "150%", value: 15000 },
  { label: "200%", value: 20000 },
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

/**
 * Earlier factories whose clubs are still read with the current BondedTontine ABI. New clubs are always
 * created on CANONICAL_FACTORY; clubs from these factories stay "Verified by Factory" and in the directory.
 */
export const ARC_TESTNET_PREVIOUS_BONDED_FACTORIES: readonly `0x${string}`[] = [
  "0x83b04a0835B8A41a3835F9bA2D20Ba5464Ce9253", // 9-param createClub (totalRounds) + unique names; re-borrow allowed
  "0x8fD54f5aeaEF658A346a351adF5BF1B7876D4E30", // task-062: 8-param createClub, totalRounds = maxMembers
] as const;

export const TRUSTED_BONDED_FACTORIES: Record<number, readonly `0x${string}`[]> = {
  [ARC_TESTNET_CHAIN_ID]: [ARC_TESTNET_BONDED_FACTORY, ...ARC_TESTNET_PREVIOUS_BONDED_FACTORIES].filter(
    (addr, i, all) => all.findIndex((a) => a.toLowerCase() === addr.toLowerCase()) === i
  ),
  [ARC_MAINNET_CHAIN_ID]: [],
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
  vi: "Chủ hụi vay trong hạn mức cọc; ai cũng tuyên bố được vỡ nợ khi chủ hụi trễ lãi hoặc quá hạn tất toán; không có thanh lý theo giá nên rủi ro còn lại gồm giá CirBTC giảm làm cọc không đủ bù nợ, CirBTC lệch giá so với BTC, và rủi ro nhà phát hành token",
  en: "Club owner borrows within collateral limit; anyone can declare default when interest or settlement is overdue; there is no price-based liquidation, so remaining risks include a CirBTC price drop leaving collateral short of the debt, CirBTC depeg vs BTC, and token issuer risk",
} as const;

export const MOCK_ORACLE_WARNING_COPY = {
  vi: "Giá thử nghiệm, không phải giá thị trường",
  en: "Test price, not market price",
} as const;
