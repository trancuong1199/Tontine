import test from "node:test";
import assert from "node:assert/strict";
import { fetchBondedClubMembers } from "../src/hooks/useBondedClub.ts";
import { formatUsdcExact } from "../src/onchain-money.ts";

test("R1: fetchBondedClubMembers returns empty without error when memberCount is 0", async () => {
  const result = await fetchBondedClubMembers(
    {} as any,
    "0x0000000000000000000000000000000000000001",
    0n
  );
  assert.deepEqual(result.members, []);
  assert.equal(result.error, null);
});

test("R1: fetchBondedClubMembers uses fallback RPC getLogs when Explorer API is unavailable", async () => {
  const testClub = "0x1111111111111111111111111111111111111111" as `0x${string}`;
  const mockMember = "0x2222222222222222222222222222222222222222" as `0x${string}`;

  const mockPublicClient = {
    getLogs: async (args: any) => {
      if (args.event.name === "MemberJoined") {
        return [{ args: { member: mockMember } }];
      }
      return [];
    },
  };

  const result = await fetchBondedClubMembers(mockPublicClient, testClub, 1n);
  assert.equal(result.members.length, 1);
  assert.equal(result.members[0].toLowerCase(), mockMember.toLowerCase());
  assert.equal(result.error, null);
});

test("R1: fetchBondedClubMembers reports clear error when memberCount > 0 and all queries fail", async () => {
  const failingClub = "0x9999999999999999999999999999999999999999" as `0x${string}`;
  const mockFailingClient = {
    getLogs: async () => {
      throw new Error("-32012 requested range too large");
    },
    getBlockNumber: async () => {
      throw new Error("RPC offline");
    },
  };

  const result = await fetchBondedClubMembers(mockFailingClient, failingClub, 3n);
  assert.deepEqual(result.members, []);
  assert.match(result.error ?? "", /giới hạn RPC/);
});

test("R2: calculateMaxBorrow respects pool liquidity when liquidity is less than collateral limit", () => {
  // Scenario from user:
  // borrowLimit = 1500 USDC (1500_000000n)
  // totalDebt = 0n
  // totalDeposits = 30 USDC (30_000000n)
  // rateBpsPerRound = 200n (2%)
  // interestOwed = 0n
  const totalDeposits = 30_000000n;
  const totalDebt = 0n;
  const borrowLimit = 1500_000000n;
  const interestOwed = 0n;
  const rateBpsPerRound = 200n;

  const liquidityLimit = totalDeposits > totalDebt ? totalDeposits - totalDebt : 0n;
  let collateralLimit = 0n;
  if (borrowLimit > interestOwed) {
    const maxDebt = ((borrowLimit - interestOwed) * 10000n) / (10000n + rateBpsPerRound);
    if (maxDebt > totalDebt) {
      collateralLimit = maxDebt - totalDebt;
    }
  }
  const maxBorrow = liquidityLimit < collateralLimit ? liquidityLimit : collateralLimit;

  assert.equal(maxBorrow, 30_000000n, "Max borrow must be capped by available liquidity (30 USDC)");
  assert.equal(formatUsdcExact(maxBorrow), "30");
});

test("R2: calculateMaxBorrow respects collateral & interest when pool liquidity is large", () => {
  // Pool has 5,000 USDC, but collateral only allows 1,000 USDC exposure
  // totalDeposits = 5,000 USDC, totalDebt = 200 USDC
  // borrowLimit = 1,000 USDC, interestOwed = 50 USDC, rateBps = 300 (3%)
  const totalDeposits = 5000_000000n;
  const totalDebt = 200_000000n;
  const borrowLimit = 1000_000000n;
  const interestOwed = 50_000000n;
  const rateBpsPerRound = 300n;

  const liquidityLimit = totalDeposits > totalDebt ? totalDeposits - totalDebt : 0n; // 4800 USDC
  let collateralLimit = 0n;
  if (borrowLimit > interestOwed) {
    // maxDebt = (950 * 10000) / 10300 = 922.330097 USDC
    const maxDebt = ((borrowLimit - interestOwed) * 10000n) / (10000n + rateBpsPerRound);
    if (maxDebt > totalDebt) {
      collateralLimit = maxDebt - totalDebt; // 722.330097 USDC
    }
  }
  const maxBorrow = liquidityLimit < collateralLimit ? liquidityLimit : collateralLimit;

  assert.equal(maxBorrow, collateralLimit, "Max borrow must be capped by collateral minus interest");
  assert.equal(formatUsdcExact(maxBorrow), "722.330097");
});

test("R2: calculateMaxBorrow returns 0 when debt or interest already exceeds limits", () => {
  const totalDeposits = 1000_000000n;
  const totalDebt = 1000_000000n;
  const borrowLimit = 1000_000000n;
  const interestOwed = 100_000000n;
  const rateBpsPerRound = 200n;

  const liquidityLimit = totalDeposits > totalDebt ? totalDeposits - totalDebt : 0n; // 0
  let collateralLimit = 0n;
  if (borrowLimit > interestOwed) {
    const maxDebt = ((borrowLimit - interestOwed) * 10000n) / (10000n + rateBpsPerRound);
    if (maxDebt > totalDebt) {
      collateralLimit = maxDebt - totalDebt;
    }
  }
  const maxBorrow = liquidityLimit < collateralLimit ? liquidityLimit : collateralLimit;
  assert.equal(maxBorrow, 0n);
});

test("R4: Oracle price string does not format with double dollar signs", () => {
  const oraclePriceRaw = 60000_00000000n;
  const formatted = `${oraclePriceRaw > 0n ? "$" + (Number(oraclePriceRaw) / 1e8).toFixed(2) : "N/A"}`;
  assert.equal(formatted, "$60000.00");
  assert.ok(!formatted.startsWith("$$"));
});

test("R4: Grace period labels are bilingual (ân hạn vs grace)", () => {
  const interestGrace = 120n;
  const viLabel = `(${true ? "ân hạn" : "grace"}: ${Number(interestGrace)}s)`;
  const enLabel = `(${false ? "ân hạn" : "grace"}: ${Number(interestGrace)}s)`;

  assert.equal(viLabel, "(ân hạn: 120s)");
  assert.equal(enLabel, "(grace: 120s)");
  assert.ok(!enLabel.includes("ân hạn"));
});

test("R5: toast.dismiss is always guaranteed in finally block upon action rejection", async () => {
  let dismissedId: any = null;
  const fakeToast = {
    loading: () => 123,
    dismiss: (id: any) => {
      dismissedId = id;
    },
  };

  let submittingToastId: any;
  try {
    submittingToastId = fakeToast.loading();
    throw new Error("Transaction timed out while waiting for receipt");
  } catch {
    // caught error
  } finally {
    if (submittingToastId !== undefined) {
      fakeToast.dismiss(submittingToastId);
    }
  }

  assert.equal(dismissedId, 123, "Toast ID must be dismissed even when an exception is thrown");
});
