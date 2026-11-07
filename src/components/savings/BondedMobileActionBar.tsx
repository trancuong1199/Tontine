export function BondedMobileActionBar({ label, onAction, disabled = false }: { label: string; onAction?: () => void; disabled?: boolean }) {
  return <div data-testid="bonded-mobile-action-bar" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-500/30 bg-[#0c0d14]/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md lg:hidden">
    {onAction ? <button type="button" onClick={onAction} disabled={disabled} className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{label}</button> : <p className="text-center text-sm text-slate-300 py-2">{label}</p>}
  </div>;
}
