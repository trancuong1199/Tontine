import React from "react";
import { CheckCircle2, Info, Share2, Check, Shield, XCircle } from "lucide-react";
import { formatUsdc } from "../../contract";
import { type Language, t } from "../../lib/i18n";

export interface WaitingViewProps {
  language: Language;
  contributionAmount: bigint;
  currentCancelVotes: number;
  effectiveRequiredVotes: number;
  hasVotedCancel?: boolean;
  isLoading?: boolean;
  joinedCount: number;
  onCopyInvite: () => void;
  copiedInvite?: boolean;
  onVoteCancelGroup: () => void;
}

export function WaitingView({
  language,
  contributionAmount,
  currentCancelVotes,
  effectiveRequiredVotes,
  hasVotedCancel,
  isLoading,
  joinedCount,
  onCopyInvite,
  copiedInvite,
  onVoteCancelGroup,
}: WaitingViewProps) {
  const isEn = language === "en";

  return (
    <div className="space-y-4">
      {/* Registration Confirmation Badge */}
      <div className="flex items-start gap-3 text-emerald-300 text-xs bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4">
        <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-300 text-sm sm:text-base">
            {isEn ? t("actionPanel.openRegisteredNotice", language) : "Bạn đã là thành viên của nhóm!"}
          </p>
          <p className="text-emerald-400/90 leading-relaxed text-xs sm:text-sm mt-0.5">
            {isEn ? (
              <>Successfully registered. The club is currently in the <strong>Registration phase (OPEN)</strong>.</>
            ) : (
              <>Ghi danh thành công. Nhóm hiện đang ở <strong>Giai đoạn đăng ký (OPEN)</strong>.</>
            )}
          </p>
        </div>
      </div>

      {/* Explanatory Box on Why Contributions Haven't Started Yet */}
      <div className="bg-[#0a0b12]/80 border border-amber-500/20 rounded-2xl p-4 sm:p-5 text-sm sm:text-base space-y-3 sm:space-y-4 shadow-inner">
        <div className="flex items-center gap-2 font-bold text-white text-base sm:text-lg">
          <Info size={18} className="text-amber-400 shrink-0" />
          <span>{isEn ? t("actionPanel.whyNoContribTitle", language) : "Vì sao chưa thấy chỗ đóng tiền?"}</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
          {isEn ? (
            <>
              According to the decentralized Rotating Savings (Tontine) smart contract rules, contributions (<strong>{formatUsdc(contributionAmount)} USDC</strong>/round) only start when <strong>Round 1 officially begins</strong>. This guarantees that round timers and bidding are synchronized fairly for all members.
            </>
          ) : (
            <>
              Theo quy tắc Smart Contract Hụi xoay vòng (Tontine), tiền đóng hụi (<strong>{formatUsdc(contributionAmount)} USDC</strong>/vòng) chỉ bắt đầu thu khi <strong>Vòng 1 chính thức bắt đầu</strong>. Điều này giúp đảm bảo thời gian đếm ngược và đấu giá được tính chuẩn cho tất cả thành viên.
            </>
          )}
        </p>

        {/* 3-Step Roadmap */}
        <div className="pt-2 sm:pt-3 border-t border-amber-500/10 space-y-2.5">
          <p className="font-bold text-amber-300 text-sm sm:text-base">
            {isEn ? t("actionPanel.roadmapTitle", language) : "Quy trình tiếp theo:"}
          </p>
          <div className="space-y-2.5 text-slate-300 text-sm sm:text-base leading-relaxed">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">1</span>
              <span>
                {isEn ? (
                  <>Wait for club to reach at least <strong>2 members</strong>.</>
                ) : (
                  <>Chờ nhóm có tối thiểu <strong>2 thành viên</strong> tham gia.</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">2</span>
              <span>
                {isEn ? (
                  <>Club owner clicks <strong>"Start Rounds"</strong> in the control panel.</>
                ) : (
                  <>Chủ nhóm bấm <strong>"Bắt đầu các vòng"</strong> trong bảng điều khiển.</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">3</span>
              <span>
                {isEn ? (
                  <>Button <strong>"Contribute ({formatUsdc(contributionAmount)} USDC)"</strong> & <strong>Place Bid</strong> box will appear right here!</>
                ) : (
                  <>Nút <strong>"Đóng góp ({formatUsdc(contributionAmount)} USDC)"</strong> & ô <strong>Đặt Bid</strong> sẽ lập tức hiển thị ngay tại đây!</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Share / Invite Friends Button */}
        <div className="pt-2 border-t border-amber-500/10">
          <button
            onClick={onCopyInvite}
            className="w-full py-2.5 sm:py-3 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-500/30"
          >
            {copiedInvite ? (
              <>
                <Check size={16} className="text-emerald-400" />
                <span className="text-emerald-300">
                  {isEn ? t("actionPanel.inviteCopied", language) : "Đã sao chép liên kết mời!"}
                </span>
              </>
            ) : (
              <>
                <Share2 size={16} className="text-amber-400" />
                <span>
                  {isEn ? t("actionPanel.inviteBtn", language) : "Mời bạn bè gia nhập để nhóm đủ điều kiện"}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Consensus Cancel Vote for Members */}
        {joinedCount >= 2 && (
          <div className="pt-3 border-t border-amber-500/15 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-red-300 flex items-center gap-1.5">
                <Shield size={14} className="text-red-400" />
                <span>
                  {isEn
                    ? "Cancel Club Consensus Vote"
                    : "Biểu quyết Huỷ nhóm (Đồng thuận đa số)"}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 font-mono font-bold">
                {currentCancelVotes}/{effectiveRequiredVotes} {isEn ? "votes" : "phiếu"}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isEn
                ? `When ${joinedCount} members have joined, the club owner cannot cancel unilaterally. At least ${effectiveRequiredVotes}/${joinedCount} members must vote to cancel (eligible collateral can be claimed separately).`
                : `Khi đã có ${joinedCount} thành viên tham gia, trưởng nhóm không thể tự ý huỷ một mình. Cần tối thiểu ${effectiveRequiredVotes}/${joinedCount} phiếu biểu quyết đồng thuận từ các thành viên để huỷ nhóm (hoàn trả 100% cọc CirBTC).`}
            </p>
            <button
              type="button"
              onClick={onVoteCancelGroup}
              disabled={isLoading || Boolean(hasVotedCancel)}
              className="w-full py-2.5 px-3 border border-red-500/40 bg-red-950/30 hover:bg-red-950/50 text-red-300 disabled:opacity-50 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <XCircle size={15} className="text-red-400" />
              <span>
                {hasVotedCancel
                  ? (isEn
                      ? `✓ You Voted to Cancel (${currentCancelVotes}/${effectiveRequiredVotes})`
                      : `✓ Bạn đã bỏ phiếu đồng ý huỷ (${currentCancelVotes}/${effectiveRequiredVotes})`)
                  : (isEn
                      ? `Vote to Cancel Club (${currentCancelVotes}/${effectiveRequiredVotes})`
                      : `Biểu quyết đồng ý Huỷ nhóm (${currentCancelVotes}/${effectiveRequiredVotes})`)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
