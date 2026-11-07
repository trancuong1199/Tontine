import { formatRoundDuration, formatFinancialAmount } from "../../lib/bondedDisplay";
import { useState, useId, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useArcWriteContract } from "../../hooks/useArcWriteContract";
import { useModal } from "connectkit";
import { toast } from "sonner";
import { parseEventLogs } from "viem";
import {
  X,
  ShieldCheck,
  Sparkles,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";
import {
  ARC_TESTNET_CHAIN_ID,
  parseUsdc,
  formatUsdc,
  formatAddress,
} from "../../contract";
import { buildAddressExplorerUrl } from "../../onchain-facts";
import {
  ARC_TESTNET_BONDED_FACTORY,
  registerRuntimeBondedClub,
  DEFAULT_SAFETY_RATIO_BPS,
  DEFAULT_LIQUIDATION_RATIO_BPS,
  DEFAULT_INTEREST_RATE_BPS,
} from "@/config/bonded-tontine";
import {
  BONDED_TONTINE_FACTORY_ABI,
  DEFAULT_BONDED_PARAMS,
  validateBondedClubParams,
  calculateAnnualizedAprPct,
  parseBondedTontineError,
} from "../../lib/bondedTontine";
import { saveKnownGroup } from "../../lib/savingsClubDirectory";
import { Language, t } from "../../lib/i18n";

export interface CreateBondedClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAddress: `0x${string}`) => void;
  language?: Language;
}

const AMOUNT_PRESETS = ["5", "10", "20", "50"];
const MEMBER_PRESETS = [3, 5, 10, 15];
const DURATION_PRESETS = [
  { labelVi: "1 giờ", labelEn: "1 hour", value: 3600, hintVi: "Thử nghiệm nhanh", hintEn: "Quick test" },
  { labelVi: "1 ngày", labelEn: "1 day", value: 86400, hintVi: "Phổ biến", hintEn: "Popular" },
  { labelVi: "3 ngày", labelEn: "3 days", value: 259200, hintVi: "Vừa phải", hintEn: "Moderate" },
  { labelVi: "7 ngày", labelEn: "7 days", value: 604800, hintVi: "1 tuần", hintEn: "1 week" },
];

export function CreateBondedClubModal({
  isOpen,
  onClose,
  onSuccess,
  language = "vi",
}: CreateBondedClubModalProps) {
  const { isConnected, chainId, address: userAddress } = useAccount();
  const { setOpen: openConnectModal } = useModal();
  const { writeContractAsync } = useArcWriteContract(undefined, { disableAutoToast: true });
  const publicClient = usePublicClient();
  const isEn = language === "en";
  const formId = useId();
  const deployingRef = useRef(false);

  const [groupName, setGroupName] = useState(isEn ? "Saigon Bonded Club" : "Nhóm Bonded V2");
  const [contributionAmount, setContributionAmount] = useState("10");
  const [maxMembers, setMaxMembers] = useState(5);
  const [roundDuration, setRoundDuration] = useState(86400);

  // Advanced configurations (recommended defaults: 200% safety ratio)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateBps, setRateBps] = useState(DEFAULT_INTEREST_RATE_BPS); // 0.5% per round
  const [safetyBps, setSafetyBps] = useState(DEFAULT_SAFETY_RATIO_BPS); // 200%
  const [liquidationBps, setLiquidationBps] = useState(DEFAULT_LIQUIDATION_RATIO_BPS); // 120%
  const [interestGraceSec, setInterestGraceSec] = useState(86400);
  const [settlementGraceSec, setSettlementGraceSec] = useState(86400);
  const [hasConfirmedCollateralSeizure, setHasConfirmedCollateralSeizure] = useState(false);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string>("");

  if (!isOpen) return null;

  // Validation
  const trimmedName = groupName.trim();
  const isNameValid = trimmedName.length > 0 && trimmedName.length <= 32;
  const parsedAmount = parseUsdc(contributionAmount);
  const isAmountValid = parsedAmount > 0n;
  const isMembersValid = Number.isInteger(maxMembers) && maxMembers >= 2 && maxMembers <= 20;
  const isDurationValid = roundDuration >= 60 && roundDuration <= 365 * 86400;

  const totalPot = isAmountValid && isMembersValid ? parsedAmount * BigInt(maxMembers) : 0n;
  const aprPct = calculateAnnualizedAprPct(rateBps, roundDuration);

  const handleDeploy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isNameValid || !isAmountValid || !isMembersValid || !isDurationValid || !hasConfirmedCollateralSeizure || isDeploying || deployingRef.current) {
      if (!hasConfirmedCollateralSeizure) {
        toast.error(
          isEn
            ? "Please confirm you understand 100% of CirBTC collateral is seized upon default"
            : "Vui lòng xác nhận bạn hiểu 100% tiền cọc CirBTC sẽ bị tịch thu nếu vỡ nợ"
        );
      }
      return;
    }

    if (!isConnected) {
      openConnectModal?.(true);
      return;
    }

    const params = {
      groupName: trimmedName,
      contributionAmount: parsedAmount,
      maxMembers,
      roundDuration,
      rateBpsPerRound: rateBps,
      safetyBps,
      liquidationBps,
      interestGrace: interestGraceSec,
      settlementGrace: settlementGraceSec,
    };

    const validation = validateBondedClubParams(params);
    if (!validation.valid) {
      toast.error(validation.reason ?? "Invalid parameters");
      return;
    }

    deployingRef.current = true;
    setIsDeploying(true);
    setDeployStep(isEn ? "Waiting for signature in wallet..." : "Đang chờ ký xác nhận trên ví...");

    try {
      const factoryAddr = ARC_TESTNET_BONDED_FACTORY;
      const hash = await writeContractAsync({
        address: factoryAddr,
        abi: BONDED_TONTINE_FACTORY_ABI,
        functionName: "createClub",
        args: [
          params.groupName,
          params.contributionAmount,
          BigInt(params.maxMembers),
          BigInt(params.roundDuration),
          BigInt(params.rateBpsPerRound),
          BigInt(params.safetyBps),
          BigInt(params.liquidationBps),
          BigInt(params.interestGrace),
          BigInt(params.settlementGrace),
        ],
      });

      setDeployStep(isEn ? "Deploying on Arc Testnet blockchain..." : "Đang tạo nhóm trên blockchain Arc Testnet...");
      toast.info(isEn ? "Transaction sent, waiting for receipt..." : "Đã gửi giao dịch, đang chờ xác nhận trên chuỗi...");

      if (!publicClient) {
        throw new Error("RPC client unavailable");
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Create club transaction reverted on-chain");
      }

      const created = parseEventLogs({
        abi: BONDED_TONTINE_FACTORY_ABI,
        eventName: "ClubCreated",
        logs: receipt.logs,
      }).find((log) => log.address.toLowerCase() === factoryAddr.toLowerCase());

      const newClubAddress = (created as unknown as { args?: { club?: `0x${string}` } } | undefined)?.args?.club;

      if (!newClubAddress) {
        throw new Error("Could not parse new club address from ClubCreated event");
      }

      // Register runtime bonded club
      registerRuntimeBondedClub(newClubAddress);

      // Save to directory
      saveKnownGroup({
        address: newClubAddress,
        name: params.groupName,
        creator: userAddress?.toLowerCase(),
        version: "v2-bonded",
      }, userAddress);

      toast.success(
        isEn
          ? `BondedTontine V2 Club created: ${params.groupName}`
          : `Đã tạo nhóm BondedTontine V2 thành công: ${params.groupName}`,
        {
          description: formatAddress(newClubAddress),
          action: {
            label: isEn ? "View Explorer" : "Xem Explorer",
            onClick: () =>
              window.open(buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, newClubAddress), "_blank"),
          },
        }
      );

      onSuccess(newClubAddress);
      onClose();
    } catch (err: any) {
      console.error("Bonded club creation failed:", err);
      toast.error(parseBondedTontineError(err, language));
    } finally {
      deployingRef.current = false;
      setIsDeploying(false);
      setDeployStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[calc(100dvh-1.5rem)] flex flex-col rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {isEn ? "Create BondedTontine V2 Club" : "Tạo Nhóm BondedTontine V2"}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase">
                  CirBTC Collateral
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                {isEn
                  ? "Factory-deployed club with BTC/USD Oracle & anti-default bond"
                  : "Nhóm hụi thế chấp CirBTC định giá Oracle, chống bùng hụi qua Factory"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeploying}
            className="text-slate-400 hover:text-white p-2 rounded-xl border border-slate-800 hover:bg-slate-800/80 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form id={formId} data-testid="create-bonded-body" onSubmit={handleDeploy} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Version Switcher banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isEn
                  ? "Bonded V2: CirBTC collateral; review the risk terms"
                  : "Bonded V2: cọc CirBTC; kiểm tra điều kiện rủi ro"}
              </span>
            </div>
          </div>

          <section data-testid="create-bonded-essential-terms" className="rounded-2xl border border-amber-500/30 bg-black/30 p-4 space-y-2 text-xs text-slate-200">
            <h3 className="font-bold text-amber-300">{isEn ? "Essential terms before creation" : "Điều kiện cần biết trước khi tạo"}</h3>
            <p>{isEn ? "Owner borrowing interest per round" : "Lãi vay chủ nhóm mỗi vòng"}: {(rateBps / 100).toFixed(2)}%</p>
            <p>{isEn ? "Initial collateral: 0 cirBTC; creation does not deposit collateral. Initial borrowing capacity: 0 USDC until collateral is deposited and a fresh price is available." : "Cọc ban đầu: 0 cirBTC; tạo nhóm không tự nạp cọc. Hạn mức vay ban đầu: 0 USDC cho đến khi nạp cọc và có giá còn hạn."}</p>
            <p>{isEn ? "To start: positive CirBTC collateral and at least 2 members. There is no requirement to collateralize 200% of the whole pool to start." : "Điều kiện bắt đầu: cọc CirBTC lớn hơn 0 và ít nhất 2 thành viên. Không bắt buộc cọc 200% toàn bộ quỹ để bắt đầu."}</p>
            <p>{isEn ? "Borrowing safety margin" : "Biên an toàn khoản vay"}: {safetyBps / 100}% — {isEn ? `$${safetyBps / 100} collateral per $100 exposure, including interest.` : `$${safetyBps / 100} cọc cho mỗi $100 dư nợ tính cả lãi.`}</p>
            <p>{isEn ? "Liquidation threshold" : "Ngưỡng thanh lý"}: {liquidationBps / 100}% {isEn ? "of exposure; separate from the start conditions." : "dư nợ; khác với điều kiện bắt đầu."}</p>
          </section>

          {/* Field 1: Group Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isEn ? "Group Name" : "Tên Nhóm"}</span>
              <span className="text-xs text-slate-500">{trimmedName.length}/32</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={isEn ? "e.g. Saigon Bonded Club" : "Ví dụ: Hụi Vàng Sài Gòn"}
              maxLength={32}
              disabled={isDeploying}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Field 2: Contribution Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isEn ? "Contribution per Round (USDC)" : "Mức Đóng Mỗi Vòng (USDC)"}</span>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {isAmountValid ? `${formatUsdc(parsedAmount)} USDC` : "--"}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                disabled={isDeploying}
                placeholder="10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors pr-16"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                USDC
              </span>
            </div>
            {/* Presets */}
            <div className="flex gap-2 pt-1">
              {AMOUNT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setContributionAmount(amt)}
                  disabled={isDeploying}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    contributionAmount === amt
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {amt} USDC
                </button>
              ))}
            </div>
          </div>

          {/* Field 3: Max Members */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isEn ? "Number of Members" : "Số Lượng Thành Viên"}</span>
              <span className="text-xs text-slate-400">
                {maxMembers} {isEn ? "members" : "thành viên"}
              </span>
            </label>
            <div className="flex gap-2">
              {MEMBER_PRESETS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxMembers(num)}
                  disabled={isDeploying}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    maxMembers === num
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Field 4: Round Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isEn ? "Round Duration" : "Thời Lượng Mỗi Vòng"}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRoundDuration(p.value)}
                  disabled={isDeploying}
                  className={`py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    roundDuration === p.value
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <div className="text-xs font-bold text-white">
                    {isEn ? p.labelEn : p.labelVi}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {isEn ? p.hintEn : p.hintVi}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Advanced Parameters */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-medium text-slate-400 hover:text-amber-300 py-1 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isEn
                    ? "Advanced Parameters (Interest & CirBTC Margins)"
                    : "Thông số nâng cao (Lãi suất & Tỷ lệ cọc CirBTC)"}
                </span>
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400">
                      {isEn ? "Interest per Round" : "Lãi suất / vòng"}
                    </span>
                    <input
                      type="number"
                      value={rateBps}
                      onChange={(e) => setRateBps(Number(e.target.value))}
                      disabled={isDeploying}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <span className="text-xs text-slate-500">
                      {(rateBps / 100).toFixed(2)}% ({aprPct.toFixed(1)}% APR)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isEn ? "Safety Margin" : "Tỷ lệ cọc an toàn"}
                    </span>
                    <input
                      type="number"
                      value={safetyBps}
                      onChange={(e) => setSafetyBps(Number(e.target.value))}
                      disabled={isDeploying}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <span className="text-xs text-slate-500">
                      {(safetyBps / 100).toFixed(0)}% (Hạn mức vay = Cọc / {safetyBps / 10000})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isEn ? "Liquidation Threshold" : "Ngưỡng thanh lý"}
                    </span>
                    <input
                      type="number"
                      value={liquidationBps}
                      onChange={(e) => setLiquidationBps(Number(e.target.value))}
                      disabled={isDeploying}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <span className="text-xs text-slate-500">
                      {(liquidationBps / 100).toFixed(0)}% (Thanh lý nếu cọc &lt; nợ x {liquidationBps / 10000})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">
                      {isEn ? "Grace Period (s)" : "Thời gian ân hạn (giây)"}
                    </span>
                    <input
                      type="number"
                      value={interestGraceSec}
                      onChange={(e) => setInterestGraceSec(Number(e.target.value))}
                      disabled={isDeploying}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                    <span className="text-xs text-slate-500">
                      {Math.round(interestGraceSec / 3600)} {isEn ? "hours" : "giờ"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-yellow-500/10 border border-amber-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isEn ? "Total Contributions per Round:" : "Vốn huy động mỗi vòng:"}</span>
              <span className="text-base font-extrabold text-amber-300">
                {isAmountValid && isMembersValid ? `${formatUsdc(totalPot)} USDC` : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{isEn ? "Full Cycle Duration:" : "Thời gian toàn chu kỳ:"}</span>
              <span className="text-slate-200 font-medium">
                {isMembersValid && isDurationValid
                  ? `${formatRoundDuration(maxMembers * roundDuration, isEn)} (${maxMembers} ${isEn ? "rounds" : "vòng"})`
                  : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>{isEn ? "Collateral asset (deposit after creation):" : "Tài sản cọc (nạp sau khi tạo):"}</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {isEn ? "CirBTC + BTC/USD Oracle" : "CirBTC + Oracle BTC/USD"}
              </span>
            </div>
          </div>

        </form>
        <div data-testid="create-bonded-footer" className="shrink-0 border-t border-amber-500/30 bg-[#0c0d14] p-3 sm:p-4 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Mandatory Collateral Seizure Confirmation Checkbox */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={hasConfirmedCollateralSeizure}
                onChange={(e) => setHasConfirmedCollateralSeizure(e.target.checked)}
                disabled={isDeploying}
                className="mt-0.5 h-4 w-4 rounded border-amber-500/40 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-black/60 cursor-pointer shrink-0"
              />
              <span className="text-slate-300 leading-relaxed">
                {isEn
                  ? `I accept the terms: interest grace ${formatRoundDuration(interestGraceSec, true)}, settlement grace ${formatRoundDuration(settlementGraceSec, true)}. Default can seize all CirBTC collateral.`
                  : `Tôi đồng ý điều kiện: ân hạn lãi ${formatRoundDuration(interestGraceSec, false)}, tất toán ${formatRoundDuration(settlementGraceSec, false)}. Vỡ nợ có thể mất toàn bộ cọc CirBTC.`}
              </span>
            </label>
          </div>

          {/* Deploy status banner if in progress */}
          {isDeploying && (
            <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex items-center gap-3 text-xs text-blue-200">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <div>
                <div className="font-semibold">{deployStep}</div>
                <div className="text-xs text-blue-300/80">
                  {isEn ? "Please do not close this window." : "Vui lòng không tắt cửa sổ này."}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              form={formId}
              disabled={!isNameValid || !isAmountValid || !isMembersValid || !isDurationValid || !hasConfirmedCollateralSeizure || isDeploying}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEn ? "Creating Club on Arc..." : "Đang tạo nhóm trên Arc..."}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isEn ? "Create BondedTontine V2 Club" : "Tạo Nhóm BondedTontine V2"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
