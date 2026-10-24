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

  // Show onboarding when no wallet connected at all
  const showOnboarding = !address && pkState.status !== "loading";

  if (showOnboarding || pkState.status === "loading" || pkState.status === "error") {
    // Show onboarding if: no address OR passkey is loading/error
    if (!address || pkState.status === "loading" || pkState.status === "error") {
      return (
        <OnboardingScreen
          isConfigured={isConfigured}
          isLoading={pkState.status === "loading"}
          loadingMessage={pkState.status === "loading" ? pkState.message : ""}
          errorMessage={pkState.status === "error" ? pkState.message : ""}
          onRegister={register}
          onLogin={login}
          onClearError={clearError}
          onConnectMetamask={() => openConnectModal(true)}
        />
      );
    }
  }

  const isLoading = clubInfo.isLoading;

  return (
    <div className="min-h-dvh bg-slate-50 font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Only show header if using wagmi wallet (passkey has inline wallet bar) */}
      {!passkeyAddress && <Header />}

      {/* Passkey top bar */}
      {passkeyAddress && (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">HC</span>
              </div>
              <span className="font-semibold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                HụiChain
              </span>
            </div>
            <div className="flex items-center gap-2">
              {balance !== undefined && (
                <span className="text-xs text-slate-500 tabular-nums bg-slate-100 px-2 py-1 rounded-lg">
                  {formatUsdc(balance)} USDC
                </span>
              )}
              <div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-lg">
                {formatAddress(passkeyAddress)}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-md mx-auto px-4 py-5 space-y-4 pb-16">

        {/* Info bar (wagmi wallet) */}
        {wagmiAddress && !passkeyAddress && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {formatAddress(wagmiAddress)}
            </div>
            <div className="flex items-center gap-2">
              {balance !== undefined && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatUsdc(balance)} USDC
                </span>
              )}
              <button
                onClick={refetchAll}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Làm mới"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Group Switcher & Share Link */}
        <GroupSwitcher
          currentAddress={contractAddress}
          onSwitchGroup={handleSwitchGroup}
        />

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Đang tải thông tin nhóm...</p>
          </div>
        )}

        {/* Main content */}
        {!isLoading && clubInfo.groupName && (
          <>
            <ClubCard
              groupName={clubInfo.groupName}
              state={clubInfo.state ?? 0}
              contributionAmount={clubInfo.contributionAmount ?? 0n}
              maxMembers={clubInfo.maxMembers ?? 0n}
              activeMembers={clubInfo.activeMembers ?? 0n}
              currentRound={clubInfo.currentRound ?? 0n}
              endTime={roundInfo.endTime}
              countdown={countdown}
            />

            {/* Owner Controls (only visible to owner when group state is OPEN) */}
            {isOwner && clubInfo.state === GROUP_STATE.OPEN && (
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 rounded-2xl p-4 border border-indigo-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-indigo-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">Bảng điều khiển Chủ nhóm</h3>
                  </div>
                  <span className="text-[11px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Owner
                  </span>
                </div>

                <p className="text-slate-500 text-xs">
                  Bạn là chủ nhóm này. Khi có đủ tối thiểu 2 thành viên, bạn có thể bắt đầu các vòng hoặc huỷ nhóm khi còn mở.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleStartRounds}
                    disabled={!clubInfo.hasMinMembers || isOwnerPending || isOwnerConfirming || isOwnerOpLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
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
                    className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-xs font-medium rounded-xl transition-colors"
                  >
                    Huỷ nhóm
                  </button>
                </div>
              </div>
            )}

            {clubInfo.state === GROUP_STATE.ACTIVE && roundInfo.endTime && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">
                  Vòng {clubInfo.currentRound?.toString()} — Thông tin
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-0.5">Tổng pot</p>
                    <p className="font-semibold text-slate-800 tabular-nums">
                      {formatUsdc(roundInfo.totalPot ?? 0n)} USDC
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-0.5">Tổng bid</p>
                    <p className="font-semibold text-slate-800 tabular-nums">
                      {formatUsdc(roundInfo.totalBids ?? 0n)} USDC
                    </p>
                  </div>
                  {roundInfo.settled && roundInfo.winner &&
                    roundInfo.winner !== "0x0000000000000000000000000000000000000000" && (
                    <div className="col-span-2 bg-emerald-50 rounded-xl p-3">
                      <p className="text-emerald-600 text-xs mb-0.5">Người thắng</p>
                      <p className="font-semibold text-emerald-800 font-mono text-xs">
                        {roundInfo.winner === address ? "Bạn!" : formatAddress(roundInfo.winner)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {address && (
              <MemberStatus
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

            {/* Round History */}
            <RoundHistory
              currentRound={clubInfo.currentRound}
              contractAddress={contractAddress}
              userAddress={address}
            />

            <div className="flex items-start gap-2 text-xs text-slate-400 bg-white rounded-xl p-3 border border-slate-100">
              <Info size={14} className="shrink-0 mt-0.5 text-slate-300" />
              <p>
                Hợp đồng trustless trên{" "}
                <a
                  href={`https://explorer.testnet.arc.io/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center gap-0.5"
                >
                  Arc Testnet <ExternalLink size={10} />
                </a>
                . Tiền được giữ bởi contract, không ai có thể tự ý rút.
              </p>
            </div>
          </>
        )}

        {/* No wallet + no passkey */}
        {!address && !isLoading && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                HụiChain
              </h2>
              <p className="text-slate-500 text-sm mt-1 text-pretty">
                Hụi/Tontine trustless onchain. Góp tiền, bid để nhận pot sớm, không cần tin tưởng ai.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
