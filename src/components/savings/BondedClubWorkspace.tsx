import React, { useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Coins,
  Lock,
  TrendingUp,
  CheckCircle2,
  Flame,
  RefreshCw,
} from "lucide-react";
import { useArcWriteContract } from "../../hooks/useArcWriteContract.ts";
import { useBondedClub } from "../../hooks/useBondedClub.ts";
import { useUsdcBalance } from "../../hooks/useSavingsClub.ts";
import {
  BONDED_TONTINE_ABI,
  BONDED_TONTINE_FACTORY_ABI,
  MOCK_AGGREGATOR_V3_ABI,
  BONDED_STATE,
  calculateAnnualizedAprPct,
  parseBondedTontineError,
  validateBondedClubParams,
  DEFAULT_BONDED_PARAMS,
} from "../../lib/bondedTontine.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  BONDED_USDC_ADDRESS,
  BONDED_CIRBTC_ADDRESS,
  CANONICAL_FACTORY,
  BONDED_DISCLOSURE_COPY,
  MOCK_ORACLE_WARNING_COPY,
} from "../../config/bonded-tontine.ts";
import { buildAddressExplorerUrl } from "../../onchain-facts.ts";
import {
  formatUsdc,
  parseUsdc,
  formatUnitsExact,
  parseUnitsExact,
} from "../../onchain-money.ts";
import { saveKnownGroup } from "../../lib/savingsClubDirectory.ts";
import { parseEventLogs } from "viem";

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface BondedClubWorkspaceProps {
  contractAddress: `0x${string}`;
  userAddress?: `0x${string}`;
  language: "vi" | "en";
  onSelectGroup?: (address: `0x${string}`) => void;
}

export { BONDED_DISCLOSURE_COPY, MOCK_ORACLE_WARNING_COPY };

export function BondedClubWorkspace({
  contractAddress,
  userAddress,
  language,
  onSelectGroup,
}: BondedClubWorkspaceProps) {
  const club = useBondedClub(contractAddress, userAddress, true);
  const usdcBalance = useUsdcBalance(userAddress);
  const { writeContractAsync, isPending } = useArcWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  useWaitForTransactionReceipt({ hash: txHash });

  // Confirmation checkbox for unverified clubs (T6.7)
  const [unverifiedConfirmed, setUnverifiedConfirmed] = useState(false);

  // Owner input states
  const [collateralInput, setCollateralInput] = useState("0.05");
  const [withdrawColInput, setWithdrawColInput] = useState("0.01");
  const [borrowInput, setBorrowInput] = useState("10");
  const [repayInput, setRepayInput] = useState("10");
  const [interestInput, setInterestInput] = useState("");
  const [removeMemberInput, setRemoveMemberInput] = useState("");
  const [mockBtcPriceInput, setMockBtcPriceInput] = useState("60000");

  // Create new BondedTontine club via Factory (T6.1)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("Saigon Bonded Club");
  const [newContribUsdc, setNewContribUsdc] = useState("10");
  const [newMaxMembers, setNewMaxMembers] = useState("4");
  const [newRoundDurationSec, setNewRoundDurationSec] = useState("120");
  const [newRateBps, setNewRateBps] = useState("200");
  const [newSafetyBps, setNewSafetyBps] = useState("20000");
  const [newLiquidationBps, setNewLiquidationBps] = useState("12000");
  const [newInterestGraceSec, setNewInterestGraceSec] = useState("120");
  const [newSettlementGraceSec, setNewSettlementGraceSec] = useState("3600");

  const isVi = language === "vi";
  const isOwner =
    Boolean(userAddress) &&
    club.owner.toLowerCase() === userAddress?.toLowerCase();

  const stateLabels: Record<number, { vi: string; en: string }> = {
    [BONDED_STATE.OPEN]: { vi: "ĐANG MỞ ĐĂNG KÝ (OPEN)", en: "OPEN FOR REGISTRATION" },
    [BONDED_STATE.ACTIVE]: { vi: "ĐANG CHẠY VÒNG (ACTIVE)", en: "ACTIVE ROUNDS" },
    [BONDED_STATE.COMPLETED]: { vi: "ĐÃ HOÀN TẤT (COMPLETED)", en: "COMPLETED" },
    [BONDED_STATE.DEFAULTED]: { vi: "ĐÃ VỠ NỢ / THANH LÝ (DEFAULTED)", en: "DEFAULTED / LIQUIDATED" },
    [BONDED_STATE.CANCELLED]: { vi: "ĐÃ HỦY (CANCELLED)", en: "CANCELLED" },
  };

  const runAction = async (label: string, fn: () => Promise<`0x${string}`>) => {
    try {
      const hash = await fn();
      setTxHash(hash);
      toast.success(isVi ? `Đã gửi giao dịch: ${label}` : `Submitted: ${label}`);
      setTimeout(() => {
        void club.refetch();
      }, 2000);
    } catch (err) {
      toast.error(parseBondedTontineError(err, language));
    }
  };

  // Exact-amount approval helper (T6.6: never approve infinite amounts)
  const ensureExactUsdcApproval = async (exactAmount: bigint) => {
    if (club.usdcAllowance < exactAmount) {
      await writeContractAsync({
        address: BONDED_USDC_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contractAddress, exactAmount],
      });
    }
  };

  const ensureExactCirBtcApproval = async (exactAmount: bigint) => {
    if (club.cirBtcAllowance < exactAmount) {
      await writeContractAsync({
        address: BONDED_CIRBTC_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contractAddress, exactAmount],
      });
    }
  };

  // Member actions (T6.4)
  const handleJoin = () =>
    runAction(isVi ? "Tham gia nhóm" : "Join Group", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "joinGroup",
        args: [],
      })
    );

  const handleContribute = () =>
    runAction(isVi ? "Đóng tiền vòng hiện tại" : "Contribute Round", async () => {
      await ensureExactUsdcApproval(club.contributionAmount);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "contribute",
        args: [],
      });
    });

  const handleClaimInterest = () =>
    runAction(isVi ? "Nhận tiền lãi" : "Claim Interest", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "claimInterest",
        args: [],
      })
    );

  const handleWithdrawPrincipal = () =>
    runAction(isVi ? "Rút tiền gốc / cọc" : "Withdraw Principal", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "withdrawPrincipal",
        args: [],
      })
    );

  // Owner actions (T6.3)
  const handleDepositCollateral = () =>
    runAction(isVi ? "Nạp cọc CirBTC" : "Deposit CirBTC Collateral", async () => {
      const sats = parseUnitsExact(collateralInput, 8);
      await ensureExactCirBtcApproval(sats);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "depositCollateral",
        args: [sats],
      });
    });

  const handleWithdrawCollateral = () =>
    runAction(isVi ? "Rút cọc CirBTC" : "Withdraw CirBTC Collateral", () => {
      const sats = parseUnitsExact(withdrawColInput, 8);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "withdrawCollateral",
        args: [sats],
      });
    });

  const handleStartRounds = () =>
    runAction(isVi ? "Bắt đầu các vòng" : "Start Rounds", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "startRounds",
        args: [],
      })
    );

  const handleBorrow = () =>
    runAction(isVi ? "Vay USDC trong hạn mức" : "Borrow USDC", () => {
      const amt = parseUsdc(borrowInput);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "borrow",
        args: [amt],
      });
    });

  const handleRepay = () =>
    runAction(isVi ? "Trả nợ gốc USDC" : "Repay Principal USDC", async () => {
      const amt = parseUsdc(repayInput);
      await ensureExactUsdcApproval(amt);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "repay",
        args: [amt],
      });
    });

  const handlePayInterest = () =>
    runAction(isVi ? "Trả lãi USDC" : "Pay Interest USDC", async () => {
      const amt = interestInput.trim()
        ? parseUsdc(interestInput)
        : club.interestOwed;
      await ensureExactUsdcApproval(amt);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "payInterest",
        args: [amt],
      });
    });

  const handleRemoveMember = () =>
    runAction(isVi ? "Xóa thành viên" : "Remove Member", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "removeMember",
        args: [removeMemberInput.trim() as `0x${string}`],
      })
    );

  const handleCancelOpen = () =>
    runAction(isVi ? "Hủy nhóm đang mở" : "Cancel Open Club", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "cancelOpen",
        args: [],
      })
    );

  // Keeper actions (T6.5)
  const handleFinalize = () =>
    runAction(isVi ? "Tất toán chu kỳ (Finalize)" : "Finalize Cycle", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "finalize",
        args: [],
      })
    );

  const handleDeclareDefault = () =>
    runAction(isVi ? "Tuyên bố vỡ nợ (Declare Default)" : "Declare Default", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "declareDefault",
        args: [],
      })
    );

  const handleLiquidate = () =>
    runAction(isVi ? "Kích hoạt thanh lý (Liquidate)" : "Trigger Liquidation", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "liquidate",
        args: [],
      })
    );

  // Mock oracle price update for testnet simulation
  const handleSetMockPrice = (usdPrice: string) =>
    runAction(
      isVi ? `Cập nhật giá Mock BTC = $${usdPrice}` : `Set Mock BTC Price = $${usdPrice}`,
      () => {
        const rawAnswer = parseUnitsExact(usdPrice, 8);
        return writeContractAsync({
          address: club.priceFeed,
          abi: MOCK_AGGREGATOR_V3_ABI,
          functionName: "setPrice",
          args: [rawAnswer],
        });
      }
    );

  // Create BondedTontine club via Factory (T6.1 & T6.10)
  const handleCreateBondedClub = async () => {
    const factoryAddr = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];
    if (!factoryAddr) {
      toast.error(isVi ? "Chưa cấu hình Factory trên mạng này" : "Factory not configured on this chain");
      return;
    }
    try {
      const contributionAmount = parseUsdc(newContribUsdc);
      const params = {
        groupName: newName.trim() || DEFAULT_BONDED_PARAMS.groupName,
        contributionAmount,
        maxMembers: Number(newMaxMembers),
        roundDuration: Number(newRoundDurationSec),
        rateBpsPerRound: Number(newRateBps),
        safetyBps: Number(newSafetyBps),
        liquidationBps: Number(newLiquidationBps),
        interestGrace: Number(newInterestGraceSec),
        settlementGrace: Number(newSettlementGraceSec),
      };
      const check = validateBondedClubParams(params);
      if (!check.valid) {
        toast.error(check.reason ?? "Invalid parameters");
        return;
      }

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
      setTxHash(hash);
      toast.success(
        isVi
          ? "Đã gửi giao dịch tạo nhóm BondedTontine qua Factory!"
          : "Submitted BondedTontine creation via Factory!"
      );
      setShowCreateForm(false);
    } catch (err) {
      toast.error(parseBondedTontineError(err, language));
    }
  };

  const aprPct = calculateAnnualizedAprPct(
    Number(club.rateBpsPerRound),
    Number(club.roundDuration)
  );
  const feedExplorerUrl =
    club.priceFeed && club.priceFeed !== "0x0000000000000000000000000000000000000000"
      ? buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, club.priceFeed)
      : "#";

  const canFinalize =
    club.state === BONDED_STATE.ACTIVE &&
    club.cycleEnded &&
    club.totalDebt === 0n &&
    club.interestOwed === 0n;

  const canLiquidate =
    club.state === BONDED_STATE.ACTIVE &&
    club.totalDebt + club.interestOwed > 0n &&
    club.healthBps !== null &&
    club.healthBps < club.liquidationBps;

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const canDeclareDefault =
    club.state === BONDED_STATE.ACTIVE &&
    club.interestOwed > 0n &&
    club.nextInterestDeadline > 0n &&
    nowSec >= club.nextInterestDeadline;

  const contributeBlockedByVerification = !club.isVerifiedClub && !unverifiedConfirmed;

  return (
    <div className="space-y-6 rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-5 text-zinc-100">
      {/* Header & Factory Verification Badge (T6.7 & T6.8) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              BondedTontine V2
            </span>
            {club.isVerifiedClub ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isVi ? "Đã xác minh bởi Factory" : "Verified by Factory"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                {isVi ? "Chưa xác minh (ngoài Factory)" : "Unverified Club"}
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">
            {club.groupName || "BondedTontine Club"}
          </h2>
          <p className="text-xs text-zinc-400">
            {stateLabels[club.state]?.[language] ?? "UNKNOWN"} •{" "}
            {isVi ? "Vòng hiện tại" : "Current Round"}:{" "}
            {club.currentRoundIndex.toString()}/{club.totalRounds.toString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void club.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-amber-400/50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isVi ? "Làm mới" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
          >
            {isVi ? "Tạo nhóm Bonded V2" : "Create Bonded V2 Club"}
          </button>
        </div>
      </div>

      {/* Honest Risk Disclosure Copy (T6.11 — replaces "owner does not hold funds") */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
        <div className="font-semibold text-amber-300">
          {isVi ? "Cơ chế & Rủi ro BondedTontine:" : "BondedTontine Mechanism & Risks:"}
        </div>
        <p className="mt-1">{BONDED_DISCLOSURE_COPY[language]}</p>
      </div>

      {/* Oracle Status & Mock Warning Badge (T6.8) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 text-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-300">
              Oracle ({club.oracleDescription || "BTC/USD"}):
            </span>
            <span className="font-mono text-amber-300">
              $
              {club.oraclePriceRaw > 0n
                ? formatUnitsExact(club.oraclePriceRaw, 8)
                : "N/A"}
            </span>
            {club.isMockOracle && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-2 py-0.5 font-semibold text-orange-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {MOCK_ORACLE_WARNING_COPY[language]}
              </span>
            )}
            {club.oracleError && (
              <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-semibold text-red-300">
                {isVi ? "Giá Oracle quá hạn hoặc lỗi" : "Oracle price stale or invalid"}
              </span>
            )}
          </div>
          <div className="text-zinc-400">
            {isVi ? "Tuổi giá:" : "Price age:"} {club.priceAgeSeconds.toString()}s (max{" "}
            {club.maxPriceAge.toString()}s)
          </div>
        </div>
        <a
          href={feedExplorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-amber-400 hover:underline"
        >
          {isVi ? "Xem Feed trên Explorer" : "View Feed on Explorer"}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Unverified Club Warning & Confirmation Gate (T6.7) */}
      {!club.isVerifiedClub && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200">
          <div className="font-semibold text-red-300">
            {isVi
              ? "Cảnh báo: Nhóm này không nằm trong danh sách BondedTontineFactory chính thức!"
              : "Warning: This club is not registered in the canonical BondedTontineFactory!"}
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={unverifiedConfirmed}
              onChange={(e) => setUnverifiedConfirmed(e.target.checked)}
              className="rounded border-red-400"
            />
            <span>
              {isVi
                ? "Tôi hiểu rủi ro của hợp đồng chưa xác minh và vẫn muốn mở khóa nút góp tiền"
                : "I understand the risks of an unverified club and want to unlock the contribute button"}
            </span>
          </label>
        </div>
      )}

      {/* Key Financial Metrics Grid (T6.2 & T6.12) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Tổng tiền góp (Pool)" : "Total Deposits"}
          </div>
          <div className="mt-1 text-base font-bold text-white">
            {formatUsdc(club.totalDeposits)} USDC
          </div>
          <div className="text-xs text-zinc-400">
            {formatUsdc(club.contributionAmount)} USDC / {isVi ? "vòng" : "round"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Dư nợ / Hạn mức vay" : "Debt / Borrow Limit"}
          </div>
          <div className="mt-1 text-base font-bold text-amber-300">
            {formatUsdc(club.totalDebt)} /{" "}
            {club.borrowLimit !== null ? `${formatUsdc(club.borrowLimit)} USDC` : "N/A"}
          </div>
          <div className="text-xs text-zinc-400">
            {isVi ? "Lãi:" : "Rate:"} {(Number(club.rateBpsPerRound) / 100).toFixed(2)}% /{" "}
            {isVi ? "vòng" : "round"} (~{aprPct.toFixed(0)}% APR)
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Cọc CirBTC của Chủ hụi" : "Owner CirBTC Collateral"}
          </div>
          <div className="mt-1 text-base font-bold text-emerald-300">
            {formatUnitsExact(club.collateral, 8)} cirBTC
          </div>
          <div className="text-xs text-zinc-400">
            ≈{" "}
            {club.collateralValueUsdc !== null
              ? `${formatUsdc(club.collateralValueUsdc)} USDC`
              : "N/A"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Hệ số sức khỏe (Health)" : "Health Ratio"}
          </div>
          <div className="mt-1 text-base font-bold text-white">
            {club.healthBps === null
              ? "N/A"
              : club.totalDebt + club.interestOwed === 0n
                ? "∞ (Không nợ)"
                : `${(Number(club.healthBps) / 100).toFixed(1)}%`}
          </div>
          <div className="text-xs text-zinc-400">
            {isVi ? "Ngưỡng thanh lý:" : "Liquidation:"}{" "}
            {(Number(club.liquidationBps) / 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Create BondedTontine Club Modal/Section (T6.1) */}
      {showCreateForm && (
        <div className="space-y-3 rounded-xl border border-amber-500/40 bg-zinc-900 p-4">
          <h3 className="text-sm font-bold text-amber-300">
            {isVi
              ? "Tạo nhóm BondedTontine V2 mới (qua Factory chính thức)"
              : "Create New BondedTontine V2 Club (via Canonical Factory)"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="text-zinc-400">{isVi ? "Tên nhóm" : "Group Name"}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Mức góp / vòng (USDC)" : "Contribution / round (USDC)"}
              </span>
              <input
                value={newContribUsdc}
                onChange={(e) => setNewContribUsdc(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Số thành viên (2..20)" : "Max Members (2..20)"}
              </span>
              <input
                value={newMaxMembers}
                onChange={(e) => setNewMaxMembers(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Thời lượng vòng (giây, >=60)" : "Round Duration (sec, >=60)"}
              </span>
              <input
                value={newRoundDurationSec}
                onChange={(e) => setNewRoundDurationSec(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Lãi mỗi vòng (bps, 200 = 2%)" : "Rate per round (bps, 200 = 2%)"}
              </span>
              <input
                value={newRateBps}
                onChange={(e) => setNewRateBps(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Hệ số an toàn / Thanh lý (bps)" : "Safety / Liquidation (bps)"}
              </span>
              <div className="mt-1 flex gap-1">
                <input
                  value={newSafetyBps}
                  onChange={(e) => setNewSafetyBps(e.target.value)}
                  className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white"
                />
                <input
                  value={newLiquidationBps}
                  onChange={(e) => setNewLiquidationBps(e.target.value)}
                  className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white"
                />
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              {isVi ? "Đóng" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleCreateBondedClub()}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {isVi ? "Xác nhận tạo qua Factory" : "Create via Factory"}
            </button>
          </div>
        </div>
      )}

      {/* Member Panel (T6.4) */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Coins className="h-4 w-4 text-amber-400" />
            {isVi ? "Bảng điều khiển Thành viên" : "Member Actions"}
          </h3>
          <div className="text-xs text-zinc-400">
            {isVi ? "Số dư ERC-20 USDC:" : "ERC-20 USDC Balance:"}{" "}
            <span className="font-semibold text-white">
              {formatUsdc(usdcBalance.balance ?? 0n)} USDC
            </span>{" "}
            • {isVi ? "Đã góp:" : "Deposited:"} {formatUsdc(club.userDeposit)} USDC •{" "}
            {isVi ? "Lãi chờ nhận:" : "Pending Interest:"}{" "}
            <span className="font-semibold text-emerald-300">
              {formatUsdc(club.pendingInterest)} USDC
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {club.state === BONDED_STATE.OPEN && !isOwner && !club.isMember && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleJoin}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {isVi ? "Tham gia nhóm (joinGroup)" : "Join Club (joinGroup)"}
            </button>
          )}

          {club.state === BONDED_STATE.ACTIVE && club.isMember && (
            <button
              type="button"
              disabled={
                isPending ||
                club.hasContributedCurrentRound ||
                contributeBlockedByVerification
              }
              onClick={handleContribute}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {club.hasContributedCurrentRound
                ? isVi
                  ? "Đã góp vòng này"
                  : "Contributed this round"
                : isVi
                  ? `Approve & Góp ${formatUsdc(club.contributionAmount)} USDC`
                  : `Approve & Contribute ${formatUsdc(club.contributionAmount)} USDC`}
            </button>
          )}

          <button
            type="button"
            disabled={isPending || club.pendingInterest === 0n}
            onClick={handleClaimInterest}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {isVi
              ? `Nhận lãi (${formatUsdc(club.pendingInterest)} USDC)`
              : `Claim Interest (${formatUsdc(club.pendingInterest)} USDC)`}
          </button>

          {(club.state === BONDED_STATE.COMPLETED ||
            club.state === BONDED_STATE.DEFAULTED) && (
            <button
              type="button"
              disabled={isPending || club.principalWithdrawn || club.userDeposit === 0n}
              onClick={handleWithdrawPrincipal}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
            >
              {isVi
                ? `Rút gốc (${formatUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`
                : `Withdraw Principal (${formatUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`}
            </button>
          )}
        </div>
      </div>

      {/* Owner Panel (T6.3) */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Lock className="h-4 w-4 text-amber-400" />
            {isVi ? "Bảng điều khiển Chủ hụi (Owner)" : "Club Owner Controls"}
          </h3>
          <span className="text-xs text-zinc-400">
            Owner: {club.owner.slice(0, 6)}...{club.owner.slice(-4)} •{" "}
            {isVi ? "Lãi đang nợ:" : "Interest Owed:"}{" "}
            <strong className="text-amber-300">{formatUsdc(club.interestOwed)} USDC</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Deposit Collateral */}
          <div className="flex gap-1.5">
            <input
              value={collateralInput}
              onChange={(e) => setCollateralInput(e.target.value)}
              placeholder="cirBTC (e.g. 0.05)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending || !isOwner}
              onClick={handleDepositCollateral}
              className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40"
            >
              {isVi ? "Nạp cọc" : "Deposit"}
            </button>
          </div>

          {/* Borrow USDC */}
          <div className="flex gap-1.5">
            <input
              value={borrowInput}
              onChange={(e) => setBorrowInput(e.target.value)}
              placeholder="USDC borrow"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending || !isOwner || club.state !== BONDED_STATE.ACTIVE}
              onClick={handleBorrow}
              className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40"
            >
              {isVi ? "Vay USDC" : "Borrow"}
            </button>
          </div>

          {/* Repay Principal */}
          <div className="flex gap-1.5">
            <input
              value={repayInput}
              onChange={(e) => setRepayInput(e.target.value)}
              placeholder="USDC repay"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending || !isOwner || club.totalDebt === 0n}
              onClick={handleRepay}
              className="shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
            >
              {isVi ? "Trả gốc" : "Repay"}
            </button>
          </div>

          {/* Pay Interest */}
          <div className="flex gap-1.5">
            <input
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder={formatUsdc(club.interestOwed)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending || !isOwner || club.interestOwed === 0n}
              onClick={handlePayInterest}
              className="shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
            >
              {isVi ? "Trả lãi" : "Pay Interest"}
            </button>
          </div>

          {/* Withdraw Collateral */}
          <div className="flex gap-1.5">
            <input
              value={withdrawColInput}
              onChange={(e) => setWithdrawColInput(e.target.value)}
              placeholder="cirBTC withdraw"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending || !isOwner || club.collateral === 0n}
              onClick={handleWithdrawCollateral}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-400 disabled:opacity-40"
            >
              {isVi ? "Rút cọc" : "Withdraw"}
            </button>
          </div>

          {/* Remove Member (OPEN only) */}
          {club.state === BONDED_STATE.OPEN && (
            <div className="flex gap-1.5">
              <input
                value={removeMemberInput}
                onChange={(e) => setRemoveMemberInput(e.target.value)}
                placeholder="0xMember..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={isPending || !isOwner || !removeMemberInput.trim()}
                onClick={handleRemoveMember}
                className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-40"
              >
                {isVi ? "Xóa TV" : "Remove"}
              </button>
            </div>
          )}
        </div>

        {club.state === BONDED_STATE.OPEN && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isPending || !isOwner || club.memberCount < 2n || club.collateral === 0n}
              onClick={handleStartRounds}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
            >
              {isVi ? "Bắt đầu các vòng (startRounds)" : "Start Rounds (startRounds)"}
            </button>
            <button
              type="button"
              disabled={isPending || !isOwner}
              onClick={handleCancelOpen}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
            >
              {isVi ? "Hủy nhóm & Hoàn cọc (cancelOpen)" : "Cancel Club & Refund Collateral"}
            </button>
          </div>
        )}
      </div>

      {/* Permissionless Keeper Actions & Testnet Mock Price Controller (T6.5) */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Flame className="h-4 w-4 text-orange-400" />
          {isVi
            ? "Tác vụ Permissionless (Ai cũng gọi được — Keeper)"
            : "Permissionless Keeper Actions (Anyone Can Call)"}
        </h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={isPending || !canFinalize}
            onClick={handleFinalize}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
          >
            {isVi ? "Tất toán chu kỳ (finalize)" : "Finalize Cycle (finalize)"}
          </button>
          <button
            type="button"
            disabled={isPending || !canDeclareDefault}
            onClick={handleDeclareDefault}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-40"
          >
            {isVi ? "Tuyên bố vỡ nợ quá hạn (declareDefault)" : "Declare Default (declareDefault)"}
          </button>
          <button
            type="button"
            disabled={isPending || !canLiquidate}
            onClick={handleLiquidate}
            className="rounded-lg bg-orange-500/20 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 disabled:opacity-40"
          >
            {isVi ? "Thanh lý do thiếu cọc (liquidate)" : "Liquidate Undercollateralized (liquidate)"}
          </button>
        </div>

        {/* Testnet Mock Oracle Simulation Bar */}
        {club.isMockOracle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3 text-xs">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-zinc-400">
              {isVi ? "Mô phỏng giá Mock BTC/USD (Testnet):" : "Simulate Mock BTC/USD (Testnet):"}
            </span>
            <input
              value={mockBtcPriceInput}
              onChange={(e) => setMockBtcPriceInput(e.target.value)}
              className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleSetMockPrice(mockBtcPriceInput)}
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-semibold text-amber-300"
            >
              {isVi ? "Đặt giá" : "Set Price"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleSetMockPrice("11500")}
              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1 font-semibold text-red-300"
            >
              {isVi ? "Mô phỏng Flash Crash ($11,500)" : "Simulate Flash Crash ($11,500)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
