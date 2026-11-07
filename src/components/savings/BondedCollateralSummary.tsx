import type { BondedClubSnapshot } from "../../hooks/useBondedClub";
import { collateralCoverage, availablePrincipal, formatFinancialAmount, formatRoundDuration } from "../../lib/bondedDisplay";
import { formatUnitsExact } from "../../onchain-money";

export function BondedCollateralSummary({ club, language }: { club: BondedClubSnapshot; language: "vi" | "en" }) {
  const en = language === "en";
  const status = club.oracleStatus;
  const ready = club.financialsAvailable && !club.isLoading && !club.error;
  const validEstimate = ready && (status === "fresh" || status === "stale");
  const coverage = collateralCoverage(club.collateral, validEstimate ? club.oraclePriceRaw : 0n, club.oracleDecimals, club.contributionAmount, club.maxMembers);
  const unavailable = en ? "Unavailable" : "Chưa có dữ liệu";
  return <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100" data-testid="bonded-collateral-summary">
    <h3 className="font-bold text-amber-300">{en ? "Collateral and price risk" : "Cọc và rủi ro giá"}</h3>
    <p>{en ? "Owner collateral" : "Cọc chủ nhóm"}: {ready ? `${formatUnitsExact(club.collateral, 8)} cirBTC` : unavailable}</p>
    <p>{status === "stale" ? (en ? "Historical estimate (stale price)" : "Ước tính theo giá cũ (quá hạn)") : (en ? "Collateral value" : "Giá trị cọc")}: {coverage.usd === null ? unavailable : `$${coverage.usd.startsWith("<") || coverage.value! <= 100_000n ? coverage.usd : formatFinancialAmount(coverage.value!)}`}</p>
    <p>{en ? "Maximum cycle pool" : "Quỹ tối đa cả chu kỳ"}: {ready ? `${formatFinancialAmount(coverage.maximumPool)} USDC` : unavailable} · {en ? "Collateral coverage" : "Tỷ lệ cọc"}: {coverage.percent === null ? unavailable : `${coverage.percent}%`}</p>
    <p>{en ? "Oracle" : "Giá oracle"}: {status === "fresh" ? (en ? "Fresh" : "Còn hạn") : status === "stale" ? (en ? "Stale — operator refresh required" : "Quá hạn — cần bên vận hành cập nhật") : status === "invalid" ? (en ? "Invalid price" : "Giá không hợp lệ") : unavailable} · {en ? "Age / limit" : "Tuổi giá / giới hạn"}: {club.oracleUpdatedAt > 0n ? `${(club.priceAgeSeconds === 0n ? (en ? "0 seconds" : "0 giây") : formatRoundDuration(Number(club.priceAgeSeconds), en))} / ${formatRoundDuration(Number(club.maxPriceAge), en)}` : unavailable}</p>
    {club.isMockOracle && <p>{en ? "Test price, not market price" : "Giá thử nghiệm, không phải giá thị trường"}</p>}
    <p>{en ? "Collateral does not guarantee full recovery. Historical estimates cannot authorize borrowing." : "Cọc không bảo đảm thu hồi đủ vốn. Ước tính theo giá cũ không dùng để cho phép vay."}</p>
  </div>;
}


export function BondedLiquiditySummary({ club, language }: { club: BondedClubSnapshot; language: "vi" | "en" }) {
  const vi = language === "vi";
  const ready = club.financialsAvailable && !club.isLoading && !club.error;
  const placeholder = club.isLoading ? (vi ? "Đang tải…" : "Loading…") : (vi ? "Chưa có dữ liệu" : "Unavailable");
  const amount = (value: bigint) => ready ? `${formatFinancialAmount(value)} USDC` : placeholder;
  return <div className="mt-3 space-y-1 text-sm" data-testid="available-principal">
    <p>{vi ? "Tổng vốn đã góp" : "Total contributed principal"}: {amount(club.totalDeposits)}</p>
    <p>{vi ? "Dư nợ gốc" : "Outstanding principal debt"}: {amount(club.totalDebt)}</p>
    <p className="font-semibold text-amber-200">{vi ? "Thanh khoản khả dụng (vốn góp)" : "Available liquidity (contributed principal)"}: {amount(availablePrincipal(club.totalDeposits, club.totalDebt))}</p>
    <p className="text-xs text-slate-400">{vi ? "Tiền góp trừ dư nợ; không phải số dư token hay cam kết số có thể rút." : "Deposits minus debt; not the token balance or a promised withdrawable amount."}</p>
  </div>;
}
