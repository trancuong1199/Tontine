import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
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

type Tab = "join" | "contribute" | "bid" | "settle";

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
  const { switchChain } = useSwitchChain();
  const [bidAmount, setBidAmount] = useState("");
  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID;

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
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
        <p className="text-slate-500 text-sm">Kết nối ví để tham gia nhóm hụi</p>
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 text-center space-y-3">
        <p className="text-amber-700 text-sm font-medium">Sai mạng. Cần chuyển sang Arc Testnet.</p>
        <button
          onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
          className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl"
        >
          Chuyển mạng
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* --- OPEN state: Join --- */}
      {state === GROUP_STATE.OPEN && (
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">Tham gia nhóm</h3>
          {isMember ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 rounded-xl p-3">
              <CheckCircle2 size={16} />
              <span>Bạn đã tham gia. Chờ chủ nhóm bắt đầu.</span>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <p>Mỗi vòng đóng <strong>{formatUsdc(contributionAmount)} USDC</strong>.</p>
                <p className="text-blue-500 text-xs mt-1">Bid thêm để nhận pot sớm hơn.</p>
              </div>
              <button
                onClick={handleApproveAndJoin}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm"
              >
                {isLoading ? loadingLabel : needsApproval ? "Approve & Tham gia" : "Tham gia nhóm"}
              </button>
            </>
          )}
        </div>
      )}

      {/* --- ACTIVE state --- */}
      {state === GROUP_STATE.ACTIVE && isMember && !isKicked && !hasWon && (
        <div className="divide-y divide-slate-50">
          {/* Contribute */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Đóng góp vòng {currentRound.toString()}</h3>
              {hasContributed && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 size={12} /> Đã đóng
                </span>
              )}
            </div>
            {!hasContributed && (
              <button
                onClick={handleContribute}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm"
              >
                {isLoading ? loadingLabel : `Đóng ${formatUsdc(contributionAmount)} USDC`}
              </button>
            )}
          </div>

          {/* Bid (only if contributed) */}
          {hasContributed && (
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Đặt bid để nhận pot sớm</h3>
                <p className="text-slate-400 text-xs mt-0.5">Bid cao nhất sẽ thắng. Bid chia đều cho người khác.</p>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-16 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">USDC</span>
              </div>
              <button
                onClick={needsApprovalForBid ? handleApproveForBid : handlePlaceBid}
                disabled={isLoading || bidRaw <= 0n}
                className="w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm"
              >
                {isLoading ? loadingLabel : needsApprovalForBid ? "Approve bid" : "Đặt bid"}
              </button>
            </div>
          )}

          {/* Settle */}
          <div className="p-4">
            <button
              onClick={handleSettle}
              disabled={isLoading}
              className="w-full py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm hover:bg-slate-50"
            >
              {isLoading ? loadingLabel : "Kết thúc vòng (ai cũng gọi được)"}
            </button>
          </div>
        </div>
      )}

      {/* Won / Kicked states */}
      {state === GROUP_STATE.ACTIVE && isMember && (isKicked || hasWon) && (
        <div className="p-4">
          {hasWon && (
            <div className="text-center text-emerald-600 text-sm bg-emerald-50 rounded-xl p-3">
              Bạn đã thắng vòng của mình. Kiểm tra số tiền có thể nhận ở trên.
            </div>
          )}
          {isKicked && (
            <div className="text-center text-red-600 text-sm bg-red-50 rounded-xl p-3">
              Bạn bị loại vì không đóng góp đúng hạn.
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {state === GROUP_STATE.COMPLETED && (
        <div className="p-4 text-center text-slate-500 text-sm">
          Nhóm hụi đã hoàn thành tất cả các vòng.
        </div>
      )}

      {/* Not a member + active */}
      {state === GROUP_STATE.ACTIVE && !isMember && (
        <div className="p-4 text-center text-slate-400 text-sm">
          Nhóm đang chạy, không nhận thành viên mới.
        </div>
      )}
    </div>
  );
}
