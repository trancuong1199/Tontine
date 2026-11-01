/**
 * usePasskeyWallet — Circle Modular Wallet với passkey authentication.
 * Cho phép user đăng ký/đăng nhập bằng Face ID / fingerprint,
 * tạo smart account trên Arc Testnet, không cần MetaMask.
 */
import { useState, useCallback, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";
import {
  createBundlerClient,
  createWebAuthnCredential,
  toWebAuthnAccount,
  type SmartAccount,
} from "viem/account-abstraction";
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from "@circle-fin/modular-wallets-core";

import { loadStoredCredential, saveCredential, clearCredential, type StoredCredential } from "../lib/passkeySession";

const clientKey = import.meta.env.VITE_CLIENT_KEY as string;
const clientUrl = import.meta.env.VITE_CLIENT_URL as string;

export type PasskeyWalletState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "ready"; account: SmartAccount; address: `0x${string}` }
  | { status: "error"; message: string };

function buildTransports() {
  if (!clientKey || !clientUrl) return null;
  const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: modularTransport });
  const bundlerClient = createBundlerClient({ chain: arcTestnet, transport: modularTransport });
  return { passkeyTransport, modularTransport, publicClient, bundlerClient };
}

function buildFallbackPublicClient() {
  return createPublicClient({ chain: arcTestnet, transport: http() });
}

function checkWebAuthnAvailable(): string | null {
  if (typeof window === "undefined") {
    return "Môi trường không hỗ trợ WebAuthn.";
  }
  if (!window.isSecureContext) {
    return "Passkey yêu cầu kết nối bảo mật HTTPS.";
  }
  if (typeof window.PublicKeyCredential === "undefined" || !navigator.credentials) {
    return "Trình duyệt trong ứng dụng (Zalo/Telegram/Messenger) không hỗ trợ Passkey. Vui lòng mở bằng Safari (iOS) hoặc Chrome (Android).";
  }
  return null;
}

export function usePasskeyWallet() {
  const [state, setState] = useState<PasskeyWalletState>({ status: "idle" });
  const [bundler, setBundler] = useState<ReturnType<typeof createBundlerClient> | null>(null);
  const isConfigured = Boolean(
    (clientKey && clientUrl) ||
      (typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined")
  );

  const restoreSession = useCallback(async (credential: StoredCredential) => {
    const transports = buildTransports();
    const publicClient = transports ? transports.publicClient : buildFallbackPublicClient();
    try {
      setState({ status: "loading", message: "Đang khôi phục phiên..." });
      const account = await toCircleSmartAccount({
        client: publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      if (transports) {
        setBundler(transports.bundlerClient);
      }
      setState({ status: "ready", account, address: account.address });
    } catch {
      clearCredential();
      setState({ status: "idle" });
    }
  }, []);

  // Auto-restore session on mount
  useEffect(() => {
    const stored = loadStoredCredential();
    if (!stored) return;
    restoreSession(stored);
  }, [restoreSession]);

  const register = useCallback(async (username: string) => {
    const envErr = checkWebAuthnAvailable();
    if (envErr) {
      setState({ status: "error", message: envErr });
      return;
    }
    const transports = buildTransports();
    try {
      setState({ status: "loading", message: "Đang tạo passkey (Face ID / Vân tay)..." });
      const credential: StoredCredential = transports
        ? await toWebAuthnCredential({
            transport: transports.passkeyTransport,
            mode: WebAuthnMode.Register,
            username,
          })
        : await (async () => {
            const raw = await createWebAuthnCredential({
              name: username,
              rp: {
                id: window.location.hostname,
                name: "Tontine Arc Savings Club",
              },
            });
            return {
              id: raw.id,
              publicKey: raw.publicKey as `0x${string}`,
            };
          })();
      saveCredential(credential);
      setState({ status: "loading", message: "Đang tạo ví thông minh..." });
      const publicClient = transports ? transports.publicClient : buildFallbackPublicClient();
      const account = await toCircleSmartAccount({
        client: publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      if (transports) {
        setBundler(transports.bundlerClient);
      }
      setState({ status: "ready", account, address: account.address });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại.";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled") || msg.includes("aborted")) {
        setState({ status: "error", message: "Bạn đã huỷ xác thực passkey hoặc trình duyệt chặn WebAuthn (hãy mở bằng Safari/Chrome)." });
      } else if (msg.includes("InvalidStateError")) {
        setState({ status: "error", message: "Passkey đã tồn tại trên thiết bị này. Hãy bấm Đăng nhập." });
      } else if (msg.includes("SecurityError")) {
        setState({ status: "error", message: "Lỗi bảo mật tên miền WebAuthn. Hãy mở trực tiếp trên Safari hoặc Chrome." });
      } else {
        setState({ status: "error", message: msg });
      }
    }
  }, []);

  const login = useCallback(async () => {
    const envErr = checkWebAuthnAvailable();
    if (envErr) {
      setState({ status: "error", message: envErr });
      return;
    }
    const transports = buildTransports();
    try {
      setState({ status: "loading", message: "Đang xác thực passkey..." });
      let credential: StoredCredential;
      if (transports) {
        credential = await toWebAuthnCredential({
          transport: transports.passkeyTransport,
          mode: WebAuthnMode.Login,
        });
      } else {
        const stored = loadStoredCredential();
        if (!stored) {
          setState({
            status: "error",
            message: "Chưa tìm thấy Passkey lưu trên trình duyệt này. Vui lòng bấm Đăng ký Ví Passkey.",
          });
          return;
        }
        const owner = toWebAuthnAccount({ credential: stored });
        if (owner.sign) {
          await owner.sign({
            hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          });
        }
        credential = stored;
      }
      saveCredential(credential);
      setState({ status: "loading", message: "Đang tải ví..." });
      const publicClient = transports ? transports.publicClient : buildFallbackPublicClient();
      const account = await toCircleSmartAccount({
        client: publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      if (transports) {
        setBundler(transports.bundlerClient);
      }
      setState({ status: "ready", account, address: account.address });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại.";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled") || msg.includes("aborted")) {
        setState({ status: "error", message: "Bạn đã huỷ xác thực." });
      } else {
        setState({ status: "error", message: msg });
      }
    }
  }, []);

  const logout = useCallback(() => {
    clearCredential();
    setBundler(null);
    setState({ status: "idle" });
  }, []);

  return {
    state,
    bundler,
    isConfigured,
    register,
    login,
    logout,
    clearError: () => setState({ status: "idle" }),
  };
}
