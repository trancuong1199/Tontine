import { historyRoundIds } from "../lib/roundHistory";
import { classifyCycleCapability } from "../lib/cycleCapabilities";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Abi } from "viem";
import {
  ROTATING_SAVINGS_ADDRESS,
  ROTATING_SAVINGS_ABI,
  USDC_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
} from "../contract";

/** A separate query keeps legacy getter failures isolated from club/claim reads. */
export function useCycleCapability(contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS) {
  const read = useReadContract({
    address: contractAddress,
    abi: ROTATING_SAVINGS_ABI,
    functionName: "cycleStartRound",
    chainId: ARC_TESTNET_CHAIN_ID,
    // Query identity includes address+chain; never borrow the previous club's data.
    query: { retry: false, placeholderData: () => undefined },
  });
  return { capability: classifyCycleCapability(read), refetch: read.refetch };
}

export function useClubInfo(contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS) {
  const { data, isLoading, isFetching, error, refetch } = useReadContracts({
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
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "cirBtcCollateralAmount", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "cancelVoteCount", chainId: ARC_TESTNET_CHAIN_ID },
      { address: contractAddress, abi: ROTATING_SAVINGS_ABI, functionName: "requiredCancelVotes", chainId: ARC_TESTNET_CHAIN_ID },
    ],
    query: { placeholderData: () => undefined },
  });

  const membershipKnown = !error && !isFetching && !!data && [data[7], data[8]].every(item => item?.status === 'success' || classifyCycleCapability({ error: item?.error }) === 'unsupported');
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
    collateralAmount: !error && !isFetching ? data?.[10]?.result as bigint | undefined : undefined,
    cancelVoteCount: data?.[11]?.result as bigint | undefined,
    requiredCancelVotes: data?.[12]?.result as bigint | undefined,
    hasMinMembers,
    memberCount,
    membershipKnown,
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
  const tokenRead = useReadContract({
    address: contractAddress,
    abi: ROTATING_SAVINGS_ABI,
    functionName: "cirBtcToken",
    chainId: ARC_TESTNET_CHAIN_ID,
  });
  const collateralToken = typeof tokenRead.data === "string" && /^0x[0-9a-fA-F]{40}$/.test(tokenRead.data) && !/^0x0{40}$/.test(tokenRead.data)
    ? tokenRead.data as `0x${string}` : undefined;
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
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "cirBtcCollateral",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "claimableCirBtc",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: collateralToken ?? "0x0000000000000000000000000000000000000000",
        abi: erc20Abi,
        functionName: "balanceOf",
        args: enabled ? [address as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: collateralToken ?? "0x0000000000000000000000000000000000000000",
        abi: erc20Abi,
        functionName: "allowance",
        args: [
          enabled ? (address as `0x${string}`) : "0x0000000000000000000000000000000000000000",
          contractAddress,
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI,
        functionName: "hasVotedCancel",
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
    lockedCollateral: data?.[4]?.result as bigint | undefined,
    claimableCirBtc: data?.[5]?.result as bigint | undefined,
    collateralToken,
    cirBtcBalance: collateralToken ? data?.[6]?.result as bigint | undefined : undefined,
    cirBtcAllowance: collateralToken ? data?.[7]?.result as bigint | undefined : undefined,
    hasVotedCancel: data?.[8]?.result as boolean | undefined,
    isLoading,
    refetch: async () => { await tokenRead.refetch(); return refetch(); },
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
  const roundIds = historyRoundIds(currentRound);
  const contracts = roundIds.map((roundId) => ({
    address: contractAddress,
    abi: ROTATING_SAVINGS_ABI as Abi,
    functionName: "getRoundSummary",
    args: [roundId],
    chainId: ARC_TESTNET_CHAIN_ID,
  }));

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
          roundId: roundIds[index],
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
    historyStartRound: roundIds[0],
    isHistoryLimited: (roundIds[0] ?? 1n) > 1n,
    isLoading,
    refetch,
  };
}

export interface ClubMemberInfo {
  index: number;
  address: `0x${string}`;
  contribution: bigint;
  bid: bigint;
  hasWon: boolean;
  isKicked: boolean;
  hasContributed: boolean;
  claimable: bigint;
  hasVotedCancel: boolean;
}

export function useClubMembers(
  contractAddress: `0x${string}` = ROTATING_SAVINGS_ADDRESS,
  currentRound: bigint | undefined = 1n,
  maxMembers: bigint | undefined = 10n,
  contributionAmount: bigint | undefined = 0n
) {
  const max = maxMembers ? Number(maxMembers) : 10;
  const count = Math.min(Math.max(max, 2), 20);
  const rId = currentRound && currentRound > 0n ? currentRound : 1n;

  // 1. Read members array up to count
  const memberContracts = [];
  for (let i = 0; i < count; i++) {
    memberContracts.push({
      address: contractAddress,
      abi: ROTATING_SAVINGS_ABI as Abi,
      functionName: "members",
      args: [BigInt(i)],
      chainId: ARC_TESTNET_CHAIN_ID,
    });
  }

  const { data: memberData, isLoading: isMembersLoading, refetch: refetchMembers } = useReadContracts({
    contracts: memberContracts,
    query: { enabled: count > 0 },
  });

  const memberAddresses: `0x${string}`[] = [];
  if (memberData) {
    for (const item of memberData) {
      if (
        item.result &&
        typeof item.result === "string" &&
        item.result !== "0x0000000000000000000000000000000000000000"
      ) {
        memberAddresses.push(item.result as `0x${string}`);
      }
    }
  }

  // 2. Read details for each member: getRoundContribution, getRoundBid, hasWon, isKicked
  const detailContracts = [];
  for (const m of memberAddresses) {
    detailContracts.push(
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "getRoundContribution",
        args: [rId, m],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "getRoundBid",
        args: [rId, m],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "hasWon",
        args: [m],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "isKicked",
        args: [m],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "claimable",
        args: [m],
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        address: contractAddress,
        abi: ROTATING_SAVINGS_ABI as Abi,
        functionName: "hasVotedCancel",
        args: [m],
        chainId: ARC_TESTNET_CHAIN_ID,
      }
    );
  }

  const { data: detailsData, isLoading: isDetailsLoading, refetch: refetchDetails } = useReadContracts({
    contracts: detailContracts,
    query: { enabled: memberAddresses.length > 0 },
  });

  const members: ClubMemberInfo[] = [];
  let highestBid = 0n;
  let highestBidder: `0x${string}` | null = null;

  memberAddresses.forEach((m, idx) => {
    const base = idx * 6;
    const contrib = (detailsData?.[base]?.result as bigint | undefined) ?? 0n;
    const bid = (detailsData?.[base + 1]?.result as bigint | undefined) ?? 0n;
    const hasWon = Boolean(detailsData?.[base + 2]?.result);
    const isKicked = Boolean(detailsData?.[base + 3]?.result);
    const claimable = (detailsData?.[base + 4]?.result as bigint | undefined) ?? 0n;
    const hasVotedCancel = Boolean(detailsData?.[base + 5]?.result);
    const hasContributed = contributionAmount ? contrib >= contributionAmount : contrib > 0n;

    if (bid > highestBid) {
      highestBid = bid;
      highestBidder = m;
    }

    members.push({
      index: idx + 1,
      address: m,
      contribution: contrib,
      bid,
      hasWon,
      isKicked,
      hasContributed,
      claimable,
      hasVotedCancel,
    });
  });

  const refetch = async () => {
    await refetchMembers();
    await refetchDetails();
  };

  return {
    members,
    totalJoined: memberAddresses.length,
    highestBid,
    highestBidder,
    isLoading: isMembersLoading || isDetailsLoading,
    refetch,
  };
}

