import { ConnectKitButton } from "connectkit";
import { PiggyBank } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <PiggyBank size={16} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            HụiChain
          </span>
        </div>
        <ConnectKitButton />
      </div>
    </header>
  );
}
