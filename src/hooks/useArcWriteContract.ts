import { useEffect, useRef, useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { getAccount, simulateContract, switchChain } from "@wagmi/core";
import { toast } from "sonner";
import { ARC_TESTNET_CHAIN_ID, parseContractError } from "../contract";
import { ensureArcChain } from "../lib/arcWallet";

/** One guarded entry point for every injected savings write. */
export function useArcWriteContract(contextKey?: string) {
  const currentContext = useRef(contextKey);
  currentContext.current = contextKey;
  const config = useConfig();
  const mutation = useWriteContract();
  const mutationPending = useRef(mutation.isPending);
  mutationPending.current = mutation.isPending;
  useEffect(() => { if (mutation.error) toast.error(parseContractError(mutation.error)); }, [mutation.error]);
  const inFlight = useRef(false);
  const asyncInFlight = useRef(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [guardError, setGuardError] = useState<Error | null>(null);
  const writeContract = ((parameters: Parameters<typeof mutation.writeContract>[0], options?: Parameters<typeof mutation.writeContract>[1]) => {
    if (inFlight.current || ((parameters.functionName === "startNewCycle" || parameters.account !== undefined) && mutationPending.current)) return;
    inFlight.current = true;
    setIsSwitching(true);
    setGuardError(null);
    void (async () => {
      let awaitingWallet = false;
      try {
        const isRestart = parameters.functionName === "startNewCycle";
        const bindSender = isRestart || parameters.account !== undefined;
        const originalSender = bindSender ? getAccount(config).address : undefined;
        const originalContext = currentContext.current;
        await ensureArcChain({
          getChainId: () => getAccount(config).chainId,
          switchChain: (chainId) => switchChain(config, { chainId }),
          chainId: ARC_TESTNET_CHAIN_ID,
        });
        if (parameters.chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Savings transactions require Arc Testnet");
        if (bindSender) {
          const current = getAccount(config);
          if (!originalSender || current.address !== originalSender || current.chainId !== ARC_TESTNET_CHAIN_ID) {
            throw new Error("Wallet account or network changed. Please review and retry.");
          }
          const requestedSender = typeof parameters.account === "string" ? parameters.account : parameters.account?.address;
          if (requestedSender && requestedSender.toLowerCase() !== originalSender.toLowerCase()) {
            throw new Error("Transaction sender does not match the connected wallet.");
          }
          if (isRestart) await simulateContract(config, { ...parameters, account: originalSender, chainId: ARC_TESTNET_CHAIN_ID });
          const latest = getAccount(config);
          if (latest.address !== originalSender || latest.chainId !== ARC_TESTNET_CHAIN_ID || currentContext.current !== originalContext) {
            throw new Error("Wallet account or network changed. Please review and retry.");
          }
          // Keep the lock through wallet submission, including the render gap.
          mutation.writeContract(parameters, {
            ...options,
            onSettled: (...args) => { inFlight.current = false; options?.onSettled?.(...args); },
          });
          awaitingWallet = true;
        } else {
          mutation.writeContract(parameters, options);
        }
      } catch (error) {
        setGuardError(error instanceof Error ? error : new Error(String(error)));
        toast.error(parseContractError(error));
      } finally {
        if (!awaitingWallet) inFlight.current = false;
        setIsSwitching(false);
      }
    })();
  }) as typeof mutation.writeContract;
  /**
   * Guarded promise-returning variant. Same protections as writeContract (Arc chain switch, forced
   * chainId, sender/network re-check after the switch) but resolves with the transaction hash so
   * callers can sequence dependent transactions (e.g. approve -> wait for receipt -> main call).
   */
  const writeContractAsync = (async (parameters: Parameters<typeof mutation.writeContractAsync>[0], options?: Parameters<typeof mutation.writeContractAsync>[1]) => {
    if (asyncInFlight.current) throw new Error("Another transaction request is still waiting for the wallet.");
    asyncInFlight.current = true;
    setIsSwitching(true);
    setGuardError(null);
    try {
      const originalSender = getAccount(config).address;
      const originalContext = currentContext.current;
      await ensureArcChain({
        getChainId: () => getAccount(config).chainId,
        switchChain: (chainId) => switchChain(config, { chainId }),
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      const current = getAccount(config);
      if (!originalSender || current.address !== originalSender || current.chainId !== ARC_TESTNET_CHAIN_ID || currentContext.current !== originalContext) {
        throw new Error("Wallet account or network changed. Please review and retry.");
      }
      return await mutation.writeContractAsync({ ...parameters, chainId: ARC_TESTNET_CHAIN_ID } as typeof parameters, options);
    } catch (error) {
      setGuardError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      asyncInFlight.current = false;
      setIsSwitching(false);
    }
  }) as typeof mutation.writeContractAsync;
  return {
    ...mutation,
    writeContract,
    writeContractAsync,
    isPending: isSwitching || mutation.isPending,
    error: guardError ?? mutation.error,
    reset: () => { setGuardError(null); mutation.reset(); },
  };
}
