import { getAccount } from "@wagmi/core";
import { parseCollateralInput, formatCollateral } from "../../lib/collateralPolicy";
import { useState, useEffect, useRef } from "react";
import { useAccount, useConfig, useDeployContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
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
  PiggyBank,
  Calendar,
} from "lucide-react";
import {
  ROTATING_SAVINGS_ABI,
  ROTATING_SAVINGS_BYTECODE,
  USDC_ADDRESS,
  getCirBtcDeploymentAddress,
  ARC_TESTNET_CHAIN_ID,
  parseUsdc,
  formatUsdc,
  parseContractError,
  formatAddress,
} from "../../contract";
import { saveKnownGroup } from "../../lib/savingsClubDirectory";
import { Language, t } from "../../lib/i18n";

interface CreateClubModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (newAddress: `0x${string}`) => void;
  language?: Language;
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
  language = "vi",
}: CreateClubModalProps) {
  const { isConnected, chainId, address } = useAccount();
  const config = useConfig();
  const { setOpen: openConnectModal } = useModal();
  const { switchChainAsync } = useSwitchChain();
  const isEn = language === "en";

  const [groupName, setGroupName] = useState("Nhóm Hụi Mới");
  const [contributionAmount, setContributionAmount] = useState("10");
  const [maxMembers, setMaxMembers] = useState(10);
  const [roundDuration, setRoundDuration] = useState(86400);
  const [collateralMode, setCollateralMode] = useState<'' | 'none' | 'custom'>('');
  const [customCollateral, setCustomCollateral] = useState('');
  const requiredCollateral = parseCollateralInput(collateralMode, customCollateral);
  const submitted = useRef<{ name: string; requiredCollateral: bigint } | null>(null);
  const deploying = useRef(false);

  const toLocalDateTimeInput = (secondsFromNow: number): string => {
    const target = new Date(Date.now() + Math.max(60, secondsFromNow) * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
  };

  const [targetDateTime, setTargetDateTime] = useState<string>(() => toLocalDateTimeInput(86400));

  const customDays = Math.floor(roundDuration / 86400);
  const customHours = Math.floor((roundDuration % 86400) / 3600);
  const customMinutes = Math.floor((roundDuration % 3600) / 60);

  const handleSelectDurationPreset = (seconds: number) => {
    setRoundDuration(seconds);
    setTargetDateTime(toLocalDateTimeInput(seconds));
  };

  const handleCustomDhmChange = (days: number, hours: number, mins: number) => {
    const d = Math.max(0, Math.min(365, Number.isFinite(days) ? Math.floor(days) : 0));
    const h = Math.max(0, Math.min(23, Number.isFinite(hours) ? Math.floor(hours) : 0));
    const m = Math.max(0, Math.min(59, Number.isFinite(mins) ? Math.floor(mins) : 0));
    const totalSec = Math.max(60, d * 86400 + h * 3600 + m * 60);
    setRoundDuration(totalSec);
    setTargetDateTime(toLocalDateTimeInput(totalSec));
  };

  const handleDateTimePickerChange = (val: string) => {
    setTargetDateTime(val);
    if (!val) return;
    const pickedMs = new Date(val).getTime();
    if (!Number.isNaN(pickedMs)) {
      const diffSec = Math.max(60, Math.round((pickedMs - Date.now()) / 1000));
      setRoundDuration(diffSec);
    }
  };

  useEffect(() => {
    setGroupName((prev) => {
      if (isEn && prev === "Nhóm Hụi Mới") return "New Savings Club";
      if (!isEn && prev === "New Savings Club") return "Nhóm Hụi Mới";
      return prev;
    });
  }, [isEn]);

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
    error: receiptError,
  } = useWaitForTransactionReceipt({ chainId: ARC_TESTNET_CHAIN_ID, hash: deployHash });

  // Handle deploy success
  useEffect(() => {
    if (isSuccess && receipt?.status === "success" && receipt.contractAddress && submitted.current) {
      const newAddress = receipt.contractAddress as `0x${string}`;
      saveKnownGroup({
        address: newAddress,
        name: submitted.current.name,
        initialCollateral: submitted.current.requiredCollateral.toString(),
      });
      setCollateralMode('');
      setCustomCollateral('');
      submitted.current = null;
      deploying.current = false;
      onSuccess(receipt.contractAddress as `0x${string}`);
      onClose();
      resetDeploy();
    }
  }, [isSuccess, receipt, onSuccess, onClose, resetDeploy]);

  useEffect(() => {
    if (receiptError) {
      deploying.current = false;
      resetDeploy();
      toast.error(parseContractError(receiptError));
    }
  }, [receiptError, resetDeploy]);

  // Handle deploy error
  useEffect(() => {
    if (deployError) {
      deploying.current = false;
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
  const isFormValid = isNameValid && isAmountValid && isMembersValid && isDurationValid && requiredCollateral !== undefined;

  // Visual calculations (AC-01.2)
  const totalPotUsdc = isAmountValid && isMembersValid ? parsedAmount * BigInt(maxMembers) : 0n;

  const totalCycleSeconds = maxMembers * roundDuration;
  const cycleDays = Math.floor(totalCycleSeconds / 86400);
  const cycleRemainingHours = Math.floor((totalCycleSeconds % 86400) / 3600);
  const cycleRemainingMins = Math.floor((totalCycleSeconds % 3600) / 60);
  let cycleTimeSummary = "";
  if (isEn) {
    if (cycleDays > 0 && cycleRemainingHours === 0) {
      cycleTimeSummary = `${cycleDays} days (${maxMembers} rounds)`;
    } else if (cycleDays > 0) {
      cycleTimeSummary = `${cycleDays} days ${cycleRemainingHours}h (${maxMembers} rounds)`;
    } else if (cycleRemainingHours > 0) {
      cycleTimeSummary = `${cycleRemainingHours} hours${cycleRemainingMins > 0 ? ` ${cycleRemainingMins}m` : ""} (${maxMembers} rounds)`;
    } else {
      cycleTimeSummary = `${Math.max(1, cycleRemainingMins)} mins (${maxMembers} rounds)`;
    }
  } else {
    if (cycleDays > 0 && cycleRemainingHours === 0) {
      cycleTimeSummary = `${cycleDays} ngày (${maxMembers} vòng)`;
    } else if (cycleDays > 0) {
      cycleTimeSummary = `${cycleDays} ngày ${cycleRemainingHours}h (${maxMembers} vòng)`;
    } else if (cycleRemainingHours > 0) {
      cycleTimeSummary = `${cycleRemainingHours} giờ${cycleRemainingMins > 0 ? ` ${cycleRemainingMins}p` : ""} (${maxMembers} vòng)`;
    } else {
      cycleTimeSummary = `${Math.max(1, cycleRemainingMins)} phút (${maxMembers} vòng)`;
    }
  }

  const handleDeploy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || requiredCollateral === undefined || deploying.current || isDeployPending || isConfirming) return;

    if (!isConnected) {
      openConnectModal(true);
      return;
    }

    deploying.current = true;
    const snapshot = { name: groupName.trim(), requiredCollateral };
    try {
      const collateralToken = getCirBtcDeploymentAddress();
      if (chainId !== ARC_TESTNET_CHAIN_ID) {
        await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
      }
      const connected = getAccount(config);
      if (!address || connected.address !== address || connected.chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Wallet changed. Review the club configuration and retry.");
      submitted.current = snapshot;
      deployContract({
        abi: ROTATING_SAVINGS_ABI,
        bytecode: ROTATING_SAVINGS_BYTECODE,
        args: [
          USDC_ADDRESS,
          parsedAmount,
          BigInt(maxMembers),
          BigInt(roundDuration),
          snapshot.name,
          collateralToken,
          snapshot.requiredCollateral,
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (err) {
      deploying.current = false;
      toast.error(parseContractError(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#0c0d14] rounded-3xl border border-amber-500/20 shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                <span className="text-white">{isEn ? t("createClubModal.title", language) : "Tạo Nhóm Hụi Mới"}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {isEn ? t("createClubModal.desc", language) : "Khởi tạo hợp đồng xoay vòng vốn trustless trên Arc Testnet"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeployPending || isConfirming}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDeploy} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Tên nhóm */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
              <span className="text-slate-300">{isEn ? t("createClubModal.nameLabel", language) : "Tên nhóm Hụi"}</span>
              <span className={`text-xs font-mono ${groupName.length > 32 ? "text-rose-400 font-semibold" : "text-slate-500"}`}>
                {groupName.length}/32
              </span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={32}
              placeholder={isEn ? "e.g. Family Savings, Monthly Susu..." : "VD: Nhóm Hụi Gia Đình, Tiết Kiệm Tháng..."}
              className="w-full px-3.5 py-2.5 text-sm sm:text-base bg-black/60 border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-amber-200 placeholder-slate-500 transition-all font-medium"
            />
            {!isNameValid && (
              <p className="text-xs sm:text-sm text-rose-400 flex items-center gap-1">
                <AlertCircle size={14} /> {isEn ? t("createClubModal.nameError", language) : "Tên nhóm không được để trống (tối đa 32 ký tự)."}
              </p>
            )}
          </div>

          {/* 2. Mức đóng mỗi vòng */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <DollarSign size={14} className="text-amber-400" />
                {isEn ? t("createClubModal.amountLabel", language) : "Mức đóng mỗi vòng (USDC)"}
              </span>
              <span className="text-xs text-slate-400">USDC 6 decimals</span>
            </label>
            <div className="flex gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setContributionAmount(preset)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                    contributionAmount === preset
                      ? "bg-amber-950/60 text-amber-300 border-amber-500/60 shadow-2xs"
                      : "bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800"
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
                placeholder={isEn ? "Enter other amount (e.g. 15, 25.5)" : "Nhập số tiền khác (VD: 15, 25.5)"}
                className="w-full px-3.5 py-2.5 text-sm sm:text-base font-mono bg-black/60 border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-amber-200 placeholder-slate-500 transition-all"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">USDC</span>
            </div>
            {!isAmountValid && (
              <p className="text-xs sm:text-sm text-rose-400 flex items-center gap-1">
                <AlertCircle size={14} /> {isEn ? t("createClubModal.amountError", language) : "Số tiền đóng góp phải lớn hơn 0 USDC."}
              </p>
            )}
          </div>

          {/* 3. Số thành viên tối đa (2 - 20) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-amber-400" />
                <span className="text-slate-300">{isEn ? "Max members (2 - 20 members)" : "Số thành viên tối đa (2 - 20 người)"}</span>
              </label>
              <span className="text-sm sm:text-base font-bold text-amber-400 tabular-nums">
                {maxMembers} {isEn ? "members" : "người"}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-xs sm:text-sm text-slate-400 font-mono">
              <span>{isEn ? "2 members" : "2 người"}</span>
              <span>{isEn ? "10 members (standard)" : "10 người (chuẩn)"}</span>
              <span>{isEn ? "20 members" : "20 người"}</span>
              <span className="hidden">2 người 10 người (chuẩn) 20 người</span>
            </div>
            {!isMembersValid && (
              <p className="text-xs sm:text-sm text-rose-400 flex items-center gap-1">
                <AlertCircle size={14} /> {isEn ? t("createClubModal.membersError", language) : "Số thành viên phải từ 2 đến 20 người."}
              </p>
            )}
          </div>

          {/* 4. Chu kỳ mỗi vòng */}
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Clock size={14} className="text-amber-400" />
                <span>{isEn ? t("createClubModal.durationLabel", language) : "Chu kỳ mỗi vòng"}</span>
              </span>
              <span className="text-xs font-mono text-amber-300">
                {customDays > 0 ? `${customDays}${isEn ? "d " : " ngày "}` : ""}
                {customHours > 0 ? `${customHours}${isEn ? "h " : " giờ "}` : ""}
                {customMinutes > 0 || (customDays === 0 && customHours === 0)
                  ? `${customMinutes}${isEn ? "m" : " phút"}`
                  : ""}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_PRESETS.map((preset) => {
                const enMap: Record<number, { label: string; hint: string }> = {
                  3600: { label: "1 hour", hint: "Test" },
                  86400: { label: "1 day", hint: "Popular" },
                  259200: { label: "3 days", hint: "Moderate" },
                  604800: { label: "7 days", hint: "1 week" },
                };
                const displayLabel = isEn ? enMap[preset.value]?.label ?? preset.label : preset.label;
                const displayHint = isEn ? enMap[preset.value]?.hint ?? preset.hint : preset.hint;

                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectDurationPreset(preset.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      roundDuration === preset.value
                        ? "bg-amber-950/60 border-amber-500 text-amber-300 shadow-2xs ring-1 ring-amber-500"
                        : "bg-black/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm">{displayLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{displayHint}</p>
                  </button>
                );
              })}
            </div>

            {/* Tùy chỉnh Ngày / Giờ / Phút & Lịch hẹn Ngày Giờ (Custom Duration & Date/Time Picker) */}
            <div className="rounded-2xl p-3.5 bg-black/50 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-amber-400" />
                  <span>
                    {isEn
                      ? "Custom Round Duration & Date/Time Schedule"
                      : "Tùy chỉnh thời gian & Chọn lịch Ngày/Giờ"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectDurationPreset(180)}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold cursor-pointer transition-colors"
                >
                  {isEn ? "⚡ 3 mins (Fast Test)" : "⚡ 3 phút (Test nhanh)"}
                </button>
              </div>

              {/* 3 ô tự nhập: Ngày - Giờ - Phút */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block">
                    {isEn ? "Days" : "Số Ngày"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={customDays}
                    onChange={(e) =>
                      handleCustomDhmChange(Number(e.target.value), customHours, customMinutes)
                    }
                    className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono bg-[#0c0d14] border border-slate-700 rounded-xl text-amber-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block">
                    {isEn ? "Hours (0-23)" : "Số Giờ (0-23)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={customHours}
                    onChange={(e) =>
                      handleCustomDhmChange(customDays, Number(e.target.value), customMinutes)
                    }
                    className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono bg-[#0c0d14] border border-slate-700 rounded-xl text-amber-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block">
                    {isEn ? "Minutes (0-59)" : "Số Phút (0-59)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={customMinutes}
                    onChange={(e) =>
                      handleCustomDhmChange(customDays, customHours, Number(e.target.value))
                    }
                    className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono bg-[#0c0d14] border border-slate-700 rounded-xl text-amber-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ô chọn Lịch Ngày & Giờ trực tiếp (Calendar Date & Time Picker) */}
              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>
                    {isEn
                      ? "📅 Or pick Round 1 end Date & Time from Calendar:"
                      : "📅 Hoặc chọn Lịch Ngày & Giờ kết thúc Vòng 1:"}
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={targetDateTime}
                  min={toLocalDateTimeInput(60)}
                  onChange={(e) => handleDateTimePickerChange(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-[#0c0d14] border border-slate-700 rounded-xl text-amber-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                />
                <p className="text-xs text-slate-400">
                  {isEn
                    ? `Each round will run for ${roundDuration.toLocaleString()} seconds (${cycleTimeSummary} total).`
                    : `Mỗi vòng sẽ kéo dài ${roundDuration.toLocaleString()} giây (Tổng chu kỳ: ${cycleTimeSummary}).`}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Ký quỹ Bảo Lãnh Chống Bùng Hụi (CirBTC Collateral - TASK-043) */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Shield size={14} className="text-amber-400" />
                {t("collateral.createFieldLabel", language)}
              </span>
              <span className="text-xs text-amber-300/80">CirBTC 8 decimals</span>
            </label>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("collateral.createFieldDesc", language)}
            </p>
            <div className="flex gap-3">
              <label><input type="radio" name="collateralPolicy" checked={collateralMode === 'none'} onChange={() => setCollateralMode('none')} /> {isEn ? 'No collateral' : 'Không ký quỹ'}</label>
              <label><input type="radio" name="collateralPolicy" checked={collateralMode === 'custom'} onChange={() => setCollateralMode('custom')} /> {isEn ? 'Custom amount' : 'Tự nhập mức ký quỹ'}</label>
            </div>
            {collateralMode === 'custom' && <input aria-label={isEn ? 'Custom CirBTC collateral' : 'Mức ký quỹ CirBTC'} inputMode="decimal" value={customCollateral} onChange={e => setCustomCollateral(e.target.value)} className="w-full rounded-xl bg-slate-900 p-3 text-white" placeholder="0.00000001" />}
            {requiredCollateral === undefined && <p className="text-xs text-amber-200">{isEn ? 'Choose no collateral or enter a positive exact CirBTC amount (up to 8 decimals).' : 'Chọn không ký quỹ hoặc nhập số CirBTC dương chính xác (tối đa 8 chữ số thập phân).'}</p>}
          </div>

          {/* Visual Summary Card (AC-01.2) */}
          <div className="bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-black/60 rounded-2xl p-4 sm:p-5 border border-amber-500/20 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-amber-400" />
              <h4 className="font-bold text-amber-300 text-xs sm:text-sm uppercase tracking-wider">
                {isEn ? t("createClubModal.potSummaryTitle", language) : "Tổng quan nhóm dự kiến"}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="bg-black/60 rounded-xl p-3 border border-amber-500/10">
                <span className="text-xs text-slate-400 block mb-0.5 font-medium">
                  {isEn ? t("createClubModal.potSummaryLabel", language) : "Tổng Pot tối đa mỗi vòng"}
                </span>
                <span className="font-bold text-amber-400 text-base tabular-nums">
                  {formatUsdc(totalPotUsdc)} USDC
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {isEn ? (
                    <>({contributionAmount} × {maxMembers} members)</>
                  ) : (
                    <>({contributionAmount} × {maxMembers} người)</>
                  )}
                </span>
              </div>
              <div className="bg-black/60 rounded-xl p-3 border border-amber-500/10">
                <span className="text-xs text-slate-400 block mb-0.5 font-medium">
                  {isEn ? t("createClubModal.cycleSummaryLabel", language) : "Thời gian hoàn thành"}
                </span>
                <span className="font-bold text-amber-300 text-base">
                  {cycleTimeSummary}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {isEn ? "(Full cycle)" : "(Toàn bộ chu kỳ)"}
                </span>
              </div>
            </div>

            {requiredCollateral !== undefined && (
              <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-500/30 flex items-center justify-between text-xs">
                <span className="text-amber-200 font-semibold flex items-center gap-1.5">
                  <Shield size={14} className="text-amber-400" />
                  {t("collateral.badgeTitle", language)}
                </span>
                <span className="font-bold text-amber-300 font-mono">
                  {formatCollateral(requiredCollateral)} CirBTC / {isEn ? "member" : "thành viên"}
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 pt-1 border-t border-amber-500/10 text-xs sm:text-sm text-slate-300">
              <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">{isEn ? "Owner Privileges:" : "Quyền lợi:"}</strong>{" "}
                {isEn ? (
                  <>You will be <span className="text-amber-300 font-bold">100% Club Owner</span>, with rights to start rounds when capacity is reached and manage contract on-chain.</>
                ) : (
                  <>Bạn sẽ là <span className="text-amber-300 font-bold">Chủ nhóm (Owner) 100%</span>, có quyền bắt đầu vòng khi đủ thành viên và quản trị hợp đồng trực tiếp trên blockchain.</>
                )}
              </p>
            </div>
          </div>

          {/* Submit Button & Statuses (AC-02.3) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isFormValid || isDeployPending || isConfirming}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                !isFormValid || isDeployPending || isConfirming
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
              }`}
            >
              {isDeployPending && (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>{isEn ? "Awaiting wallet signature..." : "Chờ ký ví (MetaMask)..."}</span>
                </>
              )}
              {isConfirming && (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>{isEn ? "Deploying on blockchain..." : "Đang triển khai lên blockchain..."}</span>
                </>
              )}
              {!isDeployPending && !isConfirming && (
                <>
                  <Sparkles size={15} />
                  {isEn ? (
                    <span>{t("createClubModal.deployBtn", language)}</span>
                  ) : (
                    <span>Tạo nhóm Hụi</span>
                  )}
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              {isEn
                ? "Deploy smart contract directly to Arc Testnet via your Web3 wallet"
                : "Triển khai trực tiếp smart contract lên Arc Testnet qua ví Web3 của bạn"}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
