import React from "react";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Crown,
  ExternalLink,
  Trophy,
  XCircle,
  Coins,
} from "lucide-react";
import { formatAddress, formatUsdc, ARC_TESTNET_CHAIN_ID } from "../../contract";
import { buildAddressExplorerUrl } from "@/onchain-facts";
import { Language, t } from "../../lib/i18n";
import { ClubMemberInfo } from "../../hooks/useSavingsClub";

interface ClubMembersRosterProps {
  members: ClubMemberInfo[];
  totalJoined: number;
  maxMembers: bigint;
  currentRound: bigint;
  highestBidder: `0x${string}` | null;
  highestBid: bigint;
  userAddress?: string;
  ownerAddress?: string;
  isLoading?: boolean;
  language?: Language;
  settledWinners?: { address: string; roundId: bigint }[];
  state?: number;
}

export function ClubMembersRoster({
  members,
  totalJoined,
  maxMembers,
  currentRound,
  highestBidder,
  highestBid,
  userAddress,
  ownerAddress,
  isLoading,
  language = "vi",
  settledWinners,
  state,
}: ClubMembersRosterProps) {
  const isEn = language === "en";
  const userAddrLower = userAddress?.toLowerCase();
  const ownerAddrLower = ownerAddress?.toLowerCase();

  return (
    <div className="bg-[#0c0d14] rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <span>{isEn ? t("roster.title", language) : "Danh Sách Thành Viên & Tiến Độ"}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {isEn
                ? t("roster.desc", language)
                : "Theo dõi trực tiếp ai đã đóng tiền và mức đấu giá nhận pot trong vòng này"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tabular-nums shadow-2xs">
            {totalJoined} / {maxMembers.toString()}{" "}
            {isEn ? "members" : "thành viên"}
          </span>
          {highestBid > 0n && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 tabular-nums">
              <Crown size={12} className="text-yellow-400" />
              <span>
                {isEn ? "Top Bid:" : "Top Bid:"} {formatUsdc(highestBid)} USDC
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && members.length === 0 && (
        <div className="py-8 text-center text-slate-400 text-sm animate-pulse flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>{isEn ? "Loading members..." : "Đang tải danh sách thành viên..."}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && members.length === 0 && (
        <div className="py-6 text-center text-slate-500 text-sm">
          {isEn ? t("roster.emptyList", language) : "Chưa có thành viên nào tham gia."}
        </div>
      )}

      {/* Members List */}
      {members.length > 0 && (
        <div className="space-y-2.5">
          {members.map((member) => {
            const isUser = userAddrLower && member.address.toLowerCase() === userAddrLower;
            const isOwner = ownerAddrLower && member.address.toLowerCase() === ownerAddrLower;
            const isHighest = highestBidder && member.address.toLowerCase() === highestBidder.toLowerCase() && member.bid > 0n;
            const wonRound = settledWinners?.slice().reverse().find((w) => w.address.toLowerCase() === member.address.toLowerCase())?.roundId;

            return (
              <div
                key={member.address}
                className={`rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                  isUser
                    ? "bg-amber-950/25 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-[#10121c]/80 border-slate-800/80 hover:border-amber-500/20"
                }`}
              >
                {/* Left: Member info & Badges */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    #{member.index}
                  </span>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, member.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                        title={member.address}
                      >
                        {formatAddress(member.address)}
                        <ExternalLink size={10} className="text-slate-500 shrink-0" />
                      </a>

                      {isUser && (
                        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-2xs">
                          {isEn ? t("roster.youBadge", language) : "Bạn"}
                        </span>
                      )}

                      {isOwner && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {isEn ? t("roster.ownerBadge", language) : "Chủ nhóm"}
                        </span>
                      )}

                      {member.hasWon && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 inline-flex items-center gap-1">
                          <Trophy size={10} />
                          <span>
                            {wonRound
                              ? (isEn
                                  ? t("roster.awardedRoundBadge", language).replace("{round}", wonRound.toString())
                                  : t("roster.awardedRoundBadge", language).replace("{round}", wonRound.toString()))
                              : (isEn ? t("roster.awardedGeneralBadge", language) : t("roster.awardedGeneralBadge", language))}
                          </span>
                          <span className="hidden">{isEn ? "Won Pot" : "Đã hốt"}</span>
                        </span>
                      )}

                      {member.isKicked && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                          <XCircle size={10} />
                          <span>{isEn ? "Kicked" : "Bị loại"}</span>
                        </span>
                      )}

                      {member.claimable !== undefined && member.claimable > 0n && (
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 inline-flex items-center gap-1 shadow-xs animate-pulse">
                          <Coins size={11} className="text-emerald-400" />
                          <span>
                            {isEn
                              ? `Claimable: ${formatUsdc(member.claimable)} USDC`
                              : `Có thể rút: ${formatUsdc(member.claimable)} USDC`}
                          </span>
                        </span>
                      )}

                      {member.hasVotedCancel && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 inline-flex items-center gap-1">
                          <span>{isEn ? "🗳️ Voted Cancel" : "🗳️ Đã bỏ phiếu huỷ"}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Round Contributions & Bid Status */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60">
                  {state === 2 ? (
                    <div className="flex items-center gap-2 text-xs">
                      {member.claimable !== undefined && member.claimable > 0n ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 font-bold shadow-xs">
                          <Coins size={13} className="text-emerald-400 shrink-0" />
                          <span>
                            {isEn ? "Ready to Claim:" : "Được chia / Chờ rút:"}{" "}
                            <strong className="text-emerald-200 tabular-nums">
                              +{formatUsdc(member.claimable)} USDC
                            </strong>
                          </span>
                        </span>
                      ) : member.hasWon ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/50 text-amber-300 border border-amber-500/30 font-semibold">
                          <Trophy size={13} className="text-amber-400 shrink-0" />
                          <span>
                            {isEn
                              ? `Pot Paid (Round ${wonRound?.toString() ?? (isEn ? "unknown" : "chưa xác định")})`
                              : `Đã nhận Pot (Vòng ${wonRound?.toString() ?? (isEn ? "unknown" : "chưa xác định")})`}
                          </span>
                        </span>
                      ) : !member.isKicked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-semibold">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span>
                            {isEn
                              ? "Principal + Bonus Withdrawn"
                              : "Đã rút hoàn gốc & lãi"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-500/30 font-semibold">
                          <XCircle size={13} className="text-rose-400 shrink-0" />
                          <span>
                            {isEn
                              ? "0.00 USDC (Did not contribute)"
                              : "0.00 USDC (Không đóng tiền vòng này)"}
                          </span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Contribution Badge */}
                      <div className="flex items-center gap-1.5 text-xs">
                        {member.hasContributed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 font-semibold shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                            <span>
                              {isEn ? "Contributed" : "Đã đóng"}{" "}
                              <strong className="text-emerald-200 tabular-nums">
                                {formatUsdc(member.contribution)}
                              </strong>
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/40 text-amber-300 border border-amber-500/30 font-semibold">
                            <AlertCircle size={13} className="text-amber-400 shrink-0" />
                            <span>{isEn ? "Pending" : "Chờ đóng"}</span>
                          </span>
                        )}
                      </div>

                      {/* Bid Display */}
                      <div className="flex items-center gap-1.5 text-xs">
                        {member.hasWon ? (
                          <span className="text-xs text-amber-400/80 px-2.5 py-1 font-medium bg-amber-950/30 rounded-xl border border-amber-500/20">
                            {isEn ? "No bid (Awarded)" : "Đã hốt (Không bid)"}
                            <span className="hidden">{isEn ? "No bid" : "Chưa bid"}</span>
                          </span>
                        ) : member.bid > 0n ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold tabular-nums border ${
                              isHighest
                                ? "bg-amber-500/25 text-amber-200 border-amber-500/50 shadow-xs shadow-amber-500/10"
                                : "bg-slate-800/70 text-slate-300 border-slate-700/70"
                            }`}
                          >
                            {isHighest && <Crown size={12} className="text-amber-400 shrink-0" />}
                            <span>
                              {formatUsdc(member.bid)} <span className="text-xs text-slate-400">USDC</span>
                            </span>
                            {isHighest && (
                              <span className="text-xs uppercase font-black tracking-tight text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded-sm border border-amber-500/30 ml-0.5">
                                {isEn ? "Top" : "Top"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 px-2.5 py-1 font-medium">
                            {isEn ? "No bid" : "Chưa bid"}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
