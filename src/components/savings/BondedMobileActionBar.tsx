export function BondedMobileActionBar({ label, onAction, disabled = false }: { label: string; onAction?: () => void; disabled?: boolean }) {
  // No actionable step: render nothing instead of a static status bar.
  if (!onAction) return null;
  return <div data-testid="bonded-mobile-action-bar" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/30 bg-[#0c0d14]/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md lg:hidden">
    <button type="button" onClick={onAction} disabled={disabled} className="w-full min-h-[44px] rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{label}</button>
  </div>;
}
