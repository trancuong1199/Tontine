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
    percent: percent === null ? null : (percent === 0n && numerator > 0n ? "<0.000001" : formatUnitsExact(percent, 6)),
  };
}
export function memberErrorMessage(error: string, language: "vi" | "en"): string {
  const vi = language === "vi";
  const reasons = error.split("|").map(reason => {
    if (reason === "explorer-429") return vi ? "Explorer giới hạn tốc độ (HTTP 429)" : "Explorer rate limit (HTTP 429)";
    if (reason === "rate-limit") return vi ? "Nhà cung cấp giới hạn tốc độ" : "Provider rate limit";
    if (reason === "rpc-range") return vi ? "RPC giới hạn phạm vi block" : "RPC block range limit";
    if (reason === "timeout") return vi ? "Truy vấn quá thời gian" : "Request timed out";
    if (reason === "partial") return vi ? "Danh sách chưa đầy đủ" : "Incomplete member list";
    return vi ? "Không tải được dữ liệu từ nhà cung cấp" : "Provider data unavailable";
  });
  return [...new Set(reasons)].join("; ");
}
