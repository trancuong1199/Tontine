import { useEffect, useRef, useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { getAccount, simulateContract, switchChain } from "@wagmi/core";
import { toast } from "sonner";
import { ARC_TESTNET_CHAIN_ID, parseContractError } from "../contract";
import { ensureArcChain } from "../lib/arcWallet";

/** One guarded entry point for every injected savings write. */
export function useArcWriteContract() {
  const config = useConfig();
  const mutation = useWriteContract();
  useEffect(() => { if (mutation.error) toast.error(parseContractError(mutation.error)); }, [mutation.error]);
  const inFlight = useRef(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [guardError, setGuardError] = useState<Error | null>(null);
  const writeContract = ((parameters: Parameters<typeof mutation.writeContract>[0], options?: Parameters<typeof mutation.writeContract>[1]) => {
    if (inFlight.current || (parameters.functionName === "startNewCycle" && mutation.isPending)) return;
    inFlight.current = true;
    setIsSwitching(true);
    setGuardError(null);
    void (async () => {
      let awaitingWallet = false;
      try {
        const isRestart = parameters.functionName === "startNewCycle";
        const originalSender = isRestart ? getAccount(config).address : undefined;
        await ensureArcChain({
          getChainId: () => getAccount(config).chainId,
          switchChain: (chainId) => switchChain(config, { chainId }),
          chainId: ARC_TESTNET_CHAIN_ID,
        });
        if (parameters.chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Savings transactions require Arc Testnet");
        if (isRestart) {
          const current = getAccount(config);
          if (!originalSender || current.address !== originalSender || current.chainId !== ARC_TESTNET_CHAIN_ID) {
            throw new Error("Wallet account or network changed. Please retry starting the cycle.");
          }
          const requestedSender = typeof parameters.account === "string" ? parameters.account : parameters.account?.address;
          if (requestedSender && requestedSender.toLowerCase() !== originalSender.toLowerCase()) {
            throw new Error("Restart sender does not match the connected wallet.");
          }
          await simulateContract(config, { ...parameters, account: originalSender, chainId: ARC_TESTNET_CHAIN_ID });
          const latest = getAccount(config);
          if (latest.address !== originalSender || latest.chainId !== ARC_TESTNET_CHAIN_ID) {
            throw new Error("Wallet account or network changed. Please retry starting the cycle.");
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
  return {
    ...mutation,
    writeContract,
    isPending: isSwitching || mutation.isPending,
    error: guardError ?? mutation.error,
    reset: () => { setGuardError(null); mutation.reset(); },
  };
}
