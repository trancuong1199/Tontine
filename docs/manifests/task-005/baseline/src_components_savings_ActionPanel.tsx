import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, PiggyBank, Wallet, ArrowRight, ShieldCheck, Zap, Info, Share2, Copy, Check } from "lucide-react";
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
}: ActionPanelProps) {
  const targetContract = contractAddress ?? ROTATING_SAVINGS_ADDRESS;
  const { address, chainId } = useAccount();
  const { setOpen: openConnectModal } = useModal();
  const { switchChain } = useSwitchChain();
  const [bidAmount, setBidAmount] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;

  const handleCopyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?group=${targetContract}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    toast.success("Đã sao chép link mời nhóm!", {
      description: "Gửi link này cho bạn bè để cùng tham gia hụi.",
    });
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
        toast.info("Approve USDC trước, rồi join nhóm.");
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
    const bidRaw = parseUsdc(bidAmount);
    if (bidRaw <= 0n) { toast.error("Nhập số tiền bid hợp lệ (lớn hơn 0)."); return; }
    const needed = contributionAmount + bidRaw;
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [targetContract, needed * 2n],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
    toast.info("Approve xong, bấm Đặt bid lại.");
  };

  const handlePlaceBid = () => {
    if (!switchIfNeeded() || !address) return;
    const bidRaw = parseUsdc(bidAmount);
    if (bidRaw <= 0n) { toast.error("Nhập số tiền bid hợp lệ (lớn hơn 0)."); return; }
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
  const loadingLabel = isPending ? "Xác nhận trong ví..." : isConfirming ? "Đang xử lý..." : "";

  if (!address) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs text-center space-y-5">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
          <PiggyBank size={28} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Tham gia nhóm hụi
          </h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
            Đóng góp {formatUsdc(contributionAmount)} USDC mỗi vòng và đặt bid nhận pot sớm. Không cần tin tưởng ai — hợp đồng giữ tiền an toàn.
          </p>
        </div>

        <button
          onClick={() => openConnectModal?.(true)}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Wallet size={16} />
          <span>Kết nối ví để tham gia</span>
        </button>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" /> Trustless
          </span>
          <span className="flex items-center gap-1">
            <Zap size={13} className="text-amber-500" /> Gas USDC ≈ $0
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
          <h4 className="font-bold text-amber-800 text-sm">Sai mạng kết nối</h4>
          <p className="text-amber-700 text-xs mt-1">Cần chuyển ví sang mạng Arc Testnet (Chain ID: {ARC_TESTNET_CHAIN_ID}) để tương tác.</p>
        </div>
        <button
          onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          Chuyển mạng Arc Testnet
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
            <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Tham gia nhóm
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Giai đoạn đăng ký
            </span>
          </div>

          {isMember ? (
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 text-emerald-800 text-xs bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Bạn đã là thành viên của nhóm!</p>
                  <p className="text-emerald-700 leading-relaxed text-[11.5px] mt-0.5">
                    Ghi danh thành công. Nhóm hiện đang ở <strong>Giai đoạn đăng ký (OPEN)</strong>.
                  </p>
                </div>
              </div>

              {/* Giải thích rõ quy trình & lý do chưa có nút đóng tiền */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <span>Vì sao chưa thấy chỗ đóng tiền?</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Theo quy tắc Smart Contract Hụi xoay vòng (Tontine), tiền đóng hụi (<strong>{formatUsdc(contributionAmount)} USDC</strong>/vòng) chỉ bắt đầu thu khi <strong>Vòng 1 chính thức bắt đầu</strong>. Điều này giúp đảm bảo thời gian đếm ngược và đấu giá được tính chuẩn cho tất cả thành viên.
                </p>

                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <p className="font-semibold text-slate-700 text-[11.5px]">Quy trình tiếp theo:</p>
                  <div className="space-y-2 text-slate-600 text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                      <span>Chờ nhóm có tối thiểu <strong>2 thành viên</strong> tham gia.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                      <span>Chủ nhóm bấm <strong>"Bắt đầu các vòng"</strong> trong bảng điều khiển.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                      <span>Nút <strong>"Đóng góp ({formatUsdc(contributionAmount)} USDC)"</strong> & ô <strong>Đặt Bid</strong> sẽ lập tức hiển thị ngay tại đây!</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <button
                    onClick={handleCopyInvite}
                    className="w-full py-2.5 px-3 bg-blue-50/90 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                  >
                    {copiedInvite ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép liên kết mời!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} className="text-blue-600" />
                        <span>Mời bạn bè gia nhập để nhóm đủ điều kiện</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
                <p className="font-medium">Mỗi vòng đóng cố định: <strong className="text-blue-700 font-bold">{formatUsdc(contributionAmount)} USDC</strong>.</p>
                <p className="text-blue-600/90 text-[11px]">Được quyền đặt Bid nhận Pot sớm hơn và hưởng lợi tức chia đều từ các thành viên khác.</p>
              </div>
              <button
                onClick={handleApproveAndJoin}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-all text-sm shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isLoading ? loadingLabel : needsApproval ? "Approve & Tham gia" : "Tham gia nhóm"}
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
                <h3 className="font-bold text-slate-900 text-sm">
                  Đóng góp vòng {currentRound.toString()}
                </h3>
                <p className="text-xs text-slate-400">Số tiền: {formatUsdc(contributionAmount)} USDC</p>
              </div>
              {hasContributed && (
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={13} className="text-emerald-600" /> Đã đóng
                </span>
              )}
            </div>
            {!hasContributed && (
              <button
                onClick={handleContribute}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-all text-sm shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isLoading ? loadingLabel : `Đóng ${formatUsdc(contributionAmount)} USDC`}
              </button>
            )}
          </div>

          {/* Bid (only if contributed) */}
          {hasContributed && (
            <div className="p-6 space-y-3.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Đặt bid để nhận pot sớm</h3>
                <p className="text-slate-400 text-xs mt-0.5">Bid cao nhất sẽ nhận Pot vòng này. Toàn bộ tiền bid được chia đều cho các thành viên chưa hốt.</p>
              </div>

              {/* Quick preset chips */}
              <div className="flex items-center gap-2">
                {["1", "2", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBidAmount(preset)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 pr-16 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums bg-slate-50/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">USDC</span>
              </div>
              <button
                onClick={needsApprovalForBid ? handleApproveForBid : handlePlaceBid}
                disabled={isLoading || bidRaw <= 0n}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isLoading ? loadingLabel : needsApprovalForBid ? "Approve bid" : "Đặt bid"}
              </button>
            </div>
          )}

          {/* Settle */}
          <div className="p-6 bg-slate-50/50">
            <button
              onClick={handleSettle}
              disabled={isLoading}
              className="w-full py-2.5 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all text-xs cursor-pointer shadow-2xs"
            >
              {isLoading ? loadingLabel : "Kết thúc vòng (ai cũng gọi được)"}
            </button>
          </div>
        </div>
      )}

      {/* Won / Kicked states */}
      {state === GROUP_STATE.ACTIVE && isMember && (isKicked || hasWon) && (
        <div className="p-6">
          {hasWon && (
            <div className="text-center text-emerald-800 text-xs bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <p className="font-bold text-sm text-emerald-900 mb-0.5">Bạn đã thắng vòng của mình!</p>
              <span>Vui lòng kiểm tra số tiền thưởng có thể nhận trong phần Trạng thái thành viên.</span>
            </div>
          )}
          {isKicked && (
            <div className="text-center text-red-800 text-xs bg-red-50 rounded-2xl p-4 border border-red-200">
              <p className="font-bold text-sm text-red-900 mb-0.5">Bạn đã bị loại khỏi nhóm</p>
              <span>Do không đóng góp đúng hạn theo chu kỳ của vòng.</span>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {state === GROUP_STATE.COMPLETED && (
        <div className="p-6 text-center text-slate-500 text-sm">
          Nhóm hụi đã hoàn thành tất cả các vòng.
        </div>
      )}

      {/* Not a member + active */}
      {state === GROUP_STATE.ACTIVE && !isMember && (
        <div className="p-6 text-center text-slate-400 text-xs">
          Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới.
        </div>
      )}
    </div>
  );
}
