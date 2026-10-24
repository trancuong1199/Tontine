import { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatAddress } from "../../contract";
import {
  getKnownGroups,
  SavingsClubItem,
} from "../../lib/savingsClubDirectory";

interface ClubDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectGroup: (address: `0x${string}`) => void;
  onOpenCreateModal: () => void;
}

export function ClubDirectoryModal({
  isOpen,
  onClose,
  currentAddress,
  onSelectGroup,
  onOpenCreateModal,
}: ClubDirectoryModalProps) {
  const [groups, setGroups] = useState<SavingsClubItem[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroups(getKnownGroups());
    }
  }, [isOpen]);

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
      toast.success("Đã sao chép địa chỉ nhóm!");
    } catch {
      toast.error("Không thể sao chép địa chỉ.");
    }
  };

  const handleSelect = (group: SavingsClubItem) => {
    if (group.address.toLowerCase() === currentAddress.toLowerCase()) {
      return;
    }
    onSelectGroup(group.address);
    onClose();
    toast.success(`Đã chuyển sang nhóm ${group.name}!`);
  };

  const handleCreateNew = () => {
    onClose();
    onOpenCreateModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Danh Sách Nhóm Hụi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Savings Clubs Directory trên Arc Testnet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Directory List Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {groups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>Chưa có nhóm nào trong danh sách.</p>
            </div>
          ) : (
            groups.map((group) => {
              const isCurrent =
                group.address.toLowerCase() === currentAddress.toLowerCase();

              return (
                <div
                  key={group.address}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-blue-50/60 border-blue-200/90 shadow-2xs ring-1 ring-blue-500/10"
                      : "bg-slate-50/70 border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {group.name}
                        </span>

                        {group.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Sparkles size={11} className="text-indigo-600" />
                            Nổi bật
                          </span>
                        )}

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={11} className="text-emerald-600" />
                            Đang xem
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200/80">
                          {formatAddress(group.address)}
                        </span>

                        <button
                          onClick={(e) => handleCopy(group.address, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title="Sao chép địa chỉ hợp đồng"
                        >
                          {copiedAddress === group.address ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        <a
                          href={`https://explorer.testnet.arc.io/address/${group.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                          title="Xem trên Arc Explorer"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isCurrent ? (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200/80 cursor-not-allowed select-none">
                          Đang xem
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelect(group)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <span>Vào nhóm</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with "+ Tạo nhóm mới" */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {groups.length} nhóm hụi khả dụng
          </p>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Tạo nhóm Hụi mới"
          >
            <Plus size={14} />
            <span>+ Tạo nhóm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
}
