import { ConnectKitButton } from "connectkit";
import { PiggyBank, BookOpen, ExternalLink, Plus, Layers, Globe } from "lucide-react";
import { Language, t } from "../../lib/i18n";

export interface HeaderProps {
  onOpenGuide?: () => void;
  onOpenCreateModal?: () => void;
  onOpenDirectoryModal?: () => void;
  language?: Language;
  onToggleLanguage?: () => void;
  activeTab?: "home" | "app";
  onSelectTab?: (tab: "home" | "app") => void;
}

export function Header({
  onOpenGuide,
  onOpenCreateModal,
  onOpenDirectoryModal,
  language = "vi",
  onToggleLanguage,
  activeTab = "home",
  onSelectTab,
}: HeaderProps = {}) {
  const isEn = language === "en";

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/85 backdrop-blur-md border-b border-slate-800/80 transition-all shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand & Network Badge */}
        <div
          onClick={() => onSelectTab?.("home")}
          className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          role="button"
          tabIndex={0}
          title="Về Trang chủ"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-white/10">
            <PiggyBank size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight">
                {t("header.appName", language)}
              </span>
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Arc Testnet
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-400 font-medium">
              {t("header.appDesc", language)}
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs (Home vs Savings Clubs) */}
        {onSelectTab && (
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 shadow-2xs">
            <button
              onClick={() => onSelectTab("home")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("header.tabHome", language)}
            </button>
            <button
              onClick={() => onSelectTab("app")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "app"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("header.tabApp", language)}
            </button>
          </nav>
        )}

        {/* Right: Actions & Connect Wallet */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Language Toggle */}
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-blue-400 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title={isEn ? "Chuyển sang Tiếng Việt (Switch to Vietnamese)" : "Switch to English (Chuyển sang Tiếng Anh)"}
              aria-label="Toggle language"
            >
              <Globe size={15} className="text-blue-400" />
              <span>{isEn ? "EN 🇬🇧" : "VI 🇻🇳"}</span>
            </button>
          )}

          {onOpenDirectoryModal && (
            <button
              onClick={onOpenDirectoryModal}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            >
              <Layers size={15} />
              <span>{isEn ? t("header.directoryBtn", language) : "Danh sách nhóm"}</span>
            </button>
          )}

          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Tạo nhóm Hụi mới"
            >
              <Plus size={15} />
              <span>{isEn ? t("header.createBtn", language) : "Tạo nhóm"}</span>
              <span className="hidden"><span>+ Tạo nhóm</span></span>
            </button>
          )}

          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title={isEn ? "View guide and rules" : "Xem hướng dẫn cách chơi và luật hụi"}
            >
              <BookOpen size={15} className="text-blue-400" />
              <span>{isEn ? t("header.guideBtn", language) : "Hướng dẫn"}</span>
            </button>
          )}

          <a
            href="https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors whitespace-nowrap"
          >
            <span>{t("header.explorerBtn", language)}</span>
            <ExternalLink size={12} />
          </a>

          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}
