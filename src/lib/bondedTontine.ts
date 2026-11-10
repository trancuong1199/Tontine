import bondedTontineArtifact from "../../contracts/out/BondedTontine.sol/BondedTontine.json" with { type: "json" };
import bondedTontineFactoryArtifact from "../../contracts/out/BondedTontineFactory.sol/BondedTontineFactory.json" with { type: "json" };
import mockAggregatorV3Artifact from "../../contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json" with { type: "json" };

export const BONDED_TONTINE_ABI = bondedTontineArtifact.abi;
export const BONDED_TONTINE_FACTORY_ABI = bondedTontineFactoryArtifact.abi;
export const MOCK_AGGREGATOR_V3_ABI = mockAggregatorV3Artifact.abi;

export const BONDED_STATE = {
  OPEN: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  DEFAULTED: 3,
  CANCELLED: 4,
} as const;

export type BondedStateCode = (typeof BONDED_STATE)[keyof typeof BONDED_STATE];

export const DEFAULT_REASON = {
  INTEREST_OVERDUE: 0,
  SETTLEMENT_OVERDUE: 1,
  UNDERCOLLATERALIZED: 2,
} as const;

export type DefaultReasonCode = (typeof DEFAULT_REASON)[keyof typeof DEFAULT_REASON];

export interface BondedClubConfigParams {
  groupName: string;
  contributionAmount: bigint; // USDC 6 decimals
  maxMembers: number; // 2..20
  roundDuration: number; // seconds, 60..31536000
  rateBpsPerRound: number; // 1..1000
  safetyBps: number; // 15000..50000
  liquidationBps: number; // 11000..safetyBps-2000
  interestGrace: number; // 0..604800
  settlementGrace: number; // 3600..1209600
}

export const DEFAULT_BONDED_PARAMS: BondedClubConfigParams = {
  groupName: "Saigon Bonded Club",
  contributionAmount: 50_000_000n, // 50 USDC
  maxMembers: 10,
  roundDuration: 86_400, // 1 day
  rateBpsPerRound: 200, // 2% per round
  safetyBps: 20_000, // 200%
  liquidationBps: 12_000, // 120%
  interestGrace: 86_400, // 1 day
  settlementGrace: 172_800, // 2 days
};

export function calculateAnnualizedAprPct(
  rateBpsPerRound: number,
  roundDurationSeconds: number
): number {
  if (roundDurationSeconds <= 0 || rateBpsPerRound <= 0) return 0;
  const roundsPerYear = (365 * 86_400) / roundDurationSeconds;
  return (rateBpsPerRound / 100) * roundsPerYear;
}

export function isMockOracleDescription(description: string): boolean {
  return typeof description === "string" && description.startsWith("MOCK");
}

export function validateBondedClubParams(params: BondedClubConfigParams): {
  valid: boolean;
  reason?: string;
} {
  const nameBytes = new TextEncoder().encode(params.groupName ?? "");
  if (nameBytes.length === 0 || nameBytes.length > 32) {
    return { valid: false, reason: "InvalidConfiguration: groupName must be 1..32 UTF-8 bytes" };
  }
  if (params.contributionAmount <= 0n) {
    return { valid: false, reason: "InvalidConfiguration: contributionAmount must be > 0" };
  }
  if (params.maxMembers < 2 || params.maxMembers > 20) {
    return { valid: false, reason: "InvalidConfiguration: maxMembers must be 2..20" };
  }
  if (params.roundDuration < 60 || params.roundDuration > 365 * 86_400) {
    return { valid: false, reason: "InvalidConfiguration: roundDuration must be 60..31536000" };
  }
  if (params.rateBpsPerRound < 1 || params.rateBpsPerRound > 1000) {
    return { valid: false, reason: "InvalidConfiguration: rateBpsPerRound must be 1..1000" };
  }
  if (params.safetyBps < 15_000 || params.safetyBps > 50_000) {
    return { valid: false, reason: "InvalidConfiguration: safetyBps must be 15000..50000" };
  }
  if (params.liquidationBps < 11_000 || params.liquidationBps > params.safetyBps - 2_000) {
    return {
      valid: false,
      reason: "InvalidConfiguration: liquidationBps must be 11000..safetyBps-2000",
    };
  }
  if (params.interestGrace < 0 || params.interestGrace > 7 * 86_400) {
    return { valid: false, reason: "InvalidConfiguration: interestGrace must be 0..604800" };
  }
  if (params.settlementGrace < 3_600 || params.settlementGrace > 14 * 86_400) {
    return { valid: false, reason: "InvalidConfiguration: settlementGrace must be 3600..1209600" };
  }
  return { valid: true };
}

export interface OracleRoundData {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
}

export interface OracleEnvironmentValidationInput {
  env: "testnet" | "mainnet";
  feedAddress: string;
  description: string;
  decimals: number;
  roundData: OracleRoundData;
  nowSeconds: bigint;
  maxPriceAge: bigint;
  mainnetAllowlist?: string[];
}

export function validateOracleFeedForEnv(input: OracleEnvironmentValidationInput): {
  valid: boolean;
  reason?: string;
} {
  if (!input.feedAddress || input.feedAddress === "0x0000000000000000000000000000000000000000") {
    return { valid: false, reason: "InvalidConfiguration: zero feedAddress" };
  }
  if (input.decimals < 0 || input.decimals > 18) {
    return { valid: false, reason: "InvalidConfiguration: decimals > 18" };
  }
  if (input.maxPriceAge < 3_600n || input.maxPriceAge > 172_800n) {
    return { valid: false, reason: "InvalidConfiguration: maxPriceAge out of bounds" };
  }

  const isMock = isMockOracleDescription(input.description);
  if (input.env === "mainnet") {
    if (isMock) {
      return { valid: false, reason: "MainnetOracleRejected: MOCK feed is forbidden on mainnet" };
    }
    const allowlist = (input.mainnetAllowlist ?? []).map((a) => a.toLowerCase());
    if (!allowlist.includes(input.feedAddress.toLowerCase())) {
      return {
        valid: false,
        reason: "MainnetOracleRejected: feedAddress is not in mainnet allowlist",
      };
    }
  }

  const { roundId, answer, updatedAt, answeredInRound } = input.roundData;
  if (
    answer <= 0n ||
    updatedAt === 0n ||
    updatedAt > input.nowSeconds ||
    answeredInRound < roundId
  ) {
    return { valid: false, reason: "BadPrice" };
  }
  if (input.nowSeconds - updatedAt > input.maxPriceAge) {
    return { valid: false, reason: "StalePrice" };
  }
  return { valid: true };
}

/**
 * Bilingual VI & EN error dictionary for all 21 custom errors in BondedTontine ABI (T6.9)
 */
export const BONDED_TONTINE_ERROR_MESSAGES: Record<
  string,
  { vi: string; en: string }
> = {
  DefaultPending: {
    vi: "Nhóm đang chờ xử lý vỡ nợ, tạm thời không nhận thêm tiền góp",
    en: "Group has a pending default or liquidation; new contributions are paused",
  },
  ExceedsBorrowLimit: {
    vi: "Số tiền vay vượt quá hạn mức tín dụng được bảo đảm bởi cọc CirBTC",
    en: "Borrow amount exceeds the credit limit backed by CirBTC collateral",
  },
  CollateralLocked: {
    vi: "Không thể rút cọc CirBTC vì dư nợ và lãi hiện tại vượt hạn mức an toàn sau khi rút",
    en: "Cannot withdraw CirBTC collateral because current exposure would exceed the safety limit",
  },
  StalePrice: {
    vi: "Giá BTC/USD từ Oracle đã quá hạn (stale), vui lòng cập nhật giá trước khi thực hiện",
    en: "Oracle BTC/USD price is stale; please wait for a fresh price update",
  },
  BadPrice: {
    vi: "Dữ liệu giá BTC/USD từ Oracle không hợp lệ",
    en: "Oracle BTC/USD price data is invalid",
  },
  NotLiquidatable: {
    vi: "Vị thế cọc vẫn an toàn trên ngưỡng thanh lý, chưa thể kích hoạt thanh lý",
    en: "Position is still healthy above the liquidation threshold and cannot be liquidated",
  },
  NotDefaultable: {
    vi: "Chưa hết hạn chót trả lãi hoặc tất toán, chưa thể tuyên bố vỡ nợ",
    en: "Interest or settlement deadline has not elapsed yet; cannot declare default",
  },
  NotFinalizable: {
    vi: "Chưa kết thúc chu kỳ hoặc chủ hụi chưa hoàn trả đủ gốc và lãi để tất toán",
    en: "Cycle has not ended or owner has not repaid all principal and interest yet",
  },
  WrongState: {
    vi: "Trạng thái nhóm hiện tại không cho phép thực hiện thao tác này",
    en: "Current group state does not allow this action",
  },
  NotMember: {
    vi: "Ví của bạn không phải là thành viên của nhóm này",
    en: "Your wallet is not a member of this club",
  },
  AlreadyMember: {
    vi: "Địa chỉ ví này đã là thành viên trong nhóm",
    en: "This wallet address is already a member of the club",
  },
  GroupFull: {
    vi: "Nhóm đã đủ số lượng thành viên tối đa",
    en: "This club has reached its maximum member capacity",
  },
  AlreadyContributed: {
    vi: "Bạn đã đóng tiền góp cho vòng hiện tại rồi",
    en: "You have already contributed for the current round",
  },
  RoundNotActive: {
    vi: "Hiện không nằm trong thời gian hoạt động của vòng đóng tiền",
    en: "Round is not currently active for contributions or borrowing",
  },
  InvalidConfiguration: {
    vi: "Cấu hình tham số nhóm hoặc điều kiện bắt đầu vòng (tối thiểu 2 thành viên và đã nạp cọc) chưa hợp lệ",
    en: "Invalid club configuration or start conditions (requires at least 2 members and non-zero collateral)",
  },
  InvalidAmount: {
    vi: "Số lượng token nhập vào không hợp lệ hoặc bằng 0",
    en: "Token amount is invalid or zero",
  },
  InsufficientLiquidity: {
    vi: "Số dư USDC khả dụng trong quỹ không đủ để vay số tiền này",
    en: "Available USDC liquidity in the pool is insufficient for this borrow amount",
  },
  NothingToClaim: {
    vi: "Hiện không có tiền lãi hoặc tiền gốc khả dụng để rút",
    en: "Nothing available to claim or withdraw",
  },
  OwnerCannotJoin: {
    vi: "Chủ hụi (người vay) không được phép tham gia làm thành viên đóng tiền trong cùng nhóm",
    en: "Club owner (borrower) cannot join as a contributing member in the same club",
  },
  RenounceDisabled: {
    vi: "Chức năng từ bỏ quyền chủ hụi đã bị khóa để bảo vệ nghĩa vụ trả nợ",
    en: "Renouncing ownership is disabled to preserve borrower accountability",
  },
  TransferLockedAfterOpen: {
    vi: "Không thể chuyển quyền chủ hụi sau khi nhóm đã bắt đầu chạy các vòng",
    en: "Ownership transfer is locked once rounds have started",
  },
};

export function parseBondedTontineError(
  err: unknown,
  lang: "vi" | "en" = "vi"
): string {
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? `${err.name} ${err.message} ${(err as { shortMessage?: string }).shortMessage ?? ""}`
        : String(err ?? "");

  for (const [errorName, msg] of Object.entries(BONDED_TONTINE_ERROR_MESSAGES)) {
    if (raw.includes(errorName)) {
      return msg[lang];
    }
  }
  if (raw.toLowerCase().includes("user rejected") || raw.toLowerCase().includes("user denied")) {
    return lang === "vi" ? "Bạn đã hủy ký giao dịch trên ví." : "Transaction signature was rejected.";
  }
  return lang === "vi"
    ? "Giao dịch BondedTontine thất bại. Vui lòng kiểm tra điều kiện vòng và số dư."
    : "BondedTontine transaction failed. Please check round conditions and balances.";
}
