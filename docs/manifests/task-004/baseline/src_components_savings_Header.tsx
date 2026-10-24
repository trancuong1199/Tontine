import { ConnectKitButton } from "connectkit";
import { PiggyBank, BookOpen, ExternalLink } from "lucide-react";

interface HeaderProps {
  onOpenGuide?: () => void;
}

export function Header({ onOpenGuide }: HeaderProps = {}) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Network Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-black/5">
            <PiggyBank size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                HụiChain
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Arc Testnet
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
              Trustless Rotating Savings Club on Arc Network
            </p>
          </div>
        </div>

        {/* Right: Actions & Connect Wallet */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Xem hướng dẫn cách chơi và luật hụi"
            >
              <BookOpen size={14} className="text-blue-600" />
              <span>Hướng dẫn</span>
            </button>
          )}

          <a
            href="https://explorer.testnet.arc.io/address/0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <span>Explorer</span>
            <ExternalLink size={12} />
          </a>

          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}
