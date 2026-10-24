import { Users, Clock, Trophy, Coins, ShieldCheck } from "lucide-react";
import { formatUsdc, GROUP_STATE, formatAddress } from "../../contract";
import { Language, t } from "../../lib/i18n";

interface ClubCardProps {
  groupName: string;
  state: number;
  contributionAmount: bigint;
  maxMembers: bigint;
  activeMembers: bigint;
  currentRound: bigint;
  endTime?: bigint;
  countdown: string;
  contractAddress?: string;
  language?: Language;
}

const STATE_CONFIG: Record<
  number,
  { bg: string; text: string; dot: string; labelVi: string; labelEn: string }
> = {
  [GROUP_STATE.OPEN]: {
    bg: "bg-emerald-500/20 border-emerald-400/30",
    text: "text-emerald-100",
    dot: "bg-emerald-400",
    labelVi: "Mở nhận thành viên",
    labelEn: "Open for Members",
  },
  [GROUP_STATE.ACTIVE]: {
    bg: "bg-cyan-500/20 border-cyan-400/30",
    text: "text-cyan-100",
    dot: "bg-cyan-400",
    labelVi: "Đang diễn ra",
    labelEn: "Active",
  },
  [GROUP_STATE.COMPLETED]: {
    bg: "bg-slate-500/20 border-slate-400/30",
    text: "text-slate-200",
    dot: "bg-slate-400",
    labelVi: "Đã hoàn thành",
    labelEn: "Completed",
  },
  [GROUP_STATE.CANCELLED]: {
    bg: "bg-red-500/20 border-red-400/30",
    text: "text-red-200",
    dot: "bg-red-400",
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
  currentRound,
  endTime,
  countdown,
  contractAddress,
  language = "vi",
}: ClubCardProps) {
  const potSize = contributionAmount * activeMembers;
  const maxPotSize = contributionAmount * maxMembers;
  const fillPercent =
    maxMembers > 0n
      ? Math.min(100, Math.round((Number(activeMembers) / Number(maxMembers)) * 100))
      : 0;
  const stateInfo = STATE_CONFIG[state] ?? STATE_CONFIG[GROUP_STATE.OPEN];
  const isEn = language === "en";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/15 border border-white/15 p-6 sm:p-7 transition-all">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
              <ShieldCheck size={13} className="text-cyan-300" />
              {t("clubCard.badge", language)}
            </span>
            {contractAddress && (
              <span className="text-xs text-blue-200/90 font-mono hidden sm:inline bg-black/20 px-2 py-0.5 rounded-lg">
                {formatAddress(contractAddress)}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
            {groupName}
          </h2>
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
      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/15 mb-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-blue-200 text-xs sm:text-sm font-semibold mb-1">
              <Coins size={16} className="text-yellow-300" />
              <span>{t("clubCard.heroPotLabel", language)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white">
                {formatUsdc(potSize)}
              </span>
              <span className="text-lg sm:text-xl font-bold text-cyan-200">USDC</span>
            </div>
            <p className="text-sm font-medium text-blue-200/95 mt-1.5">
              {t("clubCard.fixedContribLabel", language)}{" "}
              <strong className="text-white font-bold">{formatUsdc(contributionAmount)} USDC</strong>{" "}
              {isEn ? "/ member / round" : "/ thành viên / vòng"}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-blue-200/90 block">
              {t("clubCard.maxPotLabel", language)}
            </span>
            <span className="text-base font-bold text-white tabular-nums">
              {formatUsdc(maxPotSize)} USDC
            </span>
          </div>
        </div>

        {/* Member Capacity Progress Bar */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm font-semibold text-blue-200 mb-2">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-cyan-300" />
              <span>
                {t("clubCard.capacityLabel", language)} ({activeMembers.toString()}/{maxMembers.toString()})
                {state === GROUP_STATE.OPEN && (
                  <span className="ml-1.5 font-normal text-cyan-200/90 hidden sm:inline">
                    • {activeMembers < 2n ? (
                      isEn ? t("clubCard.min2Condition", language) : "Cần tối thiểu 2 để bắt đầu"
                    ) : (
                      isEn ? t("clubCard.readyCondition", language) : "Đủ điều kiện bắt đầu"
                    )}
                  </span>
                )}
              </span>
            </span>
            <span className="font-bold text-white tabular-nums">{fillPercent}%</span>
          </div>
          <div className="w-full h-3 bg-black/25 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.max(fillPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Key Stats Grid: Large Numbers & High Contrast */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
          <Users size={18} className="mx-auto mb-1.5 text-cyan-300" />
          <p className="text-lg sm:text-xl font-bold tabular-nums text-white">
            {activeMembers.toString()}
            <span className="text-blue-200 font-normal text-xs sm:text-sm">/{maxMembers.toString()}</span>
          </p>
          <p className="text-blue-200 text-xs font-semibold mt-1">
            {t("clubCard.statMembers", language)}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
          <Trophy size={18} className="mx-auto mb-1.5 text-yellow-300" />
          <p className="text-lg sm:text-xl font-bold tabular-nums text-white">
            {state === GROUP_STATE.ACTIVE
              ? (isEn ? `Round ${currentRound.toString()}` : `Vòng ${currentRound.toString()}`)
              : (isEn ? t("clubCard.statRoundNotStarted", language) : "Chưa chạy")}
          </p>
          <p className="text-blue-200 text-xs font-semibold mt-1">
            {t("clubCard.statRound", language)}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
          <Clock size={18} className="mx-auto mb-1.5 text-emerald-300" />
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
