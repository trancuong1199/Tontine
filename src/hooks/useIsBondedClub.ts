import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { BONDED_TONTINE_FACTORY_ABI } from "../lib/bondedTontine.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_DEFAULT_BONDED_CLUB,
  TRUSTED_BONDED_FACTORIES,
  isKnownBondedClubAddress,
  registerRuntimeBondedClub,
} from "../config/bonded-tontine.ts";
import { getKnownGroups } from "../lib/savingsClubDirectory.ts";

export interface IsBondedClubResult {
  /** True once the address is known (locally) or verified on-chain as a BondedTontineFactory club. */
  isBonded: boolean;
  /** True while the on-chain `factory.isClub(address)` check is still running for an unknown address. */
  isChecking: boolean;
  /** True if reading factory.isClub failed */
  isError: boolean;
  refetch?: () => void;
}

/**
 * Decides whether `address` is a BondedTontine club.
 * 1. Immediate: default club, known-club list, or directory entry marked `v2-bonded`.
 * 2. Otherwise: reads `factory.isClub(address)` from every trusted factory (current + previous) (R7).
 * The global registry is only updated inside an effect (never during render).
 */
export function useIsBondedClub(address?: `0x${string}`, account?: string): IsBondedClubResult {
  const factories = TRUSTED_BONDED_FACTORIES[ARC_TESTNET_CHAIN_ID] ?? [];
  const lower = address?.toLowerCase();

  const locallyKnown = Boolean(
    lower &&
      (lower === ARC_TESTNET_DEFAULT_BONDED_CLUB.toLowerCase() ||
        isKnownBondedClubAddress(lower) ||
        getKnownGroups(account).find((g) => g.address.toLowerCase() === lower)?.version === "v2-bonded")
  );

  const shouldCheckOnChain = Boolean(address && factories.length > 0 && !locallyKnown);

  const read = useReadContracts({
    contracts: factories.map((factory) => ({
      address: factory,
      abi: BONDED_TONTINE_FACTORY_ABI as Abi,
      functionName: "isClub",
      args: address ? [address] : undefined,
      chainId: ARC_TESTNET_CHAIN_ID,
    })),
    query: { enabled: shouldCheckOnChain, retry: 1, staleTime: 60_000 },
  });

  const results = read.data ?? [];
  const verifiedOnChain = results.some((r) => r.status === "success" && r.result === true);
  // Error only if no factory confirmed the club and every factory read failed.
  const allReadsFailed =
    read.isError || (results.length > 0 && results.every((r) => r.status === "failure"));
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
    isError: shouldCheckOnChain && !verifiedOnChain && allReadsFailed,
    refetch: read.refetch,
  };
}
