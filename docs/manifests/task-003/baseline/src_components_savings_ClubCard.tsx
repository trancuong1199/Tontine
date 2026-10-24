import { Users, Clock, Trophy, Coins, ShieldCheck, Sparkles } from "lucide-react";
import { formatUsdc, stateLabel, GROUP_STATE, formatAddress } from "../../contract";

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
}

const STATE_CONFIG: Record<number, { bg: string; text: string; dot: string; label: string }> = {
  [GROUP_STATE.OPEN]: {
    bg: "bg-emerald-500/20 border-emerald-400/30",
    text: "text-emerald-100",
    dot: "bg-emerald-400",
    label: "Mở nhận thành viên",
  },
  [GROUP_STATE.ACTIVE]: {
    bg: "bg-cyan-500/20 border-cyan-400/30",
    text: "text-cyan-100",
    dot: "bg-cyan-400",
    label: "Đang diễn ra",
  },
  [GROUP_STATE.COMPLETED]: {
    bg: "bg-slate-500/20 border-slate-400/30",
    text: "text-slate-200",
    dot: "bg-slate-400",
    label: "Đã hoàn thành",
  },
  [GROUP_STATE.CANCELLED]: {
    bg: "bg-red-500/20 border-red-400/30",
    text: "text-red-200",
    dot: "bg-red-400",
    label: "Đã hủy",
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
}: ClubCardProps) {
  const potSize = contributionAmount * activeMembers;
  const maxPotSize = contributionAmount * maxMembers;
  const fillPercent = maxMembers > 0n ? Math.min(100, Math.round((Number(activeMembers) / Number(maxMembers)) * 100)) : 0;
  const stateInfo = STATE_CONFIG[state] ?? STATE_CONFIG[GROUP_STATE.OPEN];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/15 border border-white/15 p-6 sm:p-7 transition-all">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
              <ShieldCheck size={12} className="text-cyan-300" />
              Trustless Savings Club
            </span>
            {contractAddress && (
              <span className="text-[11px] text-blue-200/80 font-mono hidden sm:inline">
                {formatAddress(contractAddress)}
              </span>
            )}
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {groupName}
          </h2>
        </div>

        {/* State Pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md ${stateInfo.bg} ${stateInfo.text}`}>
          <span className={`w-2 h-2 rounded-full ${stateInfo.dot} animate-pulse`} />
          <span>{stateInfo.label}</span>
        </div>
      </div>

      {/* Hero Pot Display */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 mb-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-medium mb-1">
              <Coins size={15} className="text-yellow-300" />
              <span>Tổng Pot vòng này</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {formatUsdc(potSize)}
              </span>
              <span className="text-lg font-bold text-cyan-200">USDC</span>
            </div>
            <p className="text-xs text-blue-200/90 mt-1 font-medium">
              Đóng góp cố định: <strong className="text-white font-semibold">{formatUsdc(contributionAmount)} USDC</strong> / thành viên / vòng
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-blue-200/80 block">Tổng quỹ tối đa (khi đủ 100%)</span>
            <span className="text-sm font-semibold text-white tabular-nums">
              {formatUsdc(maxPotSize)} USDC
            </span>
          </div>
        </div>

        {/* Member Capacity Progress Bar */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-cyan-300" />
              <span>Sức chứa thành viên ({activeMembers.toString()}/{maxMembers.toString()})</span>
            </span>
            <span className="font-semibold text-white">{fillPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.max(fillPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Key Stats Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
          <Users size={16} className="mx-auto mb-1 text-cyan-300" />
          <p className="text-base font-bold tabular-nums text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {activeMembers.toString()}
            <span className="text-blue-200 font-normal text-xs">/{maxMembers.toString()}</span>
          </p>
          <p className="text-blue-200 text-xs mt-0.5">Thành viên</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
          <Trophy size={16} className="mx-auto mb-1 text-yellow-300" />
          <p className="text-base font-bold tabular-nums text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {state === GROUP_STATE.ACTIVE ? `Vòng ${currentRound.toString()}` : "Chưa chạy"}
          </p>
          <p className="text-blue-200 text-xs mt-0.5">Vòng hiện tại</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
          <Clock size={16} className="mx-auto mb-1 text-emerald-300" />
          <p className="text-base font-bold tabular-nums text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {state === GROUP_STATE.ACTIVE ? countdown : "—"}
          </p>
          <p className="text-blue-200 text-xs mt-0.5">Thời gian vòng</p>
        </div>
      </div>
    </div>
  );
}
