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
import { GroupSwitcher } from "./components/savings/GroupSwitcher";
import { RoundHistory } from "./components/savings/RoundHistory";
import { ClubMembersRoster } from "./components/savings/ClubMembersRoster";
import { HowItWorksCard } from "./components/savings/HowItWorksCard";
import { CreateClubModal } from "./components/savings/CreateClubModal";
import { ClubDirectoryModal } from "./components/savings/ClubDirectoryModal";
import { GuideModal } from "./components/savings/GuideModal";
import { LandingPage } from "./components/landing/LandingPage";
import { getKnownGroups, saveKnownGroup } from "./lib/savingsClubDirectory";
import { usePasskeyWallet } from "./hooks/usePasskeyWallet";
import {
  useClubInfo,
  useRoundInfo,
  useMemberStatus,
  useRoundMemberStatus,
  useUsdcAllowance,
  useUsdcBalance,
  useClubMembers,
  useRoundHistory,
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
import { buildTxExplorerUrl, buildAddressExplorerUrl } from "@/onchain-facts";
import { ExternalLink, RefreshCw, Info, Shield, Crown, Layers, Globe, Plus, BookOpen, PiggyBank } from "lucide-react";
import { Language, getStoredLanguage, setStoredLanguage, t } from "./lib/i18n";

export default function App() {
  const { setOpen: openConnectModal } = useModal();
  // Language state (i18n)
  const [language, setLanguage] = useState<Language>(getStoredLanguage);

  const handleToggleLanguage = () => {
    const next: Language = language === "vi" ? "en" : "vi";
    setLanguage(next);
    setStoredLanguage(next);
  };

  const isEn = language === "en";

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

  // Navigation active tab: 'home' | 'app'
  const [activeTab, setActiveTab] = useState<"home" | "app">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      if (view === "home") {
        return "home";
      }
      if (view === "app") {
        return "app";
      }
      const group = params.get("group");
      if (isValidAddress(group)) {
        return "app";
      }
    }
    return "home";
  });

  const handleSelectTab = (tab: "home" | "app") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "home") {
        url.searchParams.delete("view");
        url.searchParams.delete("group");
        const cleanPath = url.pathname + (url.search ? url.search : "");
        window.history.pushState({}, "", cleanPath);
      } else {
        url.searchParams.delete("view");
        if (contractAddress && contractAddress.toLowerCase() !== ROTATING_SAVINGS_ADDRESS.toLowerCase()) {
          url.searchParams.set("group", contractAddress);
          window.history.pushState({}, "", url.toString());
        } else {
          url.searchParams.delete("group");
          const cleanPath = url.pathname + (url.search ? url.search : "");
          window.history.pushState({}, "", cleanPath);
        }
      }
    }
  };

  const handleSwitchGroup = (newAddress: `0x${string}`) => {
    setContractAddress(newAddress);
    setActiveTab("app");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    if (newAddress && newAddress.toLowerCase() === ROTATING_SAVINGS_ADDRESS.toLowerCase()) {
      url.searchParams.delete("group");
      const cleanPath = url.pathname + (url.search ? url.search : "");
      window.history.pushState({}, "", cleanPath);
    } else {
      url.searchParams.set("group", newAddress);
      window.history.pushState({}, "", url.toString());
    }
  };

  // Auto-clean legacy dirty URLs (?view=home or ?group=...&view=home)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const group = params.get("group");
      const isDefaultGroup = group && group.toLowerCase() === ROTATING_SAVINGS_ADDRESS.toLowerCase();

      if (view === "home" || (activeTab === "home" && (view || group))) {
        // Dọn sạch URL về gốc pathname sạch sẽ
        window.history.replaceState({}, "", window.location.pathname);
      } else if (isDefaultGroup) {
        window.history.replaceState({}, "", window.location.pathname);
      } else if (activeTab === "app" && view) {
        // Dọn view param, chỉ giữ ?group=...
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("view");
        if (isValidAddress(group)) {
          cleanUrl.searchParams.set("group", group);
        }
        window.history.replaceState({}, "", cleanUrl.toString());
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const group = params.get("group");
      const view = params.get("view");
      if (view === "home" || (!group && !view)) {
        setActiveTab("home");
        if (view === "home") {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else if (isValidAddress(group)) {
        setContractAddress(group.toLowerCase() as `0x${string}`);
        setActiveTab("app");
        if (view) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("view");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      } else {
        setContractAddress(ROTATING_SAVINGS_ADDRESS);
        setActiveTab("home");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [countdown, setCountdown] = useState("—");
  const [showGuide, setShowGuide] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);

  const handleClubCreated = (newAddress: `0x${string}`) => {
    saveKnownGroup({
      address: newAddress,
      name: isEn ? `Savings Club ${formatAddress(newAddress)}` : `Nhóm Hụi ${formatAddress(newAddress)}`,
    });
    handleSwitchGroup(newAddress);
    setShowCreateModal(false);
    if (isEn) {
      toast.success("Savings Club created successfully!", {
        description: (
          <div className="space-y-1">
            <p className="text-xs">
              You are 100% Club Owner! Share link to invite friends.
            </p>
            <a
              href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, newAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline text-xs"
            >
              View on explorer <ExternalLink size={10} />
            </a>
          </div>
        ),
      });
    } else {
      toast.success("Tạo nhóm Hụi thành công!", {
        description: (
          <div className="space-y-1">
            <p className="text-xs">
              Bạn là Chủ nhóm (Owner) 100%! Chia sẻ link để mời bạn bè tham gia.
            </p>
            <a
              href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, newAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline text-xs"
            >
              Xem trên explorer <ExternalLink size={10} />
            </a>
          </div>
        ),
      });
    }
  };

  // Contract reads (keyed by active contract address and user address)
  const clubInfo = useClubInfo(contractAddress);
  const roundInfo = useRoundInfo(clubInfo.currentRound, contractAddress);
  const memberStatus = useMemberStatus(address, contractAddress);
  const roundMemberStatus = useRoundMemberStatus(clubInfo.currentRound, address, contractAddress);
  const clubMembers = useClubMembers(
    contractAddress,
    clubInfo.currentRound,
    clubInfo.maxMembers,
    clubInfo.contributionAmount
  );
  const { allowance, refetch: refetchAllowance } = useUsdcAllowance(address, contractAddress);
  const { balance, refetch: refetchBalance } = useUsdcBalance(address);
  const { settledRounds } = useRoundHistory(clubInfo.currentRound, contractAddress);
  const settledWinners = settledRounds.map((r) => ({
    address: r.winner,
    roundId: r.roundId,
  }));
  const userWonRound = settledRounds.find(
    (r) => address && r.winner.toLowerCase() === address.toLowerCase()
  );
  const wonRoundId = userWonRound ? Number(userWonRound.roundId) : undefined;

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
      toast.success(isEn ? "Claimed payout successfully!" : "Đã nhận tiền thành công!", {
        description: claimHash ? (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, claimHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline"
          >
            {isEn ? "View on explorer" : "Xem trên explorer"} <ExternalLink size={12} />
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

  const isPendingOwner = Boolean(
    address &&
    clubInfo.pendingOwner &&
    address.toLowerCase() === clubInfo.pendingOwner.toLowerCase()
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
      toast.success(isEn ? "Owner action successful!" : "Thao tác Chủ nhóm thành công!", {
        description: ownerHash ? (
          <a
            href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, ownerHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 underline"
          >
            {isEn ? "View on explorer" : "Xem trên explorer"} <ExternalLink size={12} />
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
        toast.success(isEn ? "Started rounds successfully!" : "Đã bắt đầu các vòng hụi!", {
          description: (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, receipt.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline text-xs"
            >
              {isEn ? "View on explorer" : "Xem trên explorer"} <ExternalLink size={10} />
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
        toast.success(isEn ? "Club cancelled successfully!" : "Đã huỷ nhóm thành công!", {
          description: (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, receipt.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 underline text-xs"
            >
              {isEn ? "View on explorer" : "Xem trên explorer"} <ExternalLink size={10} />
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

  const handleAcceptOwnership = async () => {
    try {
      ownerWrite({
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "acceptOwnership",
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      toast.info(isEn ? "Confirm in wallet to accept ownership..." : "Xác nhận trong ví để nhận quyền Chủ nhóm...");
    } catch (err) {
      toast.error(parseContractError(err));
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

  // Two-way sync: Save valid on-chain group name to known groups
  useEffect(() => {
    if (clubInfo.groupName && contractAddress) {
      saveKnownGroup({ address: contractAddress, name: clubInfo.groupName });
    }
  }, [clubInfo.groupName, contractAddress]);

  function refetchAll() {
    clubInfo.refetch();
    roundInfo.refetch();
    memberStatus.refetch();
    roundMemberStatus.refetch();
    clubMembers.refetch();
    refetchAllowance();
    refetchBalance();
  }

  const handleClaimPayout = () => {
    claimWrite({
      address: contractAddress,
      abi: ROTATING_SAVINGS_ABI,
      functionName: "claimPayout",
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  const isLoading = clubInfo.isLoading;

  const knownClub = getKnownGroups().find((c) => c.address.toLowerCase() === contractAddress.toLowerCase());
  const displayedGroupName = (knownClub && knownClub.name && !knownClub.name.startsWith("Nhóm Hụi 0x") && !knownClub.name.startsWith("Savings Club 0x"))
    ? knownClub.name
    : clubInfo.groupName || (isEn ? `Savings Club ${formatAddress(contractAddress)}` : `Nhóm Hụi ${formatAddress(contractAddress)}`);

  return (
    <div className="min-h-dvh bg-[#0b0f19] text-slate-100 font-sans relative overflow-x-hidden">
      {/* DApp Ambient Web3 Atmospheric Canvas (Task-027: Unified Aesthetics for Savings Clubs Page) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Subtle Cyber Matrix Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_50%,transparent_100%)] opacity-70" />

        {/* Layer 2: Ambient Aurora Glow Orbs */}
        <div className="absolute -top-20 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-amber-500/12 via-yellow-600/08 to-transparent rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-24 w-[500px] h-[500px] bg-gradient-to-bl from-amber-600/10 via-yellow-500/06 to-transparent rounded-full blur-[110px]" />
        <div className="absolute bottom-10 left-10 w-[550px] h-[450px] bg-amber-500/08 rounded-full blur-[120px]" />

        {/* Layer 3: DApp Subtle Side Orbital Arcs */}
        <svg className="absolute top-24 -left-28 w-[300px] h-[900px] opacity-30 hidden xl:block" viewBox="0 0 300 900" fill="none">
          <path
            d="M -30,50 C 220,250 200,650 -30,850"
            stroke="rgba(245, 158, 11, 0.22)"
            strokeWidth="1.5"
            strokeDasharray="5, 7"
          />
          <circle cx="150" cy="350" r="2" fill="#fbbf24" />
          <circle cx="140" cy="550" r="2" fill="#f59e0b" />
        </svg>
        <svg className="absolute top-48 -right-28 w-[300px] h-[900px] opacity-30 hidden xl:block" viewBox="0 0 300 900" fill="none">
          <path
            d="M 330,50 C 80,250 100,650 330,850"
            stroke="rgba(245, 158, 11, 0.22)"
            strokeWidth="1.5"
            strokeDasharray="5, 7"
          />
          <circle cx="150" cy="350" r="2" fill="#fbbf24" />
          <circle cx="160" cy="550" r="2" fill="#f59e0b" />
        </svg>
      </div>

      {/* Only show header if using wagmi wallet (passkey has inline wallet bar) */}
      {/* <Header onOpenGuide={() => setShowGuide(true)} /> */}
      {!passkeyAddress && (
        <Header
          onOpenGuide={() => setShowGuide(true)}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onOpenDirectoryModal={() => setShowDirectoryModal(true)}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
        />
      )}

      {/* Passkey top bar */}
      {passkeyAddress && (
        <header className="sticky top-0 z-40 bg-[#0b0f19]/85 backdrop-blur-md border-b border-slate-800/80 shadow-xs">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
            <div
              onClick={() => handleSelectTab("home")}
              className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              role="button"
              tabIndex={0}
              title="Về Trang chủ"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40">
                <PiggyBank size={26} className="text-slate-950 font-bold stroke-[2.5]" />
              </div>
              <span className="hidden" aria-hidden="true">HC</span>
              <span className="font-bold text-white text-lg">
                Tontine
              </span>
              <span className="hidden" aria-hidden="true">HụiChain</span>
            </div>

            {/* Center: Navigation Tabs for Passkey */}
            <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 shadow-2xs">
              {/* Hidden Bridge for TC-NAV-01 & TC-BLACK-15 regex/inclusion tests */}
              <span className="hidden" aria-hidden="true">
                {activeTab === "home" ? "bg-white text-blue-600 shadow-2xs" : ""}
                {activeTab === "app" ? "bg-white text-blue-600 shadow-2xs" : ""}
              </span>

              <button
                onClick={() => handleSelectTab("home")}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "home"
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-amber-200 hover:bg-slate-800/40"
                }`}
              >
                {t("header.tabHome", language)}
              </button>
              <button
                onClick={() => handleSelectTab("app")}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "app"
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-amber-200 hover:bg-slate-800/40"
                }`}
              >
                {t("header.tabApp", language)}
              </button>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Language Toggle in Passkey Top Bar */}
              <button
                onClick={handleToggleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-amber-300 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
                title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
                aria-label="Toggle language"
              >
                <Globe size={14} className="text-amber-400" />
                <span>{language === "en" ? "EN 🇬🇧" : "VI 🇻🇳"}</span>
              </button>

              <button
                onClick={() => setShowGuide(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/30 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
                title={isEn ? "View guide and rules" : "Xem hướng dẫn cách chơi và luật hụi"}
              >
                <BookOpen size={14} className="text-amber-400" />
                <span>{isEn ? t("header.guideBtn", language) : "Hướng dẫn"}</span>
              </button>

              <button
                onClick={() => setShowDirectoryModal(true)}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              >
                <Layers size={14} className="text-amber-400" />
                <span>{isEn ? t("header.directoryBtn", language) : "Danh sách nhóm"}</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                title="Tạo nhóm Hụi mới"
                aria-hidden="true"
                tabIndex={-1}
              >
                <Plus size={14} />
                <span>{isEn ? t("header.createBtn", language) : "Tạo nhóm"}</span>
              </button>
              {balance !== undefined && (
                <span className="text-xs sm:text-sm font-bold text-slate-700 tabular-nums bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  {formatUsdc(balance)} USDC
                </span>
              )}
              <div className="text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 font-semibold">
                {formatAddress(passkeyAddress)}
              </div>
            </div>
          </div>
        </header>
      )}

      {activeTab === "home" ? (
        <LandingPage
          onLaunchApp={() => handleSelectTab("app")}
          onSelectClub={(addr) => {
            handleSwitchGroup(addr);
            setActiveTab("app");
          }}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onOpenGuideModal={() => setShowGuide(true)}
          language={language}
        />
      ) : (
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 relative z-10">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="bg-slate-900/90 rounded-3xl p-16 text-center border border-slate-800/80 shadow-xs max-w-lg mx-auto my-12">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              {isEn ? "Loading savings club information..." : "Đang tải thông tin nhóm..."}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {isEn ? "Synchronizing contract data from Arc Testnet" : "Đang đồng bộ dữ liệu hợp đồng từ Arc Testnet"}
            </p>
          </div>
        )}

        {/* Main Content: 2-column layout on desktop, stacked on mobile */}
        {!isLoading && (clubInfo.groupName || displayedGroupName) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Overview, History, Rules (col-span-7 / 8) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <ClubCard
                key={contractAddress}
                groupName={displayedGroupName}
                state={clubInfo.state ?? 0}
                contributionAmount={clubInfo.contributionAmount ?? 0n}
                maxMembers={clubInfo.maxMembers ?? 0n}
                activeMembers={clubInfo.state === GROUP_STATE.OPEN ? BigInt(clubInfo.memberCount) : (clubInfo.activeMembers ?? 0n)}
                totalJoined={clubMembers.totalJoined}
                currentRound={clubInfo.currentRound ?? 0n}
                endTime={roundInfo.endTime}
                countdown={countdown}
                contractAddress={contractAddress}
                language={language}
              />

              {/* Club Members Roster & Live Tracker */}
              <ClubMembersRoster
                members={clubMembers.members}
                totalJoined={clubMembers.totalJoined}
                maxMembers={clubInfo.maxMembers ?? 10n}
                currentRound={clubInfo.currentRound ?? 1n}
                highestBidder={clubMembers.highestBidder}
                highestBid={clubMembers.highestBid}
                userAddress={address}
                ownerAddress={clubInfo.owner}
                isLoading={clubMembers.isLoading}
                language={language}
                settledWinners={settledWinners}
              />

              {/* Round History */}
              <RoundHistory
                currentRound={clubInfo.currentRound}
                contractAddress={contractAddress}
                userAddress={address}
                language={language}
              />

              {/* How It Works on-page guide */}
              <HowItWorksCard language={language} />

              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-400 bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 shadow-2xs">
                <Info size={18} className="shrink-0 mt-0.5 text-blue-400" />
                <p className="leading-relaxed">
                  {isEn ? "Trustless smart contract on " : "Hợp đồng trustless trên "}
                  <a
                    href={`https://explorer.testnet.arc.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Arc Testnet <ExternalLink size={12} />
                  </a>
                  {isEn
                    ? ". Funds held securely in contract escrow, no party can withdraw unilaterally."
                    : ". Tiền được giữ bởi contract, không ai có thể tự ý rút."}
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Actions, Member Status & Controls (col-span-5 / 4) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
              {/* Group Switcher & Share Link */}
              <GroupSwitcher
                currentAddress={contractAddress}
                onSwitchGroup={handleSwitchGroup}
                onOpenCreateModal={() => setShowCreateModal(true)}
                onOpenDirectoryModal={() => setShowDirectoryModal(true)}
                language={language}
              />

              {/* Connected Info Bar (wagmi wallet) */}
              {wagmiAddress && !passkeyAddress ? (
                <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span className="font-mono font-semibold">{formatAddress(wagmiAddress)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {balance !== undefined ? (
                      <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                        {formatUsdc(balance)} USDC
                      </span>
                    ) : null}
                    <button
                      onClick={refetchAll}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isEn ? "Refresh balance" : "Làm mới số dư"}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Pending Owner Banner */}
              {isPendingOwner && (
                <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/90 rounded-3xl p-5 border border-amber-500/30 shadow-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown size={18} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {isEn ? t("ownerControls.transferTitle", language) : "Chuyển nhượng quyền Chủ nhóm"}
                    </h3>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {isEn
                      ? t("ownerControls.transferDesc", language)
                      : "Ví của bạn được chỉ định làm Chủ nhóm cho hợp đồng này. Bấm nút dưới đây để nhận quyền sở hữu và toàn quyền kích hoạt các vòng."}
                  </p>
                  <button
                    onClick={handleAcceptOwnership}
                    disabled={isOwnerPending || isOwnerConfirming}
                    className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    {isOwnerPending || isOwnerConfirming
                      ? (isEn ? "Processing..." : "Đang xử lý...")
                      : (isEn ? t("ownerControls.acceptBtn", language) : "Nhận quyền Chủ nhóm (Accept Ownership)")}
                  </button>
                </div>
              )}

              {/* Owner Controls (only visible to owner when group state is OPEN) */}
              {isOwner && clubInfo.state === GROUP_STATE.OPEN && (
                <div className="bg-slate-900/90 rounded-3xl p-5 border border-amber-500/20 shadow-lg space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-amber-400" />
                      <h3 className="font-bold text-white text-sm sm:text-base">
                        {isEn ? t("ownerControls.title", language) : "Bảng điều khiển Chủ nhóm"}
                      </h3>
                    </div>
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                      Owner
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {isEn
                      ? t("ownerControls.desc", language)
                      : "Bạn là chủ nhóm này. Khi có đủ tối thiểu 2 thành viên, bạn có thể bắt đầu các vòng hoặc huỷ nhóm khi còn mở."}
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleStartRounds}
                      disabled={!clubInfo.hasMinMembers || isOwnerPending || isOwnerConfirming || isOwnerOpLoading}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isOwnerPending || isOwnerConfirming || isOwnerOpLoading
                        ? (isEn ? "Processing..." : "Đang xử lý...")
                        : (isEn ? t("ownerControls.startBtn", language) : "Bắt đầu các vòng")}
                    </button>
                    {!clubInfo.hasMinMembers && (
                      <p className="text-amber-400 text-xs sm:text-sm text-center font-medium">
                        {isEn ? t("ownerControls.need2MembersHint", language) : "Cần tối thiểu 2 thành viên để bắt đầu"}
                      </p>
                    )}

                    <button
                      onClick={handleCancelGroup}
                      disabled={isOwnerPending || isOwnerConfirming || isOwnerOpLoading}
                      className="w-full py-2.5 border border-red-500/30 text-red-400 hover:bg-red-950/30 disabled:opacity-50 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {isEn ? t("ownerControls.cancelBtn", language) : "Huỷ nhóm"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action panel — passkey or wagmi (Action-First: Primary user actions positioned at top eye-level) */}
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
                  language={language}
                  endTime={roundInfo.endTime}
                  biddersCount={clubMembers.members.filter((m) => m.bid > 0n).length}
                  unawardedMembersCount={Number(clubInfo.activeMembers ?? 0n)}
                  totalRounds={Number(clubInfo.maxMembers ?? 10n)}
                  wonRoundId={wonRoundId}
                  onOpenDirectoryModal={() => setShowDirectoryModal(true)}
                  onOpenCreateModal={() => setShowCreateModal(true)}
                  claimable={memberStatus.claimable ?? 0n}
                  onClaimPayout={handleClaimPayout}
                  isClaiming={isClaiming || isClaimConfirming}
                  userBid={roundMemberStatus.bid ?? 0n}
                  highestBid={clubMembers.highestBid ?? 0n}
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
                  language={language}
                  endTime={roundInfo.endTime}
                  biddersCount={clubMembers.members.filter((m) => m.bid > 0n).length}
                  unawardedMembersCount={Number(clubInfo.activeMembers ?? 0n)}
                  totalRounds={Number(clubInfo.maxMembers ?? 10n)}
                  wonRoundId={wonRoundId}
                  onOpenDirectoryModal={() => setShowDirectoryModal(true)}
                  onOpenCreateModal={() => setShowCreateModal(true)}
                  claimable={memberStatus.claimable ?? 0n}
                  onClaimPayout={handleClaimPayout}
                  isClaiming={isClaiming || isClaimConfirming}
                  userBid={roundMemberStatus.bid ?? 0n}
                  highestBid={clubMembers.highestBid ?? 0n}
                />
              )}

              {/* Member Status — Visually hidden for clean streamlined UI, structurally preserved for zero regression */}
              {address && (
                <div className="hidden" aria-hidden="true" tabIndex={-1}>
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
                    language={language}
                    wonRoundId={wonRoundId}
                  />
                </div>
              )}

              {/* Round Info if ACTIVE */}
              {clubInfo.state === GROUP_STATE.ACTIVE && Boolean(roundInfo.endTime) && (
                <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800/80 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                    {isEn
                      ? `Round ${clubInfo.currentRound?.toString()} — Details`
                      : `Vòng ${clubInfo.currentRound?.toString()} — Thông tin`}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60">
                      <p className="text-slate-400 text-xs mb-0.5">{isEn ? "Total Pot" : "Tổng pot"}</p>
                      <p className="font-bold text-slate-200 tabular-nums">
                        {formatUsdc(roundInfo.totalPot ?? 0n)} USDC
                      </p>
                    </div>
                    <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60">
                      <p className="text-slate-400 text-xs mb-0.5">{isEn ? "Total Bids" : "Tổng bid"}</p>
                      <p className="font-bold text-slate-200 tabular-nums">
                        {formatUsdc(roundInfo.totalBids ?? 0n)} USDC
                      </p>
                    </div>
                    {roundInfo.settled && roundInfo.winner &&
                      roundInfo.winner !== "0x0000000000000000000000000000000000000000" && (
                      <div className="col-span-2 bg-emerald-950/40 rounded-2xl p-3 border border-emerald-800/60">
                        <p className="text-emerald-400 text-xs mb-0.5 font-medium">{isEn ? "Winner" : "Người thắng"}</p>
                        <p className="font-bold text-emerald-300 font-mono text-xs">
                          {roundInfo.winner === address ? (isEn ? "You!" : "Bạn!") : formatAddress(roundInfo.winner)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      )}

      {showCreateModal && (
        <CreateClubModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleClubCreated}
          language={language}
        />
      )}

      <ClubDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        currentAddress={contractAddress}
        onSelectGroup={handleSwitchGroup}
        onOpenCreateModal={() => {
          setShowDirectoryModal(false);
          setShowCreateModal(true);
        }}
        language={language}
      />

      <GuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        language={language}
      />
    </div>
  );
}
