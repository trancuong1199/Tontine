/**
 * PasskeyActionPanel — Phiên bản ActionPanel dùng Circle Modular Wallet.
 * Gửi user operations (ERC-4337) thay vì EOA transactions.
 * Gas được sponsor bởi Circle Gas Station (paymaster: true).
 */
import { useState } from "react";
import { parseUnits, encodeFunctionData, erc20Abi, type Hex } from "viem";
import { type BundlerClient, type SmartAccount } from "viem/account-abstraction";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, LogOut, Info, Share2, Check } from "lucide-react";
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
}: PasskeyActionPanelProps) {
  const targetContract = contractAddress ?? ROTATING_SAVINGS_ADDRESS;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?group=${targetContract}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    toast.success("Đã sao chép link mời nhóm!", {
      description: "Gửi link này cho bạn bè để cùng tham gia hụi.",
    });
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const needsApproval = allowance < contributionAmount;
  const bidRaw = parseUsdc(bidAmount);
  const needsBidApproval = bidRaw > 0n && allowance < contributionAmount + bidRaw;

  async function sendOp(calls: { to: Hex; data: Hex; value?: bigint }[], successMsg: string) {
    setIsLoading(true);
    setLoadingMsg("Xác nhận passkey...");
    try {
      const hash = await bundler.sendUserOperation({
        account,
        calls,
        paymaster: true,
      });
      setLoadingMsg("Đang xử lý trên chain...");
      const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
      toast.success(successMsg, {
        description: (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, receipt.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline text-xs"
          >
            Xem trên explorer <ExternalLink size={10} />
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
    await sendOp(calls, "Đã tham gia nhóm thành công!");
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
      `Đã đóng ${formatUsdc(contributionAmount)} USDC vào vòng ${currentRound}!`
    );
  };

  const handleBid = async () => {
    if (bidRaw <= 0n) { toast.error("Nhập số tiền bid hợp lệ (lớn hơn 0)."); return; }
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
    await sendOp(calls, "Đã đặt bid thành công!");
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
      "Đã kết thúc vòng!"
    );
  };

  const handleClaim = async () => {
    await sendOp(
      [{
        to: targetContract,
        data: encodeFunctionData({
          abi: ROTATING_SAVINGS_ABI,
          functionName: "claimPayout",
          args: [],
        }),
      }],
      "Đã nhận tiền thành công!"
    );
  };

  const btnPrimary = "w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm flex items-center justify-center gap-2";
  const btnSecondary = "w-full py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform text-sm hover:bg-slate-50";

  const loadingEl = isLoading ? (
    <div className="flex items-center gap-2 text-slate-500 text-sm justify-center py-1">
      <Loader2 size={16} className="animate-spin" />
      {loadingMsg}
    </div>
  ) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Wallet info bar */}
      <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-500 font-medium">Smart Wallet</span>
          <span className="text-xs text-slate-400 font-mono">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={12} />
          Đăng xuất
        </button>
      </div>

      {/* OPEN: Join */}
      {state === GROUP_STATE.OPEN && (
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 text-sm">Tham gia nhóm</h3>
          {isMember ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-emerald-800 text-xs bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-xs">Đã tham gia nhóm thành công!</p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Nhóm hiện ở Giai đoạn đăng ký (OPEN). Tiền đóng hụi sẽ thu khi Vòng 1 mở.
                  </p>
                </div>
              </div>

              {/* Giải thích rõ lý do chưa có nút đóng tiền */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  <span>Vì sao chưa thấy nút đóng tiền?</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Tiền đóng góp ({formatUsdc(contributionAmount)} USDC/vòng) chỉ bắt đầu thu khi <strong>Vòng 1 chính thức bắt đầu</strong>.
                </p>
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                  <p className="font-medium text-slate-700">Các bước tiếp theo:</p>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Chờ đủ tối thiểu <strong>2 thành viên</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Chủ nhóm bấm <strong>"Bắt đầu các vòng"</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Nút <strong>Đóng góp & Đặt Bid</strong> sẽ xuất hiện</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <button
                    onClick={handleCopyInvite}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                  >
                    {copiedInvite ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép link mời!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={13} className="text-blue-600" />
                        <span>Mời bạn bè để đủ điều kiện mở vòng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                <p>Mỗi vòng đóng <strong>{formatUsdc(contributionAmount)} USDC</strong>.</p>
                <p className="text-blue-500 text-xs mt-1">Gas được tài trợ — không tốn phí.</p>
              </div>
              {loadingEl}
              {!isLoading && (
                <button onClick={handleApproveAndJoin} disabled={isLoading} className={btnPrimary}>
                  {needsApproval ? "Approve & Tham gia (1 bước)" : "Tham gia nhóm"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ACTIVE: Contribute + Bid + Settle */}
      {state === GROUP_STATE.ACTIVE && isMember && !isKicked && !hasWon && (
        <div className="divide-y divide-slate-50">
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
              <>
                {loadingEl}
                {!isLoading && (
                  <button onClick={handleContribute} disabled={isLoading} className={btnPrimary}>
                    Đóng {formatUsdc(contributionAmount)} USDC
                  </button>
                )}
              </>
            )}
          </div>

          {hasContributed && (
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Đặt bid để nhận pot sớm</h3>
                <p className="text-slate-400 text-xs mt-0.5">Bid cao nhất thắng. Bid chia cho người khác.</p>
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
              {loadingEl}
              {!isLoading && (
                <button onClick={handleBid} disabled={isLoading || bidRaw <= 0n} className={`${btnPrimary} bg-indigo-500 from-indigo-500 to-indigo-600`}>
                  {needsBidApproval ? "Approve & Đặt bid (1 bước)" : "Đặt bid"}
                </button>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            {loadingEl}
            {!isLoading && (
              <button onClick={handleSettle} disabled={isLoading} className={btnSecondary}>
                Kết thúc vòng (ai cũng gọi được)
              </button>
            )}
            <button onClick={handleClaim} disabled={isLoading} className={btnSecondary}>
              Nhận tiền thắng
            </button>
          </div>
        </div>
      )}

      {state === GROUP_STATE.ACTIVE && isMember && (isKicked || hasWon) && (
        <div className="p-4 space-y-2">
          {hasWon && (
            <div className="text-center text-emerald-600 text-sm bg-emerald-50 rounded-xl p-3">
              Đã thắng vòng của bạn!
            </div>
          )}
          {isKicked && (
            <div className="text-center text-red-600 text-sm bg-red-50 rounded-xl p-3">
              Bị loại vì không đóng góp đúng hạn.
            </div>
          )}
          <button onClick={handleClaim} disabled={isLoading} className={btnPrimary}>
            Nhận tiền
          </button>
          {loadingEl}
        </div>
      )}

      {state === GROUP_STATE.COMPLETED && (
        <div className="p-4 space-y-2">
          <p className="text-center text-slate-500 text-sm">Nhóm hụi đã hoàn thành.</p>
          <button onClick={handleClaim} disabled={isLoading} className={btnPrimary}>
            Nhận tiền (nếu có)
          </button>
          {loadingEl}
        </div>
      )}

      {state === GROUP_STATE.ACTIVE && !isMember && (
        <div className="p-4 text-center text-slate-400 text-sm">
          Nhóm đang chạy, không nhận thành viên mới.
        </div>
      )}
    </div>
  );
}
