import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Share2, Check, Shuffle, Plus, Layers } from "lucide-react";
import { isValidAddress, formatAddress } from "../../contract";
import { saveKnownGroup } from "../../lib/savingsClubDirectory";
import { Language, t } from "../../lib/i18n";

interface GroupSwitcherProps {
  currentAddress: `0x${string}`;
  onSwitchGroup: (newAddress: `0x${string}`) => void;
  onOpenCreateModal?: () => void;
  onOpenDirectoryModal?: () => void;
  language?: Language;
}

export function GroupSwitcher({
  currentAddress,
  onSwitchGroup,
  onOpenCreateModal,
  onOpenDirectoryModal,
  language = "vi",
}: GroupSwitcherProps) {
  const [inputAddress, setInputAddress] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isEn = language === "en";

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}?group=${currentAddress}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (isEn) {
        toast.success(t("groupSwitcher.toastCopied", language), {
          description: shareUrl,
        });
      } else {
        toast.success("Đã sao chép link nhóm!", {
          description: shareUrl,
        });
      }
    } catch {
      toast.error(isEn ? t("groupSwitcher.toastCopyFail", language) : "Không thể sao chép liên kết vào clipboard.");
    }
  };

  const handleSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputAddress.trim();
    if (!trimmed) {
      toast.error(isEn ? t("groupSwitcher.toastEmptyAddr", language) : "Vui lòng nhập địa chỉ hợp đồng.");
    } else if (!isValidAddress(trimmed)) {
      toast.error(isEn ? t("groupSwitcher.toastInvalidAddr", language) : "Địa chỉ hợp đồng không hợp lệ. Cần 42 ký tự hex bắt đầu bằng 0x.");
    } else {
      saveKnownGroup({
        address: trimmed,
        name: isEn ? `Savings Club ${formatAddress(trimmed)}` : `Nhóm Hụi ${formatAddress(trimmed)}`,
      });
      onSwitchGroup(trimmed.toLowerCase() as `0x${string}`);
      setInputAddress("");
      setIsExpanded(false);
      toast.success(isEn ? t("groupSwitcher.toastSwitched", language) : "Đã chuyển sang nhóm mới!");
    }
  };

  return (
    <div className="bg-[#0c0d14] rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-lg space-y-3.5 text-slate-100">
      {/* Header Contract Information */}
      <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-amber-500/10">
        <div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">
            {isEn ? t("groupSwitcher.title", language) : "Hợp đồng nhóm hụi"}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-mono text-xs text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
              {formatAddress(currentAddress)}
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Grid Actions: Roomy, balanced, no line wraps */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Row 1, Col 1: Danh sách nhóm */}
        {onOpenDirectoryModal && (
          <button
            onClick={onOpenDirectoryModal}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-amber-300 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 border border-slate-700/80 hover:border-amber-500/30 shadow-2xs cursor-pointer whitespace-nowrap"
            title={isEn ? t("groupSwitcher.directoryBtn", language) : "Danh sách nhóm Hụi"}
          >
            <Layers size={15} className="text-amber-400 shrink-0" />
            <span className="truncate">{isEn ? t("groupSwitcher.directoryBtn", language) : "Danh sách nhóm"}</span>
          </button>
        )}

        {/* Row 1, Col 2: Tạo nhóm mới */}
        {onOpenCreateModal && (
          <button
            onClick={onOpenCreateModal}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
            title="Tạo nhóm Hụi mới"
          >
            <Plus size={15} className="shrink-0" />
            <span className="truncate">{isEn ? t("groupSwitcher.createBtn", language) : "Tạo nhóm mới"}</span>
            <span className="hidden"><span>+ Tạo nhóm mới</span></span>
          </button>
        )}

        {/* Row 2, Col 1: Sao chép link nhóm */}
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 border border-amber-500/30 shadow-2xs cursor-pointer whitespace-nowrap"
          title={isEn ? "Copy club link with query param ?group=" : "Sao chép link nhóm kèm query param ?group="}
        >
          {copied ? <Check size={15} className="text-emerald-400 shrink-0" /> : <Share2 size={15} className="shrink-0 text-amber-400" />}
          <span className="truncate">
            {copied
              ? (isEn ? t("groupSwitcher.copiedBtn", language) : "Đã chép link")
              : (isEn ? t("groupSwitcher.copyBtn", language) : "Sao chép link nhóm")}
          </span>
        </button>

        {/* Row 2, Col 2: Đổi nhóm */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 border rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            isExpanded
              ? "bg-amber-950/50 border-amber-500/50 text-amber-200"
              : "border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-amber-500/30"
          }`}
          title={isEn ? "Switch to another savings club contract" : "Đổi sang địa chỉ nhóm hụi khác"}
        >
          <Shuffle size={15} className="shrink-0" />
          <span className="truncate">
            {isExpanded
              ? (isEn ? t("groupSwitcher.closeBtn", language) : "Đóng")
              : (isEn ? t("groupSwitcher.switchBtn", language) : "Đổi nhóm")}
          </span>
        </button>
      </div>

      {/* Expandable Switch Form */}
      {isExpanded && (
        <form onSubmit={handleSwitch} className="pt-3 border-t border-amber-500/10 space-y-2.5">
          <label className="text-xs sm:text-sm text-slate-300 font-semibold block">
            {isEn ? t("groupSwitcher.switchFormTitle", language) : "Nhập địa chỉ contract nhóm hụi khác (Arc Testnet):"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-black/60 border border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-amber-200 placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
            >
              <span>{isEn ? t("groupSwitcher.switchSubmitBtn", language) : "Chuyển"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
