/**
 * OnboardingScreen — Landing page + passkey register/login flow.
 * Không mount ConnectKitButton ở đây để tránh lỗi wagmi khi không có injected wallet.
 * MetaMask connect được xử lý ở App.tsx header riêng.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint, PiggyBank, Shield, Zap, Users,
  ArrowRight, Loader2, AlertCircle, Wallet, X,
} from "lucide-react";

interface OnboardingScreenProps {
  isConfigured: boolean;
  isLoading: boolean;
  loadingMessage: string;
  errorMessage: string;
  onRegister: (username: string) => void;
  onLogin: () => void;
  onClearError: () => void;
  onConnectMetamask: () => void;
  onClose?: () => void;
}

const FEATURES = [
  { icon: Shield, title: "Trustless", desc: "Contract giữ tiền, không ai tự ý rút" },
  { icon: Zap, title: "Phí ≈ $0", desc: "Arc Testnet — USDC là gas token" },
  { icon: Users, title: "Toàn cầu", desc: "Hụi / Susu / Tanda — 80+ quốc gia" },
];

type Mode = "landing" | "register" | "login-loading" | "login-error";

export function OnboardingScreen({
  isConfigured,
  isLoading,
  loadingMessage,
  errorMessage,
  onRegister,
  onLogin,
  onClearError,
  onConnectMetamask,
  onClose,
}: OnboardingScreenProps) {
  const [mode, setMode] = useState<Mode>("landing");
  const [username, setUsername] = useState("");

  const handleRegister = () => {
    onRegister(username.trim() || "user");
  };

  const handleLogin = () => {
    setMode("login-loading");
    onLogin();
  };

  // Sync mode when loading finishes with error
  if (mode === "login-loading" && !isLoading && errorMessage) {
    setMode("login-error");
  }
  if (mode === "login-loading" && !isLoading && !errorMessage) {
    // success — parent will unmount this screen
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-50 via-slate-50 to-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-2 max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
            <PiggyBank size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">
            HụiChain
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* MetaMask fallback button — plain button, no ConnectKit */}
          <button
            onClick={onConnectMetamask}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            <Wallet size={13} />
            MetaMask
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Đóng hướng dẫn"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-4 pb-10">
        <AnimatePresence mode="wait">

          {/* ── LANDING ── */}
          {mode === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-4"
            >
              {/* Hero card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
                  <PiggyBank size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Hụi trustless
                  </h1>
                  <p className="text-slate-500 text-sm mt-1.5 text-pretty max-w-[260px] mx-auto">
                    Góp USDC mỗi vòng, bid để nhận pot sớm.
                    Contract giữ tiền — không cần tin ai.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { v: "10", l: "USDC/vòng" },
                    { v: "≈$0", l: "Gas" },
                    { v: "<1s", l: "Confirm" },
                  ].map((s) => (
                    <div key={s.l} className="bg-slate-50 rounded-2xl p-3">
                      <p className="text-slate-900 font-bold text-lg tabular-nums">{s.v}</p>
                      <p className="text-slate-400 text-xs">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature chips */}
              <div className="grid grid-cols-3 gap-2">
                {FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Icon size={16} className="text-blue-600" />
                    </div>
                    <p className="font-semibold text-slate-800 text-xs">{title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="space-y-2">
                {isConfigured ? (
                  <>
                    <button
                      onClick={() => { onClearError(); setMode("register"); }}
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-sm"
                    >
                      <Fingerprint size={18} />
                      Tạo ví bằng Face ID / Fingerprint
                    </button>
                    <button
                      onClick={handleLogin}
                      className="w-full py-3 border border-slate-200 text-slate-700 font-medium rounded-2xl active:scale-[0.98] transition-transform text-sm hover:bg-slate-50"
                    >
                      Đã có tài khoản — Đăng nhập
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onConnectMetamask}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-sm"
                  >
                    <Wallet size={18} />
                    Kết nối ví Web3 để bắt đầu
                  </button>
                )}
              </div>

              {/* How it works */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                <h2 className="font-semibold text-slate-700 text-sm">Cách hoạt động</h2>
                {[
                  "Tham gia nhóm, chờ đủ thành viên",
                  "Mỗi vòng: đóng 10 USDC vào pot chung",
                  "Ai bid cao nhất nhận toàn bộ pot vòng đó",
                  "Mỗi người thắng đúng một vòng",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-slate-600 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col gap-4"
            >
              <button
                onClick={() => { onClearError(); setMode("landing"); }}
                className="text-slate-400 text-sm hover:text-slate-600 self-start"
              >
                ← Quay lại
              </button>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto">
                    <Fingerprint size={26} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Tạo ví thông minh
                  </h2>
                  <p className="text-slate-500 text-sm text-pretty max-w-[240px] mx-auto">
                    Không cần seed phrase. Xác thực bằng Face ID hoặc fingerprint.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tên hiển thị</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyen Van A"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <p className="text-slate-400 text-xs mt-1">Dùng để nhận ra passkey, không public.</p>
                  </div>

                  {errorMessage && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl shadow-md disabled:opacity-60 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-sm"
                  >
                    {isLoading ? (
                      <><Loader2 size={18} className="animate-spin" />{loadingMessage}</>
                    ) : (
                      <><Fingerprint size={18} />Tạo ví ngay<ArrowRight size={16} /></>
                    )}
                  </button>
                </div>

                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-blue-700 text-xs font-medium mb-0.5">Smart Account (ERC-4337)</p>
                  <p className="text-blue-500 text-xs text-pretty">
                    Ví là smart contract trên Arc Testnet. Gas được tài trợ — không cần USDC để trả phí.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN LOADING ── */}
          {mode === "login-loading" && (
            <motion.div
              key="login-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 flex flex-col items-center gap-4"
            >
              <Loader2 size={36} className="text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-slate-700 font-medium">{loadingMessage || "Đang xác thực..."}</p>
                <p className="text-slate-400 text-xs mt-1">Xác nhận trong trình duyệt của bạn</p>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN ERROR ── */}
          {mode === "login-error" && (
            <motion.div
              key="login-error"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4"
            >
              <button
                onClick={() => { onClearError(); setMode("landing"); }}
                className="text-slate-400 text-sm hover:text-slate-600"
              >
                ← Quay lại
              </button>
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl text-sm"
              >
                Thử lại
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
