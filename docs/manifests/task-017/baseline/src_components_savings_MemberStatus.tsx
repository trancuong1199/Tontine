import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatUsdc, GROUP_STATE } from "../../contract";
import { Language, t } from "../../lib/i18n";

interface MemberStatusProps {
  state?: number;
  isMember: boolean;
  hasWon: boolean;
  isKicked: boolean;
  claimable: bigint;
  contribution?: bigint;
  bid?: bigint;
  contributionAmount: bigint;
  onClaimPayout: () => void;
  isClaiming: boolean;
  language?: Language;
}

export function MemberStatus({
  state,
  isMember,
  hasWon,
  isKicked,
  claimable,
  contribution,
  bid,
  contributionAmount,
  onClaimPayout,
  isClaiming,
  language = "vi",
}: MemberStatusProps) {
  const hasContributed = contribution === contributionAmount;
  const isEn = language === "en";

  if (state === GROUP_STATE.CANCELLED) {
    return (
      <div className="bg-[#0c0d14] rounded-2xl p-4 sm:p-5 border border-rose-900/40 text-center space-y-1">
        <p className="text-rose-200 font-semibold text-sm">
          {isEn ? t("memberStatus.cancelledTitle", language) : "Nhóm hụi đã bị huỷ"}
        </p>
        <p className="text-slate-400 text-xs sm:text-sm">
          {isEn ? t("memberStatus.cancelledHint", language) : "Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."}
        </p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="bg-[#0c0d14] rounded-2xl p-4 sm:p-5 border border-amber-500/20">
        <p className="text-slate-400 text-sm font-medium text-center">
          {t("memberStatus.notMemberHint", language)}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0d14] rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-lg space-y-4 text-slate-100">
      <h3 className="font-bold text-slate-900 text-base sm:text-lg">
        <span className="text-white">{t("memberStatus.title", language)}</span>
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Member */}
        <div className="flex items-center gap-2.5 bg-emerald-950/40 rounded-2xl p-3 border border-emerald-500/30">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold">
              <span className="text-emerald-300">{t("memberStatus.memberBadge", language)}</span>
            </p>
            <p className="text-xs sm:text-sm text-emerald-600 font-medium">
              <span className="text-emerald-400">{t("memberStatus.joinedBadge", language)}</span>
            </p>
          </div>
        </div>

        {/* Contribution */}
        {state === GROUP_STATE.OPEN ? (
          <div className="flex items-center gap-2.5 rounded-2xl p-3 bg-amber-950/30 border border-amber-500/20">
            <Clock size={16} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-blue-800">
                <span className="text-amber-300">{t("memberStatus.contribBadge", language)}</span>
              </p>
              <p className="text-xs sm:text-sm font-medium text-blue-600">
                <span className="text-amber-200">{isEn ? t("memberStatus.waitingRound1Badge", language) : "Chờ mở vòng 1"}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2.5 rounded-2xl p-3 border ${hasContributed ? "bg-emerald-950/40 border-emerald-500/30" : "bg-amber-950/40 border-amber-500/30"}`}>
            {hasContributed ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
            )}
            <div>
              <p className={`text-xs sm:text-sm font-semibold ${hasContributed ? "text-emerald-800 text-emerald-300" : "text-amber-800 text-amber-300"}`}>
                {t("memberStatus.contribBadge", language)}
              </p>
              {/* {hasContributed ? "Đã đóng" : "Chưa đóng"} */}
              <p className={`text-xs sm:text-sm font-medium ${hasContributed ? "text-emerald-600 text-emerald-400" : "text-amber-600 text-amber-400"}`}>
                {isEn
                  ? (hasContributed ? t("memberStatus.contributedBadge", language) : t("memberStatus.notContributedBadge", language))
                  : (hasContributed ? "Đã đóng" : "Chưa đóng")}
              </p>
            </div>
          </div>
        )}

        {/* Bid */}
        {bid !== undefined && (
          <div className="flex items-center gap-2.5 bg-black/40 rounded-2xl p-3 border border-amber-500/20">
            <StarIcon size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-blue-800 font-semibold">
                <span className="text-slate-300">{t("memberStatus.bidBadge", language)}</span>
              </p>
              <p className="text-xs sm:text-sm text-blue-600 font-bold tabular-nums">
                <span className="text-amber-300">{formatUsdc(bid)} USDC</span>
              </p>
            </div>
          </div>
        )}

        {/* Won / Kicked */}
        {hasWon && (
          <div className="flex items-center gap-2.5 bg-amber-950/30 rounded-2xl p-3 border border-amber-500/30">
            <TrophyIcon size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-indigo-800 font-semibold">
                <span className="text-amber-300">{t("memberStatus.wonBadge", language)}</span>
              </p>
              <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                <span className="text-amber-200">{t("memberStatus.yourRoundBadge", language)}</span>
              </p>
            </div>
          </div>
        )}
        {isKicked && (
          <div className="flex items-center gap-2.5 bg-rose-950/40 rounded-2xl p-3 border border-rose-500/30">
            <XCircle size={18} className="text-rose-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-red-800 font-semibold">
                <span className="text-rose-300">{t("memberStatus.kickedBadge", language)}</span>
              </p>
              <p className="text-xs sm:text-sm text-red-600 font-medium">
                <span className="text-rose-200">{t("memberStatus.kickedReason", language)}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Claimable payout */}
      {claimable > 0n && (
        <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 rounded-2xl p-4 flex items-center justify-between border border-emerald-500/30 shadow-lg">
          <div>
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold">
              <span className="text-emerald-300">{t("memberStatus.claimableBadge", language)}</span>
            </p>
            <p className="text-xl font-extrabold text-emerald-900 tabular-nums">
              <span className="text-emerald-300">{formatUsdc(claimable)}</span> <span className="text-sm font-semibold text-emerald-400">USDC</span>
            </p>
          </div>
          <button
            onClick={onClaimPayout}
            disabled={isClaiming}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-sm rounded-xl disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {isClaiming ? t("memberStatus.claimingBtn", language) : t("memberStatus.claimPayoutBtn", language)}
          </button>
        </div>
      )}
    </div>
  );
}

function StarIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrophyIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
