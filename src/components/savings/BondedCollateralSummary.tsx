import type { BondedClubSnapshot } from "../../hooks/useBondedClub";
import { collateralCoverage } from "../../lib/bondedDisplay";
import { formatUnitsExact } from "../../onchain-money";

export function BondedCollateralSummary({ club, language }: { club: BondedClubSnapshot; language: "vi" | "en" }) {
  const en = language === "en";
  const status = club.oracleStatus;
  const validEstimate = status === "fresh" || status === "stale";
  const coverage = collateralCoverage(club.collateral, validEstimate ? club.oraclePriceRaw : 0n, club.oracleDecimals, club.contributionAmount, club.maxMembers);
  const unavailable = en ? "Unavailable" : "Chưa có dữ liệu";
  return <div className="space-y-1 text-xs text-amber-200/90" data-testid="bonded-collateral-summary">
    <p>{en ? "Owner collateral" : "Cọc chủ nhóm"}: {formatUnitsExact(club.collateral, 8)} cirBTC</p>
    <p>{status === "stale" ? (en ? "Historical estimate (stale price)" : "Ước tính theo giá cũ (quá hạn)") : (en ? "Collateral value" : "Giá trị cọc")}: {coverage.usd === null ? unavailable : `$${coverage.usd}`}</p>
    <p>{en ? "Maximum cycle pool" : "Quỹ tối đa cả chu kỳ"}: {formatUnitsExact(coverage.maximumPool, 6)} USDC · {en ? "Collateral coverage" : "Tỷ lệ cọc"}: {coverage.percent === null ? unavailable : `${coverage.percent}%`}</p>
    <p>{en ? "Oracle" : "Giá oracle"}: {status === "fresh" ? (en ? "Fresh" : "Còn hạn") : status === "stale" ? (en ? "Stale — operator refresh required" : "Quá hạn — cần bên vận hành cập nhật") : status === "invalid" ? (en ? "Invalid price" : "Giá không hợp lệ") : unavailable} · {en ? "Age / limit" : "Tuổi giá / giới hạn"}: {club.oracleUpdatedAt > 0n ? `${club.priceAgeSeconds}s / ${club.maxPriceAge}s` : unavailable}</p>
    {club.isMockOracle && <p>{en ? "Test price, not market price" : "Giá thử nghiệm, không phải giá thị trường"}</p>}
    <p>{en ? "Collateral does not guarantee full recovery. Historical estimates cannot authorize borrowing." : "Cọc không bảo đảm thu hồi đủ vốn. Ước tính theo giá cũ không dùng để cho phép vay."}</p>
  </div>;
}
