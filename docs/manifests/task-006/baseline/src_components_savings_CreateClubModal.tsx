import { useState, useEffect } from "react";
import { useAccount, useDeployContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { useModal } from "connectkit";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Users,
  Clock,
  DollarSign,
  Shield,
  Loader2,
  AlertCircle,
  Calendar,
  PiggyBank,
} from "lucide-react";
import {
  ROTATING_SAVINGS_ABI,
  ROTATING_SAVINGS_BYTECODE,
  USDC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
  parseUsdc,
  formatUsdc,
  parseContractError,
  formatAddress,
} from "../../contract";
import { saveKnownGroup } from "../../lib/savingsClubDirectory";

interface CreateClubModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (newAddress: `0x${string}`) => void;
}

const AMOUNT_PRESETS = ["5", "10", "20", "50"];

const DURATION_PRESETS = [
  { label: "1 giờ", value: 3600, hint: "Thử nghiệm" },
  { label: "1 ngày", value: 86400, hint: "Phổ biến" },
  { label: "3 ngày", value: 259200, hint: "Vừa phải" },
  { label: "7 ngày", value: 604800, hint: "1 tuần" },
];

export function CreateClubModal({
  isOpen = true,
  onClose,
  onSuccess,
}: CreateClubModalProps) {
  const { isConnected, chainId } = useAccount();
  const { setOpen: openConnectModal } = useModal();
  const { switchChain } = useSwitchChain();

  const [groupName, setGroupName] = useState("Nhóm Hụi Mới");
  const [contributionAmount, setContributionAmount] = useState("10");
  const [maxMembers, setMaxMembers] = useState(10);
  const [roundDuration, setRoundDuration] = useState(86400);

  const {
    deployContract,
    data: deployHash,
    isPending: isDeployPending,
    error: deployError,
    reset: resetDeploy,
  } = useDeployContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: deployHash });

  // Handle deploy success
  useEffect(() => {
    if (isSuccess && receipt?.contractAddress) {
      const newAddress = receipt.contractAddress as `0x${string}`;
      saveKnownGroup({
        address: newAddress,
        name: groupName.trim() || `Nhóm Hụi ${formatAddress(newAddress)}`,
      });
      onSuccess(receipt.contractAddress as `0x${string}`);
      onClose();
      resetDeploy();
    }
  }, [isSuccess, receipt, onSuccess, onClose, resetDeploy]);

  // Handle deploy error
  useEffect(() => {
    if (deployError) {
      toast.error(parseContractError(deployError));
    }
  }, [deployError]);

  if (!isOpen) return null;

  // Validation rules (BR-01)
  const isNameValid = groupName.trim().length > 0 && groupName.trim().length <= 32;
  const parsedAmount = parseUsdc(contributionAmount);
  const isAmountValid = parsedAmount > 0n;
  const isMembersValid = Number.isInteger(maxMembers) && maxMembers >= 2 && maxMembers <= 20;
  const isDurationValid = roundDuration > 0;
  const isFormValid = isNameValid && isAmountValid && isMembersValid && isDurationValid;

  // Visual calculations (AC-01.2)
  const totalPotUsdc = isAmountValid && isMembersValid ? parsedAmount * BigInt(maxMembers) : 0n;

  const totalCycleSeconds = maxMembers * roundDuration;
  const cycleDays = Math.floor(totalCycleSeconds / 86400);
  const cycleRemainingHours = Math.floor((totalCycleSeconds % 86400) / 3600);
  let cycleTimeSummary = "";
  if (cycleDays > 0 && cycleRemainingHours === 0) {
    cycleTimeSummary = `${cycleDays} ngày (${maxMembers} vòng)`;
  } else if (cycleDays > 0) {
    cycleTimeSummary = `${cycleDays} ngày ${cycleRemainingHours}h (${maxMembers} vòng)`;
  } else {
    cycleTimeSummary = `${cycleRemainingHours} giờ (${maxMembers} vòng)`;
  }

  const handleDeploy = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || isDeployPending || isConfirming) return;

    if (!isConnected) {
      openConnectModal(true);
      return;
    }

    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }

    try {
      deployContract({
        abi: ROTATING_SAVINGS_ABI,
        bytecode: ROTATING_SAVINGS_BYTECODE,
        args: [
          USDC_ADDRESS,
          parsedAmount,
          BigInt(maxMembers),
          BigInt(roundDuration),
          groupName.trim(),
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (err) {
      toast.error(parseContractError(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Tạo Nhóm Hụi Mới
              </h2>
              <p className="text-xs text-slate-400">
                Khởi tạo hợp đồng xoay vòng vốn trustless trên Arc Testnet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeployPending || isConfirming}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDeploy} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Tên nhóm */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Tên nhóm Hụi</span>
              <span className={`text-xs font-mono ${groupName.length > 32 ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                {groupName.length}/32
              </span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={32}
              placeholder="VD: Nhóm Hụi Gia Đình, Tiết Kiệm Tháng..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all font-medium"
            />
            {!isNameValid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> Tên nhóm không được để trống (tối đa 32 ký tự).
              </p>
            )}
          </div>

          {/* 2. Mức đóng mỗi vòng */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign size={13} className="text-blue-600" />
                Mức đóng mỗi vòng (USDC)
              </span>
              <span className="text-xs text-slate-400">USDC 6 decimals</span>
            </label>
            <div className="flex gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setContributionAmount(preset)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    contributionAmount === preset
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Nhập số tiền khác (VD: 15, 25.5)"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">USDC</span>
            </div>
            {!isAmountValid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> Số tiền đóng góp phải lớn hơn 0 USDC.
              </p>
            )}
          </div>

          {/* 3. Số thành viên tối đa (2 - 20) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" />
                Số thành viên tối đa (2 - 20 người)
              </label>
              <span className="text-sm font-bold text-indigo-600 tabular-nums">
                {maxMembers} người
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>2 người</span>
              <span>10 người (chuẩn)</span>
              <span>20 người</span>
            </div>
            {!isMembersValid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> Số thành viên phải từ 2 đến 20 người.
              </p>
            )}
          </div>

          {/* 4. Chu kỳ mỗi vòng */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-600" />
              Chu kỳ mỗi vòng
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setRoundDuration(preset.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    roundDuration === preset.value
                      ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-2xs ring-1 ring-amber-500"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <p className="font-bold text-xs">{preset.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{preset.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Summary Card (AC-01.2) */}
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-violet-50/90 rounded-2xl p-4 border border-blue-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={16} className="text-blue-600" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Tổng quan nhóm dự kiến
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
                <span className="text-xs text-slate-400 block mb-0.5">Tổng Pot tối đa mỗi vòng</span>
                <span className="font-bold text-blue-700 text-sm tabular-nums">
                  {formatUsdc(totalPotUsdc)} USDC
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  ({contributionAmount} × {maxMembers} người)
                </span>
              </div>
              <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
                <span className="text-xs text-slate-400 block mb-0.5">Thời gian hoàn thành</span>
                <span className="font-bold text-indigo-700 text-sm">
                  {cycleTimeSummary}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  (Toàn bộ chu kỳ)
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1 border-t border-blue-100/80 text-xs text-slate-600">
              <Shield size={14} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong className="text-slate-800">Quyền lợi:</strong> Bạn sẽ là{" "}
                <span className="text-indigo-700 font-bold">Chủ nhóm (Owner) 100%</span>, có quyền
                bắt đầu vòng khi đủ thành viên và quản trị hợp đồng trực tiếp trên blockchain.
              </p>
            </div>
          </div>

          {/* Submit Button & Statuses (AC-02.3) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || isDeployPending || isConfirming}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
                !isFormValid || isDeployPending || isConfirming
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-blue-500/25 active:scale-98 cursor-pointer"
              }`}
            >
              {isDeployPending && (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Chờ ký ví (MetaMask)...</span>
                </>
              )}
              {isConfirming && (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Đang triển khai lên blockchain...</span>
                </>
              )}
              {!isDeployPending && !isConfirming && (
                <>
                  <Sparkles size={15} />
                  <span>Tạo nhóm Hụi</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Triển khai trực tiếp smart contract lên Arc Testnet qua ví Web3 của bạn
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
