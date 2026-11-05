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
import { saveKnownGroup } from "../../lib/savingsClubDirectory.ts";
import { parseEventLogs } from "viem";

export { BONDED_DISCLOSURE_COPY, MOCK_ORACLE_WARNING_COPY };

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
}

export function BondedClubWorkspace({
  contractAddress,
  userAddress,
  language,
  isPasskeyUser = false,
  onSelectGroup,
  onOpenDirectoryModal,
}: BondedClubWorkspaceProps) {
  const club = useBondedClub(contractAddress, userAddress, true);
  const usdcBalance = useUsdcBalance(userAddress);
  const { writeContractAsync } = useArcWriteContract(undefined, { disableAutoToast: true });
  const [isActionPending, setIsActionPending] = useState(false);
  const isPending = isActionPending;
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
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

  // Create new BondedTontine club via Factory (T6.1 & U5)
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
  const [expectedCollateralInput, setExpectedCollateralInput] = useState("0.05");
  const [createConfirmed, setCreateConfirmed] = useState(false);

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
    try {
      const hash = await fn();
      setTxHash(hash);
      const submittingToastId = toast.loading(
        isVi
          ? `Đang chờ xác nhận giao dịch: ${label}...`
          : `Waiting for on-chain confirmation: ${label}...`
      );

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        toast.dismiss(submittingToastId);
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
        toast.dismiss(submittingToastId);
        toast.success(isVi ? `Đã gửi giao dịch: ${label}` : `Submitted: ${label}`);
      }

      await club.refetch();
    } catch (err) {
      toast.error(parseBondedTontineError(err, language));
    } finally {
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

  // Create BondedTontine club via Factory (T6.1 & T6.10 & U5)
  const handleCreateBondedClub = async () => {
    if (isActionPending) return;
    const factoryAddr = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];
    if (!factoryAddr) {
      toast.error(isVi ? "Chưa cấu hình Factory trên mạng này" : "Factory not configured on this chain");
      return;
    }
    if (!createConfirmed) {
      toast.error(
        isVi
          ? "Vui lòng tích xác nhận đã hiểu quy tắc ân hạn và tịch thu cọc trước khi tạo nhóm"
          : "Please confirm you understand the grace periods and collateral seizure rules before creating"
      );
      return;
    }
    setIsActionPending(true);
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

      // R6: wait for the receipt, read ClubCreated, register the new club and switch to it.
      if (!publicClient) return;
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Create club transaction reverted");
      }
      const created = parseEventLogs({
        abi: BONDED_TONTINE_FACTORY_ABI,
        eventName: "ClubCreated",
        logs: receipt.logs,
      }).find((log) => log.address.toLowerCase() === factoryAddr.toLowerCase());
      const newClubAddress = (created as unknown as { args?: { club?: `0x${string}` } } | undefined)?.args?.club;
      if (!newClubAddress) {
        toast.error(
          isVi
            ? "Đã tạo nhóm nhưng không đọc được địa chỉ nhóm mới từ sự kiện ClubCreated"
            : "Club created but the new club address could not be read from ClubCreated"
        );
        return;
      }
      registerRuntimeBondedClub(newClubAddress);
      saveKnownGroup({
        address: newClubAddress,
        name: params.groupName,
        creator: userAddress?.toLowerCase(),
        version: "v2-bonded",
      });
      toast.success(
        isVi
          ? `Nhóm mới đã sẵn sàng: ${params.groupName}`
          : `New club ready: ${params.groupName}`
      );
      onSelectGroup?.(newClubAddress);
    } catch (err) {
      toast.error(parseBondedTontineError(err, language));
    } finally {
      setIsActionPending(false);
    }
  };

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

  // U5: Estimate borrow limit for the create form's expected collateral
  let estimatedNewBorrowLimitUsdc: bigint | null = null;
  try {
    const expSats = parseUnitsExact(expectedCollateralInput || "0", 8);
    const priceRaw = club.oraclePriceRaw > 0n ? club.oraclePriceRaw : 60_000_00000000n;
    const safety = BigInt(Math.max(15000, Number(newSafetyBps) || 20000));
    const colValUsdc = (expSats * priceRaw) / 10_000_000_000n;
    estimatedNewBorrowLimitUsdc = (colValUsdc * 10_000n) / safety;
  } catch {
    estimatedNewBorrowLimitUsdc = null;
  }

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
  const staleBlocksPriceAction = club.oracleError;

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

  return (
    <div className="space-y-6 rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-5 text-zinc-100">
      {/* Header & Factory Verification Badge (T6.7, T6.8 & U7) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-xs text-zinc-400">
              {isVi ? "Chủ nhóm:" : "Owner:"}{" "}
              <span className="font-mono text-zinc-200">
                {club.owner.slice(0, 6)}...{club.owner.slice(-4)}
              </span>
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">
            {club.groupName || "BondedTontine Club"}
          </h2>
          <p className="text-xs text-zinc-400">
            {stateLabels[club.state]?.[language] ?? "UNKNOWN"} •{" "}
            {isVi ? "Thành viên" : "Members"}: {club.memberCount.toString()}/
            {club.maxMembers.toString()} •{" "}
            {club.cycleEnded ? (
              <span className="font-semibold text-amber-400">
                {isVi ? "Chu kỳ đã kết thúc" : "Cycle ended"}
              </span>
            ) : (
              <>
                {isVi ? "Vòng hiện tại" : "Current Round"}:{" "}
                {club.currentRoundIndex.toString()}/{club.totalRounds.toString()}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenDirectoryModal && (
            <button
              type="button"
              onClick={onOpenDirectoryModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-zinc-800 cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              {isVi ? "Danh sách nhóm" : "Club Directory"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void club.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-amber-400/50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isVi ? "Làm mới" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 cursor-pointer"
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

      {/* Oracle Status & Mock Warning Badge (T6.8 & U2) */}
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
                {isVi
                  ? "Giá oracle đã quá hạn, cần làm mới giá"
                  : "Oracle price is stale; refresh price first"}
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

      {/* Key Financial Metrics Grid (T6.2, T6.12, U4 & U6) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Tổng tiền góp (Pool)" : "Total Deposits"}
          </div>
          <div className="mt-1 text-base font-bold text-white">
            {displayUsdc(club.totalDeposits)} USDC
          </div>
          <div className="text-xs text-zinc-400">
            {displayUsdc(club.contributionAmount)} USDC / {isVi ? "vòng" : "round"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-400">
            {isVi ? "Dư nợ / Hạn mức vay" : "Debt / Borrow Limit"}
          </div>
          <div className="mt-1 text-base font-bold text-amber-300">
            {displayUsdc(club.totalDebt)} /{" "}
            {club.borrowLimit !== null ? `${displayUsdc(club.borrowLimit)} USDC` : "N/A"}
          </div>
          <div className="text-xs text-zinc-400">
            {isVi ? "Lãi:" : "Rate:"} {(Number(club.rateBpsPerRound) / 100).toFixed(2)}% /{" "}
            {isVi ? "vòng" : "round"}{" "}
            {showAnnualizedApr
              ? `(~${aprPct.toFixed(1)}% APR)`
              : isShortRound
                ? isVi
                  ? "(chỉ minh họa, không phải lãi suất thực)"
                  : "(illustrative only, not real APR)"
                : ""}
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
              ? `${displayUsdc(club.collateralValueUsdc)} USDC`
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
                ? isVi
                  ? "∞ (Không nợ)"
                  : "∞ (No debt)"
                : Number(club.healthBps) > 100_000
                  ? ">1,000%"
                  : `${(Number(club.healthBps) / 100).toFixed(1)}%`}
          </div>
          <div className="text-xs text-zinc-400">
            {isVi ? "Ngưỡng thanh lý:" : "Liquidation:"}{" "}
            {(Number(club.liquidationBps) / 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Zero Collateral Alert (Active but Collateral is 0) */}
      {club.state === BONDED_STATE.ACTIVE && club.collateral === 0n && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/40 p-3.5 text-xs text-yellow-200 flex items-start gap-2.5">
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

      {/* Deadlines Timeline Block (M2) */}
      {club.state === BONDED_STATE.ACTIVE && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <RefreshCw className="h-4 w-4 text-amber-400" />
              {isVi ? "Mốc thời gian & Hạn chót (Deadlines)" : "Timeline & Deadlines"}
            </h3>
            <span className="text-xs text-zinc-400">
              {isVi ? "Chu kỳ:" : "Cycle duration:"} {Number(club.roundDuration)}s × {Number(club.totalRounds)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            {/* 1. Current Round Deadline */}
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
                  className={`rounded-lg border p-3 ${
                    isPast
                      ? "border-zinc-700 bg-zinc-950/60 text-zinc-400"
                      : isUrgent
                        ? "border-amber-500/50 bg-amber-950/30 text-amber-200"
                        : "border-zinc-800 bg-zinc-950/40 text-zinc-300"
                  }`}
                >
                  <div className="font-semibold text-white">
                    {isVi ? `Hạn đóng tiền vòng ${club.currentRoundIndex}` : `Round ${club.currentRoundIndex} Cutoff`}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold">
                    {currentRoundEnd === 0n
                      ? "—"
                      : isPast
                        ? isVi
                          ? "Vòng đã kết thúc"
                          : "Round ended"
                        : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                  </div>
                  <div className="mt-1 text-zinc-400">
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
                  className={`rounded-lg border p-3 ${
                    isOverdue
                      ? "border-red-500 bg-red-950/50 text-red-200 animate-pulse"
                      : isUrgent
                        ? "border-amber-500 bg-amber-950/40 text-amber-200"
                        : "border-zinc-800 bg-zinc-950/40 text-zinc-300"
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
                  <div className="mt-1 font-mono text-sm font-bold">
                    {deadline === 0n || !hasDebtOrInterest
                      ? isVi
                        ? "Không nợ lãi"
                        : "No interest due"
                      : isOverdue
                        ? isVi
                          ? `ĐÃ QUÁ HẠN (${Number(nowSec - deadline)}s)`
                          : `OVERDUE (${Number(nowSec - deadline)}s ago)`
                        : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                  </div>
                  <div className="mt-1 text-zinc-400">
                    {deadline > 0n ? new Date(Number(deadline) * 1000).toLocaleTimeString() : ""} (ân hạn:{" "}
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
                  className={`rounded-lg border p-3 ${
                    isOverdue
                      ? "border-red-500 bg-red-950/50 text-red-200 animate-pulse"
                      : "border-zinc-800 bg-zinc-950/40 text-zinc-300"
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
                  <div className="mt-1 font-mono text-sm font-bold">
                    {settlementDeadline === 0n
                      ? "—"
                      : isOverdue
                        ? isVi
                          ? "ĐÃ QUÁ HẠN TẤT TOÁN"
                          : "OVERDUE SETTLEMENT"
                        : `${remainingSec}s ${isVi ? "còn lại" : "left"}`}
                  </div>
                  <div className="mt-1 text-zinc-400">
                    {settlementDeadline > 0n
                      ? new Date(Number(settlementDeadline) * 1000).toLocaleTimeString()
                      : ""}{" "}
                    (ân hạn: {Number(club.settlementGrace)}s)
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Overdue Danger Banner */}
          {(nowSec >= club.nextInterestDeadline && club.interestOwed > 0n && club.nextInterestDeadline > 0n) && (
            <div className="rounded-lg border border-red-500 bg-red-950/70 p-3 text-xs text-red-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
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

      {/* Create BondedTontine Club Modal/Section (T6.1, U4.2 & U5) */}
      {showCreateForm && (
        <div className="space-y-3.5 rounded-xl border border-amber-500/40 bg-zinc-900 p-4">
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
              {Number(newRoundDurationSec) < 86_400 && (
                <span className="mt-1 block text-xs text-amber-300">
                  {isVi
                    ? "Vòng ngắn chỉ để thử nghiệm"
                    : "Short rounds are for testing only"}
                </span>
              )}
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
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi ? "Ân hạn trả lãi (giây, 0..604800)" : "Interest Grace (sec, 0..604800)"}
              </span>
              <input
                value={newInterestGraceSec}
                onChange={(e) => setNewInterestGraceSec(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi
                  ? "Ân hạn tất toán (giây, >=3600)"
                  : "Settlement Grace (sec, >=3600)"}
              </span>
              <input
                value={newSettlementGraceSec}
                onChange={(e) => setNewSettlementGraceSec(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </label>
            <label className="text-xs">
              <span className="text-zinc-400">
                {isVi
                  ? "Cọc CirBTC dự kiến (ước tính hạn mức)"
                  : "Expected CirBTC Collateral (limit preview)"}
              </span>
              <input
                value={expectedCollateralInput}
                onChange={(e) => setExpectedCollateralInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
              {estimatedNewBorrowLimitUsdc !== null && (
                <span className="mt-1 block text-xs text-emerald-300">
                  {isVi ? "Hạn mức vay ước tính:" : "Est. Borrow Limit:"}{" "}
                  {displayUsdc(estimatedNewBorrowLimitUsdc)} USDC
                </span>
              )}
            </label>
          </div>

          {/* U5: Grace Period & Default Seizure Disclosure + Factory Feed Info */}
          <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-zinc-950/80 p-3 text-xs text-zinc-300">
            <div className="font-semibold text-amber-300">
              {isVi
                ? `Ân hạn trả lãi: ${newInterestGraceSec}s • Ân hạn tất toán: ${newSettlementGraceSec}s. Quá hạn thì cọc CirBTC bị tịch thu toàn bộ và chia cho thành viên.`
                : `Interest grace: ${newInterestGraceSec}s • Settlement grace: ${newSettlementGraceSec}s. If overdue or undercollateralized, 100% of CirBTC collateral is seized and distributed to members.`}
            </div>
            <div className="text-xs text-zinc-400">
              {isVi ? "Nguồn giá của Factory:" : "Factory Price Feed:"}{" "}
              <a
                href={feedExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-amber-300 underline"
              >
                {activeFeedAddress}
              </a>{" "}
              • maxPriceAge:{" "}
              {(club.maxPriceAge > 0n
                ? club.maxPriceAge
                : BigInt(ORACLE_INFO[ARC_TESTNET_CHAIN_ID]?.maxPriceAge ?? 3600)
              ).toString()}
              s
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-zinc-200">
              <input
                type="checkbox"
                checked={createConfirmed}
                onChange={(e) => setCreateConfirmed(e.target.checked)}
                className="rounded border-amber-400"
              />
              <span>
                {isVi
                  ? "Tôi đã đọc rõ thời gian ân hạn và hiểu rằng toàn bộ cọc CirBTC sẽ bị tịch thu nếu vỡ nợ"
                  : "I have reviewed the grace periods and understand 100% of CirBTC collateral is seized upon default"}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
            >
              {isVi ? "Đóng" : "Cancel"}
            </button>
            <button
              type="button"
              disabled={isPending || !createConfirmed}
              onClick={() => void handleCreateBondedClub()}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              {isVi ? "Xác nhận tạo qua Factory" : "Create via Factory"}
            </button>
          </div>
        </div>
      )}

      {/* Member Panel (T6.4) */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        {/* Passkey Wallet Warning (M3) */}
        {isPasskeyUser && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
            <strong>{isVi ? "Thông báo ví Passkey:" : "Passkey Wallet Notice:"}</strong>{" "}
            {isVi
              ? "Bản BondedTontine V2 hiện tại sử dụng ví trình duyệt Web3 (như MetaMask / Rabby) để ký trực tiếp hợp đồng. Tính năng Circle Passkey Smart Account đang được cấu hình cho V2."
              : "BondedTontine V2 currently requires a standard Web3 browser wallet (MetaMask / Rabby). Circle Passkey smart account execution is disabled for V2 transactions."}
          </div>
        )}

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
            • {isVi ? "Đã góp:" : "Deposited:"} {displayUsdc(club.userDeposit)} USDC •{" "}
            {isVi ? "Lãi chờ nhận:" : "Pending Interest:"}{" "}
            <span className="font-semibold text-emerald-300">
              {displayUsdc(club.pendingInterest)} USDC
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {club.state === BONDED_STATE.OPEN && !isOwner && !club.isMember && (
            <button
              type="button"
              disabled={isPending || !userAddress}
              onClick={handleJoin}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              {isVi ? "Tham gia nhóm (joinGroup)" : "Join Club (joinGroup)"}
            </button>
          )}

          {club.state === BONDED_STATE.ACTIVE && club.isMember && (
            <div className="space-y-1">
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {club.hasContributedCurrentRound
                  ? isVi
                    ? "Đã góp vòng này"
                    : "Contributed this round"
                  : isVi
                    ? `Approve & Góp ${displayUsdc(club.contributionAmount)} USDC`
                    : `Approve & Contribute ${displayUsdc(club.contributionAmount)} USDC`}
              </button>
              {(club.cycleEnded || canDeclareDefault || canLiquidate) && !club.hasContributedCurrentRound && (
                <p className="text-xs text-red-300">
                  {club.cycleEnded
                    ? isVi
                      ? "Chu kỳ đã kết thúc, không thể góp thêm"
                      : "Cycle has ended, no further contributions"
                    : isVi
                      ? "Nhóm đang chờ xử lý vỡ nợ hoặc thanh lý (DefaultPending)"
                      : "Default or liquidation pending (DefaultPending)"}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={isPending || club.pendingInterest === 0n}
            onClick={handleClaimInterest}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 cursor-pointer"
          >
            {isVi
              ? `Nhận lãi (${displayUsdc(club.pendingInterest)} USDC)`
              : `Claim Interest (${displayUsdc(club.pendingInterest)} USDC)`}
          </button>

          {(club.state === BONDED_STATE.COMPLETED ||
            club.state === BONDED_STATE.DEFAULTED) &&
            club.userDeposit > 0n && (
            <button
              type="button"
              disabled={isPending || isPasskeyUser || club.principalWithdrawn}
              onClick={handleWithdrawPrincipal}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
            >
              {isVi
                ? `Rút gốc (${displayUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`
                : `Withdraw Principal (${displayUsdc(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC)`}
            </button>
          )}
        </div>

        {/* Member Roster (L5) */}
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">
              {isVi ? "Danh sách thành viên" : "Member Roster"} ({club.memberAddresses.length}/{club.maxMembers.toString()})
            </span>
          </div>
          {club.memberAddresses.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              {isVi ? "Chưa có thành viên nào tham gia" : "No members have joined yet"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {club.memberAddresses.map((m) => {
                const isCurrent = userAddress && m.toLowerCase() === userAddress.toLowerCase();
                const isClubOwner = m.toLowerCase() === club.owner.toLowerCase();
                return (
                  <div
                    key={m}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    <a
                      href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, m)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono hover:text-amber-300 underline"
                    >
                      {m.slice(0, 6)}...{m.slice(-4)}
                    </a>
                    {isCurrent && (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-xs text-amber-300">
                        {isVi ? "Bạn" : "You"}
                      </span>
                    )}
                    {isClubOwner && (
                      <span className="rounded bg-zinc-700/50 px-1 py-0.5 text-xs text-zinc-300">
                        Owner
                      </span>
                    )}
                    {club.state === BONDED_STATE.OPEN && isOwner && (
                      <button
                        type="button"
                        onClick={() => setRemoveMemberInput(m)}
                        className="ml-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-xs text-red-300 hover:bg-red-500/20 cursor-pointer"
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
      </div>

      {/* Owner Panel (T6.3 & U3.1: Only rendered when connected wallet is club.owner) */}
      {isOwner && (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Lock className="h-4 w-4 text-amber-400" />
              {isVi ? "Bảng điều khiển Chủ hụi (Owner)" : "Club Owner Controls"}
            </h3>
            <span className="text-xs text-zinc-400">
              Owner: {club.owner.slice(0, 6)}...{club.owner.slice(-4)} •{" "}
              {isVi ? "Lãi đang nợ:" : "Interest Owed:"}{" "}
              <strong className="text-amber-300">{displayUsdc(club.interestOwed)} USDC</strong>
            </span>
          </div>

          {staleBlocksPriceAction && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {isVi
                ? "Giá oracle đã quá hạn, cần làm mới giá trước khi vay hoặc rút cọc khi đang có nợ."
                : "Oracle price is stale; refresh price before borrowing or withdrawing collateral while indebted."}
            </div>
          )}

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
                disabled={isPending}
                onClick={handleDepositCollateral}
                className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 cursor-pointer"
              >
                {isVi ? "Nạp cọc" : "Deposit"}
              </button>
            </div>

            {/* Borrow USDC (L3: Max button) */}
            <div className="space-y-1">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    value={borrowInput}
                    onChange={(e) => setBorrowInput(e.target.value)}
                    placeholder="USDC borrow"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 pr-14 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxBorrow =
                        club.borrowLimit !== null && club.borrowLimit > club.totalDebt
                          ? club.borrowLimit - club.totalDebt
                          : 0n;
                      setBorrowInput(formatUsdcExact(maxBorrow));
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-amber-300 hover:bg-zinc-700 cursor-pointer"
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
                  className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 cursor-pointer"
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

            {/* Repay Principal (L3: Max button) */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  value={repayInput}
                  onChange={(e) => setRepayInput(e.target.value)}
                  placeholder="USDC repay"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 pr-14 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRepayInput(formatUsdcExact(club.totalDebt));
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-amber-300 hover:bg-zinc-700 cursor-pointer"
                >
                  {isVi ? "Tối đa" : "Max"}
                </button>
              </div>
              <button
                type="button"
                disabled={isPending || club.totalDebt === 0n}
                onClick={handleRepay}
                className="shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 cursor-pointer"
              >
                {isVi ? "Trả gốc" : "Repay"}
              </button>
            </div>

            {/* Pay Interest (L3: Max button) */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  placeholder={displayUsdc(club.interestOwed)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 pr-14 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setInterestInput(formatUsdcExact(club.interestOwed));
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-amber-300 hover:bg-zinc-700 cursor-pointer"
                >
                  {isVi ? "Tối đa" : "Max"}
                </button>
              </div>
              <button
                type="button"
                disabled={isPending || club.interestOwed === 0n}
                onClick={handlePayInterest}
                className="shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 cursor-pointer"
              >
                {isVi ? "Trả lãi" : "Pay Interest"}
              </button>
            </div>

            {/* Withdraw Collateral (L3: Max button) */}
            <div className="space-y-1">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    value={withdrawColInput}
                    onChange={(e) => setWithdrawColInput(e.target.value)}
                    placeholder="cirBTC withdraw"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 pr-14 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawColInput(formatUnitsExact(club.collateral, 8));
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-amber-300 hover:bg-zinc-700 cursor-pointer"
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
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-400 disabled:opacity-40 cursor-pointer"
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
              <div className="flex gap-1.5">
                <input
                  value={removeMemberInput}
                  onChange={(e) => setRemoveMemberInput(e.target.value)}
                  placeholder="0xMember..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={isPending || !removeMemberInput.trim()}
                  onClick={handleRemoveMember}
                  className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-40 cursor-pointer"
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
                disabled={isPending || club.memberCount < 2n || club.collateral === 0n}
                onClick={handleStartRounds}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-40 cursor-pointer"
              >
                {isVi ? "Bắt đầu các vòng (startRounds)" : "Start Rounds (startRounds)"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCancelOpen}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40 cursor-pointer"
              >
                {isVi ? "Hủy nhóm & Hoàn cọc (cancelOpen)" : "Cancel Club & Refund Collateral"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Permissionless Keeper Actions & Testnet Mock Price Controller (T6.5, U3.2 & U3.3) */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Flame className="h-4 w-4 text-orange-400" />
          {isVi
            ? "Tác vụ Permissionless (Ai cũng gọi được — Keeper)"
            : "Permissionless Keeper Actions (Anyone Can Call)"}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <button
              type="button"
              disabled={isPending || !canFinalize}
              onClick={handleFinalize}
              className="w-full rounded-lg bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 cursor-pointer"
            >
              {isVi ? "Tất toán chu kỳ (finalize)" : "Finalize Cycle (finalize)"}
            </button>
            {finalizeDisabledReason && (
              <p className="text-xs text-zinc-400">{finalizeDisabledReason}</p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              disabled={isPending || !canDeclareDefault}
              onClick={handleDeclareDefault}
              className="w-full rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-40 cursor-pointer"
            >
              {isVi ? "Tuyên bố vỡ nợ quá hạn (declareDefault)" : "Declare Default (declareDefault)"}
            </button>
            {declareDefaultDisabledReason && (
              <p className="text-xs text-zinc-400">{declareDefaultDisabledReason}</p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              disabled={isPending || !canLiquidate}
              onClick={handleLiquidate}
              className="w-full rounded-lg bg-orange-500/20 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 disabled:opacity-40 cursor-pointer"
            >
              {isVi ? "Thanh lý do thiếu cọc (liquidate)" : "Liquidate Undercollateralized (liquidate)"}
            </button>
            {liquidateDisabledReason && (
              <p className="text-xs text-zinc-400">{liquidateDisabledReason}</p>
            )}
          </div>
        </div>

        {/* U3.2: Testnet Mock Oracle Simulation Bar — ONLY visible to oracleAdmin on Testnet */}
        {canManageMockOracle && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3 text-xs">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-zinc-400">
              {isVi ? "Mô phỏng giá Mock BTC/USD (Testnet Admin):" : "Simulate Mock BTC/USD (Testnet Admin):"}
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
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-semibold text-amber-300 cursor-pointer"
            >
              {isVi ? "Đặt giá" : "Set Price"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => void handleSetMockPrice("11500")}
              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1 font-semibold text-red-300 cursor-pointer"
            >
              {isVi ? "Mô phỏng Flash Crash ($11,500)" : "Simulate Flash Crash ($11,500)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
