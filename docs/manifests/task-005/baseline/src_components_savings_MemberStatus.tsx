import { CheckCircle2, XCircle, Star, AlertCircle, Clock } from "lucide-react";
import { formatUsdc, GROUP_STATE } from "../../contract";

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
}: MemberStatusProps) {
  const hasContributed = contribution === contributionAmount;

  if (!isMember) {
    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <p className="text-slate-500 text-sm text-center">Tham gia nhóm để xem trạng thái của bạn</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
      <h3 className="font-semibold text-slate-800 text-sm">Trạng thái của bạn</h3>

      <div className="grid grid-cols-2 gap-2">
        {/* Member */}
        <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-2.5">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs text-emerald-700 font-medium">Thành viên</p>
            <p className="text-xs text-emerald-600">Đã tham gia</p>
          </div>
        </div>

        {/* Contribution */}
        {state === GROUP_STATE.OPEN ? (
          <div className="flex items-center gap-2 rounded-xl p-2.5 bg-blue-50/80 border border-blue-100">
            <Clock size={16} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-700">Đóng góp</p>
              <p className="text-xs text-blue-600">Chờ mở vòng 1</p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2 rounded-xl p-2.5 ${hasContributed ? "bg-emerald-50" : "bg-amber-50"}`}>
            {hasContributed ? (
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-amber-500 shrink-0" />
            )}
            <div>
              <p className={`text-xs font-medium ${hasContributed ? "text-emerald-700" : "text-amber-700"}`}>Đóng góp</p>
              <p className={`text-xs ${hasContributed ? "text-emerald-600" : "text-amber-600"}`}>
                {hasContributed ? "Đã đóng" : "Chưa đóng"}
              </p>
            </div>
          </div>
        )}

        {/* Bid */}
        {bid !== undefined && (
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5">
            <Star size={16} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-blue-700 font-medium">Bid của bạn</p>
              <p className="text-xs text-blue-600 tabular-nums">{formatUsdc(bid)} USDC</p>
            </div>
          </div>
        )}

        {/* Won / Kicked */}
        {hasWon && (
          <div className="flex items-center gap-2 bg-indigo-50 rounded-xl p-2.5">
            <Trophy size={16} className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs text-indigo-700 font-medium">Đã thắng</p>
              <p className="text-xs text-indigo-600">Vòng của bạn</p>
            </div>
          </div>
        )}
        {isKicked && (
          <div className="flex items-center gap-2 bg-red-50 rounded-xl p-2.5">
            <XCircle size={16} className="text-red-500 shrink-0" />
            <div>
              <p className="text-xs text-red-700 font-medium">Bị loại</p>
              <p className="text-xs text-red-600">Không đóng đúng hạn</p>
            </div>
          </div>
        )}
      </div>

      {/* Claimable payout */}
      {claimable > 0n && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 flex items-center justify-between border border-emerald-100">
          <div>
            <p className="text-xs text-emerald-700 font-medium">Có thể nhận</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatUsdc(claimable)} <span className="text-sm font-medium">USDC</span>
            </p>
          </div>
          <button
            onClick={onClaimPayout}
            disabled={isClaiming}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60 active:scale-95 transition-transform"
          >
            {isClaiming ? "Đang nhận..." : "Nhận tiền"}
          </button>
        </div>
      )}
    </div>
  );
}

// Need Trophy import
function Trophy({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
