import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { formatAddress } from "../../contract";
import {
  getKnownGroups,
  clearCustomKnownGroups,
  DEFAULT_SAVINGS_CLUBS,
  SavingsClubItem,
} from "../../lib/savingsClubDirectory";
import { Language, t } from "../../lib/i18n";

interface ClubDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectGroup: (address: `0x${string}`) => void;
  onOpenCreateModal: () => void;
  language?: Language;
}

export function ClubDirectoryModal({
  isOpen,
  onClose,
  currentAddress,
  onSelectGroup,
  onOpenCreateModal,
  language = "vi",
}: ClubDirectoryModalProps) {
  const [groups, setGroups] = useState<SavingsClubItem[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const isEn = language === "en";

  useEffect(() => {
    if (isOpen) {
      setGroups(getKnownGroups());
    }
  }, [isOpen]);

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
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
                Savings Clubs Directory trên Arc Testnet
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
          {groups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p>{isEn ? t("clubDirectoryModal.emptyList", language) : "Chưa có nhóm nào trong danh sách."}</p>
            </div>
          ) : (
            groups.map((group) => {
              const isCurrent =
                group.address.toLowerCase() === currentAddress.toLowerCase();

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

                    <div className="shrink-0 flex items-center">
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
                ? `${groups.length} savings clubs available`
                : `${groups.length} nhóm hụi khả dụng`}
            </p>
            {customGroupsCount > 0 && (
              <button
                onClick={handleClearCustomGroups}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title={isEn ? "Clear old test clubs" : "Dọn dẹp các nhóm thử nghiệm cũ"}
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
    </div>
  );
}
