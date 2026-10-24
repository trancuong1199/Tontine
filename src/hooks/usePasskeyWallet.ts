/**
 * usePasskeyWallet — Circle Modular Wallet với passkey authentication.
 * Cho phép user đăng ký/đăng nhập bằng Face ID / fingerprint,
 * tạo smart account trên Arc Testnet, không cần MetaMask.
 */
import { useState, useCallback, useEffect } from "react";
import { createPublicClient } from "viem";
import { arcTestnet } from "viem/chains";
import {
  createBundlerClient,
  toWebAuthnAccount,
  type P256Credential,
  type SmartAccount,
} from "viem/account-abstraction";
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
} from "@circle-fin/modular-wallets-core";

const clientKey = import.meta.env.VITE_CLIENT_KEY as string;
const clientUrl = import.meta.env.VITE_CLIENT_URL as string;

export type PasskeyWalletState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "ready"; account: SmartAccount; address: `0x${string}` }
  | { status: "error"; message: string };

const CREDENTIAL_KEY = "huichain_passkey_credential";

function loadStoredCredential(): P256Credential | null {
  try {
    const raw = localStorage.getItem(CREDENTIAL_KEY);
    return raw ? (JSON.parse(raw) as P256Credential) : null;
  } catch {
    return null;
  }
}

function saveCredential(cred: P256Credential) {
  localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(cred));
}

function clearCredential() {
  localStorage.removeItem(CREDENTIAL_KEY);
}

function buildTransports() {
  if (!clientKey || !clientUrl) return null;
  const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
  const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: modularTransport });
  const bundlerClient = createBundlerClient({ chain: arcTestnet, transport: modularTransport });
  return { passkeyTransport, modularTransport, publicClient, bundlerClient };
}

export function usePasskeyWallet() {
  const [state, setState] = useState<PasskeyWalletState>({ status: "idle" });
  const [bundler, setBundler] = useState<ReturnType<typeof createBundlerClient> | null>(null);
  const isConfigured = Boolean(clientKey && clientUrl);

  // Auto-restore session on mount
  useEffect(() => {
    if (!isConfigured) return;
    const stored = loadStoredCredential();
    if (!stored) return;
    restoreSession(stored);
  }, [isConfigured]);

  const restoreSession = useCallback(async (credential: P256Credential) => {
    const transports = buildTransports();
    if (!transports) return;
    try {
      setState({ status: "loading", message: "Đang khôi phục phiên..." });
      const account = await toCircleSmartAccount({
        client: transports.publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      setBundler(transports.bundlerClient);
      setState({ status: "ready", account, address: account.address });
    } catch {
      clearCredential();
      setState({ status: "idle" });
    }
  }, []);

  const register = useCallback(async (username: string) => {
    const transports = buildTransports();
    if (!transports) {
      setState({ status: "error", message: "VITE_CLIENT_KEY chưa được cấu hình." });
      return;
    }
    try {
      setState({ status: "loading", message: "Đang tạo passkey..." });
      const credential = await toWebAuthnCredential({
        transport: transports.passkeyTransport,
        mode: WebAuthnMode.Register,
        username,
      });
      saveCredential(credential);
      setState({ status: "loading", message: "Đang tạo ví thông minh..." });
      const account = await toCircleSmartAccount({
        client: transports.publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      setBundler(transports.bundlerClient);
      setState({ status: "ready", account, address: account.address });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại.";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled")) {
        setState({ status: "error", message: "Bạn đã huỷ xác thực passkey." });
      } else if (msg.includes("InvalidStateError")) {
        setState({ status: "error", message: "Passkey đã tồn tại. Hãy đăng nhập." });
      } else {
        setState({ status: "error", message: msg });
      }
    }
  }, []);

  const login = useCallback(async () => {
    const transports = buildTransports();
    if (!transports) {
      setState({ status: "error", message: "VITE_CLIENT_KEY chưa được cấu hình." });
      return;
    }
    try {
      setState({ status: "loading", message: "Đang xác thực passkey..." });
      const credential = await toWebAuthnCredential({
        transport: transports.passkeyTransport,
        mode: WebAuthnMode.Login,
      });
      saveCredential(credential);
      setState({ status: "loading", message: "Đang tải ví..." });
      const account = await toCircleSmartAccount({
        client: transports.publicClient,
        owner: toWebAuthnAccount({ credential }),
      });
      setBundler(transports.bundlerClient);
      setState({ status: "ready", account, address: account.address });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại.";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled")) {
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
