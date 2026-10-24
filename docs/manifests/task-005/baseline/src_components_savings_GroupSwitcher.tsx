import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Share2, Copy, Check, Shuffle, Plus } from "lucide-react";
import { isValidAddress, formatAddress } from "../../contract";

interface GroupSwitcherProps {
  currentAddress: `0x${string}`;
  onSwitchGroup: (newAddress: `0x${string}`) => void;
  onOpenCreateModal?: () => void;
}

export function GroupSwitcher({
  currentAddress,
  onSwitchGroup,
  onOpenCreateModal,
}: GroupSwitcherProps) {
  const [inputAddress, setInputAddress] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}?group=${currentAddress}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Đã sao chép link nhóm!", {
        description: shareUrl,
      });
    } catch {
      toast.error("Không thể sao chép liên kết vào clipboard.");
    }
  };

  const handleSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputAddress.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập địa chỉ hợp đồng.");
      return;
    }
    if (!isValidAddress(trimmed)) {
      toast.error("Địa chỉ hợp đồng không hợp lệ. Cần 42 ký tự hex bắt đầu bằng 0x.");
      return;
    }
    onSwitchGroup(trimmed.toLowerCase() as `0x${string}`);
    setInputAddress("");
    setIsExpanded(false);
    toast.success("Đã chuyển sang nhóm mới!");
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider block">
            Hợp đồng nhóm hụi
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-xs text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
              {formatAddress(currentAddress)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Tạo nhóm Hụi mới"
            >
              <Plus size={13} />
              <span>+ Tạo nhóm mới</span>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-blue-100 shadow-2xs cursor-pointer"
            title="Sao chép link nhóm kèm query param ?group="
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
            <span>{copied ? "Đã chép link" : "Sao chép link nhóm"}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Shuffle size={12} />
            <span>{isExpanded ? "Đóng" : "Đổi nhóm"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Switch Form */}
      {isExpanded && (
        <form onSubmit={handleSwitch} className="pt-2 border-t border-slate-100 space-y-2">
          <label className="text-xs text-slate-500 font-medium block">
            Nhập địa chỉ contract nhóm hụi khác (Arc Testnet):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 shadow-xs cursor-pointer"
            >
              <span>Chuyển</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
