import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { BONDED_TONTINE_FACTORY_ABI } from "../lib/bondedTontine.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_DEFAULT_BONDED_CLUB,
  CANONICAL_FACTORY,
  isKnownBondedClubAddress,
  registerRuntimeBondedClub,
} from "../config/bonded-tontine.ts";
import { getKnownGroups } from "../lib/savingsClubDirectory.ts";

export interface IsBondedClubResult {
  /** True once the address is known (locally) or verified on-chain as a BondedTontineFactory club. */
  isBonded: boolean;
  /** True while the on-chain `factory.isClub(address)` check is still running for an unknown address. */
  isChecking: boolean;
}

/**
 * Decides whether `address` is a BondedTontine club.
 * 1. Immediate: default club, known-club list, or directory entry marked `v2-bonded`.
 * 2. Otherwise: reads `factory.isClub(address)` from the canonical factory (R7).
 * The global registry is only updated inside an effect (never during render).
 */
export function useIsBondedClub(address?: `0x${string}`): IsBondedClubResult {
  const factory = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];
  const lower = address?.toLowerCase();

  const locallyKnown = Boolean(
    lower &&
      (lower === ARC_TESTNET_DEFAULT_BONDED_CLUB.toLowerCase() ||
        isKnownBondedClubAddress(lower) ||
        getKnownGroups().find((g) => g.address.toLowerCase() === lower)?.version === "v2-bonded")
  );

  const shouldCheckOnChain = Boolean(address && factory && !locallyKnown);

  const read = useReadContract({
    address: factory,
    abi: BONDED_TONTINE_FACTORY_ABI,
    functionName: "isClub",
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: shouldCheckOnChain, retry: 1, staleTime: 60_000 },
  });

  const verifiedOnChain = read.data === true;
  const isBonded = locallyKnown || verifiedOnChain;
  const [, setRegistryVersion] = useState(0);

  useEffect(() => {
    if (address && isBonded && !isKnownBondedClubAddress(address)) {
      registerRuntimeBondedClub(address);
      // Re-render so hooks reading the registry (legacy RotatingSavings reads) switch off.
      setRegistryVersion((v) => v + 1);
    }
  }, [address, isBonded]);

  return {
    isBonded,
    isChecking: shouldCheckOnChain && read.isLoading,
  };
}
