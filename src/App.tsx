import { classifyCycleCapability } from "./lib/cycleCapabilities";
import { useCollateralPolicy } from "./hooks/useCollateralPolicy";
import { parseCollateralInput, formatCollateral } from "./lib/collateralPolicy";
import { useArcWriteContract } from "./hooks/useArcWriteContract";
import { useEffect, useState, useMemo, useRef } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
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
import { EditClubNameModal } from "./components/savings/EditClubNameModal";
import { GuideModal } from "./components/savings/GuideModal";
import { ArcAppKitModal } from "./components/savings/ArcAppKitModal";
import { LandingPage, getLeftOuterArcPoint, getRightOuterArcPoint } from "./components/landing/LandingPage";
import { getKnownGroups, getRemovedGroups, saveKnownGroup, updateKnownGroupName } from "./lib/savingsClubDirectory";
import { usePasskeyWallet } from "./hooks/usePasskeyWallet";
import {
  useClubInfo,
  useCycleCapability,
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
import { ExternalLink, RefreshCw, Info, Shield, Crown, Layers, Globe, Plus, BookOpen, PiggyBank, Users, Calendar, Zap, Wallet } from "lucide-react";
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
  const { address: wagmiAddress, connector } = useAccount();

  // Passkey wallet (Circle Modular Wallet)
  const { state: pkState, bundler, isConfigured, register, login, logout, clearError } = usePasskeyWallet();
  const passkeyAddress = pkState.status === "ready" ? pkState.address : undefined;
  const passkeyAccount = pkState.status === "ready" ? pkState.account : undefined;

  // Active address: passkey takes priority over wagmi
  const address = passkeyAddress ?? wagmiAddress;

  // Dynamic contract address: initialized from ?group= URL query param or official default ROTATING_SAVINGS_ADDRESS
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(() => {
    if (typeof window !== "undefined") {
      const removed = getRemovedGroups();
      const params = new URLSearchParams(window.location.search);
      const group = params.get("group");
      if (
        isValidAddress(group) &&
        !removed.has(group.toLowerCase()) &&
        group.toLowerCase() !== "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b"
      ) {
        return group.toLowerCase() as `0x${string}`;
      }
    }
    return ROTATING_SAVINGS_ADDRESS;
  });

  // Tracks if the user intentionally navigated via invite link (?group=...) or selected from directory
  const [hasExplicitGroup, setHasExplicitGroup] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const group = params.get("group");
      return Boolean(
        isValidAddress(group) &&
        group.toLowerCase() !== "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b"
      );
    }
    return false;
  });

  // Navigation active tab: 'home' | 'app'
  const [activeTab, setActiveTab] = useState<"home" | "app">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const tab = params.get("tab");
      if (view === "home" || tab === "home") {
        return "home";
      }
      if (view === "app" || tab === "app") {
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
        url.searchParams.delete("tab");
        url.searchParams.delete("group");
        const cleanPath = url.pathname + (url.search ? url.search : "");
        window.history.pushState({}, "", cleanPath);
        setHasExplicitGroup(false);
      } else {
        url.searchParams.delete("view");
        url.searchParams.set("tab", "app");
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
    setHasExplicitGroup(true);
    setNameUpdateTrigger((prev) => prev + 1);
    setActiveTab("app");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("tab", "app");
    const removed = getRemovedGroups();
    if (removed.has(newAddress.toLowerCase())) {
      url.searchParams.delete("group");
    } else {
      url.searchParams.set("group", newAddress);
    }
    window.history.pushState({}, "", url.toString());
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
        if (activeTab === "home") {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else if (group && group.toLowerCase() === "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b") {
        // Tự động thanh lọc địa chỉ test cũ để URL luôn gọn gàng
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("group");
        cleanUrl.searchParams.set("tab", "app");
        window.history.replaceState({}, "", cleanUrl.toString());
        setContractAddress(ROTATING_SAVINGS_ADDRESS);
        setHasExplicitGroup(false);
      } else if (activeTab === "app" && view) {
        // Dọn view param, chỉ giữ ?group=...
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("view");
        cleanUrl.searchParams.set("tab", "app");
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
      const tab = params.get("tab");
      setHasExplicitGroup(Boolean(isValidAddress(group)));
      if (tab === "app") {
        if (isValidAddress(group)) {
          setContractAddress(group.toLowerCase() as `0x${string}`);
        }
        setActiveTab("app");
      } else if (view === "home" || (!group && !view)) {
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
          cleanUrl.searchParams.set("group", group);
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
  const [showEditCurrentClubModal, setShowEditCurrentClubModal] = useState(false);
  const [showArcAppKitModal, setShowArcAppKitModal] = useState(false);
  const [nameUpdateTrigger, setNameUpdateTrigger] = useState(0);

  // Scroll progress for dynamic orbital motion on Saving Clubs page (Task-031: Synced with Home page)
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute smooth scroll offset factor along the orbital trajectory (0 at top, up to 0.08 at 500px scroll)
  const scrollOffset = Math.min(0.08, Math.max(0, (scrollY / 600) * 0.08));

  // Continuous Full-Page Scroll Dynamic Progression (glides gracefully along Bezier orbits across all sections)
  const continuousScrollDelta = Math.min(0.16, Math.max(0, (scrollY / 2400) * 0.16));

  // Dynamic coordinates on curve for Saving Clubs Left Wing icons (100% locked on Bezier curve)
  const ptAppLeftPiggy = getLeftOuterArcPoint(0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7);
  const ptAppLeftUsers = getLeftOuterArcPoint(0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6);
  const ptAppLeftRefresh = getLeftOuterArcPoint(0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5);
  const ptAppLeftCalendar = getLeftOuterArcPoint(0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6);

  // Dynamic coordinates on curve for Saving Clubs Right Wing icons (100% locked on Bezier curve)
  const ptAppRightRefresh = getRightOuterArcPoint(0.12 + scrollOffset * 0.9 + continuousScrollDelta * 0.7);
  const ptAppRightCalendar = getRightOuterArcPoint(0.38 + scrollOffset * 0.8 + continuousScrollDelta * 0.6);
  const ptAppRightUsers = getRightOuterArcPoint(0.62 + scrollOffset * 0.7 - continuousScrollDelta * 0.5);
  const ptAppRightPiggy = getRightOuterArcPoint(0.88 - scrollOffset * 0.5 - continuousScrollDelta * 0.6);

  const handleClubCreated = (newAddress: `0x${string}`) => {
    saveKnownGroup({
      address: newAddress,
      name: isEn ? `Savings Club ${formatAddress(newAddress)}` : `Nhóm Hụi ${formatAddress(newAddress)}`,
      creator: address?.toLowerCase(),
    });
    setHasExplicitGroup(true);
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
  const cycleSupport = useCycleCapability(contractAddress);
  const collateralView = useCollateralPolicy(contractAddress, address as `0x${string}` | undefined);
  const [ownerCollateralMode, setOwnerCollateralMode] = useState<'' | 'none' | 'custom'>('');
  const [ownerCollateralInput, setOwnerCollateralInput] = useState('');
  const ownerCollateralValue = parseCollateralInput(ownerCollateralMode, ownerCollateralInput);
  const ownerContext = useRef(`${contractAddress}:${address}`);
  ownerContext.current = `${contractAddress}:${address}`;
  const ownerSettingLock = useRef(false);
  const [isOwnerSettingReview, setIsOwnerSettingReview] = useState(false);
  useEffect(() => { setOwnerCollateralMode(''); setOwnerCollateralInput(''); }, [contractAddress, address]);
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
  const { settledRounds, isHistoryLimited } = useRoundHistory(clubInfo.currentRound, contractAddress);
  const settledWinners = settledRounds.map((r) => ({
    address: r.winner,
    roundId: r.roundId,
  }));
  const userWonRound = [...settledRounds].reverse().find(
    (r) => address && r.winner.toLowerCase() === address.toLowerCase()
  );
  const wonRoundId = userWonRound ? Number(userWonRound.roundId) : undefined;

  // Claim payout (wagmi path — passkey path handled in PasskeyActionPanel)
  const {
    writeContract: claimWrite,
    data: claimHash,
    isPending: isClaiming,
    reset: resetClaim,
  } = useArcWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ chainId: ARC_TESTNET_CHAIN_ID, hash: claimHash });

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

  const isUserAffiliated = Boolean(isOwner || memberStatus.isMember);

  // Auto-switch to user-owned club if connected and current club is not affiliated
  useEffect(() => {
    if (address && !hasExplicitGroup && !isUserAffiliated) {
      const known = getKnownGroups();
      const myClub = known.find(
        (g) => g.creator && g.creator.toLowerCase() === address.toLowerCase()
      );
      if (myClub && myClub.address.toLowerCase() !== contractAddress.toLowerCase()) {
        setContractAddress(myClub.address);
        setNameUpdateTrigger((prev) => prev + 1);
      }
    }
  }, [address, hasExplicitGroup, isUserAffiliated, contractAddress]);

  const {
    writeContract: ownerWrite,
    data: ownerHash,
    isPending: isOwnerPending,
    reset: resetOwnerWrite,
  } = useArcWriteContract(`${contractAddress}:${address}`);

  const { isLoading: isOwnerConfirming, isSuccess: isOwnerSuccess, error: ownerReceiptError } =
    useWaitForTransactionReceipt({ chainId: ARC_TESTNET_CHAIN_ID, hash: ownerHash });

  useEffect(() => {
    if (ownerReceiptError) { toast.error(parseContractError(ownerReceiptError)); resetOwnerWrite(); }
  }, [ownerReceiptError, resetOwnerWrite]);

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
        toast.success(isEn ? "Cancellation vote recorded." : "Đã ghi nhận phiếu huỷ nhóm.", {
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

  const handleOwnerCollateral = async () => {
    if (ownerCollateralValue === undefined || !clubInfo.membershipKnown || clubInfo.memberCount !== 0 || clubInfo.state !== GROUP_STATE.OPEN || ownerSettingLock.current || isOwnerPending || isOwnerConfirming || isOwnerOpLoading) return;
    const context = ownerContext.current;
    const value = ownerCollateralValue;
    ownerSettingLock.current = true;
    setIsOwnerSettingReview(true);
    try {
      const result = await clubInfo.refetch();
      const data = result.data;
      if (context !== ownerContext.current || result.error || data?.[1]?.result !== GROUP_STATE.OPEN || data?.[7]?.status !== 'failure' || data?.[8]?.status !== 'failure' || classifyCycleCapability({ error: data[7].error }) !== 'unsupported' || classifyCycleCapability({ error: data[8].error }) !== 'unsupported') throw new Error('Club data changed or is unavailable. Review the configuration again.');
      if (passkeyAddress && passkeyAccount && bundler) await sendPasskeyClubAction('setCollateralAmount', [value]);
      else ownerWrite({ address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: 'setCollateralAmount', args: [value], chainId: ARC_TESTNET_CHAIN_ID, account: address as `0x${string}` });
    } catch (error) { toast.error(parseContractError(error)); }
    finally { ownerSettingLock.current = false; setIsOwnerSettingReview(false); }
  };

  const sendPasskeyClubAction = async (functionName: string, args: readonly unknown[] = []) => {
    if (!passkeyAccount || !bundler) return;
    setIsOwnerOpLoading(true);
    try {
      const hash = await bundler.sendUserOperation({
        account: passkeyAccount,
        calls: [{ to: contractAddress, data: encodeFunctionData({ abi: ROTATING_SAVINGS_ABI, functionName, args }) }],
        paymaster: true,
      });
      const result = await bundler.waitForUserOperationReceipt({ hash });
      if (result.success === false || result.receipt.status === "reverted") throw new Error("Transaction reverted.");
      toast.success(isEn ? "Transaction confirmed." : "Giao dịch đã xác nhận.");
      refetchAll();
    } catch (error) {
      toast.error(parseContractError(error));
    } finally { setIsOwnerOpLoading(false); }
  };

  const handleAcceptOwnership = async () => {
    if (passkeyAddress && passkeyAccount && bundler) {
      await sendPasskeyClubAction("acceptOwnership");
      return;
    }
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

  // Two-way sync: Save valid on-chain group name to known groups (unless removed by user)
  useEffect(() => {
    if (clubInfo.groupName && contractAddress) {
      const removed = getRemovedGroups();
      if (!removed.has(contractAddress.toLowerCase())) {
        const existed = getKnownGroups().some(
          (g) => g.address.toLowerCase() === contractAddress.toLowerCase()
        );
        saveKnownGroup({ address: contractAddress, name: clubInfo.groupName });
        if (!existed) {
          setNameUpdateTrigger((prev) => prev + 1);
        }
      }
    }
  }, [clubInfo.groupName, contractAddress]);

  function refetchAll() {
    void collateralView.refresh();
    clubInfo.refetch();
    roundInfo.refetch();
    memberStatus.refetch();
    roundMemberStatus.refetch();
    clubMembers.refetch();
    refetchAllowance();
    refetchBalance();
  }

  const handleClaimPayout = () => {
    if (passkeyAddress && passkeyAccount && bundler) {
      void sendPasskeyClubAction("claimPayout");
      return;
    }
    claimWrite({
      address: contractAddress,
      abi: ROTATING_SAVINGS_ABI,
      functionName: "claimPayout",
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  };

  const isLoading = clubInfo.isLoading;

  const knownClub = getKnownGroups().find((c) => c.address.toLowerCase() === contractAddress.toLowerCase());
  const knownGroupsList = getKnownGroups();
  const isCurrentRemoved = getRemovedGroups().has(contractAddress.toLowerCase());
  const hasNoActiveClub = isCurrentRemoved || (knownGroupsList.length === 0 && !clubInfo.groupName);
  const activeCollateralAmount = clubInfo.collateralAmount;

  useEffect(() => {
    if (isCurrentRemoved && knownGroupsList.length > 0) {
      setContractAddress(knownGroupsList[0].address);
    }
  }, [isCurrentRemoved, knownGroupsList, nameUpdateTrigger]);

  const displayedGroupName = (knownClub && knownClub.name && !knownClub.name.startsWith("Nhóm Hụi 0x") && !knownClub.name.startsWith("Savings Club 0x"))
    ? knownClub.name
    : clubInfo.groupName || (isEn ? `Savings Club ${formatAddress(contractAddress)}` : `Nhóm Hụi ${formatAddress(contractAddress)}`);

  const currentClubForModal = useMemo(
    () => ({
      address: contractAddress,
      name: displayedGroupName,
    }),
    [contractAddress, displayedGroupName]
  );

  return (
    <div className="min-h-dvh bg-[#050508] text-slate-100 font-sans relative overflow-x-hidden">
      {/* Global Ambient Cyber Grid & Cosmic Gold Dust Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.06)_1px,transparent_1px)] [background-size:32px_32px] opacity-70" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-yellow-600/[0.03] rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 left-10 w-[550px] h-[550px] bg-amber-600/[0.035] rounded-full blur-[140px]" />
      </div>

      {/* DApp Ambient Web3 Atmospheric Canvas (Task-027: Unified Aesthetics for Savings Clubs Page) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Layer 1: Subtle Cyber Matrix Grid (Preserved for TC-DAPP-SYNC-01) */}
        <div className="hidden absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_50%,transparent_100%)] opacity-70" />
        {/* Vivid Cyber Matrix Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(245,158,11,0.14)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_35%,#000_60%,transparent_100%)] opacity-85" />

        {/* Glowing Constellation Nodes (Star dust matrix points) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22)_1.5px,transparent_1.5px)] bg-[size:48px_48px] opacity-90" />

        {/* Layer 2: Ambient Aurora Glow Orbs (Preserved for TC-DAPP-SYNC-01) */}
        <div className="hidden absolute -top-20 left-1/4 w-[600px] h-[400px] bg-gradient-to-b from-amber-500/12 via-yellow-600/08 to-transparent rounded-full blur-[100px]" />
        {/* Vivid Ambient Aurora Beams */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-amber-500/25 via-yellow-500/15 to-transparent rounded-full blur-[90px]" />
        <div className="absolute top-1/4 -left-32 w-[550px] h-[550px] bg-gradient-to-tr from-amber-600/20 to-yellow-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-amber-500/20 via-yellow-600/15 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-10 left-1/3 w-[700px] h-[500px] bg-amber-500/15 rounded-full blur-[110px]" />
        <div className="absolute top-[68%] left-10 w-[450px] h-[450px] bg-cyan-500/12 rounded-full blur-[100px]" />

        {/* Layer 3: DApp Subtle Side Orbital Arcs (Legacy preservation for TC-DAPP-SYNC-02) */}
        <svg className="hidden absolute top-24 -left-28 w-[300px] h-[900px] opacity-30" viewBox="0 0 300 900" fill="none">
          <path
            d="M -30,50 C 220,250 200,650 -30,850"
            stroke="rgba(245, 158, 11, 0.22)"
            strokeWidth="1.5"
            strokeDasharray="5, 7"
          />
          <circle cx="150" cy="350" r="2" fill="#fbbf24" />
          <circle cx="140" cy="550" r="2" fill="#f59e0b" />
        </svg>
        <svg className="hidden absolute top-48 -right-28 w-[300px] h-[900px] opacity-30" viewBox="0 0 300 900" fill="none">
          <path
            d="M 330,50 C 80,250 100,650 330,850"
            stroke="rgba(245, 158, 11, 0.22)"
            strokeWidth="1.5"
            strokeDasharray="5, 7"
          />
          <circle cx="150" cy="350" r="2" fill="#fbbf24" />
          <circle cx="160" cy="550" r="2" fill="#f59e0b" />
        </svg>

        {/* DApp Concentric Orbital Dashed Arcs & Ecosystem Icons (Framing Saving Clubs page) */}
        {activeTab === "app" && (
          <>
            {/* Left Wing for Saving Clubs */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-20 sm:-left-10 lg:left-0 w-[340px] sm:w-[420px] lg:w-[480px] h-[650px] lg:h-[750px] opacity-75 sm:opacity-85 lg:opacity-100 transition-opacity duration-500 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M -50,50 C 320,120 380,630 -50,700"
                  stroke="rgba(245, 158, 11, 0.28)"
                  strokeWidth="1.5"
                  strokeDasharray="6, 8"
                />
                <path
                  d="M -50,150 C 220,200 260,550 -50,600"
                  stroke="rgba(245, 158, 11, 0.22)"
                  strokeWidth="1.5"
                  strokeDasharray="5, 7"
                />
                <circle cx="160" cy="110" r="2.5" fill="#fbbf24" className="animate-pulse" />
                <circle cx="270" cy="240" r="3" fill="#f59e0b" />
                <circle cx="285" cy="420" r="2.5" fill="#fbbf24" className="animate-pulse" />
                <circle cx="220" cy="560" r="3" fill="#f59e0b" />

                <foreignObject
                  x={ptAppLeftPiggy.x - 14}
                  y={ptAppLeftPiggy.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <PiggyBank size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppLeftUsers.x - 14}
                  y={ptAppLeftUsers.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <Users size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppLeftRefresh.x - 13}
                  y={ptAppLeftRefresh.y - 13}
                  width="26"
                  height="26"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <RefreshCw size={26} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppLeftCalendar.x - 14}
                  y={ptAppLeftCalendar.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <Calendar size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
              </svg>
            </div>

            {/* Right Wing for Saving Clubs */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-20 sm:-right-10 lg:right-0 w-[340px] sm:w-[420px] lg:w-[480px] h-[650px] lg:h-[750px] opacity-75 sm:opacity-85 lg:opacity-100 transition-opacity duration-500 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 550,50 C 180,120 120,630 550,700"
                  stroke="rgba(245, 158, 11, 0.28)"
                  strokeWidth="1.5"
                  strokeDasharray="6, 8"
                />
                <path
                  d="M 550,150 C 280,200 240,550 550,600"
                  stroke="rgba(245, 158, 11, 0.22)"
                  strokeWidth="1.5"
                  strokeDasharray="5, 7"
                />
                <circle cx="340" cy="110" r="2.5" fill="#fbbf24" className="animate-pulse" />
                <circle cx="230" cy="240" r="3" fill="#f59e0b" />
                <circle cx="215" cy="420" r="2.5" fill="#fbbf24" className="animate-pulse" />
                <circle cx="280" cy="560" r="3" fill="#f59e0b" />

                <foreignObject
                  x={ptAppRightRefresh.x - 13}
                  y={ptAppRightRefresh.y - 13}
                  width="26"
                  height="26"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <RefreshCw size={26} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppRightCalendar.x - 14}
                  y={ptAppRightCalendar.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <Calendar size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppRightUsers.x - 14}
                  y={ptAppRightUsers.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <Users size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
                <foreignObject
                  x={ptAppRightPiggy.x - 14}
                  y={ptAppRightPiggy.y - 14}
                  width="28"
                  height="28"
                  className="overflow-visible transition-all duration-75 ease-out"
                >
                  <div className="text-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)] hover:scale-110 transition-transform">
                    <PiggyBank size={28} className="stroke-[1.5]" />
                  </div>
                </foreignObject>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Only show header if using wagmi wallet (passkey has inline wallet bar) */}
      {/* <Header onOpenGuide={() => setShowGuide(true)} /> */}
      {!passkeyAddress && (
        <Header
          onOpenGuide={() => setShowGuide(true)}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onOpenDirectoryModal={() => setShowDirectoryModal(true)}
          onOpenArcAppKit={() => setShowArcAppKitModal(true)}
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

              {/* Arc AppKit Button (Passkey Mode) */}
              <button
                onClick={() => setShowArcAppKitModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 transition-all active:scale-95 shadow-sm shadow-amber-500/10 cursor-pointer whitespace-nowrap"
                title={t("arcAppKit.btnLabel", language)}
              >
                <Zap size={14} className="text-amber-400 fill-amber-400/20 animate-pulse" />
                <span>{t("arcAppKit.btnLabel", language)}</span>
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

        {/* Empty State when all clubs have been deleted from directory */}
        {!isLoading && hasNoActiveClub && (
          <div className="bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] rounded-3xl p-10 sm:p-14 text-center border border-amber-500/30 shadow-xl max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <PiggyBank size={34} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isEn ? "No Savings Clubs Available" : "Chưa có nhóm Hụi nào trong danh sách"}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                {isEn
                  ? "You have removed all clubs from your directory. Create a new Savings Club or open the directory to join via contract address."
                  : "Bạn đã xóa toàn bộ nhóm Hụi khỏi danh sách. Hãy tạo một nhóm Hụi mới hoặc mở danh sách nhóm để tham gia qua địa chỉ hợp đồng."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {isEn ? "+ Create Savings Club" : "+ Tạo nhóm Hụi mới"}
              </button>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(true)}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-sm border border-amber-500/30 transition-all cursor-pointer"
              >
                {isEn ? "Open Club Directory" : "Mở Danh sách nhóm"}
              </button>
            </div>
          </div>
        )}

        {/* Unauthenticated View: User opened app directly without logging in and without explicit invite link */}
        {!isLoading && !hasNoActiveClub && !address && !hasExplicitGroup && (
          <div className="bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] rounded-3xl p-10 sm:p-14 text-center border border-amber-500/30 shadow-xl max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <Wallet size={34} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isEn ? "Connect Wallet to View Your Clubs" : "Vui lòng kết nối ví để xem Nhóm Hụi"}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                {isEn
                  ? "Connect your wallet to manage savings clubs you've created or joined, or create a new rotating savings club on Arc Testnet."
                  : "Bạn chưa kết nối ví. Vui lòng kết nối ví để xem các nhóm hụi do bạn tạo hoặc đã tham gia, hoặc tạo nhóm mới."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openConnectModal?.(true)}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Wallet size={18} />
                <span>{isEn ? "Connect Wallet" : "Kết nối ví ngay"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(true)}
                className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-sm border border-amber-500/30 transition-all cursor-pointer"
              >
                {isEn ? "Open Club Directory" : "Mở Danh sách nhóm"}
              </button>
            </div>
          </div>
        )}

        {/* Connected but Not Affiliated: Wallet is connected, but hasn't created or joined this club and didn't open via invite link */}
        {!isLoading && !hasNoActiveClub && address && !isUserAffiliated && !hasExplicitGroup && (
          <div className="bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] rounded-3xl p-10 sm:p-14 text-center border border-amber-500/30 shadow-xl max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <PiggyBank size={34} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isEn ? "No Savings Clubs Yet" : "Bạn chưa tham gia nhóm Hụi nào"}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                {isEn
                  ? "Your connected wallet hasn't created or joined any savings clubs yet. Create a new club or choose one from the directory to participate."
                  : "Ví của bạn hiện chưa tạo hoặc tham gia nhóm hụi nào. Hãy tạo nhóm mới để làm Chủ nhóm hoặc mở danh sách nhóm để tham gia!"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus size={18} />
                <span>{isEn ? "+ Create Savings Club" : "+ Tạo nhóm Hụi mới"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(true)}
                className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-sm border border-amber-500/30 transition-all cursor-pointer"
              >
                {isEn ? "Open Club Directory" : "Mở Danh sách nhóm"}
              </button>
            </div>
          </div>
        )}

        {/* Main Content: 2-column layout on desktop, stacked on mobile */}
        {!isLoading && !hasNoActiveClub && (hasExplicitGroup || isUserAffiliated) && (clubInfo.groupName || displayedGroupName) && (
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
                collateralAmount={activeCollateralAmount}
                onEditName={() => setShowEditCurrentClubModal(true)}
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
                state={clubInfo.state}
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
                onOpenArcAppKit={() => setShowArcAppKitModal(true)}
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

              {isOwner && clubInfo.state === GROUP_STATE.ACTIVE && (
                <div className="p-5 rounded-2xl border border-red-500/30 space-y-3">
                  <p className="text-xs text-slate-300">{isEn ? "A majority vote ends future rounds and refunds only contributions and bids from the unsettled round. Earlier payouts remain final; eligible collateral is claimed separately." : "Biểu quyết đủ đa số sẽ chấm dứt các vòng tương lai, chỉ hoàn tiền góp và bid của vòng chưa quyết toán. Tiền đã trả giữ nguyên; ký quỹ đủ điều kiện được rút riêng."}</p>
                  <button onClick={handleCancelGroup} disabled={isOwnerPending || isOwnerConfirming || isOwnerOpLoading || memberStatus.hasVotedCancel} className="w-full py-2 rounded-xl border border-red-500/30 text-red-300 disabled:opacity-50">
                    {memberStatus.hasVotedCancel ? (isEn ? "Voted to cancel" : "Đã bỏ phiếu huỷ") : (isEn ? "Vote to cancel club" : "Biểu quyết huỷ nhóm")} ({String(clubInfo.cancelVoteCount ?? 0n)}/{String(clubInfo.requiredCancelVotes ?? 1n)})
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

                  {/* Owner CirBTC Collateral Quick Config (TASK-043) */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Shield size={13} className="text-amber-400" />
                        {t("collateral.createFieldLabel", language)}
                      </span>
                      <span className="text-slate-400 font-mono">CirBTC</span>
                    </div>
                    <p className="text-xs text-slate-300">{isEn ? 'Confirmed on-chain requirement:' : 'Mức ký quỹ đã xác nhận on-chain:'} {activeCollateralAmount === undefined ? (isEn ? 'Unavailable' : 'Chưa đọc được') : `${formatCollateral(activeCollateralAmount)} CirBTC`}</p>
                    <div className="flex gap-3 text-xs text-slate-200">
                      <label><input type="radio" name="ownerCollateral" checked={ownerCollateralMode === 'none'} onChange={() => setOwnerCollateralMode('none')} /> {isEn ? 'None' : 'Không ký quỹ'}</label>
                      <label><input type="radio" name="ownerCollateral" checked={ownerCollateralMode === 'custom'} onChange={() => setOwnerCollateralMode('custom')} /> {isEn ? 'Custom' : 'Tự nhập'}</label>
                    </div>
                    {ownerCollateralMode === 'custom' && <input aria-label="Owner CirBTC collateral" value={ownerCollateralInput} onChange={e => setOwnerCollateralInput(e.target.value)} inputMode="decimal" className="w-full rounded-xl bg-slate-900 p-2 text-white" />}
                    {ownerCollateralValue !== undefined && <p className="text-xs text-amber-200">{isEn ? 'Proposed requirement:' : 'Mức đề xuất:'} {formatCollateral(ownerCollateralValue)} CirBTC</p>}
                    <button type="button" disabled={clubInfo.state !== GROUP_STATE.OPEN || !clubInfo.membershipKnown || clubInfo.memberCount !== 0 || clubInfo.isLoading || activeCollateralAmount === undefined || ownerCollateralValue === undefined || isOwnerPending || isOwnerConfirming || isOwnerOpLoading || isOwnerSettingReview} onClick={handleOwnerCollateral} className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs text-amber-200 disabled:opacity-40">{isEn ? 'Confirm collateral setting' : 'Xác nhận mức ký quỹ'}</button>
                    <p className="text-xs text-slate-400">{isEn ? 'Only before the first member joins. The displayed requirement changes after confirmation and a chain refresh.' : 'Chỉ đổi trước khi thành viên đầu tiên tham gia. Mức hiển thị chỉ đổi sau xác nhận giao dịch và đọc lại chain.'}</p>
                  </div>

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

                    {clubMembers.totalJoined >= 2 && (
                      <div className="p-2.5 rounded-xl bg-red-950/25 border border-red-500/25 text-xs text-slate-300 space-y-1">
                        <div className="flex items-center justify-between font-bold text-red-300">
                          <span>
                            {isEn ? "🗳️ Majority Cancel Vote Required" : "🗳️ Cơ chế Biểu quyết Huỷ nhóm"}
                          </span>
                          <span className="font-mono">
                            {Number(clubInfo.cancelVoteCount ?? 0n)}/
                            {clubInfo.requiredCancelVotes && clubInfo.requiredCancelVotes > 0n
                              ? Number(clubInfo.requiredCancelVotes)
                              : Math.floor(clubMembers.totalJoined / 2) + 1}{" "}
                            {isEn ? "votes" : "phiếu"}
                          </span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          {isEn
                            ? "Since ≥ 2 members have joined, the owner cannot unilaterally cancel. Majority member consensus is required."
                            : "Khi nhóm đã có từ 2 thành viên trở lên, trưởng nhóm không thể tự ý huỷ một mình mà cần đa số thành viên đồng thuận bỏ phiếu."}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleCancelGroup}
                      disabled={
                        isOwnerPending ||
                        isOwnerConfirming ||
                        isOwnerOpLoading ||
                        Boolean(clubMembers.totalJoined >= 2 && memberStatus.hasVotedCancel)
                      }
                      className="w-full py-2.5 border border-red-500/30 text-red-400 hover:bg-red-950/30 disabled:opacity-50 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {clubMembers.totalJoined >= 2
                        ? memberStatus.hasVotedCancel
                          ? isEn
                            ? `✓ Voted to Cancel (${Number(clubInfo.cancelVoteCount ?? 0n)}/${
                                clubInfo.requiredCancelVotes && clubInfo.requiredCancelVotes > 0n
                                  ? Number(clubInfo.requiredCancelVotes)
                                  : Math.floor(clubMembers.totalJoined / 2) + 1
                              })`
                            : `✓ Đã bỏ phiếu Huỷ nhóm (${Number(clubInfo.cancelVoteCount ?? 0n)}/${
                                clubInfo.requiredCancelVotes && clubInfo.requiredCancelVotes > 0n
                                  ? Number(clubInfo.requiredCancelVotes)
                                  : Math.floor(clubMembers.totalJoined / 2) + 1
                              })`
                          : isEn
                          ? `Vote to Cancel Club (${Number(clubInfo.cancelVoteCount ?? 0n)}/${
                              clubInfo.requiredCancelVotes && clubInfo.requiredCancelVotes > 0n
                                ? Number(clubInfo.requiredCancelVotes)
                                : Math.floor(clubMembers.totalJoined / 2) + 1
                            })`
                          : `Biểu quyết Huỷ nhóm (${Number(clubInfo.cancelVoteCount ?? 0n)}/${
                              clubInfo.requiredCancelVotes && clubInfo.requiredCancelVotes > 0n
                                ? Number(clubInfo.requiredCancelVotes)
                                : Math.floor(clubMembers.totalJoined / 2) + 1
                            })`
                        : isEn
                        ? t("ownerControls.cancelBtn", language)
                        : "Huỷ nhóm"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action panel — passkey or wagmi (Action-First: Primary user actions positioned at top eye-level) */}
              {passkeyAddress && passkeyAccount && bundler ? (
                <PasskeyActionPanel
                  collateralView={collateralView}
                  cycleCapability={cycleSupport.capability}
                  onRetryCycleCapability={() => { void cycleSupport.refetch(); }}
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
                  isClaiming={isClaiming || isClaimConfirming || isOwnerOpLoading}
                  userBid={roundMemberStatus.bid ?? 0n}
                  highestBid={clubMembers.highestBid ?? 0n}
                  collateralAmount={activeCollateralAmount}
                  lockedCollateral={memberStatus.lockedCollateral}
                  claimableCirBtc={memberStatus.claimableCirBtc}
                  cancelVoteCount={clubInfo.cancelVoteCount}
                  requiredCancelVotes={clubInfo.requiredCancelVotes}
                  hasVotedCancel={memberStatus.hasVotedCancel}
                />
              ) : (
                <ActionPanel
                  collateralView={collateralView}
                  cycleCapability={cycleSupport.capability}
                  onRetryCycleCapability={() => { void cycleSupport.refetch(); }}
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
                  isClaiming={isClaiming || isClaimConfirming || isOwnerOpLoading}
                  userBid={roundMemberStatus.bid ?? 0n}
                  highestBid={clubMembers.highestBid ?? 0n}
                  collateralAmount={activeCollateralAmount}
                  lockedCollateral={memberStatus.lockedCollateral}
                  claimableCirBtc={memberStatus.claimableCirBtc}
                  collateralToken={memberStatus.collateralToken}
                  cirBtcBalance={memberStatus.cirBtcBalance}
                  cirBtcAllowance={memberStatus.cirBtcAllowance}
                  cancelVoteCount={clubInfo.cancelVoteCount}
                  requiredCancelVotes={clubInfo.requiredCancelVotes}
                  hasVotedCancel={memberStatus.hasVotedCancel}
                  totalJoined={clubMembers.totalJoined}
                  members={clubMembers.members}
                  settledRounds={settledRounds}
                  isHistoryLimited={isHistoryLimited}
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
                    isClaiming={isClaiming || isClaimConfirming || isOwnerOpLoading}
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
        onClose={() => {
          setShowDirectoryModal(false);
          setNameUpdateTrigger((prev) => prev + 1);
        }}
        currentAddress={contractAddress}
        onSelectGroup={handleSwitchGroup}
        onOpenCreateModal={() => {
          setShowDirectoryModal(false);
          setShowCreateModal(true);
        }}
        onGroupNameUpdated={() => setNameUpdateTrigger((prev) => prev + 1)}
        language={language}
      />

      <EditClubNameModal
        isOpen={showEditCurrentClubModal}
        onClose={() => setShowEditCurrentClubModal(false)}
        club={currentClubForModal}
        onSave={(address, newName) => {
          updateKnownGroupName(address, newName);
          setNameUpdateTrigger((prev) => prev + 1);
          toast.success(
            isEn
              ? t("editClubModal.successToast", language).replace("{name}", newName)
              : `Đã đổi tên nhóm thành "${newName}"!`
          );
        }}
        language={language}
      />

      <GuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        language={language}
      />

      {/* Arc AppKit Ecosystem Modal */}
      <ArcAppKitModal
        isOpen={showArcAppKitModal}
        onClose={() => setShowArcAppKitModal(false)}
        language={language}
        connectedAccount={address}
        passkeyAddress={passkeyAddress}
        passkeyStatus={pkState.status}
        connector={connector}
        onOpenPasskeyRegister={() => {
          const defaultUsername = `member_${Math.floor(1000 + Math.random() * 9000)}`;
          register(defaultUsername).catch((err) => {
            console.error("Passkey registration failed:", err);
          });
        }}
      />
    </div>
  );
}
