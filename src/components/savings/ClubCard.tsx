import { Users, Clock, Trophy, Coins, ShieldCheck, Pencil } from "lucide-react";
import { formatUsdc, formatCirBtc, GROUP_STATE, formatAddress } from "../../contract";
import { Language, t } from "../../lib/i18n";

interface ClubCardProps {
  groupName: string;
  state: number;
  contributionAmount: bigint;
  maxMembers: bigint;
  activeMembers: bigint;
  totalJoined?: number;
  currentRound: bigint;
  endTime?: bigint;
  countdown: string;
  contractAddress?: string;
  collateralAmount?: bigint;
  onEditName?: () => void;
  language?: Language;
}

const STATE_CONFIG: Record<
  number,
  { bg: string; text: string; dot: string; labelVi: string; labelEn: string }
> = {
  [GROUP_STATE.OPEN]: {
    bg: "bg-emerald-950/40 border-emerald-500/30",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    labelVi: "Mở nhận thành viên",
    labelEn: "Open for Members",
  },
  [GROUP_STATE.ACTIVE]: {
    bg: "bg-amber-950/40 border-amber-500/30",
    text: "text-amber-200",
    dot: "bg-amber-400",
    labelVi: "Đang diễn ra",
    labelEn: "Active",
  },
  [GROUP_STATE.COMPLETED]: {
    bg: "bg-slate-900/60 border-slate-700/40",
    text: "text-slate-300",
    dot: "bg-slate-400",
    labelVi: "Đã hoàn thành",
    labelEn: "Completed",
  },
  [GROUP_STATE.CANCELLED]: {
    bg: "bg-rose-950/40 border-rose-500/30",
    text: "text-rose-200",
    dot: "bg-rose-400",
    labelVi: "Đã hủy",
    labelEn: "Cancelled",
  },
};

export function ClubCard({
  groupName,
  state,
  contributionAmount,
  maxMembers,
  activeMembers,
  totalJoined,
  currentRound,
  endTime,
  countdown,
  contractAddress,
  collateralAmount,
  onEditName,
  language = "vi",
}: ClubCardProps) {
  const effectiveTotalJoined =
    totalJoined !== undefined && totalJoined > 0
      ? BigInt(totalJoined)
      : state === GROUP_STATE.OPEN
      ? activeMembers
      : maxMembers;
  // Under ROSCA (Hụi) rules with Hụi Chết, all joined members contribute in every round.
  // The pot size is preserved 100% across all rounds = contributionAmount * effectiveTotalJoined.
  const potSize = contributionAmount * effectiveTotalJoined;
  const maxPotSize = contributionAmount * maxMembers;
  const fillPercent =
    maxMembers > 0n
      ? Math.min(100, Math.round((Number(effectiveTotalJoined) / Number(maxMembers)) * 100))
      : 0;
  const stateInfo = STATE_CONFIG[state] ?? STATE_CONFIG[GROUP_STATE.OPEN];
  const isEn = language === "en";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-xl shadow-amber-500/5 border border-amber-500/30 p-6 sm:p-7 transition-all">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-amber-300 bg-amber-950/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-amber-500/30">
              <ShieldCheck size={13} className="text-amber-400" />
              {t("clubCard.badge", language)}
            </span>
            {collateralAmount && collateralAmount > 0n ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-200 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40"
                title={t("collateral.securityNotice", language)}
              >
                <ShieldCheck size={12} className="text-amber-400" />
                <span>{t("collateral.badgeTitle", language)}: {formatCirBtc(collateralAmount)} CirBTC</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-slate-700/40">
                {t("collateral.noCollateral", language)}
              </span>
            )}
            {contractAddress && (
              <span className="text-xs text-amber-300/80 font-mono hidden sm:inline bg-black/40 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {formatAddress(contractAddress)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              {groupName}
            </h2>
            {onEditName && (
              <button
                type="button"
                onClick={onEditName}
                className="p-1.5 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer"
                title={isEn ? t("editClubModal.editTooltip", language) : "Đổi tên nhóm"}
                aria-label={isEn ? `Edit name for ${groupName}` : `Đổi tên nhóm ${groupName}`}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        </div>

        {/* State Pill */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold backdrop-blur-md ${stateInfo.bg} ${stateInfo.text}`}
        >
          <span className={`w-2 h-2 rounded-full ${stateInfo.dot} animate-pulse`} />
          <span>{isEn ? stateInfo.labelEn : stateInfo.labelVi}</span>
        </div>
      </div>

      {/* Hero Pot Display */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-amber-500/20 mb-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-amber-300 text-xs sm:text-sm font-semibold mb-1">
              <Coins size={16} className="text-amber-400" />
              <span>
                {state === GROUP_STATE.OPEN
                  ? `${t("clubCard.heroPotEstimatedPrefix", language)} (${effectiveTotalJoined.toString()} ${
                      isEn
                        ? effectiveTotalJoined === 1n
                          ? "member"
                          : "members"
                        : "thành viên"
                    })`
                  : t("clubCard.heroPotLabel", language)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white">
                {formatUsdc(potSize)}
              </span>
              <span className="text-lg sm:text-xl font-bold text-cyan-200">USDC</span>
              {state === GROUP_STATE.OPEN && (
                <span className="text-xs font-semibold text-amber-300/90 ml-1.5 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {t("clubCard.contribStartsNotice", language)}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-blue-200/95 mt-1.5">
              {t("clubCard.fixedContribLabel", language)}{" "}
              <strong className="text-white font-bold">{formatUsdc(contributionAmount)} USDC</strong>{" "}
              {isEn ? "/ member / round" : "/ thành viên / vòng"}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-300 block">
              {t("clubCard.maxPotLabel", language)}
            </span>
            <span className="text-base font-bold text-white tabular-nums">
              {formatUsdc(maxPotSize)} USDC
            </span>
          </div>
        </div>

        {/* Member Capacity Progress Bar */}
        <div className="mt-4 pt-4 border-t border-amber-500/10">
          <div className="flex items-center justify-between text-sm font-semibold text-blue-200 mb-2">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-amber-400" />
              <span>
                {t("clubCard.capacityLabel", language)} ({effectiveTotalJoined.toString()}/{maxMembers.toString()})
                {state === GROUP_STATE.OPEN && (
                  <span className="ml-1.5 font-normal text-amber-200/90 hidden sm:inline">
                    • {effectiveTotalJoined < 2n ? (
                      isEn ? t("clubCard.min2Condition", language) : "Cần tối thiểu 2 để bắt đầu"
                    ) : (
                      isEn ? t("clubCard.readyCondition", language) : "Đủ điều kiện bắt đầu"
                    )}
                  </span>
                )}
              </span>
            </span>
            <span className="font-bold text-amber-300 tabular-nums">{fillPercent}%</span>
          </div>
          <div className="w-full h-3 bg-black/50 border border-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500 shadow-sm shadow-amber-400/30"
              style={{ width: `${Math.max(fillPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Key Stats Grid: Large Numbers & High Contrast */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
          <Users size={18} className="mx-auto mb-1.5 text-amber-400" />
          <p className="text-lg sm:text-xl font-bold tabular-nums text-white">
            {state === GROUP_STATE.ACTIVE ? (
              <>
                <span>{activeMembers.toString()}</span>
                <span className="text-amber-300 text-xs sm:text-sm font-semibold ml-1">
                  {isEn ? t("clubCard.unawardedCount", language) : "chờ hốt"}
                </span>
                <span className="text-slate-400 font-normal text-xs sm:text-sm">/{effectiveTotalJoined.toString()}</span>
              </>
            ) : (
              <>
                {effectiveTotalJoined.toString()}
                <span className="text-slate-400 font-normal text-xs sm:text-sm">/{maxMembers.toString()}</span>
              </>
            )}
          </p>
          <p className="text-blue-200 text-xs font-semibold mt-1">
            {state === GROUP_STATE.ACTIVE ? t("clubCard.unawardedMembers", language) : t("clubCard.statMembers", language)}
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
          <Trophy size={18} className="mx-auto mb-1.5 text-amber-400" />
          <p className="text-lg sm:text-xl font-bold tabular-nums text-white">
            {state === GROUP_STATE.ACTIVE
              ? (isEn ? `Round ${currentRound.toString()}` : `Vòng ${currentRound.toString()}`)
              : (isEn ? t("clubCard.statRoundNotStarted", language) : "Chưa chạy")}
          </p>
          <p className="text-blue-200 text-xs font-semibold mt-1">
            {t("clubCard.statRound", language)}
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
          <Clock size={18} className="mx-auto mb-1.5 text-amber-400" />
          <p className="text-lg sm:text-xl font-bold tabular-nums text-white">
            {state === GROUP_STATE.ACTIVE ? countdown : "—"}
          </p>
          <p className="text-blue-200 text-xs font-semibold mt-1">
            {t("clubCard.statDuration", language)}
          </p>
        </div>
      </div>
    </div>
  );
}
