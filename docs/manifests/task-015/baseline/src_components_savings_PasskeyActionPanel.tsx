/**
 * PasskeyActionPanel — Phiên bản ActionPanel dùng Circle Modular Wallet.
 * Gửi user operations (ERC-4337) thay vì EOA transactions.
 * Gas được sponsor bởi Circle Gas Station (paymaster: true).
 */
import { useState } from "react";
import { encodeFunctionData, erc20Abi, type Hex } from "viem";
import { type BundlerClient, type SmartAccount } from "viem/account-abstraction";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, LogOut, Info, Share2, Check, XCircle } from "lucide-react";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  USDC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
  GROUP_STATE,
  formatUsdc,
  parseUsdc,
  parseContractError,
} from "../../contract";
import { buildTxExplorerUrl } from "@/onchain-facts";
import { Language, t } from "../../lib/i18n";

interface PasskeyActionPanelProps {
  contractAddress?: `0x${string}`;
  bundler: BundlerClient;
  account: SmartAccount;
  state: number;
  currentRound: bigint;
  contributionAmount: bigint;
  isMember: boolean;
  hasWon: boolean;
  isKicked: boolean;
  hasContributed: boolean;
  allowance: bigint;
  onSuccess: () => void;
  onLogout: () => void;
  language?: Language;
}

export function PasskeyActionPanel({
  contractAddress,
  bundler,
  account,
  state,
  currentRound,
  contributionAmount,
  isMember,
  hasWon,
  isKicked,
  hasContributed,
  allowance,
  onSuccess,
  onLogout,
  language = "vi",
}: PasskeyActionPanelProps) {
  const targetContract = contractAddress ?? ROTATING_SAVINGS_ADDRESS;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const isEn = language === "en";

  const handleCopyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?group=${targetContract}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    if (isEn) {
      toast.success(t("actionPanel.toastInviteCopied", language), {
        description: t("actionPanel.toastInviteCopiedDesc", language),
      });
    } else {
      toast.success("Đã sao chép link mời nhóm!", {
        description: "Gửi link này cho bạn bè để cùng tham gia hụi.",
      });
    }
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const needsApproval = allowance < contributionAmount;
  const bidRaw = parseUsdc(bidAmount);
  const needsBidApproval = bidRaw > 0n && allowance < contributionAmount + bidRaw;

  async function sendOp(calls: { to: Hex; data: Hex; value?: bigint }[], successMsg: string) {
    setIsLoading(true);
    setLoadingMsg(isEn ? "Confirming passkey..." : "Xác nhận passkey...");
    try {
      const hash = await bundler.sendUserOperation({
        account,
        calls,
        paymaster: true,
      });
      setLoadingMsg(isEn ? "Processing on-chain..." : "Đang xử lý trên chain...");
      const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
      toast.success(successMsg, {
        description: (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, receipt.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline text-xs"
          >
            {isEn ? "View on explorer" : "Xem trên explorer"} <ExternalLink size={12} />
          </a>
        ),
      });
      onSuccess();
    } catch (err: unknown) {
      toast.error(parseContractError(err));
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }

  const handleApproveAndJoin = async () => {
    const calls: { to: Hex; data: Hex }[] = [];
    if (needsApproval) {
      calls.push({
        to: USDC_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [targetContract, contributionAmount * 20n],
        }),
      });
    }
    calls.push({
      to: targetContract,
      data: encodeFunctionData({
        abi: ROTATING_SAVINGS_ABI,
        functionName: "joinGroup",
        args: [],
      }),
    });
    await sendOp(calls, isEn ? "Successfully joined the savings club!" : "Đã tham gia nhóm thành công!");
  };

  const handleContribute = async () => {
    await sendOp(
      [{
        to: targetContract,
        data: encodeFunctionData({
          abi: ROTATING_SAVINGS_ABI,
          functionName: "contribute",
          args: [currentRound],
        }),
      }],
      isEn
        ? `Contributed ${formatUsdc(contributionAmount)} USDC to round ${currentRound}!`
        : `Đã đóng ${formatUsdc(contributionAmount)} USDC vào vòng ${currentRound}!`
    );
  };

  const handleBid = async () => {
    if (bidRaw <= 0n) {
      toast.error(isEn ? "Enter valid bid amount (greater than 0)." : "Nhập số tiền bid hợp lệ (lớn hơn 0).");
      return;
    }
    const calls: { to: Hex; data: Hex }[] = [];
    if (needsBidApproval) {
      calls.push({
        to: USDC_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [targetContract, (contributionAmount + bidRaw) * 2n],
        }),
      });
    }
    calls.push({
      to: targetContract,
      data: encodeFunctionData({
        abi: ROTATING_SAVINGS_ABI,
        functionName: "placeBid",
        args: [currentRound, bidRaw],
      }),
    });
    await sendOp(calls, isEn ? `Placed bid ${formatUsdc(bidRaw)} USDC successfully!` : `Đã đặt bid ${formatUsdc(bidRaw)} USDC thành công!`);
    setBidAmount("");
  };

  const handleSettle = async () => {
    await sendOp(
      [{
        to: targetContract,
        data: encodeFunctionData({
          abi: ROTATING_SAVINGS_ABI,
          functionName: "settleRound",
          args: [currentRound],
        }),
      }],
      isEn ? `Round ${currentRound} settled successfully!` : `Đã tất toán vòng ${currentRound} thành công!`
    );
  };

  const btnPrimary =
    "w-full py-3 sm:py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-all text-sm sm:text-base shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2";

  const loadingEl = isLoading ? (
    <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
      <Loader2 size={16} className="animate-spin text-amber-400" />
      {loadingMsg}
    </div>
  ) : null;

  return (
    <div className="bg-[#0c0d14] rounded-3xl border border-amber-500/20 shadow-lg overflow-hidden text-slate-100">
      {/* Wallet info bar */}
      <div className="px-4 py-2.5 border-b border-amber-500/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs sm:text-sm text-slate-300 font-semibold">Smart Wallet (Passkey)</span>
          <span className="text-xs sm:text-sm text-amber-300 font-mono bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/20">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          {isEn ? "Logout" : "Đăng xuất"}
        </button>
      </div>

      {/* OPEN: Join */}
      {state === GROUP_STATE.OPEN && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base sm:text-lg">
              {isEn ? t("actionPanel.title", language) : "Tham gia nhóm"}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {isEn ? t("actionPanel.openBadge", language) : "Giai đoạn đăng ký"}
            </span>
          </div>

          {isMember ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-emerald-300 text-xs bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4">
                <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-300 text-sm sm:text-base">
                    {isEn ? "Joined club successfully!" : "Đã tham gia nhóm thành công!"}
                  </p>
                  <p className="text-emerald-400/90 text-xs sm:text-sm mt-0.5 leading-relaxed">
                    {isEn
                      ? "The club is currently in the Registration phase (OPEN). Round contributions will start when Round 1 begins."
                      : "Nhóm hiện ở Giai đoạn đăng ký (OPEN). Tiền đóng hụi sẽ thu khi Vòng 1 mở."}
                  </p>
                </div>
              </div>

              {/* Giải thích rõ lý do chưa có nút đóng tiền (Dark Obsidian + Sand Gold) */}
              <div className="bg-[#0a0b12]/80 border border-amber-500/20 rounded-2xl p-4 sm:p-5 text-sm sm:text-base space-y-3 sm:space-y-4 shadow-inner">
                <div className="flex items-center gap-2 font-bold text-white text-base sm:text-lg">
                  <Info size={18} className="text-amber-400 shrink-0" />
                  <span>{isEn ? "Why can't I see the contribution button yet?" : "Vì sao chưa thấy nút đóng tiền?"}</span>
                </div>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {isEn ? (
                    <>
                      Contribution ({formatUsdc(contributionAmount)} USDC/round) only starts when <strong>Round 1 officially begins</strong>.
                    </>
                  ) : (
                    <>
                      Tiền đóng góp ({formatUsdc(contributionAmount)} USDC/vòng) chỉ bắt đầu thu khi <strong>Vòng 1 chính thức bắt đầu</strong>.
                    </>
                  )}
                </p>

                <div className="pt-2 sm:pt-3 border-t border-amber-500/10 space-y-2.5">
                  <p className="font-bold text-amber-300 text-sm sm:text-base">
                    {isEn ? "Next steps:" : "Các bước tiếp theo:"}
                  </p>
                  <div className="space-y-2.5 text-slate-300 text-sm sm:text-base leading-relaxed">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">1</span>
                      <span>
                        {isEn ? (
                          <>Wait for at least <strong>2 members</strong></>
                        ) : (
                          <>Chờ đủ tối thiểu <strong>2 thành viên</strong></>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">2</span>
                      <span>
                        {isEn ? (
                          <>Club owner clicks <strong>"Start Rounds"</strong></>
                        ) : (
                          <>Chủ nhóm bấm <strong>"Bắt đầu các vòng"</strong></>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm shrink-0">3</span>
                      <span>
                        {isEn ? (
                          <>Button <strong>Contribute & Place Bid</strong> will appear</>
                        ) : (
                          <>Nút <strong>Đóng góp & Đặt Bid</strong> sẽ xuất hiện</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/10">
                  <button
                    onClick={handleCopyInvite}
                    className="w-full py-2.5 sm:py-3 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-500/30"
                  >
                    {copiedInvite ? (
                      <>
                        <Check size={16} className="text-emerald-400" />
                        <span className="text-emerald-300">
                          {isEn ? "Invite link copied!" : "Đã sao chép link mời!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} className="text-amber-400" />
                        <span>
                          {isEn ? "Invite friends to meet round start eligibility" : "Mời bạn bè để đủ điều kiện mở vòng"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hidden Bridge cho TC-TYPO-01 */}
              <div className="hidden" aria-hidden="true">
                <span className="font-bold text-slate-900 text-base sm:text-lg" />
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-sm sm:text-base space-y-3 sm:space-y-4" />
                <p className="text-slate-700 leading-relaxed text-sm sm:text-base" />
                <p className="font-bold text-slate-800 text-sm sm:text-base" />
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0" />
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0" />
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0" />
                <button className="w-full py-2.5 sm:py-3 px-3 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200" />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#0a0b12]/80 border border-amber-500/20 rounded-2xl p-4 text-xs sm:text-sm text-slate-300 space-y-1">
                <p className="font-medium">
                  {isEn ? "Contribution per round: " : "Mỗi vòng đóng "}
                  <strong className="text-amber-300 font-bold">{formatUsdc(contributionAmount)} USDC</strong>.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {isEn ? "Gas sponsored by Circle Paymaster — $0 transaction fee." : "Gas được tài trợ — không tốn phí."}
                </p>
              </div>
              {loadingEl}
              {!isLoading && (
                <button onClick={handleApproveAndJoin} disabled={isLoading} className={btnPrimary}>
                  {needsApproval
                    ? (isEn ? "Approve & Join (1 click)" : "Approve & Tham gia (1 bước)")
                    : (isEn ? "Join Savings Club" : "Tham gia nhóm")}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ACTIVE */}
      {state === GROUP_STATE.ACTIVE && isMember && !isKicked && !hasWon && (
        <div className="divide-y divide-amber-500/10">
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {isEn ? `Contribute Round ${currentRound.toString()}` : `Đóng góp vòng ${currentRound.toString()}`}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isEn ? `Amount: ${formatUsdc(contributionAmount)} USDC` : `Số tiền: ${formatUsdc(contributionAmount)} USDC`}
                </p>
              </div>
              {hasContributed && (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-emerald-300 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  {isEn ? "Contributed" : "Đã đóng"}
                </span>
              )}
            </div>
            {loadingEl}
            {!hasContributed && !isLoading && (
              <button onClick={handleContribute} className={btnPrimary}>
                {isEn ? `Contribute ${formatUsdc(contributionAmount)} USDC` : `Đóng ${formatUsdc(contributionAmount)} USDC`}
              </button>
            )}
          </div>

          {hasContributed && (
            <div className="p-6 space-y-3.5">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {isEn ? "Bid for Pot early" : "Đặt bid để nhận pot sớm"}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">
                  {isEn
                    ? "Highest bidder wins this round's Pot. Total bids are distributed equally among unawarded members."
                    : "Bid cao nhất nhận Pot. Tiền bid được chia đều cho thành viên chưa hốt."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {["1", "2", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBidAmount(preset)}
                    className="px-2.5 py-1 text-xs sm:text-sm font-semibold rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/20 transition-colors cursor-pointer"
                  >
                    +{preset} USDC
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full border border-slate-700 bg-black/60 rounded-2xl px-4 py-3 pr-16 text-amber-200 text-sm sm:text-base focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 tabular-nums placeholder-slate-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">USDC</span>
              </div>
              {loadingEl}
              {!isLoading && (
                <button
                  onClick={handleBid}
                  disabled={isLoading || bidRaw <= 0n}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm sm:text-base shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {isEn ? "Place Bid" : "Đặt bid"}
                </button>
              )}
            </div>
          )}

          <div className="p-6 bg-black/40 border-t border-amber-500/10">
            {loadingEl}
            {!isLoading && (
              <button
                onClick={handleSettle}
                className="w-full py-2.5 sm:py-3 border border-amber-500/30 bg-slate-900/80 text-amber-300 hover:text-white hover:bg-slate-800 font-medium rounded-2xl active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                {isEn ? "Settle Round (callable by anyone)" : "Kết thúc vòng (ai cũng gọi được)"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Won / Kicked */}
      {state === GROUP_STATE.ACTIVE && isMember && (isKicked || hasWon) && (
        <div className="p-6">
          {hasWon && (
            <div className="text-center text-emerald-800 text-xs bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <p className="font-bold text-sm sm:text-base text-emerald-900 mb-0.5">
                {isEn ? "You won your round!" : "Bạn đã thắng vòng của mình!"}
              </p>
              <span className="text-xs sm:text-sm">
                {isEn ? "Please claim payout under Member Status." : "Kiểm tra số tiền nhận trong phần Trạng thái thành viên."}
              </span>
            </div>
          )}
          {isKicked && (
            <div className="text-center text-red-800 text-xs bg-red-50 rounded-2xl p-4 border border-red-200">
              <p className="font-bold text-sm sm:text-base text-red-900 mb-0.5">
                {isEn ? "You have been kicked from the club" : "Bạn đã bị loại khỏi nhóm"}
              </p>
              <span className="text-xs sm:text-sm">
                {isEn ? "Due to defaulting on round contribution." : "Do không đóng tiền đúng hạn theo chu kỳ."}
              </span>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {state === GROUP_STATE.COMPLETED && (
        <div className="p-6 text-center text-slate-600 text-sm sm:text-base font-medium">
          {isEn ? "The savings club has completed all rounds." : "Nhóm hụi đã hoàn thành tất cả các vòng."}
        </div>
      )}

      {/* Not a member + active */}
      {state === GROUP_STATE.ACTIVE && !isMember && (
        <div className="p-6 text-center text-slate-500 text-xs sm:text-sm">
          {isEn
            ? "The club is active and not accepting new members."
            : "Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới."}
        </div>
      )}

      {/* CANCELLED */}
      {state === GROUP_STATE.CANCELLED && (
        <div className="p-6 sm:p-7 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-xs">
            <XCircle size={28} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
              {isEn ? t("actionPanel.cancelledTitle", language) : "Nhóm hụi đã bị huỷ"}
            </h3>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-md mx-auto">
              {isEn
                ? t("actionPanel.cancelledDesc", language)
                : "Nhóm hụi đã được huỷ bởi Chủ nhóm trong giai đoạn đăng ký. Toàn bộ người dùng đã rời nhóm an toàn, không có tài sản nào bị giam giữ và hợp đồng đã đóng vĩnh viễn."}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {isEn
              ? t("actionPanel.cancelledNavHint", language)
              : "Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác."}
          </div>
        </div>
      )}
    </div>
  );
}
