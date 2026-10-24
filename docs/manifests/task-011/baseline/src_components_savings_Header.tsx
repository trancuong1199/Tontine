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
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Network Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-black/5">
            <PiggyBank size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg tracking-tight">
                {t("header.appName", language)}
              </span>
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-2xs">
            <button
              onClick={() => onSelectTab("home")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("header.tabHome", language)}
            </button>
            <button
              onClick={() => onSelectTab("app")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "app"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title={isEn ? "Chuyển sang Tiếng Việt (Switch to Vietnamese)" : "Switch to English (Chuyển sang Tiếng Anh)"}
              aria-label="Toggle language"
            >
              <Globe size={15} className="text-blue-600" />
              <span>{isEn ? "EN 🇬🇧" : "VI 🇻🇳"}</span>
            </button>
          )}

          {onOpenDirectoryModal && (
            <button
              onClick={onOpenDirectoryModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title={isEn ? t("header.directoryBtn", language) : "Danh sách nhóm Hụi"}
            >
              <Layers size={15} className="text-blue-600" />
              <span>{isEn ? t("header.directoryBtn", language) : "Danh sách nhóm"}</span>
            </button>
          )}

          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title={isEn ? "View guide and rules" : "Xem hướng dẫn cách chơi và luật hụi"}
            >
              <BookOpen size={15} className="text-blue-600" />
              <span>{isEn ? t("header.guideBtn", language) : "Hướng dẫn"}</span>
            </button>
          )}

          <a
            href="https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
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
