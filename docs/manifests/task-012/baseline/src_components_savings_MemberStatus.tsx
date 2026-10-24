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
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 text-center space-y-1">
        <p className="text-slate-800 font-semibold text-sm">
          {isEn ? t("memberStatus.cancelledTitle", language) : "Nhóm hụi đã bị huỷ"}
        </p>
        <p className="text-slate-600 text-xs sm:text-sm">
          {isEn ? t("memberStatus.cancelledHint", language) : "Hợp đồng đã giải tán an toàn, không còn thành viên hoạt động."}
        </p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
        <p className="text-slate-600 text-sm font-medium text-center">
          {t("memberStatus.notMemberHint", language)}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
      <h3 className="font-bold text-slate-900 text-base sm:text-lg">
        {t("memberStatus.title", language)}
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Member */}
        <div className="flex items-center gap-2.5 bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold">
              {t("memberStatus.memberBadge", language)}
            </p>
            <p className="text-xs sm:text-sm text-emerald-600 font-medium">
              {t("memberStatus.joinedBadge", language)}
            </p>
          </div>
        </div>

        {/* Contribution */}
        {state === GROUP_STATE.OPEN ? (
          <div className="flex items-center gap-2.5 rounded-2xl p-3 bg-blue-50/80 border border-blue-100">
            <Clock size={16} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-blue-800">
                {t("memberStatus.contribBadge", language)}
              </p>
              <p className="text-xs sm:text-sm font-medium text-blue-600">
                {isEn ? t("memberStatus.waitingRound1Badge", language) : "Chờ mở vòng 1"}
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2.5 rounded-2xl p-3 border ${hasContributed ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
            {hasContributed ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-amber-500 shrink-0" />
            )}
            <div>
              <p className={`text-xs sm:text-sm font-semibold ${hasContributed ? "text-emerald-800" : "text-amber-800"}`}>
                {t("memberStatus.contribBadge", language)}
              </p>
              {/* {hasContributed ? "Đã đóng" : "Chưa đóng"} */}
              <p className={`text-xs sm:text-sm font-medium ${hasContributed ? "text-emerald-600" : "text-amber-600"}`}>
                {isEn
                  ? (hasContributed ? t("memberStatus.contributedBadge", language) : t("memberStatus.notContributedBadge", language))
                  : (hasContributed ? "Đã đóng" : "Chưa đóng")}
              </p>
            </div>
          </div>
        )}

        {/* Bid */}
        {bid !== undefined && (
          <div className="flex items-center gap-2.5 bg-blue-50 rounded-2xl p-3 border border-blue-100">
            <StarIcon size={18} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-blue-800 font-semibold">
                {t("memberStatus.bidBadge", language)}
              </p>
              <p className="text-xs sm:text-sm text-blue-600 font-bold tabular-nums">{formatUsdc(bid)} USDC</p>
            </div>
          </div>
        )}

        {/* Won / Kicked */}
        {hasWon && (
          <div className="flex items-center gap-2.5 bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
            <TrophyIcon size={18} className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-indigo-800 font-semibold">
                {t("memberStatus.wonBadge", language)}
              </p>
              <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                {t("memberStatus.yourRoundBadge", language)}
              </p>
            </div>
          </div>
        )}
        {isKicked && (
          <div className="flex items-center gap-2.5 bg-red-50 rounded-2xl p-3 border border-red-100">
            <XCircle size={18} className="text-red-500 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm text-red-800 font-semibold">
                {t("memberStatus.kickedBadge", language)}
              </p>
              <p className="text-xs sm:text-sm text-red-600 font-medium">
                {t("memberStatus.kickedReason", language)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Claimable payout */}
      {claimable > 0n && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 flex items-center justify-between border border-emerald-200 shadow-2xs">
          <div>
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold">
              {t("memberStatus.claimableBadge", language)}
            </p>
            <p className="text-xl font-extrabold text-emerald-900 tabular-nums">
              {formatUsdc(claimable)} <span className="text-sm font-semibold">USDC</span>
            </p>
          </div>
          <button
            onClick={onClaimPayout}
            disabled={isClaiming}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 active:scale-95 transition-transform shadow-xs cursor-pointer"
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
