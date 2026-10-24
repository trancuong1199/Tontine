import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Abi } from "viem";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  USDC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
} from "../contract";

export function useClubInfo(contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS) {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "groupName", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "state", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "currentRound", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "activeMembers", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "contributionAmount", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "maxMembers", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "owner", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "members", args: [0n], chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "members", args: [1n], chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "pendingOwner", chainId: ARC_TESTNET_CHAIN_ID },
    ],
  });

  const member0 = data?.[7]?.result as string | undefined;
  const member1 = data?.[8]?.result as string | undefined;
  const hasMinMembers = Boolean(member1);
  const memberCount = member1 ? 2 : member0 ? 1 : 0;

  return {
    groupName: data?.[0]?.result as string | undefined,
    state: data?.[1]?.result as number | undefined,
    currentRound: data?.[2]?.result as bigint | undefined,
    activeMembers: data?.[3]?.result as bigint | undefined,
    contributionAmount: data?.[4]?.result as bigint | undefined,
    maxMembers: data?.[5]?.result as bigint | undefined,
    owner: data?.[6]?.result as string | undefined,
    pendingOwner: data?.[9]?.result as string | undefined,
    hasMinMembers,
    memberCount,
    isLoading,
    refetch,
  };
}

export function useRoundInfo(
  roundId: bigint | undefined,
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS
) {
  const enabled = roundId !== undefined && roundId > 0n;
  const { data, isLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: ROTATING_SAVINGS_ABI,
    functionName: "getRoundSummary",
    args: enabled ? [roundId] : [1n],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled },
  });

  const result = data as [bigint, bigint, string, bigint, bigint, boolean] | undefined;
  return {
    startTime: result?.[0],
    endTime: result?.[1],
    winner: result?.[2],
    totalPot: result?.[3],
    totalBids: result?.[4],
    settled: result?.[5],
    isLoading,
    refetch,
  };
}

export function useMemberStatus(
  address: string | undefined,
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS
) {
  const enabled = !!address;
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "isMember",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "hasWon",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "isKicked",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "claimable",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
    ],
    query: { enabled },
  });

  return {
    isMember: data?.[0]?.result as boolean | undefined,
    hasWon: data?.[1]?.result as boolean | undefined,
    isKicked: data?.[2]?.result as boolean | undefined,
    claimable: data?.[3]?.result as bigint | undefined,
    isLoading,
    refetch,
  };
}

export function useRoundMemberStatus(
  roundId: bigint | undefined,
  address: string | undefined,
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS
) {
  const enabled = !!address && roundId !== undefined && roundId > 0n;
  const addr = (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
  const rId = roundId ?? 1n;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "getRoundContribution",
        args: [rId, addr],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "getRoundBid",
        args: [rId, addr],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
    ],
    query: { enabled },
  });

  return {
    contribution: data?.[0]?.result as bigint | undefined,
    bid: data?.[1]?.result as bigint | undefined,
    isLoading,
    refetch,
  };
}

export function useUsdcAllowance(
  owner: string | undefined,
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS
) {
  const { data, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [
      (owner ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      contractAddress,
    ],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!owner },
  });

  return { allowance: data, refetch };
}

export function useUsdcBalance(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [(address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  });

  return { balance: data, isLoading, refetch };
}

export interface SettledRound {
  roundId: bigint;
  startTime: bigint;
  endTime: bigint;
  winner: string;
  totalPot: bigint;
  totalBids: bigint;
  settled: boolean;
}

export function useRoundHistory(
  currentRound: bigint | undefined,
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS
) {
  const roundCount = currentRound ? Number(currentRound) : 0;
  const contracts = [];
  for (let i = 1; i <= roundCount; i++) {
    contracts.push({
      address: contractAddress,
      abi: ROTATING_SAVINGS_ABI as Abi,
      functionName: "getRoundSummary",
      args: [BigInt(i)],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  }

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const settledRounds: SettledRound[] = [];
  if (data) {
    data.forEach((item, index) => {
      const result = item.result as [bigint, bigint, string, bigint, bigint, boolean] | undefined;
      if (result && result[5] === true) {
        settledRounds.push({
          roundId: BigInt(index + 1),
          startTime: result[0],
          endTime: result[1],
          winner: result[2],
          totalPot: result[3],
          totalBids: result[4],
          settled: result[5],
        });
      }
    });
  }

  return {
    settledRounds,
    isLoading,
    refetch,
  };
}
