import { formatRoundDuration } from "../../lib/bondedDisplay";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { toast } from "sonner";
import {
  X,
  Plus,
  Layers,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import {
  formatAddress,
  formatUsdc,
  ROTATING_SAVINGS_ABI,
  ARC_TESTNET_CHAIN_ID,
  GROUP_STATE,
} from "../../contract";
import { buildAddressExplorerUrl } from "../../onchain-facts";
import {
  getKnownGroups,
  getRemovedGroups,
  removeKnownGroup,
  updateKnownGroupName,
  clearCustomKnownGroups,
  syncFactoryBondedClubs,
  saveKnownGroup,
  DEFAULT_SAVINGS_CLUBS,
  SavingsClubItem,
} from "../../lib/savingsClubDirectory";
import {
  CANONICAL_FACTORY,
  registerRuntimeBondedClub,
  ARC_TESTNET_DEFAULT_BONDED_CLUB,
  HIDDEN_DEMO_CLUBS,
} from "../../config/bonded-tontine";
import { BONDED_TONTINE_ABI, BONDED_TONTINE_FACTORY_ABI } from "../../lib/bondedTontine";
import { Language, t } from "../../lib/i18n";
import { EditClubNameModal } from "./EditClubNameModal";

interface ClubDirectoryModalProps {
  account?: string;
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectGroup: (address: `0x${string}`) => void;
  onOpenCreateModal: () => void;
  onGroupNameUpdated?: (address: `0x${string}`, newName: string) => void;
  language?: Language;
}

export const CANONICAL_BONDED_CLUBS: SavingsClubItem[] = [
  {
    address: ARC_TESTNET_DEFAULT_BONDED_CLUB,
    name: "Saigon Bonded Club V2",
    version: "v2-bonded",
    isDefault: true,
  },
];


export function ClubDirectoryModal({
  account,
  isOpen,
  onClose,
  currentAddress,
  onSelectGroup,
  onOpenCreateModal,
  onGroupNameUpdated,
  language = "vi",
}: ClubDirectoryModalProps) {
  const [groups, setGroups] = useState<SavingsClubItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [confirmingClub, setConfirmingClub] = useState<SavingsClubItem | null>(null);
  const [editingClub, setEditingClub] = useState<SavingsClubItem | null>(null);
  const isEn = language === "en";

  const displayedGroups = useMemo(() => {
    const removed = getRemovedGroups(account);
    const rawList = groups.length > 0 ? groups : getKnownGroups(account);
    const hiddenSet = new Set(HIDDEN_DEMO_CLUBS.map((a) => a.toLowerCase()));

    const list = rawList.filter((g) => {
      const addr = g.address.toLowerCase();
      if (removed.has(addr)) return false;
      if (hiddenSet.has(addr)) return false;
      // Filter out legacy default V1 clubs so directory stays clean with Bonded V2
      if (g.isDefault && g.version !== "v2-bonded") return false;
      return true;
    });

    const hasBonded = list.some((g) => g.version === "v2-bonded");
    if (!hasBonded) {
      const fallback = CANONICAL_BONDED_CLUBS.filter(
        (c) => !removed.has(c.address.toLowerCase())
      );
      return [...fallback, ...list];
    }
    return list;
  }, [groups, account]);

  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const canonicalFactory = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];

  useEffect(() => {
    if (isOpen) {
      let currentKnown = getKnownGroups(account);
      const hasBonded = currentKnown.some((g) => g.version === "v2-bonded");
      if (!hasBonded) {
        const removed = getRemovedGroups(account);
        for (const item of CANONICAL_BONDED_CLUBS) {
          if (!removed.has(item.address.toLowerCase())) {
            saveKnownGroup({
              address: item.address,
              name: item.name,
              version: "v2-bonded",
            }, account);
            registerRuntimeBondedClub(item.address);
          }
        }
        currentKnown = getKnownGroups(account);
      }
      setGroups(currentKnown);
    }
    if (!isOpen || !publicClient || !canonicalFactory) return;
    let cancelled = false;
    setIsSyncing(true);
    void (async () => {
      try {
        const synced = await syncFactoryBondedClubs(
          publicClient as unknown as Parameters<typeof syncFactoryBondedClubs>[0],
          canonicalFactory,
          BONDED_TONTINE_FACTORY_ABI as unknown as readonly unknown[],
          BONDED_TONTINE_ABI as unknown as readonly unknown[],
          account
        );
        for (const item of synced) {
          registerRuntimeBondedClub(item.address);
        }
        if (currentAddress && currentAddress.startsWith("0x")) {
          const removed = getRemovedGroups(account);
          if (!removed.has(currentAddress.toLowerCase())) {
            const isClub = await publicClient.readContract({
              address: canonicalFactory,
              abi: BONDED_TONTINE_FACTORY_ABI,
              functionName: "isClub",
              args: [currentAddress as `0x${string}`],
            });
            if (isClub) {
              registerRuntimeBondedClub(currentAddress);
              let clubName = `Bonded Club ${formatAddress(currentAddress)}`;
              try {
                const nameOnChain = await publicClient.readContract({
                  address: currentAddress as `0x${string}`,
                  abi: BONDED_TONTINE_ABI,
                  functionName: "groupName",
                });
                if (typeof nameOnChain === "string" && nameOnChain.trim()) {
                  clubName = nameOnChain.trim();
                }
              } catch {
                // ignore
              }
              saveKnownGroup({
                address: currentAddress as `0x${string}`,
                name: clubName,
                version: "v2-bonded",
              }, account);
              if (!cancelled) onGroupNameUpdated?.(currentAddress as `0x${string}`, clubName);
            }
          }
        }
        if (!cancelled && isOpen) {
          const removed = getRemovedGroups(account);
          const hiddenSet = new Set(HIDDEN_DEMO_CLUBS.map((a) => a.toLowerCase()));
          setGroups(
            getKnownGroups(account).filter(
              (g) => !removed.has(g.address.toLowerCase()) && !hiddenSet.has(g.address.toLowerCase())
            )
          );
        }
      } catch {
        // Ignore network errors
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, publicClient, canonicalFactory, currentAddress, account]);

  // Read rich parameters for all clubs: state, memberCount, maxMembers, contributionAmount, roundDuration, owner
  const stateContracts = useMemo(() => {
    return displayedGroups.flatMap((g) => {
      const isBonded = g.version === "v2-bonded";
      const abi = (isBonded ? BONDED_TONTINE_ABI : ROTATING_SAVINGS_ABI) as Abi;
      return [
        {
          address: g.address,
          abi,
          functionName: "state",
          chainId: ARC_TESTNET_CHAIN_ID,
        },
        ...(isBonded
          ? [
              {
                address: g.address,
                abi,
                functionName: "memberCount",
                chainId: ARC_TESTNET_CHAIN_ID,
              },
            ]
          : [
              {
                address: g.address,
                abi,
                functionName: "members",
                args: [0n],
                chainId: ARC_TESTNET_CHAIN_ID,
              },
            ]),
        {
          address: g.address,
          abi,
          functionName: "maxMembers",
          chainId: ARC_TESTNET_CHAIN_ID,
        },
        {
          address: g.address,
          abi,
          functionName: "contributionAmount",
          chainId: ARC_TESTNET_CHAIN_ID,
        },
        {
          address: g.address,
          abi,
          functionName: "roundDuration",
          chainId: ARC_TESTNET_CHAIN_ID,
        },
        {
          address: g.address,
          abi,
          functionName: "owner",
          chainId: ARC_TESTNET_CHAIN_ID,
        },
      ];
    });
  }, [displayedGroups]);

  const { data: stateData } = useReadContracts({
    contracts: stateContracts,
    query: {
      enabled: isOpen && displayedGroups.length > 0,
    },
  });

  const visibleGroups = displayedGroups.map((group, groupIndex) => ({ group, groupIndex })).filter(({ group, groupIndex }) => {
    const result = stateData?.[groupIndex * 6];
    return result?.status !== "success" || Number(result.result) !== (group.version === "v2-bonded" ? 4 : GROUP_STATE.CANCELLED);
  });

  const customGroupsCount = useMemo(() => {
    return groups.filter((g) => !g.isDefault).length;
  }, [groups, account]);

  const handleClearCustomGroups = () => {
    if (customGroupsCount === 0) {
      toast.info(isEn ? t("clubDirectoryModal.clearOldClubsEmpty", language) : "Danh bạ hiện đã sạch sẽ, chỉ chứa các nhóm mặc định.");
      return;
    }
    clearCustomKnownGroups(account);
    setGroups([...DEFAULT_SAVINGS_CLUBS]);
    toast.success(
      isEn
        ? t("clubDirectoryModal.clearOldClubsSuccess", language)
        : "Đã dọn dẹp danh sách nhóm hụi cũ!"
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmingClub) {
          setConfirmingClub(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, confirmingClub]);

  if (!isOpen) return null;

  const handleCopy = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
      toast.success(isEn ? t("clubDirectoryModal.copyAddrSuccess", language) : "Đã sao chép địa chỉ nhóm!");
    } catch {
      toast.error(isEn ? t("clubDirectoryModal.copyAddrFail", language) : "Không thể sao chép địa chỉ.");
    }
  };

  const handleSelect = (group: SavingsClubItem) => {
    if (group.address.toLowerCase() === currentAddress.toLowerCase()) {
      return;
    }
    onSelectGroup(group.address);
    onClose();
    if (isEn) {
      toast.success(`Switched to club ${group.name}!`);
    } else {
      toast.success(`Đã chuyển sang nhóm ${group.name}!`);
    }
  };

  const handleCreateNew = () => {
    onClose();
    onOpenCreateModal();
  };

  const handleDeleteGroup = (group: SavingsClubItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupIndex = displayedGroups.findIndex(
      (g) => g.address.toLowerCase() === group.address.toLowerCase()
    );
    const baseIdx = groupIndex * 6;
    const rawState =
      stateData?.[baseIdx]?.status === "success"
        ? (stateData[baseIdx].result as number)
        : undefined;
    const isBonded = group.version === "v2-bonded";
    const memberCount = isBonded
      ? (stateData?.[baseIdx + 1]?.status === "success" ? BigInt(stateData[baseIdx + 1].result as any) : 0n)
      : (stateData?.[baseIdx + 1]?.status === "success" && stateData[baseIdx + 1].result ? 1n : 0n);
    const hasMember0 = memberCount > 0n;
    const isActive =
      rawState === GROUP_STATE.ACTIVE ||
      (rawState === GROUP_STATE.OPEN && hasMember0);

    if (group.isDefault || isActive) {
      toast.error(
        isEn
          ? t("clubDirectoryModal.deleteActiveError", language)
          : "Không thể xóa nhóm đang hoạt động!"
      );
      return;
    }
    setConfirmingClub(group);
  };

  const handleConfirmDelete = () => {
    if (!confirmingClub) return;
    const group = confirmingClub;
    const groupIndex = displayedGroups.findIndex(
      (g) => g.address.toLowerCase() === group.address.toLowerCase()
    );
    const baseIdx = groupIndex * 6;
    const rawState =
      stateData?.[baseIdx]?.status === "success"
        ? (stateData[baseIdx].result as number)
        : undefined;
    const isBonded = group.version === "v2-bonded";
    const memberCount = isBonded
      ? (stateData?.[baseIdx + 1]?.status === "success" ? BigInt(stateData[baseIdx + 1].result as any) : 0n)
      : (stateData?.[baseIdx + 1]?.status === "success" && stateData[baseIdx + 1].result ? 1n : 0n);
    const hasMember0 = memberCount > 0n;
    const isActive =
      rawState === GROUP_STATE.ACTIVE ||
      (rawState === GROUP_STATE.OPEN && hasMember0);

    if (group.isDefault || isActive) {
      toast.error(
        isEn
          ? t("clubDirectoryModal.deleteActiveError", language)
          : "Không thể xóa nhóm đang hoạt động!"
      );
      setConfirmingClub(null);
      return;
    }
    removeKnownGroup(group.address, account);
    const hiddenSet = new Set(HIDDEN_DEMO_CLUBS.map((a) => a.toLowerCase()));
    const updated = getKnownGroups(account).filter((g) => {
      const addr = g.address.toLowerCase();
      if (addr === group.address.toLowerCase()) return false;
      if (hiddenSet.has(addr)) return false;
      if (g.isDefault && g.version !== "v2-bonded") return false;
      return true;
    });
    setGroups(updated);
    setConfirmingClub(null);
    onGroupNameUpdated?.(group.address, group.name);

    const isCurrent = group.address.toLowerCase() === currentAddress.toLowerCase();
    if (isCurrent) {
      if (updated.length > 0) {
        const fallbackAddress = updated[0].address;
        onSelectGroup(fallbackAddress);
        if (typeof window !== "undefined") {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set("group", fallbackAddress);
            window.history.replaceState({}, "", url.toString());
          } catch {
            // ignore
          }
        }
      } else {
        if (typeof window !== "undefined") {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("group");
            window.history.replaceState({}, "", url.toString());
          } catch {
            // ignore
          }
        }
      }
      const msg = isEn
        ? t("clubDirectoryModal.deleteClubAndSwitched", language).replace("{name}", group.name)
        : `Đã ẩn nhóm "${group.name}" và chuyển về nhóm mặc định!`;
      toast.success(msg);
    } else {
      const msg = isEn
        ? t("clubDirectoryModal.deleteClubSuccess", language).replace("{name}", group.name)
        : `Đã ẩn nhóm "${group.name}" khỏi danh sách của bạn!`;
      toast.success(msg);
    }
  };

  const handleSaveClubName = (address: `0x${string}`, newName: string) => {
    updateKnownGroupName(address, newName, account);
    const updated = getKnownGroups(account);
    setGroups(updated);
    if (onGroupNameUpdated) {
      onGroupNameUpdated(address, newName);
    }
    toast.success(
      isEn
        ? t("editClubModal.successToast", language).replace("{name}", newName)
        : `Đã đổi tên nhóm thành "${newName}"!`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-directory-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] text-white shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-amber-500/10 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="club-directory-title" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
                <span>{isEn ? t("clubDirectoryModal.title", language) : "Danh Sách Nhóm Hụi"}</span>
                {isSyncing && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal animate-pulse">
                    {isEn ? "Syncing..." : "Đang đồng bộ..."}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn ? t("clubDirectoryModal.subtitle", language) : "Chọn nhóm hụi trên mạng Arc Testnet để tham gia hoặc quản lý"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isEn ? t("clubDirectoryModal.closeBtn", language) : "Đóng"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Club List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {visibleGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              {isEn ? t("clubDirectoryModal.noClubs", language) : "Chưa có nhóm nào trong danh sách."}
            </div>
          ) : (
            visibleGroups.map(({ group, groupIndex }) => {
              const isCurrent = group.address.toLowerCase() === currentAddress.toLowerCase();
              const baseIdx = groupIndex * 6;
              const rawState =
                stateData?.[baseIdx]?.status === "success"
                  ? (stateData[baseIdx].result as number)
                  : undefined;
              const isBonded = group.version === "v2-bonded";
              const memberCount = isBonded
                ? (stateData?.[baseIdx + 1]?.status === "success" ? BigInt(stateData[baseIdx + 1].result as any) : 0n)
                : (stateData?.[baseIdx + 1]?.status === "success" && stateData[baseIdx + 1].result ? 1n : 0n);
              const maxMembers =
                stateData?.[baseIdx + 2]?.status === "success"
                  ? BigInt(stateData[baseIdx + 2].result as any)
                  : 0n;
              const contributionAmount =
                stateData?.[baseIdx + 3]?.status === "success"
                  ? BigInt(stateData[baseIdx + 3].result as any)
                  : 0n;
              const roundDuration =
                stateData?.[baseIdx + 4]?.status === "success"
                  ? Number(stateData[baseIdx + 4].result as any)
                  : 0;
              const owner =
                stateData?.[baseIdx + 5]?.status === "success"
                  ? String(stateData[baseIdx + 5].result)
                  : undefined;
              const hasMember0 = memberCount > 0n;
              const isActive =
                rawState === GROUP_STATE.ACTIVE ||
                (rawState === GROUP_STATE.OPEN && hasMember0);

              return (
                <div
                  key={group.address}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent shadow-md shadow-amber-500/5"
                      : "border-slate-800 bg-[#0c0d14]/70 hover:border-amber-500/30 hover:bg-[#0c0d14]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base sm:text-lg">
                          <span className="text-white">{group.name} <span className="text-xs font-mono text-amber-300">{formatAddress(group.address)}</span></span>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClub(group);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isEn ? t("editClubModal.editTooltip", language) : "Đổi tên nhóm"}
                          aria-label={isEn ? `Edit name for ${group.name}` : `Đổi tên nhóm ${group.name}`}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* On-chain Status Badge with Real Member Count */}
                        {rawState === GROUP_STATE.OPEN && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {memberCount > 0n
                              ? (isEn ? `Open (${memberCount}${maxMembers > 0n ? `/${maxMembers}` : ""} members)` : `Mở tham gia (${memberCount}${maxMembers > 0n ? `/${maxMembers}` : ""} tv)`)
                              : (isEn ? "Open (0 members)" : "Mở tham gia (0 tv)")}
                          </span>
                        )}
                        {rawState === GROUP_STATE.ACTIVE && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {isEn ? `Active (${memberCount} members)` : `Đang chạy (${memberCount} tv)`}
                          </span>
                        )}
                        {rawState === GROUP_STATE.COMPLETED && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-500/30">
                            {isEn ? "Completed" : "Hoàn thành"}
                          </span>
                        )}
                        {rawState === GROUP_STATE.CANCELLED && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-500/30">
                            {group.version === "v2-bonded"
                              ? (isEn ? "Defaulted" : "Đã vỡ nợ")
                              : (isEn ? "Cancelled" : "Đã huỷ")}
                          </span>
                        )}
                        {rawState === 4 && group.version === "v2-bonded" && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-500/30">
                            {isEn ? "Cancelled" : "Đã huỷ"}
                          </span>
                        )}

                        {group.version === "v2-bonded" && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            BondedTontine V2
                          </span>
                        )}

                        {group.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30">
                            <Sparkles size={12} className="text-amber-400" />
                            {isEn ? t("clubDirectoryModal.featuredBadge", language) : "Nổi bật"}
                          </span>
                        )}

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                            <Check size={12} className="text-emerald-400" />
                            {isEn ? t("clubDirectoryModal.currentBadge", language) : "Đang xem"}
                          </span>
                        )}
                      </div>

                      {/* Address and Explorer */}
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg border border-amber-500/20 font-semibold">
                          {formatAddress(group.address)}
                        </span>

                        <button
                          onClick={(e) => handleCopy(group.address, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isEn ? "Copy contract address" : "Sao chép địa chỉ hợp đồng"}
                        >
                          {copiedAddress === group.address ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        <a
                          href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, group.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-amber-300 transition-colors p-1.5"
                          title={isEn ? "View on Arc Explorer" : "Xem trên Arc Explorer"}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      {/* Distinct specs row to disambiguate clubs with identical names */}
                      {(owner || contributionAmount > 0n || roundDuration > 0) && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1.5 border-t border-slate-800/60 mt-1.5">
                          {owner && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500 font-medium">{isEn ? "Owner:" : "Chủ nhóm:"}</span>
                              <span className="font-mono text-slate-300">{formatAddress(owner)}</span>
                            </span>
                          )}
                          {contributionAmount > 0n && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500 font-medium">{isEn ? "Contrib:" : "Mức góp:"}</span>
                              <span className="text-amber-300 font-semibold">{formatUsdc(contributionAmount)} USDC</span>
                            </span>
                          )}
                          {roundDuration > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500 font-medium">{isEn ? "Round:" : "Vòng:"}</span>
                              <span className="text-slate-300 font-medium">{formatRoundDuration(roundDuration, isEn)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isCurrent ? (
                        <span className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 bg-slate-900/60 border border-slate-800 cursor-not-allowed select-none">
                          {isEn ? t("clubDirectoryModal.currentBtn", language) : "Đang xem"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelect(group)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          <span>{isEn ? t("clubDirectoryModal.switchBtn", language) : "Vào nhóm"}</span>
                          <ArrowRight size={14} />
                        </button>
                      )}

                      {/* Icon xóa / ẩn cho từng club */}
                      {isActive ? (
                        <button
                          type="button"
                          disabled={true}
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.error(
                              isEn
                                ? t("clubDirectoryModal.deleteActiveError", language)
                                : "Không thể xóa nhóm đang hoạt động!"
                            );
                          }}
                          className="p-2 rounded-xl text-slate-600 bg-slate-900/40 border border-slate-800 cursor-not-allowed opacity-40 shrink-0"
                          title={isEn ? t("clubDirectoryModal.deleteClubDisabledTooltip", language) : "Không thể xóa nhóm đang hoạt động (Mở tham gia / Đang chạy)"}
                          aria-label={isEn ? `Cannot delete active club ${group.name}` : `Không thể xóa nhóm đang hoạt động ${group.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleDeleteGroup(group, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 transition-all cursor-pointer shrink-0"
                          title={isEn ? t("clubDirectoryModal.deleteClubTooltip", language) : "Xóa nhóm khỏi danh sách (đã hủy / hết hạn / không chơi nữa)"}
                          aria-label={isEn ? `Delete ${group.name}` : `Xóa nhóm ${group.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with "Tạo nhóm mới" & "Dọn dẹp nhóm cũ" */}
        <div className="p-4 sm:p-5 border-t border-amber-500/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {isEn
                ? `${displayedGroups.length} savings clubs available`
                : `${displayedGroups.length} nhóm hụi khả dụng`}
            </p>
            {customGroupsCount > 0 && (
              <button
                onClick={handleClearCustomGroups}
                className="hidden items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title={isEn ? "Clear old test clubs" : "Dọn dẹp các nhóm thử nghiệm cũ"}
                aria-hidden="true"
              >
                <Trash2 size={13} />
                <span>{isEn ? t("clubDirectoryModal.clearOldClubsBtn", language) : "Dọn dẹp nhóm cũ"}</span>
              </button>
            )}
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
            title="Tạo nhóm Hụi mới"
            aria-label="+ Tạo nhóm mới"
          >
            <Plus size={15} />
            <span>{isEn ? t("clubDirectoryModal.createShortcutBtn", language) : "Tạo nhóm mới"}</span>
            {/* + Tạo nhóm mới */}
          </button>
        </div>
      </div>

      {/* Confirmation Modal khi Ẩn / Xóa Nhóm */}
      {confirmingClub && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          style={{ zIndex: 100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmingClub(null);
          }}
        >
          <div
            role="alertdialog"
            aria-labelledby="confirm-delete-title"
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#12131c] p-5 sm:p-6 text-white shadow-2xl shadow-red-950/40 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 id="confirm-delete-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isEn ? t("clubDirectoryModal.confirmDeleteTitle", language) : "Xác nhận xóa nhóm"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isEn
                    ? t("clubDirectoryModal.confirmDeleteDesc", language)
                        .replace("{name}", confirmingClub.name)
                        .replace("{address}", formatAddress(confirmingClub.address))
                    : t("clubDirectoryModal.confirmDeleteDesc", "vi")
                        .replace("{name}", confirmingClub.name)
                        .replace("{address}", formatAddress(confirmingClub.address))}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-200 truncate">{confirmingClub.name}</span>
              <span className="font-mono text-amber-300 shrink-0 bg-black/60 px-2 py-0.5 rounded border border-amber-500/20">
                {formatAddress(confirmingClub.address)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingClub(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                {isEn ? t("clubDirectoryModal.cancelDeleteBtn", language) : "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmDelete();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>{isEn ? t("clubDirectoryModal.confirmDeleteBtn", language) : "Xác nhận xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi Tên Nhóm (Edit Club Name Modal) */}
      <EditClubNameModal
        isOpen={!!editingClub}
        onClose={() => setEditingClub(null)}
        club={editingClub}
        onSave={handleSaveClubName}
        language={language}
      />
    </div>
  );
}
