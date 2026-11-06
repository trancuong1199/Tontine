import { formatUnitsExact } from "../onchain-money.ts";

export function formatRoundDuration(seconds: number, isEn: boolean): string {
  if (seconds <= 0) return "--";
  const value = seconds < 3600 ? Math.round(seconds / 60) : seconds < 86400 ? Math.round(seconds / 3600) : Number((seconds / 86400).toFixed(1));
  const unit = seconds < 3600 ? (isEn ? "min" : "phút") : seconds < 86400 ? (isEn ? (value === 1 ? "hour" : "hours") : "giờ") : (isEn ? (value === 1 ? "day" : "days") : "ngày");
  return `${value} ${unit}`;
}
export function bondedStateLabel(state: number, language: "vi" | "en"): string {
  return (language === "en" ? ["Open for Registration", "Active", "Completed", "Defaulted / Liquidated", "Cancelled"] : ["Đang mở tham gia", "Đang hoạt động", "Đã hoàn tất", "Vỡ nợ / Thanh lý", "Đã hủy"])[state] ?? (language === "en" ? "Unknown" : "Chưa rõ");
}
export type OracleStatus = "fresh" | "stale" | "invalid" | "unavailable";
export function oracleStatus(price: bigint, updatedAt: bigint, answeredInRound: bigint, roundId: bigint, now: bigint, maxAge: bigint): OracleStatus {
  if (updatedAt === 0n) return "unavailable";
  if (price <= 0n || updatedAt > now || answeredInRound < roundId) return "invalid";
  return now - updatedAt > maxAge ? "stale" : "fresh";
}
export function collateralCoverage(collateral: bigint, price: bigint, decimals: number | null, contribution: bigint, maxMembers: bigint) {
  const maximumPool = contribution * maxMembers * maxMembers;
  const scale = decimals !== null && Number.isInteger(decimals) && decimals >= 0 && decimals <= 18 && price > 0n
    ? 10n ** BigInt(decimals + 2) : null;
  const numerator = collateral * price;
  const value = scale !== null ? numerator / scale : null;
  // Calculate coverage before rounding to USDC base units so tiny positive bonds
  // remain distinguishable from a genuinely zero deposit.
  const percent = scale !== null && maximumPool > 0n ? numerator * 100_000_000n / (scale * maximumPool) : null;
  return {
    maximumPool,
    value,
    usd: value === null ? null : (value === 0n && collateral > 0n ? "<0.000001" : formatUnitsExact(value, 6)),
    percent: percent === null ? null : (percent === 0n && numerator > 0n ? "<0.000001" : formatAdaptivePercent(percent)),
  };
}
export function memberErrorMessage(error: string, language: "vi" | "en"): string {
  const vi = language === "vi";
  const reasons = new Set(error.split("|"));
  const primary = reasons.has("explorer-429")
    ? (vi ? "Explorer đang giới hạn tốc độ (HTTP 429). Vui lòng thử lại." : "Explorer rate limited (HTTP 429). Please retry.")
    : reasons.has("rate-limit")
      ? (vi ? "Nhà cung cấp đang giới hạn tốc độ. Vui lòng thử lại." : "Provider rate limited. Please retry.")
      : reasons.has("timeout")
        ? (vi ? "Truy vấn quá thời gian. Vui lòng thử lại." : "Request timed out. Please retry.")
        : reasons.has("rpc-range")
          ? (vi ? "RPC giới hạn phạm vi block. Vui lòng thử lại." : "RPC block range limit. Please retry.")
          : (vi ? "Không tải được danh sách. Vui lòng thử lại." : "Member list unavailable. Please retry.");
  return reasons.has("partial") ? `${primary} ${vi ? "Danh sách chưa đầy đủ." : "Incomplete member list."}` : primary;
}

export interface ContributionRiskInput {
  collateral: bigint;
  oraclePriceRaw: bigint;
  oracleDecimals: number | null;
  oracleStatus: OracleStatus;
  oracleError: boolean;
  contributionAmount: bigint;
  maxMembers: bigint;
  oracleUpdatedAt: bigint;
  maxPriceAge: bigint;
  financialsAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

/** Disclosure threshold only, independent of contract borrowing/liquidation rules. */
export function requiresRiskAcknowledgement(input: ContributionRiskInput): boolean {
  const { oracleDecimals: decimals } = input;
  if (!input.financialsAvailable || input.isLoading || input.error || input.oracleError || input.oracleStatus !== "fresh" || decimals === null || !Number.isInteger(decimals) || decimals < 0 || decimals > 18 || input.oraclePriceRaw <= 0n || input.contributionAmount <= 0n || input.maxMembers <= 0n) return true;
  return input.collateral * input.oraclePriceRaw < input.contributionAmount * input.maxMembers * input.maxMembers * 10n ** BigInt(decimals + 2);
}

export function riskAcknowledgementContext(input: ContributionRiskInput, account?: string, club?: string): string {
  return [account?.toLowerCase() ?? "guest", club?.toLowerCase() ?? "", input.collateral, input.oraclePriceRaw, input.oracleDecimals, input.oracleStatus, input.oracleError, input.contributionAmount, input.maxMembers, input.oracleUpdatedAt, input.maxPriceAge, input.financialsAvailable, Boolean(input.error)].join(":");
}

export function availablePrincipal(deposits: bigint, debt: bigint): bigint {
  return deposits > debt ? deposits - debt : 0n;
}

/** Input uses six decimal places of percentage; bigints keep large ratios exact. */
export function formatAdaptivePercent(percent: bigint): string {
  if (percent >= 1_000_000n) return formatUnitsExact((percent + 5_000n) / 10_000n, 2);
  return formatUnitsExact(percent, 6);
}
