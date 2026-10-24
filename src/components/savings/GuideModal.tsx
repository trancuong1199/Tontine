import React, { useEffect } from "react";
import {
  X,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Users,
  Coins,
  TrendingUp,
  Wallet,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Language, t } from "../../lib/i18n";

export interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export function GuideModal({
  isOpen,
  onClose,
  language = "vi",
}: GuideModalProps) {
  // Handle ESC key to dismiss modal
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      <div
        className="bg-[#0c0d14] rounded-2xl sm:rounded-3xl border border-amber-500/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col transition-all text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-[#0c0d14]/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
              <BookOpen size={20} />
            </div>
            <div>
              <h2
                id="guide-modal-title"
                className="text-lg sm:text-xl font-bold text-white tracking-tight"
              >
                {t("guideModal.title", language)}
              </h2>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                {t("guideModal.subtitle", language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700"
            aria-label={t("guideModal.closeBtn", language)}
            title={t("guideModal.closeBtn", language)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: 5 Pillars */}
        <div className="p-5 sm:p-7 space-y-6 sm:space-y-8">
          {/* Pillar 1: Concept & Nature of Trustless ROSCA */}
          <section className="bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-black/60 border border-amber-500/20 rounded-2xl p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                1
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t("guideModal.pillar1Title", language)}
              </h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {t("guideModal.pillar1Desc", language)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30">
                ROSCA / Susu / Tanda
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30">
                Code Is Law
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                100% Non-Custodial
              </span>
            </div>
          </section>

          {/* Pillar 2: Head-to-Head Comparison Table */}
          <section className="space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                  2
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t("guideModal.pillar2Title", language)}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 ml-9.5">
                {t("guideModal.pillar2Subtitle", language)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {/* Traditional Tontine Column */}
              <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-b from-[#140b0d] to-[#0d090a] p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-rose-900/40">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <h4 className="font-bold text-rose-200 text-sm sm:text-base">
                      {t("guideModal.tradTitle", language)}
                    </h4>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-rose-300">
                    <li className="flex items-start gap-2">
                      <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.tradRisk1", language)}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.tradRisk2", language)}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.tradRisk3", language)}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-2 border-t border-rose-900/30 text-xs font-medium text-rose-400">
                  ⚠️ Nguy cơ bể hụi, mất vốn rất cao
                </div>
              </div>

              {/* HụiChain Smart Contract Column */}
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#0e1612] to-[#09110d] p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-amber-500/5">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-500/30">
                    <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                    <h4 className="font-bold text-white text-sm sm:text-base">
                      {t("guideModal.smartTitle", language)}
                    </h4>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.smartBenefit1", language)}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.smartBenefit2", language)}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{t("guideModal.smartBenefit3", language)}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-2 border-t border-amber-500/20 text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-amber-400" /> An toàn tuyệt đối, thực thi bằng code
                </div>
              </div>
            </div>
          </section>

          {/* Pillar 3: 4-Step Lifecycle */}
          <section className="space-y-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                  3
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t("guideModal.pillar3Title", language)}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 ml-9.5">
                {t("guideModal.pillar3Subtitle", language)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-black/40 hover:bg-black/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                    <Users size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {t("guideModal.step1Title", language)}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {t("guideModal.step1Desc", language)}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-black/40 hover:bg-black/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                    <Coins size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {t("guideModal.step2Title", language)}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {t("guideModal.step2Desc", language)}
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-black/40 hover:bg-black/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                    <TrendingUp size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {t("guideModal.step3Title", language)}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {t("guideModal.step3Desc", language)}
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-black/40 hover:bg-black/60 transition-all flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                    <Wallet size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    {t("guideModal.step4Title", language)}
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {t("guideModal.step4Desc", language)}
                </p>
              </div>
            </div>
          </section>

          {/* Pillar 4: Auto-kick Rule */}
          <section className="bg-gradient-to-br from-amber-950/30 to-black/60 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                4
              </div>
              <h3 className="text-base sm:text-lg font-bold text-amber-300">
                {t("guideModal.pillar4Title", language)}
              </h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {t("guideModal.pillar4Desc", language)}
            </p>
          </section>

          {/* Pillar 5: Arc Testnet USDC & Speed Benefits */}
          <section className="bg-gradient-to-br from-amber-950/30 to-black/60 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                <Zap size={14} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-amber-300">
                {t("guideModal.pillar5Title", language)}
              </h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {t("guideModal.pillar5Desc", language)}
            </p>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-10 bg-[#0c0d14]/95 backdrop-blur-md px-5 sm:px-7 py-3.5 border-t border-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <HelpCircle size={14} className="text-amber-400" />
            <span>Arc Testnet • Circle USDC • Trustless DeFi</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {t("guideModal.closeBtn", language)}
          </button>
        </div>
      </div>
    </div>
  );
}
