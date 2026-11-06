import { oracleStatus as getOracleStatus, type OracleStatus } from "../lib/bondedDisplay.ts";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { decodeEventLog, type PublicClient } from "viem";
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
  oracleDecimals: number | null;
  oracleStatus: OracleStatus;
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
  publicClient: Pick<PublicClient, "getLogs" | "getBlockNumber">,
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

  const errors: string[] = [];
  let best = cached?.addresses ?? [];
  const classify = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/429|rate.?limit/i.test(message)) return "rate-limit";
    if (/block.?range|-32012|range.*limit/i.test(message)) return "rpc-range";
    if (/timeout|timed out|abort/i.test(message)) return "timeout";
    return "unavailable";
  };
  const accept = (members: `0x${string}`[]) => {
    if (members.length > best.length) best = members;
    if (BigInt(members.length) !== memberCount) { errors.push("partial"); return false; }
    memberListCache.set(cacheKey, { addresses: members, memberCount, timestamp: Date.now() });
    return true;
  };
  type MemberEvent = { eventName: string; args?: { member?: `0x${string}` }; blockNumber?: bigint; logIndex?: number };
  const sortEvents = (a: MemberEvent, b: MemberEvent) => (a.blockNumber ?? 0n) === (b.blockNumber ?? 0n) ? (a.logIndex ?? 0) - (b.logIndex ?? 0) : (a.blockNumber ?? 0n) < (b.blockNumber ?? 0n) ? -1 : 1;
  const replay = (logs: MemberEvent[]) => {
    const active = new Map<string, `0x${string}`>();
    for (const log of logs) {
      const member = log.args?.member;
      if (!member) continue;
      if (log.eventName === "MemberRemoved") active.delete(member.toLowerCase());
      else if (log.eventName === "MemberJoined") active.set(member.toLowerCase(), member);
    }
    return [...active.values()];
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const explorerApi = `${requireChain(ARC_TESTNET_CHAIN_ID).explorerBase}/api`;
    const response = await fetch(`${explorerApi}?module=logs&action=getLogs&address=${clubAddress}&fromBlock=0&toBlock=latest`, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) errors.push("explorer-429");
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json() as { result?: unknown; message?: unknown };
    if (!Array.isArray(data.result)) throw new Error(String(data.result ?? data.message));
    type ExplorerEvent = { data: `0x${string}`; topics: [`0x${string}`, ...`0x${string}`[]]; blockNumber?: string; logIndex?: string };
    const decoded = (data.result as ExplorerEvent[]).flatMap((item): MemberEvent[] => {
      try {
        const event = decodeEventLog({ abi: BONDED_TONTINE_ABI, data: item.data, topics: item.topics });
        return [{ eventName: event.eventName ?? "", args: event.args as { member?: `0x${string}` }, blockNumber: BigInt(item.blockNumber ?? 0), logIndex: Number(item.logIndex ?? 0) }];
      } catch { return []; }
    }).sort(sortEvents);
    const members = replay(decoded);
    if (accept(members)) return { members, error: null };
  } catch (error) { errors.push(classify(error)); }
  finally { clearTimeout(timeout); }

  const readRange = async (fromBlock: bigint, toBlock: bigint | "latest") => {
    const all = await Promise.all(["MemberJoined", "MemberRemoved"].map(async eventName => {
      const logs = await publicClient.getLogs({ address: clubAddress, event: { type: "event", name: eventName, inputs: [{ type: "address", name: "member", indexed: true }] }, fromBlock, toBlock }) as unknown as MemberEvent[];
      return logs.map(log => ({ ...log, eventName }));
    }));
    return replay(all.flat().sort(sortEvents));
  };
  try {
    const members = await readRange(0n, "latest");
    if (accept(members)) return { members, error: null };
  } catch (error) { errors.push(classify(error)); }
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const members = await readRange(currentBlock > 4000n ? currentBlock - 4000n : 0n, currentBlock);
    if (accept(members)) return { members, error: null };
  } catch (error) { errors.push(classify(error)); }
  return { members: best, error: [...new Set([...errors, "partial"])].join("|") };
}

export function useBondedClub(
  clubAddress?: `0x${string}`,
  userAddress?: `0x${string}`,
  enabled = true
): BondedClubSnapshot {
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const contextKey = `${clubAddress?.toLowerCase()}:${userAddress?.toLowerCase() ?? "guest"}`;
  const contextRef = useRef(contextKey);
  useLayoutEffect(() => { contextRef.current = contextKey; }, [contextKey]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const initialVerified = Boolean(
    clubAddress &&
      (clubAddress.toLowerCase() === ARC_TESTNET_DEFAULT_BONDED_CLUB.toLowerCase() ||
        isKnownBondedClubAddress(clubAddress) ||
        getKnownGroups(userAddress).find((g) => g.address.toLowerCase() === clubAddress.toLowerCase())?.version === "v2-bonded")
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
    oracleDecimals: null,
    oracleStatus: "unavailable",
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
    const requestContext = contextKey;
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
      let oracleDecimals: number | null = null;
      let roundId = 0n;
      let answeredInRound = 0n;
      let oraclePriceRaw = 0n;
      let oracleUpdatedAt = 0n;
      let oracleAdmin: `0x${string}` | undefined = undefined;
      if (priceFeed && priceFeed !== "0x0000000000000000000000000000000000000000") {
        const [desc, roundData, adminAddr, decimals] = await Promise.all([
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
          (publicClient.readContract({ address: priceFeed, abi: MOCK_AGGREGATOR_V3_ABI, functionName: "decimals" }) as Promise<number>).catch(() => null),
        ]);
        oracleDecimals = decimals;
        oracleDescription = desc;
        if (roundData) {
          roundId = roundData[0];
          answeredInRound = roundData[4];
          oraclePriceRaw = roundData[1];
          oracleUpdatedAt = roundData[3];
        }
        oracleAdmin = adminAddr;
      }

      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const priceAgeSeconds =
        oracleUpdatedAt > 0n && nowSec >= oracleUpdatedAt ? nowSec - oracleUpdatedAt : 0n;

      const oracleStatus = getOracleStatus(oraclePriceRaw, oracleUpdatedAt, answeredInRound, roundId, nowSec, maxPriceAge);
      oracleError = oracleError || oracleStatus !== "fresh";

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

      if (contextRef.current !== requestContext) return;
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
        oracleDecimals,
        oracleStatus,
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
      if (contextRef.current === requestContext) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (contextRef.current === requestContext) setIsLoading(false);
    }
  }, [clubAddress, userAddress, enabled, publicClient, contextKey]);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => void refetch(), 30_000);
    return () => clearInterval(interval);
  }, [refetch]);

  return {
    ...data,
    isLoading,
    error,
    refetch,
  };
}
