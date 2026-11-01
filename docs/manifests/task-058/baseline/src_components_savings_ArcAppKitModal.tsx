import { isPositiveAmount } from "../../lib/swapSafety";
import { readArcBalances, formatArcBalance, formatApproximateQuote } from "../../lib/arcBalances";
import { ARC_RPC, USDC_NATIVE_DECIMALS, EURC_DECIMALS, CIRBTC_DECIMALS } from "../../config/arc-constants";
import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  ArrowUpDown,
  Coins,
  ShieldCheck,
  Droplet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Fingerprint,
  Layers,
  Sparkles,
} from "lucide-react";
import { Language, t } from "../../lib/i18n";
import { executeArcSwap, ARC_ROUTER } from "../../lib/arcSwap";
import { switchOrAddArcNetwork, forceUpdateArcRpc } from "../../utils/arcChain";

import { formatAddress } from "../../contract";

interface ArcAppKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  connectedAccount?: string | null;
  passkeyAddress?: `0x${string}`;
  passkeyStatus?: string;
  onOpenPasskeyRegister?: () => void;
  connector?: any;
}

export function ArcAppKitModal({
  isOpen,
  onClose,
  language = "vi",
  connectedAccount,
  passkeyAddress,
  passkeyStatus,
  onOpenPasskeyRegister,
  connector,
}: ArcAppKitModalProps) {
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState<"swap" | "passkey" | "bridge" | "faucet">("swap");

  // Swap State
  const [fromToken, setFromToken] = useState<"USDC" | "EURC" | "cirBTC">("USDC");
  const [toToken, setToToken] = useState<"USDC" | "EURC" | "cirBTC">("EURC");
  const [amount, setAmount] = useState("1.00");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string>("");
  const [swapError, setSwapError] = useState<string>("");
  const [swapSuccess, setSwapSuccess] = useState<string>("");
  const [rpcSyncMsg, setRpcSyncMsg] = useState<string>("");
  const [balances, setBalances] = useState<{ usdc: string; eurc: string; cirbtc: string }>({
    usdc: "—",
    eurc: "—",
    cirbtc: "—",
  });
  const [exchangeRate, setExchangeRate] = useState<number>(0.8238); // 1 USDC ≈ 0.8238 EURC on Arc pool

  const getBestProvider = async () => {
    if (connector?.getProvider) {
      try {
        const p = await connector.getProvider();
        if (p) return p;
      } catch (err) {
        console.warn("Could not get provider from connector:", err);
      }
    }
    if (typeof window !== "undefined") {
      const anyWin = window as any;
      if (anyWin.okxwallet) return anyWin.okxwallet;
      if (anyWin.ethereum?.providers?.length) {
        const okx = anyWin.ethereum.providers.find((p: any) => p.isOkxWallet);
        if (okx) return okx;
        return anyWin.ethereum.providers[0];
      }
      return anyWin.ethereum;
    }
    return null;
  };

  const handleSyncRpc = async () => {
    try {
      setRpcSyncMsg(isEn ? "Prompting wallet to update RPC..." : "Đang gửi yêu cầu cập nhật RPC tới ví...");
      const provider = await getBestProvider();
      const ok = await forceUpdateArcRpc(provider);
      if (ok) {
        setRpcSyncMsg(isEn ? `Arc RPC updated to ${ARC_RPC}!` : `Đã cập nhật RPC thành ${ARC_RPC}!`);
      } else {
        setRpcSyncMsg(isEn ? "Could not update automatically. Please check wallet settings." : "Không thể tự cập nhật. Vui lòng kiểm tra cài đặt ví.");
      }
    } catch (e: any) {
      setRpcSyncMsg(e?.message || "Failed to update RPC");
    }
  };

  // Faucet state
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Arc-pinned reads also work with no injected wallet or a wallet on another chain.
  useEffect(() => {
    setBalances({ usdc: "—", eurc: "—", cirbtc: "—" });
    if (!isOpen || !connectedAccount) return;
    let isMounted = true;
    void readArcBalances(connectedAccount).then(raw => {
      if (isMounted) setBalances({
        usdc: formatArcBalance(raw.usdc, 'USDC'), eurc: formatArcBalance(raw.eurc, 'EURC'), cirbtc: formatArcBalance(raw.cirbtc, 'cirBTC'),
      });
    });
    return () => { isMounted = false; };
  }, [isOpen, connectedAccount, swapSuccess]);

  if (!isOpen) return null;

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapError("");
    setSwapSuccess("");
    const provider = await getBestProvider();
    if (!provider) {
      setSwapError(isEn ? "No Web3 wallet detected. Please connect OKX Wallet or MetaMask." : "Không tìm thấy ví Web3. Vui lòng cài đặt và kết nối OKX Wallet hoặc MetaMask.");
      return;
    }
    try {
      setIsSwapping(true);
      setSwapStatus(isEn ? "Connecting to wallet..." : "Đang kết nối tài khoản ví...");

      try {
        await provider.request({ method: "eth_requestAccounts" });
      } catch (accErr: any) {
        if (accErr?.message?.includes("at least one account")) {
          throw new Error(
            isEn
              ? "Wallet error: OKX Wallet is locked or has no active account. Please open OKX Wallet extension, unlock it, and try again."
              : "Lỗi ví: Tiện ích OKX Wallet đang bị khóa mật khẩu hoặc chưa chọn tài khoản hoạt động. Vui lòng mở tiện ích OKX Wallet trên trình duyệt, nhập mật khẩu mở khóa ví và thử lại."
          );
        }
        throw accErr;
      }

      setSwapStatus(isEn ? "Switching to Arc Testnet..." : "Đang chuyển mạng Arc Testnet...");
      await switchOrAddArcNetwork(provider);

      await executeArcSwap(
        provider,
        amount,
        fromToken,
        50,
        (msg: string) => setSwapStatus(msg),
        toToken
      );

      setSwapSuccess(
        isEn
          ? `Successfully swapped ${amount} ${fromToken} → ${toToken}!`
          : `Đổi thành công ${amount} ${fromToken} → ${toToken}!`
      );
      setSwapStatus("");
    } catch (err: any) {
      let message = err?.message || (isEn ? "Swap failed." : "Giao dịch đổi token thất bại.");
      if (message.includes("must has at least one account") || message.includes("at least one account")) {
        message = isEn
          ? "OKX Wallet is locked or has no active account. Please open OKX Wallet extension in your browser, enter password to unlock, and try again."
          : "Ví OKX Wallet đang bị khóa mật khẩu hoặc chưa chọn tài khoản. Vui lòng bấm vào icon OKX Wallet trên thanh tiện ích trình duyệt, nhập mật khẩu mở khóa ví và thử lại.";
      }
      setSwapError(message);
      setSwapStatus("");
    } finally {
      setIsSwapping(false);
    }
  };

  const copyAddress = () => {
    if (connectedAccount) {
      navigator.clipboard.writeText(connectedAccount);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  const tokenPriceMap: Record<"USDC" | "EURC" | "cirBTC", number> = {
    USDC: 1,
    EURC: 1 / (exchangeRate || 0.8238),
    cirBTC: 350000,
  };
  const estimatedOutput = formatApproximateQuote(amount, tokenPriceMap[fromToken] / tokenPriceMap[toToken], toToken === "cirBTC" ? 8 : 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#161722] via-[#0e0f18] to-[#07080d] border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arc-appkit-title"
      >
        {/* Header: Spacious & Elegant Obsidian Sand-Gold */}
        <div className="flex items-start sm:items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-800/80 bg-gradient-to-r from-black/70 via-slate-950/50 to-black/70 gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/35 text-slate-950 font-bold shrink-0">
              <Zap size={22} className="fill-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="arc-appkit-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {t("arcAppKit.modalTitle", language)}
                </h2>
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                  Arc Native
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed max-w-md sm:max-w-lg">
                {t("arcAppKit.modalDesc", language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation: Segmented 4-Column Bar (Zero scrollbar, spacious & elegant) */}
        <div className="px-6 sm:px-8 pt-4 pb-3 bg-black/40 border-b border-slate-800/70">
          <div className="grid grid-cols-4 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 gap-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("swap")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "swap"
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <ArrowUpDown size={15} className="shrink-0" />
              <span className="truncate">{t("arcAppKit.tabSwap", language)}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("passkey")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "passkey"
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <Fingerprint size={15} className="shrink-0" />
              <span className="truncate">{t("arcAppKit.tabPasskey", language)}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bridge")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "bridge"
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <Layers size={15} className="shrink-0" />
              <span className="truncate">{t("arcAppKit.tabBridge", language)}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("faucet")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "faucet"
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              <Droplet size={15} className="shrink-0" />
              <span className="truncate">{t("arcAppKit.tabFaucet", language)}</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* TAB 1: SWAP */}
          {activeTab === "swap" && (
            <div className="space-y-4">
              <div className="bg-black/40 rounded-2xl p-4 border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
                <span className="text-slate-400">
                  {isEn ? "USDC:" : "Số dư USDC:"}{" "}
                  <strong className="text-white font-mono">{balances.usdc} USDC</strong>
                </span>
                <span className="text-slate-400">
                  {isEn ? "EURC:" : "Số dư EURC:"}{" "}
                  <strong className="text-white font-mono">{balances.eurc} EURC</strong>
                </span>
                <span className="text-slate-400">
                  {isEn ? "CirBTC:" : "Số dư CirBTC:"}{" "}
                  <strong className="text-amber-300 font-mono">{balances.cirbtc} cirBTC</strong>
                </span>
              </div>

              <form onSubmit={handleSwap} className="space-y-4">
                <div className="bg-black/60 rounded-2xl p-4 border border-amber-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>{isEn ? "Pay with" : "Đổi từ"}</span>
                    <span>
                      {isEn ? "Available:" : "Khả dụng:"}{" "}
                      {fromToken === "USDC" ? balances.usdc : fromToken === "EURC" ? balances.eurc : balances.cirbtc}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-transparent flex-1 text-2xl font-extrabold text-white focus:outline-none tabular-nums"
                      placeholder="0.00"
                      disabled={isSwapping}
                    />
                    <select
                      value={fromToken}
                      onChange={(e) => {
                        const next = e.target.value as "USDC" | "EURC" | "cirBTC";
                        setFromToken(next);
                        if (next === toToken) {
                          setToToken(next === "USDC" ? "cirBTC" : "USDC");
                        }
                      }}
                      className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-sm font-bold text-amber-300 cursor-pointer focus:outline-none"
                    >
                      <option value="USDC">USDC</option>
                      <option value="EURC">EURC</option>
                      <option value="cirBTC">cirBTC</option>
                    </select>
                  </div>
                </div>

                {/* Reverse button */}
                <div className="flex justify-center -my-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      const prevFrom = fromToken;
                      setFromToken(toToken);
                      setToToken(prevFrom);
                    }}
                    className="p-2.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 hover:text-white hover:bg-amber-500/20 transition-all shadow-md active:scale-95 cursor-pointer"
                    title={isEn ? "Switch direction" : "Đổi chiều"}
                  >
                    <ArrowUpDown size={16} />
                  </button>
                </div>

                <div className="bg-black/60 rounded-2xl p-4 border border-amber-500/20 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>{isEn ? "You receive (Estimated)" : "Bạn nhận được (Ước tính)"}</span>
                    <span>
                      {toToken === "cirBTC"
                        ? "Pool: WUSDC / cirBTC (0.3%)"
                        : `1 USDC ≈ ${exchangeRate} EURC`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={estimatedOutput}
                      className="bg-transparent flex-1 text-2xl font-extrabold text-amber-300 focus:outline-none tabular-nums cursor-not-allowed"
                    />
                    <select
                      value={toToken}
                      onChange={(e) => {
                        const next = e.target.value as "USDC" | "EURC" | "cirBTC";
                        setToToken(next);
                        if (next === fromToken) {
                          setFromToken(next === "USDC" ? "cirBTC" : "USDC");
                        }
                      }}
                      className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-sm font-bold text-amber-300 cursor-pointer focus:outline-none"
                    >
                      <option value="EURC">EURC</option>
                      <option value="cirBTC">cirBTC</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>

                {swapStatus && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-amber-400 shrink-0" />
                    <span>{swapStatus}</span>
                  </div>
                )}

                {swapError && (
                  <div className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 space-y-2">
                    <p>{swapError}</p>
                    {(swapError.toLowerCase().includes("fetch") || swapError.toLowerCase().includes("network") || swapError.toLowerCase().includes("rpc")) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleSyncRpc}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
                        >
                          {isEn ? `🔧 Fix Wallet RPC (Switch to ${ARC_RPC})` : `🔧 Sửa RPC Ví (Chuyển sang ${ARC_RPC})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {rpcSyncMsg && (
                  <div className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                    <span>{rpcSyncMsg}</span>
                    <button
                      type="button"
                      onClick={() => setRpcSyncMsg("")}
                      className="text-slate-400 hover:text-white ml-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {swapSuccess && (
                  <div className="text-xs text-emerald-300 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span>{swapSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSwapping || !connectedAccount || !isPositiveAmount(amount, fromToken === "USDC" ? USDC_NATIVE_DECIMALS : fromToken === "EURC" ? EURC_DECIMALS : CIRBTC_DECIMALS)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 hover:to-yellow-500 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {isSwapping
                    ? (isEn ? "Swapping on Arc Testnet..." : "Đang thực thi Swap...")
                    : (isEn ? `Swap ${amount} ${fromToken}` : `Đổi ${amount} ${fromToken}`)}
                </button>

                {/* Pool & Route Transparency */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{isEn ? "Verified Arc Pool:" : "Bể thanh khoản Arc:"}</span>
                  <a
                    href="https://explorer.testnet.arc.io/address/0xe8f7fA2A412e98C537554643F83DA34DfdD50c23"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-amber-400/90 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>0xe8f7...0c23 (Uniswap V3)</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Quick RPC Sync */}
                <div className="pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>RPC: {ARC_RPC}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncRpc}
                    className="text-amber-400/90 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer"
                    title={isEn ? "Fix OKX / MetaMask Failed to fetch error" : "Khắc phục lỗi Failed to fetch trên OKX / MetaMask"}
                  >
                    {isEn ? "Sync / Fix Wallet RPC" : "Đồng bộ / Sửa RPC Ví"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PASSKEY SMART ACCOUNT */}
          {activeTab === "passkey" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-950/30 to-black/60 rounded-2xl p-5 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Fingerprint size={18} className="text-amber-400" />
                  <span>{isEn ? "Circle Modular Wallets (ERC-4337)" : "Ví Thông Minh Circle Modular (ERC-4337)"}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? "Secured by Apple Secure Enclave & Android Biometrics. Transactions are bundled seamlessly with zero gas fees sponsored by Circle Paymaster."
                    : "Bảo chứng bằng chip phần cứng Apple Secure Enclave & Vân tay Android. Giao dịch được gom lệnh mượt mà và miễn phí gas hoàn toàn nhờ Circle Paymaster."}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-black/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">{isEn ? "Account Type" : "Loại tài khoản"}</span>
                    <strong className="text-white font-mono">Circle Smart Account</strong>
                  </div>
                  <div className="bg-black/50 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-xs mb-0.5">{isEn ? "Gas Sponsorship" : "Tài trợ phí Gas"}</span>
                    <strong className="text-emerald-400">100% Free (Paymaster)</strong>
                  </div>
                </div>
              </div>

              {passkeyAddress ? (
                <div className="bg-black/40 rounded-2xl p-4 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400 font-medium block">
                    {isEn ? "Your Connected Passkey Address:" : "Địa chỉ Ví Passkey của bạn:"}
                  </span>
                  <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-amber-500/20">
                    <span className="font-mono text-xs text-amber-300 truncate max-w-[320px]">
                      {passkeyAddress}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(passkeyAddress);
                        setCopiedAddr(true);
                        setTimeout(() => setCopiedAddr(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy"
                    >
                      {copiedAddr ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-black/30 rounded-2xl border border-dashed border-amber-500/20 space-y-3">
                  <p className="text-xs text-slate-300">
                    {isEn
                      ? "You haven't activated a Passkey Smart Account on this device yet."
                      : "Bạn chưa kích hoạt Ví Passkey trên thiết bị này."}
                  </p>
                  {onOpenPasskeyRegister && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPasskeyRegister();
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                    >
                      {isEn ? "Register Passkey (Touch ID / Face ID)" : "Đăng ký Ví Passkey (Vân tay / Face ID)"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BRIDGE */}
          {activeTab === "bridge" && (
            <div className="space-y-4">
              <div className="bg-black/50 rounded-2xl p-5 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Layers size={18} className="text-amber-400" />
                  <span>{isEn ? "Circle CCTP Cross-Chain Bridge" : "Cầu Nối Xuyên Chuỗi Circle CCTP"}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? "Transfer native USDC seamlessly from Base, Arbitrum, Ethereum, or Avalanche to Arc Testnet using Circle's Cross-Chain Transfer Protocol (CCTP)."
                    : "Chuyển tiền USDC chính hãng từ Base, Arbitrum, Ethereum sang Arc Testnet nhanh chóng thông qua giao thức Circle CCTP chính chủ."}
                </p>
                <div className="pt-2">
                  <a
                    href="https://bridge.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs transition-all"
                  >
                    <span>{isEn ? "Launch Circle CCTP Portal" : "Mở Cổng Cầu Nối Circle CCTP"}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FAUCET */}
          {activeTab === "faucet" && (
            <div className="space-y-4">
              <div className="bg-black/50 rounded-2xl p-5 border border-amber-500/30 space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-300 font-bold text-sm">
                  <Droplet size={18} className="text-amber-400" />
                  <span>{isEn ? "Official Circle Testnet Faucet" : "Vòi Testnet Chính Thức Từ Circle"}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? "Claim free testnet USDC and EURC directly from Circle's official faucet to participate in savings clubs and test round bidding."
                    : "Nhận miễn phí USDC và EURC testnet từ Circle để tham gia các nhóm hụi và trải nghiệm đóng quỹ, đấu giá."}
                </p>

                <div className="space-y-2 pt-2 text-left">
                  <label className="text-xs text-slate-400 block font-medium">
                    {isEn ? "Your Address to receive tokens:" : "Địa chỉ ví nhận token của bạn:"}
                  </label>
                  <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-mono text-xs text-amber-300 truncate flex-1">
                      {connectedAccount || (isEn ? "Connect your wallet first" : "Hãy kết nối ví trước")}
                    </span>
                    {connectedAccount && (
                      <button
                        onClick={copyAddress}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        {copiedAddr ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedAddr ? (isEn ? "Copied" : "Đã chép") : (isEn ? "Copy" : "Sao chép")}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3">
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    <span>{isEn ? "Go to Circle Faucet (faucet.circle.com)" : "Đi đến Circle Faucet (faucet.circle.com)"}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-black/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
            <Sparkles size={13} />
            <span>{t("arcAppKit.badgeText", language)}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isEn ? "Close" : "Đóng"}
          </button>
        </div>
      </div>
    </div>
  );
}
