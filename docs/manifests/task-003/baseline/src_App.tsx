import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";
import { useModal } from "connectkit";
import { Header } from "./components/savings/Header";
import { ClubCard } from "./components/savings/ClubCard";
import { MemberStatus } from "./components/savings/MemberStatus";
import { ActionPanel } from "./components/savings/ActionPanel";
import { PasskeyActionPanel } from "./components/savings/PasskeyActionPanel";
import { OnboardingScreen } from "./components/savings/OnboardingScreen";
import { GroupSwitcher } from "./components/savings/GroupSwitcher";
import { RoundHistory } from "./components/savings/RoundHistory";
import { HowItWorksCard } from "./components/savings/HowItWorksCard";
import { usePasskeyWallet } from "./hooks/usePasskeyWallet";
import {
  useClubInfo,
  useRoundInfo,
  useMemberStatus,
  useRoundMemberStatus,
  useUsdcAllowance,
  useUsdcBalance,
} from "./hooks/useSavingsClub";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  ARC_TESTNET_CHAIN_ID,
  GROUP_STATE,
  formatUsdc,
  formatAddress,
  formatCountdown,
  isValidAddress,
  parseContractError,
} from "./contract";
import { buildTxExplorerUrl } from "@/onchain-facts";
import { ExternalLink, RefreshCw, Info, Shield } from "lucide-react";

export default function App() {
  const { setOpen: openConnectModal } = useModal();
  // MetaMask / injected wallet (wagmi)
  const { address: wagmiAddress } = useAccount();

  // Passkey wallet (Circle Modular Wallet)
  const { state: pkState, bundler, isConfigured, register, login, logout, clearError } = usePasskeyWallet();
  const passkeyAddress = pkState.status === "ready" ? pkState.address : undefined;
  const passkeyAccount = pkState.status === "ready" ? pkState.account : undefined;

  // Active address: passkey takes priority over wagmi
  const address = passkeyAddress ?? wagmiAddress;

  // Dynamic contract address: initialized from ?group= URL query param
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const group = params.get("group");
      if (isValidAddress(group)) {
        return group.toLowerCase() as `0x${string}`;
      }
    }
    return ROTATING_SAVINGS_ADDRESS;
  });

  const handleSwitchGroup = (newAddress: `0x${string}`) => {
    setContractAddress(newAddress);
    const url = new URL(window.location.href);
    url.searchParams.set("group", newAddress);
    window.history.pushState({}, "", url.toString());
  };

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const group = params.get("group");
      if (isValidAddress(group)) {
        setContractAddress(group.toLowerCase() as `0x${string}`);
      } else {
        setContractAddress(ROTATING_SAVINGS_ADDRESS);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [countdown, setCountdown] = useState("—");
  const [showGuide, setShowGuide] = useState(false);

  // Contract reads (keyed by active contract address and user address)
  const clubInfo = useClubInfo(contractAddress);
  const roundInfo = useRoundInfo(clubInfo.currentRound, contractAddress);
  const memberStatus = useMemberStatus(address, contractAddress);
  const roundMemberStatus = useRoundMemberStatus(clubInfo.currentRound, address, contractAddress);
  const { allowance, refetch: refetchAllowance } = useUsdcAllowance(address, contractAddress);
  const { balance, refetch: refetchBalance } = useUsdcBalance(address);

  // Claim payout (wagmi path — passkey path handled in PasskeyActionPanel)
  const {
    writeContract: claimWrite,
    data: claimHash,
    isPending: isClaiming,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  useEffect(() => {
    if (isClaimSuccess) {
      toast.success("Đã nhận tiền thành công!", {
        description: claimHash ? (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, claimHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline"
          >
            Xem trên explorer <ExternalLink size={12} />
          </a>
        ) : undefined,
      });
      resetClaim();
      refetchAll();
    }
  }, [isClaimSuccess]);

  // Owner Controls
  const isOwner = Boolean(
    address &&
    clubInfo.owner &&
    address.toLowerCase() === clubInfo.owner.toLowerCase()
  );

  const {
    writeContract: ownerWrite,
    data: ownerHash,
    isPending: isOwnerPending,
    reset: resetOwnerWrite,
  } = useWriteContract();

  const { isLoading: isOwnerConfirming, isSuccess: isOwnerSuccess } =
    useWaitForTransactionReceipt({ hash: ownerHash });

  useEffect(() => {
    if (isOwnerSuccess) {
      toast.success("Thao tác Chủ nhóm thành công!", {
        description: ownerHash ? (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, ownerHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline"
          >
            Xem trên explorer <ExternalLink size={12} />
          </a>
        ) : undefined,
      });
      resetOwnerWrite();
      refetchAll();
    }
  }, [isOwnerSuccess]);

  const [isOwnerOpLoading, setIsOwnerOpLoading] = useState(false);

  const handleStartRounds = async () => {
    if (passkeyAddress && passkeyAccount && bundler) {
      setIsOwnerOpLoading(true);
      try {
        const hash = await bundler.sendUserOperation({
          account: passkeyAccount,
          calls: [{
            to: contractAddress,
            data: encodeFunctionData({
              abi: ROTATING_SAVINGS_ABI,
              functionName: "startRounds",
              args: [],
            }),
          }],
          paymaster: true,
        });
        const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
        toast.success("Đã bắt đầu các vòng hụi!", {
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
        refetchAll();
      } catch (err) {
        toast.error(parseContractError(err));
      } finally {
        setIsOwnerOpLoading(false);
      }
    } else {
      try {
        ownerWrite({
          address: contractAddress,
          abi: ROTATING_SAVINGS_ABI,
          functionName: "startRounds",
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } catch (err) {
        toast.error(parseContractError(err));
      }
    }
  };

  const handleCancelGroup = async () => {
    if (passkeyAddress && passkeyAccount && bundler) {
      setIsOwnerOpLoading(true);
      try {
        const hash = await bundler.sendUserOperation({
          account: passkeyAccount,
          calls: [{
            to: contractAddress,
            data: encodeFunctionData({
              abi: ROTATING_SAVINGS_ABI,
              functionName: "cancelGroup",
              args: [],
            }),
          }],
          paymaster: true,
        });
        const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
        toast.success("Đã huỷ nhóm thành công!", {
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
        refetchAll();
      } catch (err) {
        toast.error(parseContractError(err));
      } finally {
        setIsOwnerOpLoading(false);
      }
    } else {
      try {
        ownerWrite({
          address: contractAddress,
          abi: ROTATING_SAVINGS_ABI,
          functionName: "cancelGroup",
          chainId: ARC_TESTNET_CHAIN_ID,
        });
      } catch (err) {
        toast.error(parseContractError(err));
      }
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!roundInfo.endTime) return;
    const tick = () => setCountdown(formatCountdown(roundInfo.endTime!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roundInfo.endTime]);

  const refetchAll = () => {
    clubInfo.refetch();
    roundInfo.refetch();
    memberStatus.refetch();
    roundMemberStatus.refetch();
    refetchAllowance();
    refetchBalance();
  };

  const handleClaimPayout = () => {
    claimWrite({
      address: contractAddress,
      abi: ROTATING_SAVINGS_ABI,
      functionName: "claimPayout",
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  // If user explicitly opened guide modal
  if (showGuide) {
    return (
      <OnboardingScreen
        isConfigured={isConfigured}
        isLoading={pkState.status === "loading"}
        loadingMessage={pkState.status === "loading" ? pkState.message : ""}
        errorMessage={pkState.status === "error" ? pkState.message : ""}
        onRegister={register}
        onLogin={login}
        onClearError={clearError}
        onConnectMetamask={() => {
          setShowGuide(false);
          openConnectModal(true);
        }}
        onClose={() => setShowGuide(false)}
      />
    );
  }

  const isLoading = clubInfo.isLoading;

  return (
    <div className="min-h-dvh bg-slate-50 font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Only show header if using wagmi wallet (passkey has inline wallet bar) */}
      {!passkeyAddress && <Header onOpenGuide={() => setShowGuide(true)} />}

      {/* Passkey top bar */}
      {passkeyAddress && (
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <span className="text-white text-xs font-bold">HC</span>
              </div>
              <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                HụiChain
              </span>
            </div>
            <div className="flex items-center gap-3">
              {balance !== undefined && (
                <span className="text-xs font-bold text-slate-700 tabular-nums bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  {formatUsdc(balance)} USDC
                </span>
              )}
              <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                {formatAddress(passkeyAddress)}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto my-12">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="font-bold text-slate-800 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Đang tải thông tin nhóm...
            </h3>
            <p className="text-slate-400 text-xs mt-1">Đang đồng bộ dữ liệu hợp đồng từ Arc Testnet</p>
          </div>
        )}

        {/* Main Content: 2-column layout on desktop, stacked on mobile */}
        {!isLoading && clubInfo.groupName && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Overview, History, Rules (col-span-7 / 8) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <ClubCard
                groupName={clubInfo.groupName}
                state={clubInfo.state ?? 0}
                contributionAmount={clubInfo.contributionAmount ?? 0n}
                maxMembers={clubInfo.maxMembers ?? 0n}
                activeMembers={clubInfo.activeMembers ?? 0n}
                currentRound={clubInfo.currentRound ?? 0n}
                endTime={roundInfo.endTime}
                countdown={countdown}
                contractAddress={contractAddress}
              />

              {/* Round History */}
              <RoundHistory
                currentRound={clubInfo.currentRound}
                contractAddress={contractAddress}
                userAddress={address}
              />

              {/* How It Works on-page guide */}
              <HowItWorksCard />

              <div className="flex items-start gap-3 text-xs text-slate-500 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed">
                  Hợp đồng trustless trên{" "}
                  <a
                    href={`https://explorer.testnet.arc.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Arc Testnet <ExternalLink size={10} />
                  </a>
                  . Tiền được giữ bởi contract, không ai có thể tự ý rút.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Actions, Member Status & Controls (col-span-5 / 4) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
              {/* Group Switcher & Share Link */}
              <GroupSwitcher
                currentAddress={contractAddress}
                onSwitchGroup={handleSwitchGroup}
              />

              {/* Connected Info Bar (wagmi wallet) */}
              {wagmiAddress && !passkeyAddress ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span className="font-mono">{formatAddress(wagmiAddress)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {balance !== undefined ? (
                      <span className="text-xs font-bold text-slate-800 tabular-nums bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                        {formatUsdc(balance)} USDC
                      </span>
                    ) : null}
                    <button
                      onClick={refetchAll}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Làm mới số dư"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Owner Controls (only visible to owner when group state is OPEN) */}
              {isOwner && clubInfo.state === GROUP_STATE.OPEN && (
                <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/90 rounded-3xl p-5 border border-indigo-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-indigo-600" />
                      <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Bảng điều khiển Chủ nhóm
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      Owner
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    Bạn là chủ nhóm này. Khi có đủ tối thiểu 2 thành viên, bạn có thể bắt đầu các vòng hoặc huỷ nhóm khi còn mở.
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleStartRounds}
                      disabled={!clubInfo.hasMinMembers || isOwnerPending || isOwnerConfirming || isOwnerOpLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      {isOwnerPending || isOwnerConfirming || isOwnerOpLoading ? "Đang xử lý..." : "Bắt đầu các vòng"}
                    </button>
                    {!clubInfo.hasMinMembers && (
                      <p className="text-amber-600 text-[11px] text-center font-medium">
                        Cần tối thiểu 2 thành viên để bắt đầu
                      </p>
                    )}

                    <button
                      onClick={handleCancelGroup}
                      disabled={isOwnerPending || isOwnerConfirming || isOwnerOpLoading}
                      className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Huỷ nhóm
                    </button>
                  </div>
                </div>
              )}

              {/* Round Info if ACTIVE */}
              {clubInfo.state === GROUP_STATE.ACTIVE && Boolean(roundInfo.endTime) && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Vòng {clubInfo.currentRound?.toString()} — Thông tin
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-slate-400 text-xs mb-0.5">Tổng pot</p>
                      <p className="font-bold text-slate-800 tabular-nums">
                        {formatUsdc(roundInfo.totalPot ?? 0n)} USDC
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <p className="text-slate-400 text-xs mb-0.5">Tổng bid</p>
                      <p className="font-bold text-slate-800 tabular-nums">
                        {formatUsdc(roundInfo.totalBids ?? 0n)} USDC
                      </p>
                    </div>
                    {roundInfo.settled && roundInfo.winner &&
                      roundInfo.winner !== "0x0000000000000000000000000000000000000000" && (
                      <div className="col-span-2 bg-emerald-50 rounded-2xl p-3 border border-emerald-200">
                        <p className="text-emerald-700 text-xs mb-0.5 font-medium">Người thắng</p>
                        <p className="font-bold text-emerald-800 font-mono text-xs">
                          {roundInfo.winner === address ? "Bạn!" : formatAddress(roundInfo.winner)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Member Status */}
              {address && (
                <MemberStatus
                  state={clubInfo.state}
                  isMember={memberStatus.isMember ?? false}
                  hasWon={memberStatus.hasWon ?? false}
                  isKicked={memberStatus.isKicked ?? false}
                  claimable={memberStatus.claimable ?? 0n}
                  contribution={roundMemberStatus.contribution}
                  bid={roundMemberStatus.bid}
                  contributionAmount={clubInfo.contributionAmount ?? 0n}
                  onClaimPayout={handleClaimPayout}
                  isClaiming={isClaiming || isClaimConfirming}
                />
              )}

              {/* Action panel — passkey or wagmi */}
              {passkeyAddress && passkeyAccount && bundler ? (
                <PasskeyActionPanel
                  contractAddress={contractAddress}
                  bundler={bundler}
                  account={passkeyAccount}
                  state={clubInfo.state ?? 0}
                  currentRound={clubInfo.currentRound ?? 1n}
                  contributionAmount={clubInfo.contributionAmount ?? 0n}
                  isMember={memberStatus.isMember ?? false}
                  hasWon={memberStatus.hasWon ?? false}
                  isKicked={memberStatus.isKicked ?? false}
                  hasContributed={roundMemberStatus.contribution === clubInfo.contributionAmount}
                  allowance={allowance ?? 0n}
                  onSuccess={refetchAll}
                  onLogout={logout}
                />
              ) : (
                <ActionPanel
                  contractAddress={contractAddress}
                  state={clubInfo.state ?? 0}
                  currentRound={clubInfo.currentRound ?? 1n}
                  contributionAmount={clubInfo.contributionAmount ?? 0n}
                  isMember={memberStatus.isMember ?? false}
                  hasWon={memberStatus.hasWon ?? false}
                  isKicked={memberStatus.isKicked ?? false}
                  hasContributed={roundMemberStatus.contribution === clubInfo.contributionAmount}
                  allowance={allowance ?? 0n}
                  onSuccess={refetchAll}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
