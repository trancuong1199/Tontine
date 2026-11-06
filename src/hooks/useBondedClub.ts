import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import {
  BONDED_TONTINE_ABI,
  BONDED_TONTINE_FACTORY_ABI,
  MOCK_AGGREGATOR_V3_ABI,
  BONDED_STATE,
  isMockOracleDescription,
  type BondedStateCode,
} from "../lib/bondedTontine.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_DEFAULT_BONDED_CLUB,
  CANONICAL_FACTORY,
  BONDED_USDC_ADDRESS,
  BONDED_CIRBTC_ADDRESS,
  isKnownBondedClubAddress,
} from "../config/bonded-tontine.ts";
import { getKnownGroups } from "../lib/savingsClubDirectory.ts";
import { requireChain } from "../onchain-facts.ts";

const ERC20_READ_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface BondedClubSnapshot {
  address: `0x${string}`;
  isLoading: boolean;
  error: string | null;
  isVerifiedClub: boolean;
  factoryAddress?: `0x${string}`;
  state: BondedStateCode;
  owner: `0x${string}`;
  groupName: string;
  contributionAmount: bigint;
  maxMembers: bigint;
  totalRounds: bigint;
  roundDuration: bigint;
  rateBpsPerRound: bigint;
  safetyBps: bigint;
  liquidationBps: bigint;
  interestGrace: bigint;
  settlementGrace: bigint;
  maxPriceAge: bigint;
  priceFeed: `0x${string}`;
  memberCount: bigint;
  totalDeposits: bigint;
  totalDebt: bigint;
  collateral: bigint;
  interestDueTotal: bigint;
  interestPaidTotal: bigint;
  interestClaimedTotal: bigint;
  interestOwed: bigint;
  startTime: bigint;
  nextInterestDeadline: bigint;
  currentRoundIndex: bigint;
  cycleEnded: boolean;
  memberAddresses: readonly `0x${string}`[];
  membersLoadError: string | null;
  // Oracle-dependent fields (may be null if oracle is stale/broken)
  oracleError: boolean;
  collateralValueUsdc: bigint | null;
  borrowLimit: bigint | null;
  exposure: bigint | null;
  healthBps: bigint | null;
  // Oracle feed metadata (T6.8)
  oracleDescription: string;
  isMockOracle: boolean;
  oraclePriceRaw: bigint;
  oracleUpdatedAt: bigint;
  priceAgeSeconds: bigint;
  oracleAdmin?: `0x${string}`;
  // User-specific fields
  isMember: boolean;
  userDeposit: bigint;
  hasContributedCurrentRound: boolean;
  pendingInterest: bigint;
  previewPrincipalUsdc: bigint;
  previewPrincipalCirBtc: bigint;
  principalWithdrawn: boolean;
  usdcAllowance: bigint;
  cirBtcBalance: bigint;
  cirBtcAllowance: bigint;
  refetch: () => Promise<void>;
}

interface MemberCacheEntry {
  addresses: `0x${string}`[];
  memberCount: bigint;
  timestamp: number;
}
const memberListCache = new Map<string, MemberCacheEntry>();

export async function fetchBondedClubMembers(
  publicClient: any,
  clubAddress: `0x${string}`,
  memberCount: bigint
): Promise<{ members: `0x${string}`[]; error: string | null }> {
  if (memberCount === 0n) {
    return { members: [], error: null };
  }

  const cacheKey = clubAddress.toLowerCase();
  const cached = memberListCache.get(cacheKey);
  // Cache valid for 30s if count matches
  if (
    cached &&
    cached.memberCount === memberCount &&
    cached.addresses.length === Number(memberCount) &&
    Date.now() - cached.timestamp < 30_000
  ) {
    return { members: cached.addresses, error: null };
  }

  // Strategy 1: On Arc Testnet, use Blockscout Explorer Logs API (bypasses RPC block range limit)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const explorerApi = `${requireChain(ARC_TESTNET_CHAIN_ID).explorerBase}/api`;
    const explorerRes = await fetch(
      `${explorerApi}?module=logs&action=getLogs&address=${clubAddress}&fromBlock=0&toBlock=latest`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (explorerRes.ok) {
      const data = await explorerRes.json();
      if (data.message === "OK" && Array.isArray(data.result)) {
        const joinedOrder: `0x${string}`[] = [];
        const removedSet = new Set<string>();

        for (const item of data.result) {
          try {
            const decoded = decodeEventLog({
              abi: BONDED_TONTINE_ABI,
              data: item.data,
              topics: (item.topics || []).filter(Boolean),
            });
            if (decoded.eventName === "MemberJoined") {
              const m = (decoded.args as { member?: `0x${string}` })?.member;
              if (m && !joinedOrder.some((a) => a.toLowerCase() === m.toLowerCase())) {
                joinedOrder.push(m);
              }
            } else if (decoded.eventName === "MemberRemoved") {
              const m = (decoded.args as { member?: `0x${string}` })?.member;
              if (m) {
                removedSet.add(m.toLowerCase());
              }
            }
          } catch {
            // Non-matching log or unrelated event
          }
        }

        const activeMembers = joinedOrder.filter((m) => !removedSet.has(m.toLowerCase()));
        if (activeMembers.length > 0 || memberCount === 0n) {
          memberListCache.set(cacheKey, {
            addresses: activeMembers,
            memberCount,
            timestamp: Date.now(),
          });
          return { members: activeMembers, error: null };
        }
      }
    }
  } catch {
    // Explorer API failed or timed out, continue to RPC strategy
  }

  // Strategy 2: RPC getLogs with fallback range
  try {
    // First try full range (works on local fork / anvil)
    const [joinedLogs, removedLogs] = await Promise.all([
      publicClient.getLogs({
        address: clubAddress,
        event: {
          type: "event",
          name: "MemberJoined",
          inputs: [{ type: "address", name: "member", indexed: true }],
        },
        fromBlock: 0n,
        toBlock: "latest",
      }),
      publicClient.getLogs({
        address: clubAddress,
        event: {
          type: "event",
          name: "MemberRemoved",
          inputs: [{ type: "address", name: "member", indexed: true }],
        },
        fromBlock: 0n,
        toBlock: "latest",
      }),
    ]);

    const removedSet = new Set(
      removedLogs
        .map((l: any) => (l.args as { member?: string })?.member?.toLowerCase())
        .filter(Boolean)
    );

    const joinedOrder: `0x${string}`[] = [];
    for (const log of joinedLogs) {
      const m = (log.args as { member?: `0x${string}` })?.member;
      if (m && !removedSet.has(m.toLowerCase()) && !joinedOrder.some((a) => a.toLowerCase() === m.toLowerCase())) {
        joinedOrder.push(m);
      }
    }

    memberListCache.set(cacheKey, {
      addresses: joinedOrder,
      memberCount,
      timestamp: Date.now(),
    });
    return { members: joinedOrder, error: null };
  } catch {
    // Strategy 3: If RPC failed with block range limit (-32012), try last 4000 blocks
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 4000n ? currentBlock - 4000n : 0n;
      const [joinedLogs, removedLogs] = await Promise.all([
        publicClient.getLogs({
          address: clubAddress,
          event: {
            type: "event",
            name: "MemberJoined",
            inputs: [{ type: "address", name: "member", indexed: true }],
          },
          fromBlock,
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: clubAddress,
          event: {
            type: "event",
            name: "MemberRemoved",
            inputs: [{ type: "address", name: "member", indexed: true }],
          },
          fromBlock,
          toBlock: currentBlock,
        }),
      ]);

      const removedSet = new Set(
        removedLogs
          .map((l: any) => (l.args as { member?: string })?.member?.toLowerCase())
          .filter(Boolean)
      );

      const joinedOrder: `0x${string}`[] = [];
      for (const log of joinedLogs) {
        const m = (log.args as { member?: `0x${string}` })?.member;
        if (m && !removedSet.has(m.toLowerCase()) && !joinedOrder.some((a) => a.toLowerCase() === m.toLowerCase())) {
          joinedOrder.push(m);
        }
      }

      if (joinedOrder.length > 0 || memberCount === 0n) {
        memberListCache.set(cacheKey, {
          addresses: joinedOrder,
          memberCount,
          timestamp: Date.now(),
        });
        return { members: joinedOrder, error: null };
      }
    } catch {
      // Ignore chunked failure
    }

    return {
      members: cached ? cached.addresses : [],
      error: "Không thể tải danh sách thành viên (giới hạn RPC / lỗi mạng)",
    };
  }
}

export function useBondedClub(
  clubAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
  enabled = true
): BondedClubSnapshot {
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const initialVerified = Boolean(
    clubAddress &&
      (clubAddress.toLowerCase() === ARC_TESTNET_DEFAULT_BONDED_CLUB.toLowerCase() ||
        isKnownBondedClubAddress(clubAddress) ||
        getKnownGroups().find((g) => g.address.toLowerCase() === clubAddress.toLowerCase())?.version === "v2-bonded")
  );
  const [data, setData] = useState<Omit<BondedClubSnapshot, "isLoading" | "error" | "refetch">>({
    address: (clubAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    isVerifiedClub: initialVerified,
    factoryAddress: CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID],
    state: BONDED_STATE.OPEN,
    owner: "0x0000000000000000000000000000000000000000",
    groupName: "",
    contributionAmount: 0n,
    maxMembers: 0n,
    totalRounds: 0n,
    roundDuration: 0n,
    rateBpsPerRound: 0n,
    safetyBps: 20_000n,
    liquidationBps: 12_000n,
    interestGrace: 0n,
    settlementGrace: 0n,
    maxPriceAge: 3600n,
    priceFeed: "0x0000000000000000000000000000000000000000",
    memberCount: 0n,
    totalDeposits: 0n,
    totalDebt: 0n,
    collateral: 0n,
    interestDueTotal: 0n,
    interestPaidTotal: 0n,
    interestClaimedTotal: 0n,
    interestOwed: 0n,
    startTime: 0n,
    nextInterestDeadline: 0n,
    currentRoundIndex: 0n,
    cycleEnded: false,
    memberAddresses: [],
    membersLoadError: null,
    oracleError: false,
    collateralValueUsdc: null,
    borrowLimit: null,
    exposure: null,
    healthBps: null,
    oracleDescription: "",
    isMockOracle: true,
    oraclePriceRaw: 0n,
    oracleUpdatedAt: 0n,
    priceAgeSeconds: 0n,
    oracleAdmin: undefined,
    isMember: false,
    userDeposit: 0n,
    hasContributedCurrentRound: false,
    pendingInterest: 0n,
    previewPrincipalUsdc: 0n,
    previewPrincipalCirBtc: 0n,
    principalWithdrawn: false,
    usdcAllowance: 0n,
    cirBtcBalance: 0n,
    cirBtcAllowance: 0n,
  });

  const refetch = useCallback(async () => {
    if (!enabled || !clubAddress || !publicClient) return;
    setIsLoading(true);
    setError(null);
    try {
      const readClub = <T = unknown>(functionName: string, args: readonly unknown[] = []) =>
        publicClient.readContract({
          address: clubAddress,
          abi: BONDED_TONTINE_ABI,
          functionName: functionName as never,
          args: args as never,
        }) as Promise<T>;

      let stateRaw: number = 0;
      let owner: `0x${string}` = "0x0000000000000000000000000000000000000000";
      let groupName: string = "";
      let contributionAmount: bigint = 0n;
      let maxMembers: bigint = 0n;
      let totalRounds: bigint = 0n;
      let roundDuration: bigint = 0n;
      let rateBpsPerRound: bigint = 0n;
      let safetyBps: bigint = 20_000n;
      let liquidationBps: bigint = 12_000n;
      let interestGrace: bigint = 0n;
      let settlementGrace: bigint = 0n;
      let maxPriceAge: bigint = 3600n;
      let priceFeed: `0x${string}` = "0x0000000000000000000000000000000000000000";
      let memberCount: bigint = 0n;
      let totalDeposits: bigint = 0n;
      let totalDebt: bigint = 0n;
      let collateral: bigint = 0n;
      let interestDueTotal: bigint = 0n;
      let interestPaidTotal: bigint = 0n;
      let interestClaimedTotal: bigint = 0n;
      let interestOwed: bigint = 0n;
      let startTime: bigint = 0n;
      let nextInterestDeadline: bigint = 0n;
      let currentRoundIndex: bigint = 0n;
      let cycleEnded: boolean = false;

      let multicallSucceeded = false;
      if (typeof publicClient.multicall === "function") {
        try {
          const fnNames = [
            "state", "owner", "groupName", "contributionAmount", "maxMembers",
            "totalRounds", "roundDuration", "rateBpsPerRound", "safetyBps", "liquidationBps",
            "interestGrace", "settlementGrace", "maxPriceAge", "priceFeed", "memberCount",
            "totalDeposits", "totalDebt", "collateral", "interestDueTotal", "interestPaidTotal",
            "interestClaimedTotal", "interestOwed", "startTime", "nextInterestDeadline",
            "currentRoundIndex", "cycleEnded"
          ] as const;

          const results = await publicClient.multicall({
            contracts: fnNames.map((fn) => ({
              address: clubAddress,
              abi: BONDED_TONTINE_ABI as any,
              functionName: fn,
            })),
          });

          if (results && results.length === fnNames.length) {
            stateRaw = results[0].status === "success" ? Number(results[0].result) : 0;
            owner = results[1].status === "success" ? (results[1].result as `0x${string}`) : owner;
            groupName = results[2].status === "success" ? String(results[2].result) : "";
            contributionAmount = results[3].status === "success" ? BigInt(results[3].result as bigint) : 0n;
            maxMembers = results[4].status === "success" ? BigInt(results[4].result as bigint) : 0n;
            totalRounds = results[5].status === "success" ? BigInt(results[5].result as bigint) : 0n;
            roundDuration = results[6].status === "success" ? BigInt(results[6].result as bigint) : 0n;
            rateBpsPerRound = results[7].status === "success" ? BigInt(results[7].result as bigint) : 0n;
            safetyBps = results[8].status === "success" ? BigInt(results[8].result as bigint) : 20_000n;
            liquidationBps = results[9].status === "success" ? BigInt(results[9].result as bigint) : 12_000n;
            interestGrace = results[10].status === "success" ? BigInt(results[10].result as bigint) : 0n;
            settlementGrace = results[11].status === "success" ? BigInt(results[11].result as bigint) : 0n;
            maxPriceAge = results[12].status === "success" ? BigInt(results[12].result as bigint) : 3600n;
            priceFeed = results[13].status === "success" ? (results[13].result as `0x${string}`) : priceFeed;
            memberCount = results[14].status === "success" ? BigInt(results[14].result as bigint) : 0n;
            totalDeposits = results[15].status === "success" ? BigInt(results[15].result as bigint) : 0n;
            totalDebt = results[16].status === "success" ? BigInt(results[16].result as bigint) : 0n;
            collateral = results[17].status === "success" ? BigInt(results[17].result as bigint) : 0n;
            interestDueTotal = results[18].status === "success" ? BigInt(results[18].result as bigint) : 0n;
            interestPaidTotal = results[19].status === "success" ? BigInt(results[19].result as bigint) : 0n;
            interestClaimedTotal = results[20].status === "success" ? BigInt(results[20].result as bigint) : 0n;
            interestOwed = results[21].status === "success" ? BigInt(results[21].result as bigint) : 0n;
            startTime = results[22].status === "success" ? BigInt(results[22].result as bigint) : 0n;
            nextInterestDeadline = results[23].status === "success" ? BigInt(results[23].result as bigint) : 0n;
            currentRoundIndex = results[24].status === "success" ? BigInt(results[24].result as bigint) : 0n;
            cycleEnded = results[25].status === "success" ? Boolean(results[25].result) : false;
            multicallSucceeded = true;
          }
        } catch {
          // Fall back to individual reads
        }
      }

      if (!multicallSucceeded) {
        const [
          sR,
          own,
          gn,
          cA,
          mM,
          tR,
          rD,
          rB,
          sB,
          lB,
          iG,
          sG,
          mP,
          pF,
          mC,
          tDep,
          tDbt,
          col,
          iDT,
          iPT,
          iCT,
          iO,
          sT,
          nID,
          cRI,
          cE,
        ] = await Promise.all([
          readClub<number>("state"),
          readClub<`0x${string}`>("owner"),
          readClub<string>("groupName"),
          readClub<bigint>("contributionAmount"),
          readClub<bigint>("maxMembers"),
          readClub<bigint>("totalRounds"),
          readClub<bigint>("roundDuration"),
          readClub<bigint>("rateBpsPerRound"),
          readClub<bigint>("safetyBps"),
          readClub<bigint>("liquidationBps"),
          readClub<bigint>("interestGrace"),
          readClub<bigint>("settlementGrace"),
          readClub<bigint>("maxPriceAge"),
          readClub<`0x${string}`>("priceFeed"),
          readClub<bigint>("memberCount"),
          readClub<bigint>("totalDeposits"),
          readClub<bigint>("totalDebt"),
          readClub<bigint>("collateral"),
          readClub<bigint>("interestDueTotal"),
          readClub<bigint>("interestPaidTotal"),
          readClub<bigint>("interestClaimedTotal").catch(() => 0n),
          readClub<bigint>("interestOwed"),
          readClub<bigint>("startTime").catch(() => 0n),
          readClub<bigint>("nextInterestDeadline"),
          readClub<bigint>("currentRoundIndex"),
          readClub<boolean>("cycleEnded"),
        ]);

        stateRaw = sR;
        owner = own;
        groupName = gn;
        contributionAmount = cA;
        maxMembers = mM;
        totalRounds = tR;
        roundDuration = rD;
        rateBpsPerRound = rB;
        safetyBps = sB;
        liquidationBps = lB;
        interestGrace = iG;
        settlementGrace = sG;
        maxPriceAge = mP;
        priceFeed = pF;
        memberCount = mC;
        totalDeposits = tDep;
        totalDebt = tDbt;
        collateral = col;
        interestDueTotal = iDT;
        interestPaidTotal = iPT;
        interestClaimedTotal = iCT;
        interestOwed = iO;
        startTime = sT;
        nextInterestDeadline = nID;
        currentRoundIndex = cRI;
        cycleEnded = cE;
      }

      // Oracle-dependent reads: catch reverts gracefully when price is stale/invalid (T6.2)
      let oracleError = false;
      const [collateralValueUsdc, borrowLimit, exposure, healthBps] = await Promise.all([
        readClub<bigint>("collateralValueUsdc").catch(() => {
          oracleError = true;
          return null;
        }),
        readClub<bigint>("borrowLimit").catch(() => {
          oracleError = true;
          return null;
        }),
        readClub<bigint>("exposure").catch(() => null),
        readClub<bigint>("healthBps").catch(() => {
          oracleError = true;
          return null;
        }),
      ]);

      // Factory verification (T6.7)
      const factoryAddress = CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID];
      let isVerifiedClub = false;
      if (factoryAddress) {
        isVerifiedClub = await (publicClient.readContract({
          address: factoryAddress,
          abi: BONDED_TONTINE_FACTORY_ABI,
          functionName: "isClub" as never,
          args: [clubAddress] as never,
        }) as Promise<boolean>).catch(() => false);
      }

      // Oracle metadata (T6.8)
      let oracleDescription = "";
      let oraclePriceRaw = 0n;
      let oracleUpdatedAt = 0n;
      let oracleAdmin: `0x${string}` | undefined = undefined;
      if (priceFeed && priceFeed !== "0x0000000000000000000000000000000000000000") {
        const [desc, roundData, adminAddr] = await Promise.all([
          (publicClient.readContract({
            address: priceFeed,
            abi: MOCK_AGGREGATOR_V3_ABI,
            functionName: "description" as never,
          }) as Promise<string>).catch(() => ""),
          (publicClient.readContract({
            address: priceFeed,
            abi: MOCK_AGGREGATOR_V3_ABI,
            functionName: "latestRoundData" as never,
          }) as Promise<readonly [bigint, bigint, bigint, bigint, bigint]>).catch(() => null),
          (publicClient.readContract({
            address: priceFeed,
            abi: MOCK_AGGREGATOR_V3_ABI,
            functionName: "admin" as never,
          }) as Promise<`0x${string}`>).catch(() => undefined),
        ]);
        oracleDescription = desc;
        if (roundData) {
          oraclePriceRaw = roundData[1];
          oracleUpdatedAt = roundData[3];
        }
        oracleAdmin = adminAddr;
      }

      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const priceAgeSeconds =
        oracleUpdatedAt > 0n && nowSec >= oracleUpdatedAt ? nowSec - oracleUpdatedAt : 0n;

      // User-specific reads
      let isMember = false;
      let userDeposit = 0n;
      let hasContributedCurrentRound = false;
      let pendingInterest = 0n;
      let previewPrincipalUsdc = 0n;
      let previewPrincipalCirBtc = 0n;
      let principalWithdrawn = false;
      let usdcAllowance = 0n;
      let cirBtcBalance = 0n;
      let cirBtcAllowance = 0n;

      if (userAddress) {
        const [
          memberBool,
          depAmt,
          contribBool,
          pendInt,
          prevPrin,
          prinWithdrawn,
          uAllow,
          cBal,
          cAllow,
        ] = await Promise.all([
          readClub<boolean>("isMember", [userAddress]).catch(() => false),
          readClub<bigint>("deposit", [userAddress]).catch(() => 0n),
          currentRoundIndex >= 1n && currentRoundIndex <= maxMembers
            ? readClub<boolean>("contributed", [currentRoundIndex, userAddress]).catch(() => false)
            : Promise.resolve(false),
          readClub<bigint>("pendingInterest", [userAddress]).catch(() => 0n),
          readClub<readonly [bigint, bigint]>("previewPrincipal", [userAddress]).catch(
            () => [0n, 0n] as const
          ),
          readClub<boolean>("principalWithdrawn", [userAddress]).catch(() => false),
          publicClient
            .readContract({
              address: BONDED_USDC_ADDRESS,
              abi: ERC20_READ_ABI,
              functionName: "allowance",
              args: [userAddress, clubAddress],
            })
            .catch(() => 0n),
          publicClient
            .readContract({
              address: BONDED_CIRBTC_ADDRESS,
              abi: ERC20_READ_ABI,
              functionName: "balanceOf",
              args: [userAddress],
            })
            .catch(() => 0n),
          publicClient
            .readContract({
              address: BONDED_CIRBTC_ADDRESS,
              abi: ERC20_READ_ABI,
              functionName: "allowance",
              args: [userAddress, clubAddress],
            })
            .catch(() => 0n),
        ]);

        isMember = memberBool;
        userDeposit = depAmt;
        hasContributedCurrentRound = contribBool;
        pendingInterest = pendInt;
        previewPrincipalUsdc = prevPrin[0];
        previewPrincipalCirBtc = prevPrin[1];
        principalWithdrawn = prinWithdrawn;
        usdcAllowance = uAllow;
        cirBtcBalance = cBal;
        cirBtcAllowance = cAllow;
      }

      // Read member list from MemberJoined / MemberRemoved events (L5 & R1 resilient fetching)
      const { members: memberAddresses, error: membersLoadError } = await fetchBondedClubMembers(
        publicClient,
        clubAddress,
        memberCount
      );

      setData({
        address: clubAddress,
        isVerifiedClub,
        factoryAddress,
        state: Number(stateRaw) as BondedStateCode,
        owner,
        groupName,
        contributionAmount,
        maxMembers,
        totalRounds,
        roundDuration,
        rateBpsPerRound,
        safetyBps,
        liquidationBps,
        interestGrace,
        settlementGrace,
        maxPriceAge,
        priceFeed,
        memberCount,
        totalDeposits,
        totalDebt,
        collateral,
        interestDueTotal,
        interestPaidTotal,
        interestClaimedTotal,
        interestOwed,
        startTime,
        nextInterestDeadline,
        currentRoundIndex,
        cycleEnded,
        memberAddresses,
        membersLoadError,
        oracleError,
        collateralValueUsdc,
        borrowLimit,
        exposure,
        healthBps,
        oracleDescription,
        isMockOracle: isMockOracleDescription(oracleDescription),
        oraclePriceRaw,
        oracleUpdatedAt,
        priceAgeSeconds,
        oracleAdmin,
        isMember,
        userDeposit,
        hasContributedCurrentRound,
        pendingInterest,
        previewPrincipalUsdc,
        previewPrincipalCirBtc,
        principalWithdrawn,
        usdcAllowance,
        cirBtcBalance,
        cirBtcAllowance,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [clubAddress, userAddress, enabled, publicClient]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    ...data,
    isLoading,
    error,
    refetch,
  };
}
