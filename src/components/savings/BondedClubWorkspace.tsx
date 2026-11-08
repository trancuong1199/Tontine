import { BondedTerminalView } from "./BondedTerminalView";
import { BondedMobileActionBar } from "./BondedMobileActionBar";
import { BondedLiquiditySummary, BondedRiskBanner } from "./BondedCollateralSummary";
import { memberErrorMessage, requiresRiskAcknowledgement, riskAcknowledgementContext, formatAdaptivePercent, formatFinancialAmount, formatRoundDuration } from "../../lib/bondedDisplay";
import React, { useLayoutEffect, useRef, useState } from "react";
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
  HIDDEN_DEMO_CLUBS,
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
  return formatRoundDuration(sec, !isVi);
}


const displayUsdc = formatFinancialAmount;

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
  const actionPendingRef = useRef(false);
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
  const memberActionsRef = useRef<HTMLDivElement>(null);
  const ownerControlsRef = useRef<HTMLDivElement>(null);

  const [acknowledgedContext, setAcknowledgedContext] = useState<string | null>(null);
  const riskContext = riskAcknowledgementContext(club, userAddress, contractAddress);
  const riskRequired = requiresRiskAcknowledgement(club);
  const riskAcknowledged = acknowledgedContext === riskContext;
  const financialsReady = club.financialsAvailable && !club.isLoading && !club.error;
  const riskBlocked = riskRequired && !riskAcknowledged;
  const memberActionRef = useRef<{ context: string; join: boolean; contribute: boolean } | null>(null);
  // Context comparison blocks the first changed render; clearing also prevents an
  // old acknowledgement resurrecting after A → B → A or a quote reverting.
  useLayoutEffect(() => { setAcknowledgedContext(null); }, [riskContext]);

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
    if (isActionPending || actionPendingRef.current) return;
    actionPendingRef.current = true;
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
      actionPendingRef.current = false;
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

  const assertMemberAction = (action: "join" | "contribute", expectedContext: string) => {
    const current = memberActionRef.current;
    if (!current || current.context !== expectedContext || !current[action]) {
      throw new Error(isVi ? "Thông tin nhóm hoặc xác nhận rủi ro đã thay đổi. Hãy kiểm tra lại trước khi ký." : "Club details or risk acknowledgement changed. Review again before signing.");
    }
  };

  const handleJoin = () =>
    runAction(isVi ? "Tham gia nhóm" : "Join Group", async () => {
      assertMemberAction("join", riskContext);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "joinGroup",
        args: [],
      });
    });

  const handleContribute = () =>
    runAction(isVi ? "Đóng tiền vòng hiện tại" : "Contribute Round", async () => {
      assertMemberAction("contribute", riskContext);
      await ensureExactUsdcApproval(club.contributionAmount);
      // Approval may outlive account/club/quote changes or checkbox withdrawal.
      assertMemberAction("contribute", riskContext);
      return writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "contribute",
        args: [],
      });
    });

  const handleClaimInterest = () => {
    if (!userAddress || isPasskeyUser || !club.positionAvailable || club.isLoading || club.error || club.pendingInterest <= 0n) return;
    return runAction(isVi ? "Nhận tiền lãi" : "Claim Interest", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "claimInterest",
        args: [],
      })
    );

  };

  const handleWithdrawPrincipal = () => {
    if (!userAddress || isPasskeyUser || !club.positionAvailable || club.isLoading || club.error || club.userDeposit <= 0n || club.principalWithdrawn || (club.state !== BONDED_STATE.COMPLETED && club.state !== BONDED_STATE.DEFAULTED)) return;
    return runAction(isVi ? "Rút tiền gốc / cọc" : "Withdraw Principal", () =>
      writeContractAsync({
        address: contractAddress,
        abi: BONDED_TONTINE_ABI,
        functionName: "withdrawPrincipal",
        args: [],
      })
    );

  };

  const handleTerminalCollateral = () => {
    if (!isOwner || isPasskeyUser || !club.financialsAvailable || club.isLoading || club.error || club.collateral <= 0n || (club.state !== BONDED_STATE.COMPLETED && club.state !== BONDED_STATE.DEFAULTED && club.state !== BONDED_STATE.CANCELLED)) return;
    return runAction(isVi ? "Rút cọc còn lại" : "Withdraw remaining collateral", () => writeContractAsync({ address: contractAddress, abi: BONDED_TONTINE_ABI, functionName: "withdrawCollateral", args: [club.collateral] }));
  };

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
  const hasCapacity = club.maxMembers > 0n && club.memberCount < club.maxMembers;
  const joinEligible = Boolean(userAddress) && !isPasskeyUser && financialsReady && club.positionAvailable && club.state === BONDED_STATE.OPEN && hasCapacity && !isOwner && !club.isMember;
  const contributeEligible = Boolean(userAddress) && financialsReady && club.positionAvailable && club.state === BONDED_STATE.ACTIVE && club.isMember && !isPasskeyUser && !club.hasContributedCurrentRound && !club.cycleEnded && !canDeclareDefault && !canLiquidate;
  const hasFundingAction = joinEligible || contributeEligible;
  const canJoinWithAcknowledgement = joinEligible && !riskBlocked;
  const canContributeWithAcknowledgement = contributeEligible && !riskBlocked && !contributeBlockedByVerification;
  useLayoutEffect(() => {
    memberActionRef.current = { context: riskContext, join: canJoinWithAcknowledgement, contribute: canContributeWithAcknowledgement };
    return () => { memberActionRef.current = null; };
  }, [riskContext, canJoinWithAcknowledgement, canContributeWithAcknowledgement]);
  const financialPlaceholder = club.isLoading ? (isVi ? "Đang tải…" : "Loading…") : (isVi ? "Chưa có dữ liệu" : "Unavailable");
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
          ? "Giá oracle không hợp lệ hoặc quá hạn, cần cập nhật"
          : "Oracle price is invalid, unavailable or stale; refresh first"
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
    !financialsReady || club.healthBps === null
      ? "N/A"
      : club.totalDebt + club.interestOwed === 0n
        ? isVi
          ? "∞ (Không nợ)"
          : "∞ (No debt)"
        : club.healthBps > 100_000n ? ">1000%" : `${formatAdaptivePercent(club.healthBps * 10_000n)}%`;

  const terminal = club.state === BONDED_STATE.COMPLETED || club.state === BONDED_STATE.DEFAULTED || club.state === BONDED_STATE.CANCELLED;
  const canRemoveFromDirectory =
    !club.isLoading &&
    club.financialsAvailable &&
    (club.memberCount === 0n || terminal);
  const handleRemoveCurrentClub = () => {
    if (club.state === BONDED_STATE.ACTIVE || (club.state === BONDED_STATE.OPEN && club.memberCount > 0n)) {
      toast.error(
        isVi
          ? "Không thể xóa nhóm đang hoạt động hoặc đã có thành viên!"
          : "Cannot remove an active club or a club with members!"
      );
      return;
    }
    removeKnownGroup(contractAddress, userAddress);
    toast.success(isVi ? "Đã xóa nhóm khỏi danh bạ!" : "Removed club from directory!");
    const hiddenSet = new Set(HIDDEN_DEMO_CLUBS.map((a) => a.toLowerCase()));
    const known = getKnownGroups(userAddress).filter((g) => {
      const addr = g.address.toLowerCase();
      if (addr === contractAddress.toLowerCase()) return false;
      if (hiddenSet.has(addr)) return false;
      if (g.isDefault && g.version !== "v2-bonded") return false;
      return true;
    });
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
  };
  const reviewMemberAction = () => {
    memberActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    memberActionsRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:checked)')?.focus({ preventScroll: true });
  };
  const ownerNextStep = club.state === BONDED_STATE.OPEN
    ? club.collateral === 0n ? (isVi ? "Bước tiếp theo: nạp cọc CirBTC lớn hơn 0. Sau đó mời ít nhất 2 thành viên để bắt đầu." : "Next: deposit a positive CirBTC bond, then recruit at least 2 members to start.")
      : club.memberCount < 2n ? (isVi ? "Bước tiếp theo: mời thêm thành viên; cần ít nhất 2 người để bắt đầu." : "Next: invite members; at least 2 are required to start.")
        : (isVi ? "Nhóm đủ điều kiện cơ bản để bắt đầu chu kỳ." : "The club meets the basic conditions to start its cycle.")
    : club.interestOwed > 0n ? (isVi ? "Bước tiếp theo: thanh toán lãi đến hạn và kiểm tra lịch trả nợ." : "Next: pay outstanding interest and review repayment deadlines.")
      : club.totalDebt > 0n ? (isVi ? "Bước tiếp theo: hoàn trả khoản vay trước hạn tất toán." : "Next: repay the loan before settlement is due.")
        : club.cycleEnded ? (isVi ? "Chu kỳ đã hết hạn; kiểm tra điều kiện để hoàn tất." : "The cycle has ended; review completion eligibility.")
          : (isVi ? "Theo dõi tiền góp và lịch trả lãi của chu kỳ đang chạy." : "Monitor contributions and interest deadlines during the active cycle.");
  if (terminal) return <BondedTerminalView club={club} language={language} isOwner={isOwner} isPasskeyUser={isPasskeyUser} pending={isPending} onClaim={() => void handleClaimInterest()} onWithdraw={() => void handleWithdrawPrincipal()} onCollateral={() => void handleTerminalCollateral()} onDirectory={onOpenDirectoryModal} onRemove={handleRemoveCurrentClub} />;
  const mobileReview = hasFundingAction && (riskBlocked || (contributeEligible && contributeBlockedByVerification));
  const mobileUnavailable = !financialsReady || !club.positionAvailable;
  const mobileLabel = mobileUnavailable ? (club.isLoading ? (isVi ? "Đang tải thông tin…" : "Loading details…") : (isVi ? "Chưa tải được thông tin — thử lại" : "Details unavailable — retry")) : mobileReview ? (isVi ? "Xem và xác nhận rủi ro" : "Review and acknowledge risk") : canJoinWithAcknowledgement ? (isVi ? "Tham gia nhóm" : "Join club") : canContributeWithAcknowledgement ? (isVi ? "Góp tiền vòng này" : "Contribute this round") : club.pendingInterest > 0n ? (isVi ? "Nhận lãi đã trả" : "Claim paid interest") : isOwner ? (isVi ? "Xem bước tiếp theo" : "Review next step") : club.state === BONDED_STATE.OPEN && club.isMember ? (isVi ? "Đang chờ chủ nhóm bắt đầu" : "Waiting for the owner to start") : club.state === BONDED_STATE.OPEN && !hasCapacity ? (isVi ? "Nhóm đã đủ thành viên" : "Club is full") : (isVi ? "Hiện chưa có thao tác cần thực hiện" : "No action needed right now");
  const mobileAction = mobileUnavailable ? () => void club.refetch() : mobileReview ? reviewMemberAction : canJoinWithAcknowledgement ? () => void handleJoin() : canContributeWithAcknowledgement ? () => void handleContribute() : club.pendingInterest > 0n ? () => void handleClaimInterest() : isOwner ? () => ownerControlsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined;

  const timelineRoundEnd = club.startTime > 0n && club.currentRoundIndex >= 1n && club.currentRoundIndex <= club.maxMembers
    ? club.startTime + club.currentRoundIndex * club.roundDuration : 0n;
  const timelineRoundLeft = timelineRoundEnd > nowSec ? Number(timelineRoundEnd - nowSec) : 0;
  const timelineInterestOverdue = club.nextInterestDeadline > 0n && nowSec >= club.nextInterestDeadline && club.interestOwed > 0n;
  const timelineInterestLeft = club.nextInterestDeadline > nowSec ? Number(club.nextInterestDeadline - nowSec) : 0;
  const timelineHasDebt = club.totalDebt > 0n || club.interestOwed > 0n;
  const timelineUrgent = timelineInterestOverdue
    || (timelineHasDebt && timelineInterestLeft > 0 && timelineInterestLeft < Number(club.interestGrace || 120n))
    || (timelineRoundLeft > 0 && timelineRoundLeft < Number(club.roundDuration) * 0.2);
  const nextDeadlineLabel = timelineInterestOverdue
    ? (isVi ? "Quá hạn trả lãi!" : "Interest overdue!")
    : timelineRoundLeft > 0
      ? `${isVi ? `Vòng ${club.currentRoundIndex} đóng sau` : `Round ${club.currentRoundIndex} closes in`} ${formatRoundDuration(timelineRoundLeft, !isVi)}`
      : timelineHasDebt && timelineInterestLeft > 0
        ? `${isVi ? "Hạn trả lãi sau" : "Interest due in"} ${formatRoundDuration(timelineInterestLeft, !isVi)}`
        : (isVi ? "Không có hạn gấp" : "No urgent deadline");
  return (
    <div className="space-y-6 text-slate-100 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-0" data-testid="bonded-workspace">
      {/* Thanh công cụ gọn: nhận diện nhóm bên trái, hành động phụ bên phải */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-[#0c0d14]/95 p-3.5 sm:px-5 sm:py-4 shadow-xl backdrop-blur-md" data-testid="bonded-toolbar">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-slate-300">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300">BondedTontine V2</span>
          {club.isVerifiedClub ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isVi ? "Đã xác minh bởi Factory" : "Verified by Factory"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 font-semibold text-red-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              {isVi ? "Chưa xác minh (ngoài Factory)" : "Unverified Club"}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1 font-mono">
            <button
              type="button"
              onClick={handleCopyContractAddress}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-slate-200 hover:text-amber-200 transition-colors cursor-pointer sm:min-h-0"
              title={isVi ? `Sao chép: ${contractAddress}` : `Copy: ${contractAddress}`}
            >
              <span>{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
              {copiedAddress ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="shrink-0" />}
            </button>
            <a
              href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-slate-400 hover:text-amber-300 transition-colors sm:min-h-0"
              title={isVi ? "Xem trên Arc Explorer" : "View on Arc Explorer"}
              aria-label={isVi ? "Xem nhóm trên Arc Explorer" : "View club on Arc Explorer"}
            >
              <ExternalLink size={12} />
            </a>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/70 hover:bg-amber-900/80 px-3 text-xs font-semibold text-amber-200 hover:border-amber-400/70 shadow-sm transition-colors cursor-pointer"
            title={isVi ? "Sao chép link mời thành viên (?group=...)" : "Copy club invite link (?group=...)"}
            aria-label={isVi ? "Sao chép link mời" : "Copy club invite link"}
          >
            {copiedInviteLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-amber-300" />}
            <span className="hidden sm:inline">{copiedInviteLink ? (isVi ? "Đã chép link mời!" : "Link Copied!") : (isVi ? "Sao chép link mời" : "Copy Club Link")}</span>
          </button>
          {onOpenDirectoryModal && (
            <button
              type="button"
              onClick={onOpenDirectoryModal}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-900/95 hover:bg-slate-800 px-3 text-xs font-semibold text-slate-100 hover:border-amber-400/60 shadow-sm transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden sm:inline">{isVi ? "Danh sách nhóm" : "Club Directory"}</span>
              <span className="sr-only sm:hidden">{isVi ? "Danh sách nhóm" : "Club Directory"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void club.refetch()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-600 bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:border-amber-400/60 shadow-sm transition-colors cursor-pointer"
            title={isVi ? "Làm mới" : "Refresh"}
            aria-label={isVi ? "Làm mới dữ liệu nhóm" : "Refresh club data"}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {canRemoveFromDirectory && (
            <button
              type="button"
              onClick={handleRemoveCurrentClub}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-500/45 bg-red-950/75 hover:bg-red-900/85 px-3 text-xs font-semibold text-red-200 hover:border-red-400/70 shadow-sm transition-colors cursor-pointer"
              title={isVi ? "Xóa nhóm khỏi danh bạ" : "Remove club from directory"}
              aria-label={isVi ? "Xóa nhóm" : "Remove club"}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-300" />
              <span className="hidden sm:inline">{isVi ? "Xóa nhóm" : "Remove club"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenCreateModal?.()}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:via-amber-400 px-3.5 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span className="sm:hidden">{isVi ? "+ Tạo nhóm" : "+ New club"}</span><span className="hidden sm:inline">{isVi ? "+ Tạo nhóm Bonded V2" : "+ Create Bonded V2 Club"}</span>
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

      {/* Main 2-Column Grid (Grid 12 cols: 7/8 Left, 5/4 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Overview, Deadlines, Roster, Oracle (col-span-7 / 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 1. Hero: một đối tượng chính, bốn số liệu cốt lõi, chi tiết thu gọn */}
          <section data-testid="bonded-hero" className="space-y-5 rounded-3xl border border-amber-500/20 bg-[#0c0d14] p-6 shadow-xl sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold tracking-tight text-white text-balance sm:text-3xl">
                  {club.groupName || "BondedTontine Club"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {isVi ? "Chủ nhóm:" : "Owner:"}{" "}
                  <span className="font-mono text-slate-200">{club.owner.slice(0, 6)}...{club.owner.slice(-4)}</span>
                  {" • "}
                  {club.cycleEnded ? (
                    <span className="font-semibold text-amber-400">{isVi ? "Chu kỳ đã kết thúc" : "Cycle ended"}</span>
                  ) : (
                    <span>
                      {isVi ? "Vòng hiện tại:" : "Current Round:"}{" "}
                      <strong className="text-white">{club.currentRoundIndex.toString()}/{club.totalRounds.toString()}</strong>
                    </span>
                  )}
                </p>
              </div>
              <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold sm:text-sm ${stateInfo.bg} ${stateInfo.text}`}>
                <span className={`h-2 w-2 rounded-full ${stateInfo.dot}`} />
                <span>{isVi ? stateInfo.labelVi : stateInfo.labelEn}</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-400">{isVi ? "Tổng tiền góp trong quỹ (Pool)" : "Total Deposits in Pool"}</dt>
                <dd className="mt-1 text-2xl font-extrabold tabular-nums text-white">
                  {financialsReady ? displayUsdc(club.totalDeposits) : financialPlaceholder}
                  <span className="ml-1 text-sm font-semibold text-slate-400">USDC</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">{isVi ? "Mức đóng / vòng" : "Contribution / round"}</dt>
                <dd className="mt-1 text-2xl font-extrabold tabular-nums text-white">
                  {displayUsdc(club.contributionAmount)}
                  <span className="ml-1 text-sm font-semibold text-slate-400">USDC</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">{isVi ? "Quy mô thành viên" : "Member Capacity"}</dt>
                <dd className="mt-1 text-2xl font-extrabold tabular-nums text-white">
                  {club.memberCount.toString()}/{club.maxMembers.toString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">{isVi ? "Lãi suất / Vòng" : "Rate per Round"}</dt>
                <dd className="mt-1 text-2xl font-extrabold tabular-nums text-white">
                  {(Number(club.rateBpsPerRound) / 100).toFixed(2)}%
                </dd>
                <dd className="text-xs text-slate-400">{isVi ? "chủ nhóm chi trả" : "paid by owner"}</dd>
              </div>
            </dl>

            <BondedRiskBanner club={club} language={language} />

            <details className="group rounded-2xl border border-slate-800 bg-black/30" data-testid="bonded-details">
              <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300">
                <span>{isVi ? "Chi tiết quỹ và cọc" : "Pool and collateral details"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-4 px-4 pb-4">
                <BondedLiquiditySummary club={club} language={language} />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-400">{isVi ? "Cọc CirBTC của Chủ hụi" : "Owner CirBTC Collateral"}</dt>
                    <dd className="font-semibold tabular-nums text-emerald-300">{formatUnitsExact(club.collateral, 8)} cirBTC</dd>
                    <dd className="text-xs text-slate-400">≈ {club.collateralValueUsdc !== null ? `${displayUsdc(club.collateralValueUsdc)} USDC` : "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">{isVi ? "Dư nợ / Hạn mức vay" : "Debt / Borrow Limit"}</dt>
                    <dd className="font-semibold tabular-nums text-amber-300">
                      {financialsReady ? displayUsdc(club.totalDebt) : financialPlaceholder} / {club.borrowLimit !== null ? `${displayUsdc(club.borrowLimit)} USDC` : "N/A"}
                    </dd>
                    <dd className="text-xs text-slate-400">{isVi ? "Lãi nợ:" : "Interest:"} {displayUsdc(club.interestOwed)} USDC</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">{isVi ? "Hệ số sức khỏe" : "Health Ratio"}</dt>
                    <dd className="font-semibold tabular-nums text-white">{healthRatioDisplay}</dd>
                    <dd className="text-xs text-slate-400">{isVi ? "Thanh lý:" : "Liquidation:"} {(Number(club.liquidationBps) / 100).toFixed(0)}%</dd>
                  </div>
                </dl>
                <p className="text-xs text-slate-400">
                  {showAnnualizedApr
                    ? `(~ ${aprPct.toFixed(1)}% APR)`
                    : isShortRound
                      ? (isVi ? "Lãi suất mỗi vòng chỉ minh họa, không phải lãi suất thực." : "Rate per round is illustrative only, not real APR.")
                      : ""}
                </p>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {isVi ? "Quy mô thành viên" : "Member Capacity"} ({club.memberCount.toString()}/{club.maxMembers.toString()})
                      {club.state === BONDED_STATE.OPEN && (
                        <span className="ml-1.5 text-amber-200/90">
                          • {club.memberCount < 2n
                            ? (isVi ? "Cần tối thiểu 2 để bắt đầu" : "Min 2 members required")
                            : (isVi ? "Đủ điều kiện bắt đầu" : "Ready to start")}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-300">{fillPercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/50">
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${Math.max(fillPercent, 4)}%` }} />
                  </div>
                </div>
                {/* Quick remove if club is defaulted/completed or empty open club */}
                      {canRemoveFromDirectory && (
                        <button
                          type="button"
                          onClick={handleRemoveCurrentClub}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-xs font-semibold text-red-300 transition-colors cursor-pointer"
                          title={isVi ? "Xóa nhóm khỏi danh bạ" : "Remove club from directory"}
                        >
                          <Trash2 size={12} />
                          <span>{isVi ? "Xóa nhóm" : "Remove club"}</span>
                        </button>
                      )}
              </div>
            </details>
          </section>

          {/* 2. Deadlines Timeline Block (M2) */}
          {club.state === BONDED_STATE.ACTIVE && (
            <details data-testid="bonded-timeline" open={timelineUrgent || undefined} className="group rounded-3xl border border-amber-500/20 bg-[#0c0d14] text-white shadow-xl">
              <summary className="flex cursor-pointer select-none list-none flex-wrap items-center justify-between gap-2 p-5">
                <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                  <Clock className="h-4 w-4 text-amber-400" />
                  {isVi ? "Mốc thời gian & Hạn chót (Deadlines)" : "Timeline & Deadlines"}
                </h3>
                <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-300">{nextDeadlineLabel}<ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
              </summary>
              <div className="space-y-4 px-5 pb-5">
              <p className="text-xs text-slate-400">{isVi ? "Chu kỳ:" : "Cycle duration:"} {formatFriendlyDuration(Number(club.roundDuration), isVi)} × {Number(club.totalRounds)} {isVi ? "vòng" : "rounds"}</p>

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
                            : `${formatRoundDuration(remainingSec, !isVi)} ${isVi ? "còn lại" : "left"}`}
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
                            ? (isVi ? `ĐÃ QUÁ HẠN (${formatFriendlyDuration(Number(nowSec - deadline), isVi)})` : `OVERDUE (${formatFriendlyDuration(Number(nowSec - deadline), isVi)} ago)`)
                            : `${formatRoundDuration(remainingSec, !isVi)} ${isVi ? "còn lại" : "left"}`}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {deadline > 0n ? new Date(Number(deadline) * 1000).toLocaleTimeString() : ""} ({isVi ? "ân hạn" : "grace"}:{" "}
                        {formatRoundDuration(Number(club.interestGrace), !isVi)})
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
                            : `${formatRoundDuration(remainingSec, !isVi)} ${isVi ? "còn lại" : "left"}`}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {settlementDeadline > 0n
                          ? new Date(Number(settlementDeadline) * 1000).toLocaleTimeString()
                          : ""}{" "}
                        ({isVi ? "ân hạn" : "grace"}: {formatRoundDuration(Number(club.settlementGrace), !isVi)})
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
            </details>
          )}

          {/* 3. Club Members Roster (L5 & phong cách ClubMembersRoster) */}
          <details data-testid="bonded-roster" className="group rounded-3xl border border-amber-500/20 bg-[#0c0d14] text-white shadow-xl">
            <summary className="flex cursor-pointer select-none list-none items-center justify-between p-5">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-bold text-white">
                <Users className="h-4 w-4 text-amber-400" />
                {isVi ? "Danh sách thành viên" : "Member Roster"} ({(club.memberAddresses.length || club.memberCount).toString()}/{club.maxMembers.toString()})
              </h3>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-4 px-5 pb-5">

            {club.membersLoadError && club.memberAddresses.length > 0 && <p role="status" className="text-xs text-amber-300">{memberErrorMessage(club.membersLoadError, language)} ({club.memberAddresses.length}/{club.memberCount.toString()}) <button onClick={() => void club.refetch()}>{isVi ? "Thử lại" : "Retry"}</button></p>}
            {club.memberAddresses.length === 0 ? (
              club.memberCount > 0n ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-amber-300">
                      {isVi ? "Không thể tải danh sách địa chỉ" : "Failed to load member addresses"}:
                    </span>{" "}
                    {memberErrorMessage(club.membersLoadError ?? "unavailable", language)}
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

                      {club.state === BONDED_STATE.ACTIVE && club.currentRoundIndex >= 1n && club.currentRoundIndex <= club.maxMembers && <span data-testid="member-payment-status" className="text-xs text-amber-200">
                        {club.isLoading ? (isVi ? "Đang tải…" : "Loading…") : club.memberContributionRound !== club.currentRoundIndex || club.memberContributions?.[m.toLowerCase()] == null ? (isVi ? "Chưa rõ trạng thái đóng" : "Contribution unknown") : club.memberContributions?.[m.toLowerCase()] ? (isVi ? "Đã góp vòng này" : "Contributed this round") : (isVi ? "Chưa góp vòng này" : "Not contributed yet")}
                      </span>}
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
          </details>


        </div>

        {/* RIGHT COLUMN: ActionPanel (col-span-5 / 4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* 1. Member Actions Card (phong cách ActionPanel.tsx) */}
          {(!isOwner || club.userDeposit > 0n || club.pendingInterest > 0n) && (
          <div ref={memberActionsRef} data-testid="bonded-member-actions" className="scroll-mt-24 rounded-3xl bg-[#0c0d14] p-6 sm:p-7 border border-amber-500/30 shadow-xl space-y-5 text-slate-100">
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
            {(club.isMember || club.userDeposit > 0n) && (
            <div className="grid grid-cols-2 gap-3 bg-black/40 rounded-2xl p-4 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block">{isVi ? "Đã góp:" : "Deposited:"}</span>
                <span className="text-base font-bold text-white tabular-nums">
                  {club.positionAvailable && !club.isLoading && !club.error ? `${displayUsdc(club.userDeposit)} USDC` : financialPlaceholder}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">{isVi ? "Lãi chờ nhận:" : "Pending Interest:"}</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  {club.positionAvailable && !club.isLoading && !club.error ? `${displayUsdc(club.pendingInterest)} USDC` : financialPlaceholder}
                </span>
              </div>
            </div>
            )}

      {/* Unverified Club Warning & Confirmation Gate (T6.7) */}
      {!club.isVerifiedClub && hasFundingAction && (
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



            {riskRequired && hasFundingAction && (
              <div role="alert" className="rounded-2xl border-2 border-red-500 bg-red-950/60 p-4 space-y-3 text-red-100" data-testid="contribution-risk-warning">
                <p className="font-bold">{isVi ? "Cảnh báo: có thể mất vốn gốc" : "Warning: you may lose principal"}</p>
                <p className="text-sm">{isVi ? "Cọc chưa đủ 100% quỹ tối đa cả chu kỳ, hoặc giá trị cọc chưa được xác nhận bằng giá còn hạn. Bạn có thể không thu hồi đủ tiền đã góp." : "Collateral covers less than 100% of the maximum cycle pool, or its value cannot be verified with a fresh price. You may recover less than you contribute."}</p>
                <label className="flex items-start gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={riskAcknowledged} onChange={event => setAcknowledgedContext(event.target.checked ? riskContext : null)} className="mt-1 accent-red-500" />
                  <span>{isVi ? "Tôi hiểu nguy cơ mất vốn và vẫn muốn tham gia hoặc góp tiền với thông tin hiện tại." : "I understand the risk of principal loss and still want to join or contribute with the current information."}</span>
                </label>
                <p className="text-xs text-red-200">{isVi ? "Đây là xác nhận thông tin rủi ro, không thay đổi hạn mức vay hoặc quy tắc hợp đồng." : "This acknowledges disclosed risk; it does not change borrowing limits or contract rules."}</p>
              </div>
            )}

            {club.state === BONDED_STATE.OPEN && !club.isLoading && club.maxMembers > 0n && !hasCapacity && <p role="status" className="text-amber-200">{isVi ? "Nhóm đã đủ thành viên; không nhận đăng ký mới." : "This club is full; new registrations are closed."}</p>}
            {/* Actions */}
            <div className="space-y-3">
              {joinEligible && (
                <button
                  type="button"
                  disabled={isPending || !canJoinWithAcknowledgement}
                  onClick={handleJoin}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 text-slate-950 font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {isVi ? "Tham gia nhóm" : "Join Club"}
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
                      !canContributeWithAcknowledgement ||
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
                        : (isVi ? "Nhóm đang chờ xử lý vỡ nợ hoặc thanh lý" : "Default or liquidation pending")}
                    </p>
                  )}
                </div>
              )}

              {club.pendingInterest > 0n && (
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
              )}

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
          )}

          {/* 2. Club Owner Controls (T6.3 & U3.1: Only rendered when connected wallet is club.owner) */}
          {isOwner && (
            <div ref={ownerControlsRef} data-testid="bonded-owner-actions" className="scroll-mt-24 rounded-3xl bg-[#0c0d14] p-6 border border-amber-500/30 shadow-xl space-y-4 text-slate-100">
              <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-sm text-amber-200">{ownerNextStep}</p>
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
                    ? "Giá oracle không hợp lệ hoặc quá hạn, cần cập nhật trước khi vay hoặc rút cọc khi đang có nợ."
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
                        ? "Giá oracle không hợp lệ hoặc quá hạn, cần cập nhật"
                        : "Oracle price is invalid, unavailable or stale; refresh first"}
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
                        ? "Giá oracle không hợp lệ hoặc quá hạn, cần cập nhật"
                        : "Oracle price is invalid, unavailable or stale; refresh first"}
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
                    {isVi ? "Bắt đầu các vòng" : "Start Rounds"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCancelOpen}
                    className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-300 font-semibold text-xs transition-all cursor-pointer"
                  >
                    {isVi ? "Hủy nhóm & Hoàn cọc" : "Cancel Club & Refund Collateral"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Permissionless Keeper Actions (T6.5, U3.2 & U3.3) */}
          <details data-testid="bonded-keeper-actions" open={(canFinalize || canDeclareDefault || canLiquidate) || undefined} className="group rounded-2xl border border-slate-800 bg-[#0c0d14] text-slate-100 shadow-xl">
            <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Flame className="h-4 w-4 text-orange-400" />
              {isVi
                ? "Hoàn tất hoặc xử lý vỡ nợ"
                : "Complete cycle or resolve default"}
            </h3><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="space-y-3.5 px-5 pb-5">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isPending || !canFinalize}
                  onClick={handleFinalize}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  {isVi ? "Tất toán chu kỳ" : "Finalize Cycle"}
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
                  {isVi ? "Tuyên bố vỡ nợ quá hạn" : "Declare Default"}
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
                  {isVi ? "Thanh lý do thiếu cọc" : "Liquidate Undercollateralized"}
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
          </details>
        </div>
      </div>
      <BondedMobileActionBar label={mobileLabel} onAction={mobileAction} disabled={isPending || club.isLoading || (isPasskeyUser && !mobileReview && !isOwner)} />
    </div>
  );
}
