import React from "react";
import { Lock, Compass, PlusCircle } from "lucide-react";
import { type Language } from "../../lib/i18n";

export interface NonMemberActiveViewProps {
  language: Language;
  onOpenDirectoryModal?: () => void;
  onOpenCreateModal?: () => void;
}

export function NonMemberActiveView({
  language,
  onOpenDirectoryModal,
  onOpenCreateModal,
}: NonMemberActiveViewProps) {
  const isEn = language === "en";

  return (
    <div className="p-6 sm:p-8 text-center space-y-4 bg-[#0a0b12]/60 rounded-3xl border border-amber-500/15">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
        <Lock size={22} />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-white text-base sm:text-lg">
          {isEn ? "Club is in Progress" : "Nhóm hụi đang diễn ra"}
        </h4>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          {isEn
            ? "The club is active and not accepting new members."
            : "Nhóm đang diễn ra các vòng, không nhận thêm thành viên mới."}
        </p>
      </div>

      {(onOpenDirectoryModal || onOpenCreateModal) && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
          {onOpenDirectoryModal && (
            <button
              type="button"
              onClick={onOpenDirectoryModal}
              className="w-full py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Compass size={14} className="text-amber-400" />
              <span>{isEn ? "Browse Other Clubs" : "Khám phá nhóm khác"}</span>
            </button>
          )}
          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="w-full py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} className="text-amber-400" />
              <span>{isEn ? "Create New Club" : "Tạo nhóm mới"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
