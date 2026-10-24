import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, PiggyBank, Wallet, ShieldCheck, Zap, Info, Share2, Check, XCircle } from "lucide-react";
import { useModal } from "connectkit";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  USDC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
  GROUP_STATE,
  parseUsdc,
  formatUsdc,
  parseContractError,
} from "../../contract";
import { buildTxExplorerUrl } from "@/onchain-facts";
import { Language, t } from "../../lib/i18n";

interface ActionPanelProps {
  contractAddress?: `0x${string}`;
  state: number;
  currentRound: bigint;
  contributionAmount: bigint;
  isMember: boolean;
  hasWon: boolean;
  isKicked: boolean;
  hasContributed: boolean;
  allowance: bigint;
  onSuccess: () => void;
  language?: Language;
}

export function ActionPanel({
  contractAddress,
  state,
  currentRound,
  contributionAmount,
  isMember,
  hasWon,
  isKicked,
  hasContributed,
  allowance,
  onSuccess,
  language = "vi",
}: ActionPanelProps) {
  const targetContract = contractAddress ?? ROTATING_SAVINGS_ADDRESS;
  const { address, chainId } = useAccount();
  const { setOpen: openConnectModal } = useModal();
  const { switchChain } = useSwitchChain();
  const [bidAmount, setBidAmount] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;
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

  const {
    writeContract,
    data: hash,
    isPending,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      if (isEn) {
        toast.success("Transaction successful!", {
          description: hash ? (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline"
            >
              View on explorer <ExternalLink size={12} />
            </a>
          ) : undefined,
        });
      } else {
        toast.success("Giao dịch thành công!", {
          description: hash ? (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline"
            >
              Xem trên explorer <ExternalLink size={12} />
            </a>
          ) : undefined,
        });
      }
      reset();
      onSuccess();
    }
  }, [isSuccess]);

  const switchIfNeeded = () => {
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return false;
    }
    return true;
  };

  const bidRaw = parseUsdc(bidAmount);
  const needsApproval = allowance < contributionAmount;
  const needsApprovalForBid = bidRaw > 0n && allowance < contributionAmount + bidRaw;

  // --- Actions ---

  const handleApproveAndJoin = async () => {
    if (!switchIfNeeded() || !address) return;
    try {
      if (needsApproval) {
        writeContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [targetContract, contributionAmount * 20n],
          chainId: ARC_TESTNET_CHAIN_ID,
        });
        toast.info(isEn ? "Approve USDC first, then join club." : "Approve USDC trước, rồi join nhóm.");
      } else {
        writeContract({
          address: targetContract,
          abi: ROTATING_SAVINGS_ABI,
          functionName: "joinGroup",
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      }
    } catch (e) {
      toast.error(parseContractError(e));
    }
  };

  const handleContribute = () => {
    if (!switchIfNeeded() || !address) return;
    try {
      writeContract({
        address: targetContract,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "contribute",
        args: [currentRound],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) {
      toast.error(parseContractError(e));
    }
  };

  const handleApproveForBid = () => {
    if (!switchIfNeeded() || !address) return;
    if (bidRaw <= 0n) {
      toast.error(isEn ? "Enter valid bid amount (greater than 0)." : "Nhập số tiền bid hợp lệ (lớn hơn 0).");
      return;
    }
    const needed = contributionAmount + bidRaw;
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [targetContract, needed * 2n],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
    toast.info(isEn ? "Approval complete, submit bid again." : "Approve xong, bấm Đặt bid lại.");
  };

  const handlePlaceBid = () => {
    if (!switchIfNeeded() || !address) return;
    if (bidRaw <= 0n) {
      toast.error(isEn ? "Enter valid bid amount (greater than 0)." : "Nhập số tiền bid hợp lệ (lớn hơn 0).");
      return;
    }
    try {
      writeContract({
        address: targetContract,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "placeBid",
        args: [currentRound, bidRaw],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) {
      toast.error(parseContractError(e));
    }
  };

  const handleSettle = () => {
    if (!switchIfNeeded() || !address) return;
    try {
      writeContract({
        address: targetContract,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "settleRound",
        args: [currentRound],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (e) {
      toast.error(parseContractError(e));
    }
  };

  const isLoading = isPending || isConfirming;
  const loadingLabel = isPending
    ? (isEn ? t("actionPanel.loadingSign", language) : "Xác nhận trong ví...")
    : isConfirming
    ? (isEn ? t("actionPanel.loadingProcess", language) : "Đang xử lý...")
    : "";

  if (!address) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs text-center space-y-5">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
          <PiggyBank size={28} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
            {isEn ? t("actionPanel.notConnectedTitle", language) : "Tham gia nhóm hụi"}
          </h3>
          <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-sm mx-auto">
            {isEn
              ? `Contribute ${formatUsdc(contributionAmount)} USDC each round and bid to receive pot early. Zero counterparty risk — contract safeguards funds.`
              : `Đóng góp ${formatUsdc(contributionAmount)} USDC mỗi vòng và đặt bid nhận pot sớm. Không cần tin tưởng ai — hợp đồng giữ tiền an toàn.`}
          </p>
        </div>

        <button
          onClick={() => openConnectModal?.(true)}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl text-sm sm:text-base shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Wallet size={18} />
          <span>{isEn ? t("actionPanel.connectBtn", language) : "Kết nối ví để tham gia"}</span>
        </button>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" /> Trustless
          </span>
          <span className="flex items-center gap-1">
            <Zap size={14} className="text-amber-500" /> Gas USDC ≈ $0
          </span>
          <span>Arc Testnet</span>
        </div>
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200/80 text-center space-y-3 shadow-xs">
        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-sm">
          !
        </div>
        <div>
          <h4 className="font-bold text-amber-800 text-sm sm:text-base">
            {isEn ? t("actionPanel.wrongChainTitle", language) : "Sai mạng kết nối"}
          </h4>
          <p className="text-amber-700 text-xs sm:text-sm mt-1">
            {isEn
              ? `Please switch wallet to Arc Testnet (Chain ID: ${ARC_TESTNET_CHAIN_ID}) to interact.`
              : `Cần chuyển ví sang mạng Arc Testnet (Chain ID: ${ARC_TESTNET_CHAIN_ID}) để tương tác.`}
          </p>
        </div>
        <button
          onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          {isEn ? t("actionPanel.switchChainBtn", language) : "Chuyển mạng Arc Testnet"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* --- OPEN state: Join --- */}
      {state === GROUP_STATE.OPEN && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {isEn ? t("actionPanel.title", language) : "Tham gia nhóm"}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isEn ? t("actionPanel.openBadge", language) : "Giai đoạn đăng ký"}
            </span>
          </div>

          {isMember ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-emerald-800 text-xs bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm sm:text-base">
                    {isEn ? t("actionPanel.openRegisteredNotice", language) : "Bạn đã là thành viên của nhóm!"}
                  </p>
                  <p className="text-emerald-700 leading-relaxed text-xs sm:text-sm mt-0.5">
                    {isEn ? (
                      <>Successfully registered. The club is currently in the <strong>Registration phase (OPEN)</strong>.</>
                    ) : (
                      <>Ghi danh thành công. Nhóm hiện đang ở <strong>Giai đoạn đăng ký (OPEN)</strong>.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Giải thích rõ quy trình & lý do chưa có nút đóng tiền (Large Typography Upgrade AC-03.1) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-sm sm:text-base space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base sm:text-lg">
                  <Info size={18} className="text-blue-600 shrink-0" />
                  <span>{isEn ? t("actionPanel.whyNoContribTitle", language) : "Vì sao chưa thấy chỗ đóng tiền?"}</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
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

                <div className="pt-2 sm:pt-3 border-t border-slate-200/60 space-y-2.5">
                  <p className="font-bold text-slate-800 text-sm sm:text-base">
                    {isEn ? t("actionPanel.roadmapTitle", language) : "Quy trình tiếp theo:"}
                  </p>
                  <div className="space-y-2.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">1</span>
                      <span>
                        {isEn ? (
                          <>Wait for club to reach at least <strong>2 members</strong>.</>
                        ) : (
                          <>Chờ nhóm có tối thiểu <strong>2 thành viên</strong> tham gia.</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">2</span>
                      <span>
                        {isEn ? (
                          <>Club owner clicks <strong>"Start Rounds"</strong> in the control panel.</>
                        ) : (
                          <>Chủ nhóm bấm <strong>"Bắt đầu các vòng"</strong> trong bảng điều khiển.</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">3</span>
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

                <div className="pt-2 border-t border-slate-200/60">
                  <button
                    onClick={handleCopyInvite}
                    className="w-full py-2.5 sm:py-3 px-3 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200"
                  >
                    {copiedInvite ? (
                      <>
                        <Check size={16} className="text-emerald-600" />
                        <span className="text-emerald-700">
                          {isEn ? t("actionPanel.inviteCopied", language) : "Đã sao chép liên kết mời!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} className="text-blue-600" />
                        <span>
                          {isEn ? t("actionPanel.inviteBtn", language) : "Mời bạn bè gia nhập để nhóm đủ điều kiện"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs sm:text-sm text-blue-900 space-y-1">
                <p className="font-medium">
                  {isEn ? "Fixed contribution per round: " : "Mỗi vòng đóng cố định: "}
                  <strong className="text-blue-700 font-bold">{formatUsdc(contributionAmount)} USDC</strong>.
                </p>
                <p className="text-blue-600/90 text-xs sm:text-sm">
                  {isEn
                    ? "Eligible to place bids for pot early and earn dividend yield shared from other bidders."
                    : "Được quyền đặt Bid nhận Pot sớm hơn và hưởng lợi tức chia đều từ các thành viên khác."}
                </p>
              </div>
              <button
                onClick={handleApproveAndJoin}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-all text-sm sm:text-base shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isLoading
                  ? loadingLabel
                  : needsApproval
                  ? (isEn ? "Approve & Join" : "Approve & Tham gia")
                  : (isEn ? "Join Savings Club" : "Tham gia nhóm")}
              </button>
            </>
          )}
        </div>
      )}

      {/* --- ACTIVE state --- */}
      {state === GROUP_STATE.ACTIVE && isMember && !isKicked && !hasWon && (
        <div className="divide-y divide-slate-100">
          {/* Contribute */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {isEn
                    ? `Contribute Round ${currentRound.toString()}`
                    : `Đóng góp vòng ${currentRound.toString()}`}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isEn
                    ? `Amount: ${formatUsdc(contributionAmount)} USDC`
                    : `Số tiền: ${formatUsdc(contributionAmount)} USDC`}
                </p>
              </div>
              {hasContributed && (
                <span className="flex items-center gap-1 text-xs sm:text-sm text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  {isEn ? "Contributed" : "Đã đóng"}
                </span>
              )}
            </div>
            {!hasContributed && (
              <button
                onClick={handleContribute}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-all text-sm sm:text-base shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isLoading
                  ? loadingLabel
                  : isEn
                  ? `Contribute ${formatUsdc(contributionAmount)} USDC`
                  : `Đóng ${formatUsdc(contributionAmount)} USDC`}
              </button>
            )}
          </div>

          {/* Bid (only if contributed) */}
          {hasContributed && (
            <div className="p-6 space-y-3.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {isEn ? "Bid for Pot early" : "Đặt bid để nhận pot sớm"}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5 leading-relaxed">
                  {isEn
                    ? "Highest bidder wins this round's Pot. Total bids are distributed equally among unawarded members."
                    : "Bid cao nhất sẽ nhận Pot vòng này. Toàn bộ tiền bid được chia đều cho các thành viên chưa hốt."}
                </p>
              </div>

              {/* Quick preset chips */}
              <div className="flex items-center gap-2">
                {["1", "2", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBidAmount(preset)}
                    className="px-2.5 py-1 text-xs sm:text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 pr-16 text-slate-900 text-sm sm:text-base focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums bg-slate-50/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">USDC</span>
              </div>
              <button
                onClick={needsApprovalForBid ? handleApproveForBid : handlePlaceBid}
                disabled={isLoading || bidRaw <= 0n}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm sm:text-base shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isLoading
                  ? loadingLabel
                  : needsApprovalForBid
                  ? (isEn ? "Approve bid" : "Approve bid")
                  : (isEn ? "Place Bid" : "Đặt bid")}
              </button>
            </div>
          )}

          {/* Settle */}
          <div className="p-6 bg-slate-50/50">
            <button
              onClick={handleSettle}
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer shadow-2xs"
            >
              {isLoading ? loadingLabel : isEn ? "Settle Round (callable by anyone)" : "Kết thúc vòng (ai cũng gọi được)"}
            </button>
          </div>
        </div>
      )}

      {/* Won / Kicked states */}
      {state === GROUP_STATE.ACTIVE && isMember && (isKicked || hasWon) && (
        <div className="p-6">
          {hasWon && (
            <div className="text-center text-emerald-800 text-xs bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <p className="font-bold text-sm sm:text-base text-emerald-900 mb-0.5">
                {isEn ? "You won your round!" : "Bạn đã thắng vòng của mình!"}
              </p>
              <span className="text-xs sm:text-sm">
                {isEn
                  ? "Please check claimable payout under Your Status."
                  : "Vui lòng kiểm tra số tiền thưởng có thể nhận trong phần Trạng thái thành viên."}
              </span>
            </div>
          )}
          {isKicked && (
            <div className="text-center text-red-800 text-xs bg-red-50 rounded-2xl p-4 border border-red-200">
              <p className="font-bold text-sm sm:text-base text-red-900 mb-0.5">
                {isEn ? "You have been kicked from the club" : "Bạn đã bị loại khỏi nhóm"}
              </p>
              <span className="text-xs sm:text-sm">
                {isEn
                  ? "Due to defaulting on round contribution deadline."
                  : "Do không đóng góp đúng hạn theo chu kỳ của vòng."}
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
