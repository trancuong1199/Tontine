import { useEffect, useState, useRef } from "react";
import { X, Pencil, Check } from "lucide-react";
import { formatAddress } from "../../contract";
import { SavingsClubItem } from "../../lib/savingsClubDirectory";
import { Language, t } from "../../lib/i18n";
import { toast } from "sonner";

interface EditClubNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: SavingsClubItem | null;
  onSave: (address: `0x${string}`, newName: string) => void;
  language?: Language;
}

export function EditClubNameModal({
  isOpen,
  onClose,
  club,
  onSave,
  language = "vi",
}: EditClubNameModalProps) {
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);
  const prevAddressRef = useRef<string | null>(null);
  const isEn = language === "en";

  useEffect(() => {
    if (isOpen && club) {
      const isNewlyOpened = !prevIsOpenRef.current;
      const isDifferentClub = prevAddressRef.current !== club.address;
      if (isNewlyOpened || isDifferentClub) {
        setNameInput(club.name);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
    prevIsOpenRef.current = isOpen;
    prevAddressRef.current = club?.address ?? null;
  }, [isOpen, club?.address, club?.name]);

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

  if (!isOpen || !club) return null;

  const handleSave = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error(isEn ? t("editClubModal.errorEmpty", language) : "Tên nhóm không được để trống.");
      return;
    }
    onSave(club.address, trimmed);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      style={{ zIndex: 100 }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#0f1019] rounded-2xl border border-amber-500/30 shadow-2xl max-w-md w-full p-5 sm:p-6 text-slate-100 animate-in zoom-in-95 duration-150 relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isEn ? t("editClubModal.title", language) : "Đổi tên nhóm hụi"}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {formatAddress(club.address)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title={isEn ? "Close" : "Đóng"}
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>{isEn ? t("editClubModal.nameLabel", language) : "Tên nhóm hụi"}</span>
            <span className="text-xs text-slate-400 tabular-nums">
              {nameInput.length}/40
            </span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value.slice(0, 40))}
            onKeyDown={handleInputKeyDown}
            placeholder={isEn ? t("editClubModal.placeholder", language) : "Nhập tên nhóm mới..."}
            className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-sm text-white placeholder-slate-500 outline-hidden transition-all"
            maxLength={40}
          />
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn ? t("editClubModal.desc", language) : "Tùy chỉnh tên nhóm để dễ dàng nhận diện và quản lý trong danh bạ hụi của bạn."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            {isEn ? t("editClubModal.cancelBtn", language) : "Hủy bỏ"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!nameInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-95 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check size={15} />
            <span>{isEn ? t("editClubModal.saveBtn", language) : "Lưu thay đổi"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
