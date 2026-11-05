import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
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

      const [
        stateRaw,
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

      // Read member list from MemberJoined / MemberRemoved events (L5)
      let memberAddresses: `0x${string}`[] = [];
      try {
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
            .map((l) => (l.args as { member?: string })?.member?.toLowerCase())
            .filter(Boolean)
        );

        const joinedOrder: `0x${string}`[] = [];
        for (const log of joinedLogs) {
          const m = (log.args as { member?: `0x${string}` })?.member;
          if (m && !removedSet.has(m.toLowerCase()) && !joinedOrder.some((a) => a.toLowerCase() === m.toLowerCase())) {
            joinedOrder.push(m);
          }
        }
        memberAddresses = joinedOrder;
      } catch {
        // Fallback: empty member array if getLogs not supported by RPC
        memberAddresses = [];
      }

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
