import React, { useState } from "react";
import { usePublicClient, useWaitForTransactionReceipt } from "wagmi";
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
  Layers,
  Users,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Settings2,
  Trash2,
  Share2,
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
  ARC_TESTNET_MOCK_FEED,
  BONDED_USDC_ADDRESS,
  BONDED_CIRBTC_ADDRESS,
  CANONICAL_FACTORY,
  ORACLE_INFO,
  BONDED_DISCLOSURE_COPY,
  MOCK_ORACLE_WARNING_COPY,
  registerRuntimeBondedClub,
} from "../../config/bonded-tontine.ts";
import { buildAddressExplorerUrl, buildTxExplorerUrl } from "../../onchain-facts.ts";
import {
  formatUsdc,
  formatUsdcExact,
  parseUsdc,
  formatUnitsExact,
  parseUnitsExact,
} from "../../onchain-money.ts";
import { saveKnownGroup, removeKnownGroup, getKnownGroups, buildShareGroupUrl } from "../../lib/savingsClubDirectory.ts";
import { parseEventLogs } from "viem";

export { BONDED_DISCLOSURE_COPY, MOCK_ORACLE_WARNING_COPY };

const DURATION_PRESETS = [
  { labelVi: "⚡ 2 phút (Test nhanh)", labelEn: "⚡ 2 mins (Fast Test)", sec: 120, interestGrace: 120, settleGrace: 3600 },
  { labelVi: "1 giờ (Thử nghiệm)", labelEn: "1 hour (Test)", sec: 3600, interestGrace: 3600, settleGrace: 3600 },
  { labelVi: "1 ngày (Phổ biến)", labelEn: "1 day (Standard)", sec: 86400, interestGrace: 86400, settleGrace: 86400 },
  { labelVi: "7 ngày (1 tuần)", labelEn: "7 days (1 week)", sec: 604800, interestGrace: 604800, settleGrace: 86400 },
];

const RATE_PRESETS = [
  { label: "1.0%", bps: "100" },
  { label: "2.0%", bps: "200" },
  { label: "3.0%", bps: "300" },
  { label: "5.0%", bps: "500" },
];

function formatFriendlyDuration(sec: number, isVi: boolean): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : isVi ? `${m} phút` : `${m}m`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : isVi ? `${h} giờ` : `${h}h`;
  }
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : isVi ? `${d} ngày` : `${d}d`;
}


function displayUsdc(raw: bigint): string {
  if (raw > 0n && raw < 10_000n) {
    return formatUsdcExact(raw);
  }
  return formatUsdc(raw);
}

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
  isPasskeyUser?: boolean;
  onSelectGroup?: (address: `0x${string}`) => void;
  onOpenDirectoryModal?: () => void;
  onOpenCreateModal?: () => void;
}

export function BondedClubWorkspace({
  contractAddress,
  userAddress,
  language,
  isPasskeyUser = false,
  onSelectGroup,
  onOpenDirectoryModal,
  onOpenCreateModal,
}: BondedClubWorkspaceProps) {
  const club = useBondedClub(contractAddress, userAddress, true);
  const usdcBalance = useUsdcBalance(userAddress);
  const { writeContractAsync } = useArcWriteContract(undefined, { disableAutoToast: true });
  const [isActionPending, setIsActionPending] = useState(false);
  const isPending = isActionPending;
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  useWaitForTransactionReceipt({ hash: txHash });

  const [copiedAddress, setCopiedAddress] = useState(false);
  const handleCopyContractAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
      toast.success(
        language === "vi" ? "Đã sao chép địa chỉ hợp đồng!" : "Copied contract address!",
        { description: contractAddress }
      );
    } catch {
      toast.error(
        language === "vi" ? "Không thể sao chép địa chỉ hợp đồng" : "Could not copy contract address"
      );
    }
  };

  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const handleCopyInviteLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const shareUrl = buildShareGroupUrl(contractAddress);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2000);
      toast.success(
        language === "vi" ? "Đã sao chép link mời nhóm!" : "Club invite link copied!",
        { description: shareUrl }
      );
    } catch {
      toast.error(
        language === "vi" ? "Không thể sao chép liên kết" : "Could not copy invite link"
      );
    }
  };

  // Confirmation checkbox for unverified clubs (T6.7)
  const [unverifiedConfirmed, setUnverifiedConfirmed] = useState(false);

  // Owner input states
  const [collateralInput, setCollateralInput] = useState("0.05");
  const [withdrawColInput, setWithdrawColInput] = useState("");
  const [borrowInput, setBorrowInput] = useState("");
  const [repayInput, setRepayInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [removeMemberInput, setRemoveMemberInput] = useState("");
  const [mockBtcPriceInput, setMockBtcPriceInput] = useState("60000");

  const isVi = language === "vi";
  const isOwner =
    Boolean(userAddress) &&
    club.owner !== "0x0000000000000000000000000000000000000000" &&
    club.owner.toLowerCase() === userAddress?.toLowerCase();

  // U3.2: Only show mock price simulation bar when feed is mock AND connected wallet is oracleAdmin
  const canManageMockOracle =
    club.isMockOracle &&
    Boolean(userAddress) &&
    Boolean(club.oracleAdmin) &&
    userAddress?.toLowerCase() === club.oracleAdmin?.toLowerCase();

  const stateLabels: Record<number, { vi: string; en: string }> = {
    [BONDED_STATE.OPEN]: { vi: "ĐANG MỞ ĐĂNG KÝ (OPEN)", en: "OPEN FOR REGISTRATION" },
    [BONDED_STATE.ACTIVE]: { vi: "ĐANG CHẠY VÒNG (ACTIVE)", en: "ACTIVE ROUNDS" },
    [BONDED_STATE.COMPLETED]: { vi: "ĐÃ HOÀN TẤT (COMPLETED)", en: "COMPLETED" },
    [BONDED_STATE.DEFAULTED]: { vi: "ĐÃ VỠ NỢ / THANH LÝ (DEFAULTED)", en: "DEFAULTED / LIQUIDATED" },
    [BONDED_STATE.CANCELLED]: { vi: "ĐÃ HỦY (CANCELLED)", en: "CANCELLED" },
  };

  const runAction = async (label: string, fn: () => Promise<`0x${string}`>) => {
    if (isActionPending) return;
    setIsActionPending(true);
    let submittingToastId: string | number | undefined;
    try {
      const hash = await fn();
      setTxHash(hash);
      submittingToastId = toast.loading(
        isVi
          ? `Đang chờ xác nhận giao dịch: ${label}...`
          : `Waiting for on-chain confirmation: ${label}...`
      );

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (submittingToastId !== undefined) {
          toast.dismiss(submittingToastId);
          submittingToastId = undefined;
        }
        if (receipt.status === "success") {
          toast.success(
            <div className="space-y-1">
              <div>{isVi ? `Thành công: ${label}` : `Confirmed: ${label}`}</div>
              <a
                href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 underline flex items-center gap-1"
              >
                {isVi ? "Xem trên Arc Explorer" : "View on Arc Explorer"}
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </div>
          );
        } else {
          toast.error(
            isVi
              ? `Giao dịch ${label} bị revert trên chain.`
              : `Transaction reverted on-chain: ${label}`
          );
        }
      } else {
        if (submittingToastId !== undefined) {
          toast.dismiss(submittingToastId);
          submittingToastId = undefined;
        }
        toast.success(isVi ? `Đã gửi giao dịch: ${label}` : `Submitted: ${label}`);
      }

      await club.refetch();
    } catch (err) {
      toast.error(parseBondedTontineError(err, language));
    } finally {
      if (submittingToastId !== undefined) {
        toast.dismiss(submittingToastId);
      }
      setIsActionPending(false);
    }
  };

  // Wait until a transaction is mined on Arc before sending the dependent transaction (R2).
  const waitForSuccessfulReceipt = async (hash: `0x${string}`) => {
    if (!publicClient) throw new Error("Arc Testnet RPC client is unavailable");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Approval transaction reverted");
    return receipt;
  };

  // Exact-amount approval helper (T6.6: never approve infinite amounts).
  // Sends approve, then waits for its receipt so the main call never estimates gas without allowance.
  const ensureExactUsdcApproval = async (exactAmount: bigint) => {
    if (club.usdcAllowance < exactAmount) {
      const approveHash = await writeContractAsync({
        address: BONDED_USDC_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contractAddress, exactAmount],
      });
      await waitForSuccessfulReceipt(approveHash);
    }
  };

  const ensureExactCirBtcApproval = async (exactAmount: bigint) => {
    if (club.cirBtcAllowance < exactAmount) {
      const approveHash = await writeContractAsync({
        address: BONDED_CIRBTC_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contractAddress, exactAmount],
      });
      await waitForSuccessfulReceipt(approveHash);
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

  // Owner actions (T6.3 & L3)
  const handleDepositCollateral = () => {
    let sats = 0n;
    try {
      if (!collateralInput.trim()) throw new Error();
      sats = parseUnitsExact(collateralInput, 8);
      if (sats <= 0n) throw new Error();
    } catch {
      toast.error(
        isVi
          ? "Vui lòng nhập số lượng cirBTC cọc hợp lệ (> 0)"
          : "Please enter a valid cirBTC collateral amount (> 0)"
      );
      return;
    }
    return runAction(isVi ? "Nạp cọc CirBTC" : "Deposit CirBTC Collateral", async () => {
      await ensureExactCirBtcApproval(sats);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "depositCollateral",
        args: [sats],
      });
    });
  };

  const handleWithdrawCollateral = () => {
    let sats = 0n;
    try {
      if (!withdrawColInput.trim()) throw new Error();
      sats = parseUnitsExact(withdrawColInput, 8);
      if (sats <= 0n) throw new Error();
    } catch {
      toast.error(
        isVi
          ? "Vui lòng nhập số lượng cirBTC rút hợp lệ (> 0)"
          : "Please enter a valid cirBTC withdraw amount (> 0)"
      );
      return;
    }
    return runAction(isVi ? "Rút cọc CirBTC" : "Withdraw CirBTC Collateral", () => {
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "withdrawCollateral",
        args: [sats],
      });
    });
  };

  const handleStartRounds = () =>
    runAction(isVi ? "Bắt đầu các vòng" : "Start Rounds", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "startRounds",
        args: [],
      })
    );

  const handleBorrow = () => {
    let amt = 0n;
    try {
      if (!borrowInput.trim()) throw new Error();
      amt = parseUsdc(borrowInput);
      if (amt <= 0n) throw new Error();
    } catch {
      toast.error(
        isVi
          ? "Vui lòng nhập số tiền vay hợp lệ (> 0)"
          : "Please enter a valid borrow amount (> 0)"
      );
      return;
    }
    return runAction(isVi ? "Vay USDC trong hạn mức" : "Borrow USDC", () => {
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "borrow",
        args: [amt],
      });
    });
  };

  const handleRepay = () => {
    let amt = 0n;
    try {
      if (!repayInput.trim()) throw new Error();
      amt = parseUsdc(repayInput);
      if (amt <= 0n) throw new Error();
    } catch {
      toast.error(
        isVi
          ? "Vui lòng nhập số tiền trả gốc hợp lệ (> 0)"
          : "Please enter a valid repay amount (> 0)"
      );
      return;
    }
    return runAction(isVi ? "Trả nợ gốc USDC" : "Repay Principal USDC", async () => {
      await ensureExactUsdcApproval(amt);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "repay",
        args: [amt],
      });
    });
  };

  const handlePayInterest = () => {
    let amt = 0n;
    try {
      const trimmed = interestInput.trim();
      amt = trimmed ? parseUsdc(trimmed) : club.interestOwed;
      if (amt <= 0n) throw new Error();
    } catch {
      toast.error(
        isVi
          ? "Vui lòng nhập số tiền trả lãi hợp lệ (> 0)"
          : "Please enter a valid interest amount (> 0)"
      );
      return;
    }
    return runAction(isVi ? "Trả lãi USDC" : "Pay Interest USDC", async () => {
      await ensureExactUsdcApproval(amt);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "payInterest",
        args: [amt],
      });
    });
  };

  const handleRemoveMember = () => {
    const trimmed = removeMemberInput.trim();
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
      toast.error(
        isVi
          ? "Vui lòng nhập hoặc chọn địa chỉ thành viên hợp lệ (0x...)"
          : "Please enter or select a valid member address (0x...)"
      );
      return;
    }
    return runAction(isVi ? "Xóa thành viên" : "Remove Member", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "removeMember",
        args: [trimmed as `0x${string}`],
      })
    );
  };

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

  const aprPct = calculateAnnualizedAprPct(
    Number(club.rateBpsPerRound),
    Number(club.roundDuration)
  );
  const isShortRound = Number(club.roundDuration) > 0 && Number(club.roundDuration) < 86_400;
  const showAnnualizedApr = !isShortRound && aprPct > 0 && aprPct <= 1000;

  const activeFeedAddress =
    club.priceFeed && club.priceFeed !== "0x0000000000000000000000000000000000000000"
      ? club.priceFeed
      : ARC_TESTNET_MOCK_FEED;
  const feedExplorerUrl = buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, activeFeedAddress);

  const canFinalize =
    club.state === BONDED_STATE.ACTIVE &&
    club.cycleEnded &&
    club.totalDebt === 0n &&
    club.interestOwed === 0n;

  const canLiquidate =
    club.state === BONDED_STATE.ACTIVE &&
    !club.oracleError &&
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
  const isOracleRelevant =
    club.state === BONDED_STATE.OPEN || club.state === BONDED_STATE.ACTIVE;
  const staleBlocksPriceAction = isOracleRelevant && club.oracleError;

  // U3.3: Short reasons for disabled Keeper actions
  const finalizeDisabledReason = canFinalize
    ? null
    : club.state !== BONDED_STATE.ACTIVE
      ? isVi
        ? "Nhóm chưa ở trạng thái đang chạy"
        : "Club not in active state"
      : !club.cycleEnded
        ? isVi
          ? "Chưa hết chu kỳ các vòng"
          : "Cycle not ended yet"
        : club.totalDebt > 0n
          ? isVi
            ? "Còn dư nợ gốc chưa trả"
            : "Principal debt unpaid"
          : isVi
            ? "Còn nợ lãi chưa trả"
            : "Interest unpaid";

  const declareDefaultDisabledReason = canDeclareDefault
    ? null
    : club.state !== BONDED_STATE.ACTIVE
      ? isVi
        ? "Nhóm chưa ở trạng thái đang chạy"
        : "Club not in active state"
      : isVi
        ? "Chưa quá hạn lãi / tất toán"
        : "Not overdue on interest or settlement";

  const liquidateDisabledReason = canLiquidate
    ? null
    : club.state !== BONDED_STATE.ACTIVE
      ? isVi
        ? "Nhóm chưa ở trạng thái đang chạy"
        : "Club not in active state"
      : club.oracleError
        ? isVi
          ? "Giá oracle đã quá hạn, cần làm mới giá"
          : "Oracle price is stale; refresh price first"
        : club.totalDebt + club.interestOwed === 0n
          ? isVi
            ? "Không có dư nợ"
            : "No active debt"
          : isVi
            ? "Giá còn an toàn"
            : "Collateral ratio is still safe";

  const stateConfig: Record<
    number,
    { bg: string; text: string; dot: string; labelVi: string; labelEn: string }
  > = {
    [BONDED_STATE.OPEN]: {
      bg: "bg-emerald-950/40 border-emerald-500/30",
      text: "text-emerald-200",
      dot: "bg-emerald-400",
      labelVi: "Mở nhận thành viên",
      labelEn: "Open for Members",
    },
    [BONDED_STATE.ACTIVE]: {
      bg: "bg-amber-950/40 border-amber-500/30",
      text: "text-amber-200",
      dot: "bg-amber-400",
      labelVi: "Đang diễn ra",
      labelEn: "Active",
    },
    [BONDED_STATE.COMPLETED]: {
      bg: "bg-slate-900/60 border-slate-700/40",
      text: "text-slate-300",
      dot: "bg-slate-400",
      labelVi: "Đã hoàn thành",
      labelEn: "Completed",
    },
    [BONDED_STATE.DEFAULTED]: {
      bg: "bg-rose-950/40 border-rose-500/30",
      text: "text-rose-200",
      dot: "bg-rose-400",
      labelVi: "Đã vỡ nợ / Thanh lý",
      labelEn: "Defaulted",
    },
    [BONDED_STATE.CANCELLED]: {
      bg: "bg-rose-950/40 border-rose-500/30",
      text: "text-rose-200",
      dot: "bg-rose-400",
      labelVi: "Đã hủy",
      labelEn: "Cancelled",
    },
  };
  const stateInfo = stateConfig[club.state] ?? stateConfig[BONDED_STATE.OPEN];
  const fillPercent =
    club.maxMembers > 0n
      ? Math.min(100, Math.round((Number(club.memberCount) / Number(club.maxMembers)) * 100))
      : 0;

  const healthRatioDisplay =
    club.healthBps === null
      ? "N/A"
      : club.totalDebt + club.interestOwed === 0n
        ? isVi
          ? "∞ (Không nợ)"
          : "∞ (No debt)"
        : Number(club.healthBps) > 100_000
          ? ">1,000%"
          : `${(Number(club.healthBps) / 100).toFixed(1)}%`;

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Action & Verification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] p-4 sm:p-5 rounded-3xl border border-amber-500/30 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
            BondedTontine V2
          </span>
          {club.isVerifiedClub ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isVi ? "Đã xác minh bởi Factory" : "Verified by Factory"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/40">
              <ShieldAlert className="h-3.5 w-3.5" />
              {isVi ? "Chưa xác minh (ngoài Factory)" : "Unverified Club"}
            </span>
          )}
          <div className="inline-flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs">
            <button
              type="button"
              onClick={handleCopyContractAddress}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-mono transition-colors cursor-pointer"
              title={isVi ? `Sao chép: ${contractAddress}` : `Copy: ${contractAddress}`}
            >
              <span>{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
              {copiedAddress ? (
                <Check size={12} className="text-emerald-400 shrink-0" />
              ) : (
                <Copy size={12} className="text-amber-400/80 shrink-0" />
              )}
            </button>
            <a
              href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-amber-300 p-0.5 rounded transition-colors inline-flex items-center"
              title={isVi ? "Xem trên Arc Explorer" : "View on Arc Explorer"}
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 px-3.5 py-2 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isVi ? "Sao chép link mời thành viên (?group=...)" : "Copy club invite link (?group=...)"}
          >
            {copiedInviteLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Share2 className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>{copiedInviteLink ? (isVi ? "Đã chép link mời!" : "Link Copied!") : (isVi ? "Sao chép link mời" : "Copy Club Link")}</span>
          </button>
          {onOpenDirectoryModal && (
            <button
              type="button"
              onClick={onOpenDirectoryModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              {isVi ? "Danh sách nhóm" : "Club Directory"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void club.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-amber-400/50 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isVi ? "Làm mới" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => onOpenCreateModal?.()}
            className="rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 text-slate-950 font-bold px-4 py-2 text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            {isVi ? "+ Tạo nhóm Bonded V2" : "+ Create Bonded V2 Club"}
          </button>
        </div>
      </div>

      {/* Passkey Wallet Warning (M3) */}
      {isPasskeyUser && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200 shadow-md">
          <strong>{isVi ? "Thông báo ví Passkey:" : "Passkey Wallet Notice:"}</strong>{" "}
          {isVi
            ? "Bản BondedTontine V2 hiện tại sử dụng ví trình duyệt Web3 (như MetaMask / Rabby) để ký trực tiếp hợp đồng. Tính năng Circle Passkey Smart Account đang được cấu hình cho V2."
            : "BondedTontine V2 currently requires a standard Web3 browser wallet (MetaMask / Rabby). Circle Passkey smart account execution is disabled for V2 transactions."}
        </div>
      )}

      {/* Zero Collateral Alert (Active but Collateral is 0) */}
      {club.state === BONDED_STATE.ACTIVE && club.collateral === 0n && (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-950/40 p-4 text-xs text-yellow-200 flex items-start gap-2.5 shadow-md">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-300">
              {isVi ? "Cảnh báo cọc bảo đảm bằng 0" : "Zero Collateral Warning"}
            </div>
            <p className="mt-0.5 text-yellow-200/90 leading-relaxed">
              {isVi
                ? "Chủ hụi hiện không có cọc CirBTC nào trong nhóm (hạn mức vay = 0). Thành viên cần lưu ý trước khi đóng thêm tiền."
                : "The club owner currently has zero CirBTC collateral locked (borrow limit = 0). Members should take note before contributing."}
            </p>
          </div>
        </div>
      )}

      {/* Unverified Club Warning & Confirmation Gate (T6.7) */}
      {!club.isVerifiedClub && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200 shadow-md">
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


      {/* Main 2-Column Grid (Grid 12 cols: 7/8 Left, 5/4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Overview, Deadlines, Roster, Oracle (col-span-7 / 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 1. Hero Overview Card (phong cách ClubCard.tsx) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-xl shadow-amber-500/5 border border-amber-500/30 p-6 sm:p-7 transition-all">
            {/* Ambient glows */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Row: Badges, Title, State Pill */}
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {/* Quick remove if club is defaulted/completed or empty open club */}
              {(club.memberCount === 0n || club.state === BONDED_STATE.DEFAULTED || club.state === BONDED_STATE.COMPLETED) && (
                <button
                  type="button"
                  onClick={() => {
                    removeKnownGroup(contractAddress);
                    toast.success(isVi ? "Đã xóa nhóm khỏi danh bạ!" : "Removed club from directory!");
                    const known = getKnownGroups().filter((g) => g.address.toLowerCase() !== contractAddress.toLowerCase());
                    if (known.length > 0) {
                      onSelectGroup?.(known[0].address as `0x${string}`);
                    } else {
                      if (typeof window !== "undefined") {
                        try {
                          const url = new URL(window.location.href);
                          url.searchParams.delete("group");
                          window.history.replaceState({}, "", url.toString());
                        } catch {}
                      }
                      onSelectGroup?.(contractAddress);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-xs font-semibold text-red-300 transition-colors cursor-pointer"
                  title={isVi ? "Xóa nhóm khỏi danh bạ" : "Remove club from directory"}
                >
                  <Trash2 size={12} />
                  <span>{isVi ? "Xóa nhóm" : "Remove club"}</span>
                </button>
              )}

                  <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-amber-300 bg-amber-950/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-amber-500/30">
                    <ShieldCheck size={13} className="text-amber-400" />
                    {isVi ? "Hụi bảo chứng V2" : "BondedTontine V2"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-200 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                    <ShieldCheck size={12} className="text-amber-400" />
                    <span>
                      {isVi ? "Cọc" : "Collateral"}: {formatUnitsExact(club.collateral, 8)} CirBTC
                    </span>
                  </span>
                  <div className="inline-flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-lg border border-amber-500/30 text-xs">
                    <button
                      type="button"
                      onClick={handleCopyContractAddress}
                      className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-mono transition-colors cursor-pointer"
                    >
                      <span className="font-semibold">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
                      {copiedAddress ? (
                        <Check size={12} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Copy size={12} className="text-amber-400/80 shrink-0" />
                      )}
                    </button>
                    <a
                      href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, contractAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-amber-300 p-0.5 rounded transition-colors inline-flex items-center"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="inline-flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
                    title={isVi ? "Sao chép link mời thành viên (?group=...)" : "Copy invite link (?group=...)"}
                  >
                    {copiedInviteLink ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} className="text-amber-400" />}
                    <span>{copiedInviteLink ? (isVi ? "Đã chép link mời!" : "Link Copied!") : (isVi ? "Sao chép link mời" : "Copy Invite Link")}</span>
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                  {club.groupName || "BondedTontine Club"}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isVi ? "Chủ nhóm:" : "Owner:"}{" "}
                  <span className="font-mono text-slate-200">{club.owner.slice(0, 6)}...{club.owner.slice(-4)}</span>
                  {" • "}
                  {club.cycleEnded ? (
                    <span className="font-semibold text-amber-400">
                      {isVi ? "Chu kỳ đã kết thúc" : "Cycle ended"}
                    </span>
                  ) : (
                    <span>
                      {isVi ? "Vòng hiện tại:" : "Current Round:"}{" "}
                      <strong className="text-white">{club.currentRoundIndex.toString()}/{club.totalRounds.toString()}</strong>
                    </span>
                  )}
                </p>
              </div>

              {/* State Pill */}
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold backdrop-blur-md ${stateInfo.bg} ${stateInfo.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${stateInfo.dot} animate-pulse`} />
                <span>{isVi ? stateInfo.labelVi : stateInfo.labelEn}</span>
              </div>
            </div>

            {/* Hero Pot / Deposit Display */}
            <div className="relative z-10 bg-black/40 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-amber-500/20 mb-6 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs sm:text-sm font-semibold mb-1">
                    <Coins size={16} className="text-amber-400" />
                    <span>{isVi ? "Tổng tiền góp trong quỹ (Pool)" : "Total Deposits in Pool"}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight text-white">
                      {displayUsdc(club.totalDeposits)}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-cyan-200">USDC</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-blue-200/90 mt-1.5">
                    {isVi ? "Mức đóng cố định:" : "Fixed contribution:"}{" "}
                    <strong className="text-white font-bold">{displayUsdc(club.contributionAmount)} USDC</strong>{" "}
                    {isVi ? "/ thành viên / vòng" : "/ member / round"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {isVi ? "Cọc CirBTC của Chủ hụi" : "Owner CirBTC Collateral"}
                  </span>
                  <span className="text-base font-bold text-emerald-300 tabular-nums">
                    {formatUnitsExact(club.collateral, 8)} cirBTC
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    ≈ {club.collateralValueUsdc !== null ? `${displayUsdc(club.collateralValueUsdc)} USDC` : "N/A"}
                  </span>
                </div>
              </div>

              {/* Member Capacity Progress Bar */}
              <div className="mt-4 pt-4 border-t border-amber-500/10">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-blue-200 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-amber-400" />
                    <span>
                      {isVi ? "Quy mô thành viên" : "Member Capacity"} ({club.memberCount.toString()}/{club.maxMembers.toString()})
                      {club.state === BONDED_STATE.OPEN && (
                        <span className="ml-1.5 font-normal text-amber-200/90 hidden sm:inline">
                          • {club.memberCount < 2n
                            ? (isVi ? "Cần tối thiểu 2 để bắt đầu" : "Min 2 members required")
                            : (isVi ? "Đủ điều kiện bắt đầu" : "Ready to start")}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="font-bold text-amber-300 tabular-nums">{fillPercent}%</span>
                </div>
                <div className="w-full h-3 bg-black/50 border border-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500 shadow-sm shadow-amber-400/30"
                    style={{ width: `${Math.max(fillPercent, 4)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4 Key Metrics Grid */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
                <div className="text-xs text-slate-300 font-semibold mb-1">
                  {isVi ? "Cọc CirBTC" : "Owner Collateral"}
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-300">
                  {formatUnitsExact(club.collateral, 8)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  cirBTC
                </p>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
                <div className="text-xs text-slate-300 font-semibold mb-1">
                  {isVi ? "Dư nợ / Hạn mức vay" : "Debt / Borrow Limit"}
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums text-amber-300">
                  {displayUsdc(club.totalDebt)} / {club.borrowLimit !== null ? `${displayUsdc(club.borrowLimit)} USDC` : "N/A"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isVi ? "Lãi nợ:" : "Interest:"} {displayUsdc(club.interestOwed)} USDC
                </p>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
                <div className="text-xs text-slate-300 font-semibold mb-1">
                  {isVi ? "Hệ số sức khỏe" : "Health Ratio"}
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums text-white">
                  {healthRatioDisplay}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isVi ? "Thanh lý:" : "Liquidation:"} {(Number(club.liquidationBps) / 100).toFixed(0)}%
                </p>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 text-center">
                <div className="text-xs text-slate-300 font-semibold mb-1">
                  {isVi ? "Lãi suất / Vòng" : "Rate per Round"}
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums text-white">
                  {(Number(club.rateBpsPerRound) / 100).toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {showAnnualizedApr
                    ? `(~ ${aprPct.toFixed(1)}% APR)`
                    : isShortRound
                      ? (isVi ? "(chỉ minh họa, không phải lãi suất thực)" : "(illustrative only, not real APR)")
                      : ""}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Deadlines Timeline Block (M2) */}
          {club.state === BONDED_STATE.ACTIVE && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-xl border border-amber-500/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                  <Clock className="h-4 w-4 text-amber-400" />
                  {isVi ? "Mốc thời gian & Hạn chót (Deadlines)" : "Timeline & Deadlines"}
                </h3>
                <span className="text-xs text-slate-400">
                  {isVi ? "Chu kỳ:" : "Cycle duration:"} {Number(club.roundDuration)}s × {Number(club.totalRounds)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. Current Round Cutoff */}
                {(() => {
                  const currentRoundEnd =
                    club.startTime > 0n && club.currentRoundIndex >= 1n && club.currentRoundIndex <= club.maxMembers
                      ? club.startTime + club.currentRoundIndex * club.roundDuration
                      : 0n;
                  const isPast = currentRoundEnd > 0n && nowSec >= currentRoundEnd;
                  const remainingSec = currentRoundEnd > nowSec ? Number(currentRoundEnd - nowSec) : 0;
                  const isUrgent = remainingSec > 0 && remainingSec < Number(club.roundDuration) * 0.2;

                  return (
                    <div
                      className={`rounded-2xl border p-4 ${
                        isPast
                          ? "border-slate-800 bg-black/40 text-slate-400"
                          : isUrgent
                            ? "border-amber-500/50 bg-amber-950/30 text-amber-200"
                            : "border-slate-800 bg-black/40 text-slate-300"
                      }`}
                    >
                      <div className="font-semibold text-white">
                        {isVi ? `Hạn đóng tiền vòng ${club.currentRoundIndex}` : `Round ${club.currentRoundIndex} Cutoff`}
                      </div>
                      <div className="mt-1 font-mono text-base font-bold">
                        {currentRoundEnd === 0n
                          ? "—"
                          : isPast
                            ? (isVi ? "Vòng đã kết thúc" : "Round ended")
                            : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {currentRoundEnd > 0n ? new Date(Number(currentRoundEnd) * 1000).toLocaleTimeString() : ""}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Interest Deadline (+ Grace) */}
                {(() => {
                  const deadline = club.nextInterestDeadline;
                  const hasDebtOrInterest = club.totalDebt > 0n || club.interestOwed > 0n;
                  const isOverdue = deadline > 0n && nowSec >= deadline && club.interestOwed > 0n;
                  const remainingSec = deadline > nowSec ? Number(deadline - nowSec) : 0;
                  const isUrgent = remainingSec > 0 && remainingSec < Number(club.interestGrace || 120n);

                  return (
                    <div
                      className={`rounded-2xl border p-4 ${
                        isOverdue
                          ? "border-red-500 bg-red-950/50 text-red-200 animate-pulse"
                          : isUrgent
                            ? "border-amber-500 bg-amber-950/40 text-amber-200"
                            : "border-slate-800 bg-black/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className={isOverdue ? "text-red-300 font-bold" : "text-white"}>
                          {isVi ? "Hạn trả lãi (+ ân hạn)" : "Interest Deadline (+ Grace)"}
                        </span>
                        {isOverdue && (
                          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-extrabold text-black uppercase">
                            {isVi ? "Quá hạn!" : "Overdue!"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-base font-bold">
                        {deadline === 0n || !hasDebtOrInterest
                          ? (isVi ? "Không nợ lãi" : "No interest due")
                          : isOverdue
                            ? (isVi ? `ĐÃ QUÁ HẠN (${Number(nowSec - deadline)}s)` : `OVERDUE (${Number(nowSec - deadline)}s ago)`)
                            : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {deadline > 0n ? new Date(Number(deadline) * 1000).toLocaleTimeString() : ""} ({isVi ? "ân hạn" : "grace"}:{" "}
                        {Number(club.interestGrace)}s)
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Cycle Settlement Deadline */}
                {(() => {
                  const cycleEnd =
                    club.startTime > 0n ? club.startTime + club.totalRounds * club.roundDuration : 0n;
                  const settlementDeadline =
                    cycleEnd > 0n ? cycleEnd + club.settlementGrace : 0n;
                  const isOverdue =
                    settlementDeadline > 0n &&
                    nowSec >= settlementDeadline &&
                    (club.totalDebt > 0n || club.interestOwed > 0n);
                  const remainingSec = settlementDeadline > nowSec ? Number(settlementDeadline - nowSec) : 0;

                  return (
                    <div
                      className={`rounded-2xl border p-4 ${
                        isOverdue
                          ? "border-red-500 bg-red-950/50 text-red-200 animate-pulse"
                          : "border-slate-800 bg-black/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className={isOverdue ? "text-red-300 font-bold" : "text-white"}>
                          {isVi ? "Hạn tất toán chu kỳ (+ ân hạn)" : "Settlement Deadline"}
                        </span>
                        {isOverdue && (
                          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-extrabold text-black uppercase">
                            {isVi ? "Quá hạn!" : "Overdue!"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-base font-bold">
                        {settlementDeadline === 0n
                          ? "—"
                          : isOverdue
                            ? (isVi ? "ĐÃ QUÁ HẠN TẤT TOÁN" : "OVERDUE SETTLEMENT")
                            : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {settlementDeadline > 0n
                          ? new Date(Number(settlementDeadline) * 1000).toLocaleTimeString()
                          : ""}{" "}
                        ({isVi ? "ân hạn" : "grace"}: {Number(club.settlementGrace)}s)
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Overdue Danger Banner */}
              {(nowSec >= club.nextInterestDeadline && club.interestOwed > 0n && club.nextInterestDeadline > 0n) && (
                <div className="rounded-2xl border border-red-500 bg-red-950/70 p-4 text-xs text-red-200 flex items-center justify-between gap-2 shadow-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                    <span>
                      <strong>{isVi ? "CẢNH BÁO QUÁ HẠN:" : "CRITICAL OVERDUE ALERT:"}</strong>{" "}
                      {isVi
                        ? "Chủ hụi đã trễ hạn trả lãi! Bất kỳ ai cũng có thể bấm 'Tuyên bố vỡ nợ' bên dưới để tịch thu 100% cọc CirBTC chia cho thành viên."
                        : "Owner has missed interest deadline! Anyone can click 'Declare Default' below to seize 100% CirBTC collateral for members."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Club Members Roster (L5 & phong cách ClubMembersRoster) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-xl border border-amber-500/30 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/15 pb-3">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                <Users className="h-4 w-4 text-amber-400" />
                {isVi ? "Danh sách thành viên" : "Member Roster"} ({(club.memberAddresses.length || club.memberCount).toString()}/{club.maxMembers.toString()})
              </h3>
            </div>

            {club.memberAddresses.length === 0 ? (
              club.memberCount > 0n ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-amber-300">
                      {isVi ? "Không thể tải danh sách địa chỉ" : "Failed to load member addresses"}:
                    </span>{" "}
                    {isVi
                      ? "Do giới hạn truy vấn RPC Arc Testnet. Nhóm hiện có " + club.memberCount.toString() + " thành viên on-chain."
                      : "Due to Arc Testnet RPC block range limit. Club has " + club.memberCount.toString() + " on-chain members."}
                  </div>
                  <button
                    type="button"
                    onClick={() => void club.refetch()}
                    className="shrink-0 rounded-xl bg-amber-500/20 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer transition-all"
                  >
                    {isVi ? "Thử lại" : "Retry"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isVi ? "Chưa có thành viên nào tham gia" : "No members have joined yet"}
                </p>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {club.memberAddresses.map((m, idx) => {
                  const isCurrent = userAddress && m.toLowerCase() === userAddress.toLowerCase();
                  const isClubOwner = m.toLowerCase() === club.owner.toLowerCase();
                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between rounded-2xl bg-black/40 border border-slate-800 p-3 text-xs text-slate-300 hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, m)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono hover:text-amber-300 underline font-semibold text-white"
                            >
                              {m.slice(0, 6)}...{m.slice(-4)}
                            </a>
                            {isCurrent && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                                {isVi ? "Bạn" : "You"}
                              </span>
                            )}
                            {isClubOwner && (
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300 border border-slate-700">
                                Owner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {club.state === BONDED_STATE.OPEN && isOwner && (
                        <button
                          type="button"
                          onClick={() => setRemoveMemberInput(m)}
                          className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
                          title={isVi ? "Chọn để xóa thành viên" : "Select to remove"}
                        >
                          {isVi ? "Chọn xóa" : "Select"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Oracle Status & Risk Disclosure */}
          <div className="rounded-3xl bg-black/40 backdrop-blur-md border border-amber-500/20 p-5 text-xs space-y-3 text-slate-300 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    Oracle ({club.oracleDescription || "BTC/USD"}):
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {club.oraclePriceRaw > 0n ? "$" + formatUnitsExact(club.oraclePriceRaw, 8) : "N/A"}
                  </span>
                  {club.isMockOracle && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-300 border border-orange-500/30">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {MOCK_ORACLE_WARNING_COPY[language]}
                    </span>
                  )}
                  {isOracleRelevant && club.oracleError && (
                    <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-300 border border-red-500/30">
                      {isVi ? "Giá oracle đã quá hạn, cần làm mới giá" : "Oracle price is stale; refresh price first"}
                    </span>
                  )}
                </div>
                <div className="text-slate-400">
                  {isVi ? "Tuổi giá:" : "Price age:"} {club.priceAgeSeconds.toString()}s (max {club.maxPriceAge.toString()}s)
                </div>
              </div>
              <a
                href={feedExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-amber-400 hover:underline font-semibold"
              >
                {isVi ? "Xem Feed trên Explorer" : "View Feed on Explorer"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="pt-1 text-amber-200/90 leading-relaxed">
              <div className="font-semibold text-amber-300 mb-1">
                {isVi ? "Cơ chế & Rủi ro BondedTontine:" : "BondedTontine Mechanism & Risks:"}
              </div>
              <p>{BONDED_DISCLOSURE_COPY[language]}</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ActionPanel (col-span-5 / 4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* 1. Member Actions Card (phong cách ActionPanel.tsx) */}
          <div className="rounded-3xl bg-[#0c0d14] p-6 sm:p-7 border border-amber-500/30 shadow-xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-amber-500/15 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Coins className="h-5 w-5 text-amber-400" />
                {isVi ? "Thao tác Thành viên" : "Member Actions"}
              </h3>
              <span className="text-xs text-slate-400">
                {isVi ? "Ví:" : "Wallet:"} <strong className="text-white font-semibold">{formatUsdc(usdcBalance.balance ?? 0n)} USDC</strong>
              </span>
            </div>

            {/* Position Summary */}
            <div className="grid grid-cols-2 gap-3 bg-black/40 rounded-2xl p-4 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block">{isVi ? "Đã góp:" : "Deposited:"}</span>
                <span className="text-base font-bold text-white tabular-nums">
                  {displayUsdc(club.userDeposit)} USDC
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isVi ? "Lãi chờ nhận:" : "Pending Interest:"}</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  {displayUsdc(club.pendingInterest)} USDC
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {club.state === BONDED_STATE.OPEN && !isOwner && !club.isMember && (
                <button
                  type="button"
                  disabled={isPending || !userAddress}
                  onClick={handleJoin}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 text-slate-950 font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {isVi ? "Tham gia nhóm (joinGroup)" : "Join Club (joinGroup)"}
                </button>
              )}

              {club.state === BONDED_STATE.OPEN && (
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="w-full py-2.5 rounded-2xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {copiedInviteLink ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} className="text-amber-400" />}
                  <span>{copiedInviteLink ? (isVi ? "Đã sao chép link mời!" : "Invite Link Copied!") : (isVi ? "Sao chép link mời bạn bè" : "Copy Club Invite Link")}</span>
                </button>
              )}

              {club.state === BONDED_STATE.ACTIVE && club.isMember && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    disabled={
                      isPending ||
                      isPasskeyUser ||
                      club.hasContributedCurrentRound ||
                      contributeBlockedByVerification ||
                      club.cycleEnded ||
                      canDeclareDefault ||
                      canLiquidate
                    }
                    onClick={handleContribute}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {club.hasContributedCurrentRound
                      ? (isVi ? "Đã góp vòng này" : "Contributed this round")
                      : (isVi
                          ? `Approve & Góp ${displayUsdc(club.contributionAmount)} USDC`
                          : `Approve & Contribute ${displayUsdc(club.contributionAmount)} USDC`)}
                  </button>
                  {(club.cycleEnded || canDeclareDefault || canLiquidate) && !club.hasContributedCurrentRound && (
                    <p className="text-xs text-red-300 text-center">
                      {club.cycleEnded
                        ? (isVi ? "Chu kỳ đã kết thúc, không thể góp thêm" : "Cycle has ended, no further contributions")
                        : (isVi ? "Nhóm đang chờ xử lý vỡ nợ hoặc thanh lý (DefaultPending)" : "Default or liquidation pending (DefaultPending)")}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={isPending || club.pendingInterest === 0n}
                onClick={handleClaimInterest}
                className="w-full py-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-300 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Coins className="h-4 w-4" />
                {isVi
                  ? `Nhận lãi (${displayUsdc(club.pendingInterest)} USDC)`
                  : `Claim Interest (${displayUsdc(club.pendingInterest)} USDC)`}
              </button>

              {(club.state === BONDED_STATE.COMPLETED || club.state === BONDED_STATE.DEFAULTED) &&
                club.userDeposit > 0n && (
                <button
                  type="button"
                  disabled={isPending || isPasskeyUser || club.principalWithdrawn}
                  onClick={handleWithdrawPrincipal}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coins className="h-4 w-4" />
                  {isVi
                    ? `Rút gốc (${displayUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`
                    : `Withdraw Principal (${displayUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`}
                </button>
              )}
            </div>
          </div>

          {/* 2. Club Owner Controls (T6.3 & U3.1: Only rendered when connected wallet is club.owner) */}
          {isOwner && (
            <div className="rounded-3xl bg-[#0c0d14] p-6 border border-amber-500/30 shadow-xl space-y-4 text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-3">
                <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                  <Lock className="h-4 w-4 text-amber-400" />
                  {isVi ? "Bảng điều khiển Chủ hụi (Owner)" : "Club Owner Controls"}
                </h3>
                <span className="text-xs text-slate-400">
                  Owner: {club.owner.slice(0, 6)}...{club.owner.slice(-4)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-black/40 rounded-xl px-3.5 py-2.5 border border-slate-800 text-xs">
                <span className="text-slate-400">{isVi ? "Lãi đang nợ:" : "Interest Owed:"}</span>
                <strong className="text-amber-300 font-bold text-sm">{displayUsdc(club.interestOwed)} USDC</strong>
              </div>

              {staleBlocksPriceAction && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300">
                  {isVi
                    ? "Giá oracle đã quá hạn, cần làm mới giá trước khi vay hoặc rút cọc khi đang có nợ."
                    : "Oracle price is stale; refresh price before borrowing or withdrawing collateral while indebted."}
                </div>
              )}

              {/* Owner Input Controls */}
              <div className="space-y-3">
                {/* Deposit Collateral */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">
                    {isVi ? "Nạp cọc CirBTC" : "Deposit CirBTC Collateral"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={collateralInput}
                      onChange={(e) => setCollateralInput(e.target.value)}
                      placeholder="cirBTC (e.g. 0.05)"
                      className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleDepositCollateral}
                      className="shrink-0 rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {isVi ? "Nạp cọc" : "Deposit"}
                    </button>
                  </div>
                </div>

                {/* Borrow USDC (with Max) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">
                    {isVi ? "Vay USDC" : "Borrow USDC"}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={borrowInput}
                        onChange={(e) => setBorrowInput(e.target.value)}
                        placeholder="USDC borrow"
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 pr-14 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const liquidityLimit =
                            club.totalDeposits > club.totalDebt
                              ? club.totalDeposits - club.totalDebt
                              : 0n;
                          let collateralLimit = 0n;
                          if (club.borrowLimit !== null && club.borrowLimit > club.interestOwed) {
                            const maxDebt =
                              ((club.borrowLimit - club.interestOwed) * 10000n) /
                              (10000n + club.rateBpsPerRound);
                            if (maxDebt > club.totalDebt) {
                              collateralLimit = maxDebt - club.totalDebt;
                            }
                          }
                          const maxBorrow =
                            liquidityLimit < collateralLimit ? liquidityLimit : collateralLimit;
                          setBorrowInput(formatUsdcExact(maxBorrow));
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        {isVi ? "Tối đa" : "Max"}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={
                        isPending ||
                        club.state !== BONDED_STATE.ACTIVE ||
                        staleBlocksPriceAction
                      }
                      onClick={handleBorrow}
                      className="shrink-0 rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {isVi ? "Vay USDC" : "Borrow"}
                    </button>
                  </div>
                  {staleBlocksPriceAction && (
                    <p className="text-xs text-red-300">
                      {isVi
                        ? "Giá oracle đã quá hạn, cần làm mới giá"
                        : "Oracle price is stale; refresh price first"}
                    </p>
                  )}
                </div>

                {/* Repay Principal (with Max) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">
                    {isVi ? "Trả nợ gốc USDC" : "Repay Principal USDC"}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={repayInput}
                        onChange={(e) => setRepayInput(e.target.value)}
                        placeholder="USDC repay"
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 pr-14 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRepayInput(formatUsdcExact(club.totalDebt));
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        {isVi ? "Tối đa" : "Max"}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isPending || club.totalDebt === 0n}
                      onClick={handleRepay}
                      className="shrink-0 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {isVi ? "Trả gốc" : "Repay"}
                    </button>
                  </div>
                </div>

                {/* Pay Interest (with Max) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">
                    {isVi ? "Trả lãi USDC" : "Pay Interest USDC"}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        placeholder={displayUsdc(club.interestOwed)}
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 pr-14 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setInterestInput(formatUsdcExact(club.interestOwed));
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        {isVi ? "Tối đa" : "Max"}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isPending || club.interestOwed === 0n}
                      onClick={handlePayInterest}
                      className="shrink-0 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {isVi ? "Trả lãi" : "Pay Interest"}
                    </button>
                  </div>
                </div>

                {/* Withdraw Collateral (with Max) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">
                    {isVi ? "Rút cọc CirBTC" : "Withdraw CirBTC Collateral"}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={withdrawColInput}
                        onChange={(e) => setWithdrawColInput(e.target.value)}
                        placeholder="cirBTC withdraw"
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 pr-14 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawColInput(formatUnitsExact(club.collateral, 8));
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        {isVi ? "Tối đa" : "Max"}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={
                        isPending ||
                        club.collateral === 0n ||
                        (staleBlocksPriceAction && club.totalDebt + club.interestOwed > 0n)
                      }
                      onClick={handleWithdrawCollateral}
                      className="shrink-0 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400 disabled:opacity-40 transition-all cursor-pointer"
                    >
                      {isVi ? "Rút cọc" : "Withdraw"}
                    </button>
                  </div>
                  {staleBlocksPriceAction && club.totalDebt + club.interestOwed > 0n && (
                    <p className="text-xs text-red-300">
                      {isVi
                        ? "Giá oracle đã quá hạn, cần làm mới giá"
                        : "Oracle price is stale; refresh price first"}
                    </p>
                  )}
                </div>

                {/* Remove Member (OPEN only) */}
                {club.state === BONDED_STATE.OPEN && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs text-slate-400 font-medium">
                      {isVi ? "Xóa thành viên (chỉ khi chưa chạy)" : "Remove Member"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={removeMemberInput}
                        onChange={(e) => setRemoveMemberInput(e.target.value)}
                        placeholder="0xMember..."
                        className="w-full rounded-xl border border-slate-700 bg-black/60 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={isPending || !removeMemberInput.trim()}
                        onClick={handleRemoveMember}
                        className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        {isVi ? "Xóa TV" : "Remove"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Open State Actions */}
              {club.state === BONDED_STATE.OPEN && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={isPending || club.memberCount < 2n || club.collateral === 0n}
                    onClick={handleStartRounds}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all cursor-pointer"
                  >
                    {isVi ? "Bắt đầu các vòng (startRounds)" : "Start Rounds (startRounds)"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCancelOpen}
                    className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-300 font-semibold text-xs transition-all cursor-pointer"
                  >
                    {isVi ? "Hủy nhóm & Hoàn cọc (cancelOpen)" : "Cancel Club & Refund Collateral"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Permissionless Keeper Actions (T6.5, U3.2 & U3.3) */}
          <div className="rounded-2xl bg-[#0c0d14] p-5 border border-slate-800 shadow-xl space-y-3.5 text-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Flame className="h-4 w-4 text-orange-400" />
              {isVi
                ? "Tác vụ Permissionless (Ai cũng gọi được — Keeper)"
                : "Permissionless Keeper Actions (Anyone Can Call)"}
            </h3>
            <div className="space-y-2.5">
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isPending || !canFinalize}
                  onClick={handleFinalize}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  {isVi ? "Tất toán chu kỳ (finalize)" : "Finalize Cycle (finalize)"}
                </button>
                {finalizeDisabledReason && (
                  <p className="text-xs text-slate-400">{finalizeDisabledReason}</p>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isPending || !canDeclareDefault}
                  onClick={handleDeclareDefault}
                  className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40 text-red-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  {isVi ? "Tuyên bố vỡ nợ quá hạn (declareDefault)" : "Declare Default (declareDefault)"}
                </button>
                {declareDefaultDisabledReason && (
                  <p className="text-xs text-slate-400">{declareDefaultDisabledReason}</p>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isPending || !canLiquidate}
                  onClick={handleLiquidate}
                  className="w-full py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-40 text-orange-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  {isVi ? "Thanh lý do thiếu cọc (liquidate)" : "Liquidate Undercollateralized (liquidate)"}
                </button>
                {liquidateDisabledReason && (
                  <p className="text-xs text-slate-400">{liquidateDisabledReason}</p>
                )}
              </div>
            </div>

            {/* U3.2: Testnet Mock Oracle Simulation Bar — ONLY visible to oracleAdmin on Testnet */}
            {canManageMockOracle && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3 text-xs">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <span className="text-slate-400">
                  {isVi ? "Mô phỏng giá Mock BTC/USD (Testnet Admin):" : "Simulate Mock BTC/USD (Testnet Admin):"}
                </span>
                <input
                  value={mockBtcPriceInput}
                  onChange={(e) => setMockBtcPriceInput(e.target.value)}
                  className="w-24 rounded-lg border border-slate-700 bg-black/60 px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void handleSetMockPrice(mockBtcPriceInput)}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                >
                  {isVi ? "Đặt giá" : "Set Price"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void handleSetMockPrice("11500")}
                  className="rounded-lg border border-red-500/40 bg-red-500/15 px-2.5 py-1 font-semibold text-red-300 hover:bg-red-500/25 cursor-pointer"
                >
                  {isVi ? "Mô phỏng Flash Crash ($11,500)" : "Simulate Flash Crash ($11,500)"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}