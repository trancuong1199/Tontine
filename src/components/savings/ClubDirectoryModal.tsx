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
  ROTATING_SAVINGS_ABI,
  ARC_TESTNET_CHAIN_ID,
  GROUP_STATE,
} from "../../contract";
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
import { CANONICAL_FACTORY, registerRuntimeBondedClub } from "../../config/bonded-tontine";
import { BONDED_TONTINE_ABI, BONDED_TONTINE_FACTORY_ABI } from "../../lib/bondedTontine";
import { Language, t } from "../../lib/i18n";
import { EditClubNameModal } from "./EditClubNameModal";

interface ClubDirectoryModalProps {
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
    address: "0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b",
    name: "Saigon Bonded Club V2",
    version: "v2-bonded",
    isDefault: true,
  },
];

export function ClubDirectoryModal({
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
    const removed = getRemovedGroups();
    const rawList = groups.length > 0 ? groups : getKnownGroups();
    // Exclude old historical testnet demo clubs if user has them lingering in localStorage
    const legacyDemoAddresses = new Set([
      "0xe74069717317dbb86d423439fb9c219a5c5bf812",
      "0xf9469568ebb287275009fce3db224a16273c5d05",
      "0xe9ccfe9f2d53a5479a17d795635e0795e84d9130",
    ]);
    const list = rawList.filter((g) => {
      const addr = g.address.toLowerCase();
      if (removed.has(addr)) return false;
      if (legacyDemoAddresses.has(addr)) return false;
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
  }, [groups]);

  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const canonicalFactory = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];

  useEffect(() => {
    if (isOpen) {
      let currentKnown = getKnownGroups();
      // Ensure canonical Bonded clubs are immediately present in known groups if not previously removed
      const hasBonded = currentKnown.some((g) => g.version === "v2-bonded");
      if (!hasBonded) {
        const removed = getRemovedGroups();
        for (const item of CANONICAL_BONDED_CLUBS) {
          if (!removed.has(item.address.toLowerCase())) {
            saveKnownGroup({
              address: item.address,
              name: item.name,
              version: "v2-bonded",
            });
            registerRuntimeBondedClub(item.address);
          }
        }
        currentKnown = getKnownGroups();
      }
      setGroups(currentKnown);
    }
    if (!publicClient || !canonicalFactory) return;
    let cancelled = false;
    setIsSyncing(true);
    void (async () => {
      try {
        const synced = await syncFactoryBondedClubs(
          publicClient as unknown as Parameters<typeof syncFactoryBondedClubs>[0],
          canonicalFactory,
          BONDED_TONTINE_FACTORY_ABI as unknown as readonly unknown[],
          BONDED_TONTINE_ABI as unknown as readonly unknown[]
        );
        for (const item of synced) {
          registerRuntimeBondedClub(item.address);
        }
        if (currentAddress && currentAddress.startsWith("0x")) {
          const removed = getRemovedGroups();
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
              });
              onGroupNameUpdated?.(currentAddress as `0x${string}`, clubName);
            }
          }
        }
        if (!cancelled && isOpen) {
          const removed = getRemovedGroups();
          const legacyDemoAddresses = new Set([
            "0xe74069717317dbb86d423439fb9c219a5c5bf812",
            "0xf9469568ebb287275009fce3db224a16273c5d05",
            "0xe9ccfe9f2d53a5479a17d795635e0795e84d9130",
          ]);
          setGroups(
            getKnownGroups().filter(
              (g) => !removed.has(g.address.toLowerCase()) && !legacyDemoAddresses.has(g.address.toLowerCase())
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
  }, [isOpen, publicClient, canonicalFactory, currentAddress]);

  const stateContracts = useMemo(() => {
    return displayedGroups.flatMap((g) => [
      {
        address: g.address,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "state",
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: g.address,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "members",
        args: [0n],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
    ]);
  }, [displayedGroups]);

  const { data: stateData } = useReadContracts({
    contracts: stateContracts,
    query: {
      enabled: isOpen && displayedGroups.length > 0,
    },
  });

  const customGroupsCount = useMemo(() => {
    return groups.filter((g) => !g.isDefault).length;
  }, [groups]);

  const handleClearCustomGroups = () => {
    if (customGroupsCount === 0) {
      toast.info(isEn ? t("clubDirectoryModal.clearOldClubsEmpty", language) : "Danh bạ hiện đã sạch sẽ, chỉ chứa các nhóm mặc định.");
      return;
    }
    clearCustomKnownGroups();
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
    const rawState =
      stateData?.[groupIndex * 2]?.status === "success"
        ? (stateData[groupIndex * 2].result as number)
        : undefined;
    const hasMember0 =
      !group.isDefault &&
      stateData?.[groupIndex * 2 + 1]?.status === "success" &&
      Boolean(stateData[groupIndex * 2 + 1].result);
    const isActive =
      rawState === GROUP_STATE.ACTIVE ||
      (rawState === GROUP_STATE.OPEN && hasMember0);

    if (isActive) {
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
    const rawState =
      stateData?.[groupIndex * 2]?.status === "success"
        ? (stateData[groupIndex * 2].result as number)
        : undefined;
    const hasMember0 =
      !group.isDefault &&
      stateData?.[groupIndex * 2 + 1]?.status === "success" &&
      Boolean(stateData[groupIndex * 2 + 1].result);
    const isActive =
      rawState === GROUP_STATE.ACTIVE ||
      (rawState === GROUP_STATE.OPEN && hasMember0);

    if (isActive) {
      toast.error(
        isEn
          ? t("clubDirectoryModal.deleteActiveError", language)
          : "Không thể xóa nhóm đang hoạt động!"
      );
      setConfirmingClub(null);
      return;
    }
    removeKnownGroup(group.address);
    const updated = getKnownGroups().filter((g) => g.address.toLowerCase() !== group.address.toLowerCase());
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
        : `Đã xóa nhóm "${group.name}" và chuyển về nhóm mặc định!`;
      toast.success(msg);
    } else {
      const msg = isEn
        ? t("clubDirectoryModal.deleteClubSuccess", language).replace("{name}", group.name)
        : `Đã xóa nhóm "${group.name}" khỏi danh sách!`;
      toast.success(msg);
    }
  };

  const handleSaveClubName = (address: `0x${string}`, newName: string) => {
    updateKnownGroupName(address, newName);
    const updated = getKnownGroups();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0d14] rounded-3xl border border-amber-500/20 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                <span className="text-white">{isEn ? t("clubDirectoryModal.title", language) : "Danh Sách Nhóm Hụi"}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {isEn ? "Savings Clubs Directory on Arc Testnet" : "Savings Clubs Directory trên Arc Testnet"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title={isEn ? "Close modal" : "Đóng modal"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Directory List Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {displayedGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {isSyncing ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p>{isEn ? "Loading savings clubs from Arc Testnet..." : "Đang tải danh sách nhóm từ Arc Testnet..."}</p>
                </div>
              ) : (
                <p>{isEn ? t("clubDirectoryModal.emptyList", language) : "Chưa có nhóm nào trong danh sách."}</p>
              )}
            </div>
          ) : (
            displayedGroups.map((group, index) => {
              const isCurrent =
                group.address.toLowerCase() === currentAddress.toLowerCase();
              const rawState =
                stateData?.[index * 2]?.status === "success"
                  ? (stateData[index * 2].result as number)
                  : undefined;
              const hasMember0 =
                !group.isDefault &&
                stateData?.[index * 2 + 1]?.status === "success" &&
                Boolean(stateData[index * 2 + 1].result);
              const isActive =
                rawState === GROUP_STATE.ACTIVE ||
                (rawState === GROUP_STATE.OPEN && hasMember0);

              return (
                <div
                  key={group.address}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-amber-950/20 border-amber-500/40 shadow-lg ring-1 ring-amber-500/20"
                      : "bg-black/40 border-slate-800 hover:bg-black/60 hover:border-amber-500/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base sm:text-lg">
                          <span className="text-white">{group.name}</span>
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

                        {/* On-chain Status Badge */}
                        {rawState === GROUP_STATE.OPEN && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {hasMember0
                              ? (isEn ? "Open" : "Mở tham gia")
                              : (isEn ? "Open (0 members)" : "Mở tham gia (0 tv)")}
                          </span>
                        )}
                        {rawState === GROUP_STATE.ACTIVE && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {isEn ? "Active" : "Đang chạy"}
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
                          href={`https://explorer.testnet.arc.io/address/${group.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-amber-300 transition-colors p-1.5"
                          title={isEn ? "View on Arc Explorer" : "Xem trên Arc Explorer"}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
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

                      {/* Icon xóa cho từng club (cancle, hết hạn, hoặc không chơi nữa) */}
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
          >
            <Plus size={15} />
            <span>{isEn ? t("clubDirectoryModal.createShortcutBtn", language) : "Tạo nhóm mới"}</span>
            <span className="hidden">+ Tạo nhóm mới</span>
          </button>
        </div>
      </div>

      {/* Popup Xác Nhận Xóa Nhóm (Confirmation Modal) */}
      {confirmingClub && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          style={{ zIndex: 100 }}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingClub(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#10111a] rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full p-5 sm:p-6 text-slate-100 animate-in zoom-in-95 duration-150 relative space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="confirm-delete-title"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
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
