import { useEffect, useRef, useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { getAccount, switchChain } from "@wagmi/core";
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
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSwitching(true);
    setGuardError(null);
    void (async () => {
      try {
        await ensureArcChain({
          getChainId: () => getAccount(config).chainId,
          switchChain: (chainId) => switchChain(config, { chainId }),
          chainId: ARC_TESTNET_CHAIN_ID,
        });
        if (parameters.chainId !== ARC_TESTNET_CHAIN_ID) throw new Error("Savings transactions require Arc Testnet");
        mutation.writeContract(parameters, options);
      } catch (error) {
        setGuardError(error instanceof Error ? error : new Error(String(error)));
        toast.error(parseContractError(error));
      } finally {
        inFlight.current = false;
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
