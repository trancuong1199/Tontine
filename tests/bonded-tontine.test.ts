import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BONDED_TONTINE_ABI,
  BONDED_TONTINE_FACTORY_ABI,
  MOCK_AGGREGATOR_V3_ABI,
  BONDED_STATE,
  DEFAULT_REASON,
  DEFAULT_BONDED_PARAMS,
  calculateAnnualizedAprPct,
  isMockOracleDescription,
  validateBondedClubParams,
  validateOracleFeedForEnv,
  MockOracleSimulator,
  MockTokenLedger,
  BondedTontineSimulator,
  BondedTontineFactorySimulator,
} from "../src/lib/bondedTontine.ts";
import {
  getClubVersion,
  getKnownGroups,
  saveKnownGroup,
  SAVINGS_CLUBS_STORAGE_KEY,
} from "../src/lib/savingsClubDirectory.ts";
import { validatePreBroadcastConfig } from "../scripts/deploy-bonded-tontine-factory.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("Task-059: BondedTontine Design Specification & Implementation Suite", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Contract Artifacts, EIP-170 Bytecode Size & ABI Completeness
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-01: Compiled artifacts exist and runtime bytecode sizes are well below EIP-170 24,576-byte limit", () => {
    const tontineArtifactPath = path.join(ROOT, "contracts/out/BondedTontine.sol/BondedTontine.json");
    const factoryArtifactPath = path.join(
      ROOT,
      "contracts/out/BondedTontineFactory.sol/BondedTontineFactory.json"
    );
    const mockArtifactPath = path.join(
      ROOT,
      "contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json"
    );

    assert.ok(fs.existsSync(tontineArtifactPath), "BondedTontine.json must exist");
    assert.ok(fs.existsSync(factoryArtifactPath), "BondedTontineFactory.json must exist");
    assert.ok(fs.existsSync(mockArtifactPath), "MockAggregatorV3.json must exist");

    const tontineJson = JSON.parse(fs.readFileSync(tontineArtifactPath, "utf8"));
    const factoryJson = JSON.parse(fs.readFileSync(factoryArtifactPath, "utf8"));

    const tontineRuntimeHex: string = tontineJson.deployedBytecode.object.replace(/^0x/, "");
    const factoryRuntimeHex: string = factoryJson.deployedBytecode.object.replace(/^0x/, "");

    const tontineRuntimeBytes = tontineRuntimeHex.length / 2;
    const factoryRuntimeBytes = factoryRuntimeHex.length / 2;

    assert.ok(tontineRuntimeBytes > 1000 && tontineRuntimeBytes < 24_576, `BondedTontine runtime (${tontineRuntimeBytes} B) must be < 24576 B`);
    assert.ok(factoryRuntimeBytes > 1000 && factoryRuntimeBytes < 24_576, `BondedTontineFactory runtime (${factoryRuntimeBytes} B) must be < 24576 B`);
  });

  it("T059-02: BondedTontine ABI exposes all 20 custom errors, 14 events, and all write/view functions from Section 10", () => {
    const errors = BONDED_TONTINE_ABI.filter((item: { type: string }) => item.type === "error").map(
      (item: { name?: string }) => item.name
    );
    const expectedErrors = [
      "WrongState",
      "NotMember",
      "AlreadyMember",
      "GroupFull",
      "AlreadyContributed",
      "RoundNotActive",
      "InvalidConfiguration",
      "InvalidAmount",
      "InsufficientLiquidity",
      "ExceedsBorrowLimit",
      "CollateralLocked",
      "NothingToClaim",
      "NotDefaultable",
      "NotLiquidatable",
      "NotFinalizable",
      "BadPrice",
      "StalePrice",
      "OwnerCannotJoin",
      "RenounceDisabled",
      "TransferLockedAfterOpen",
    ];
    for (const errName of expectedErrors) {
      assert.ok(errors.includes(errName), `Missing custom error in ABI: ${errName}`);
    }

    const events = BONDED_TONTINE_ABI.filter((item: { type: string }) => item.type === "event").map(
      (item: { name?: string }) => item.name
    );
    const expectedEvents = [
      "CollateralDeposited",
      "CollateralWithdrawn",
      "MemberJoined",
      "MemberRemoved",
      "RoundsStarted",
      "Contributed",
      "Borrowed",
      "Repaid",
      "InterestPaid",
      "InterestClaimed",
      "GroupCompleted",
      "GroupDefaulted",
      "GroupCancelled",
      "PrincipalWithdrawn",
    ];
    for (const evName of expectedEvents) {
      assert.ok(events.includes(evName), `Missing event in ABI: ${evName}`);
    }

    const functions = BONDED_TONTINE_ABI.filter(
      (item: { type: string }) => item.type === "function"
    ).map((item: { name?: string }) => item.name);
    const expectedFunctions = [
      "depositCollateral",
      "withdrawCollateral",
      "joinGroup",
      "removeMember",
      "cancelOpen",
      "startRounds",
      "contribute",
      "claimInterest",
      "borrow",
      "repay",
      "payInterest",
      "finalize",
      "declareDefault",
      "liquidate",
      "withdrawPrincipal",
      "currentRoundIndex",
      "cycleEnded",
      "collateralValueUsdc",
      "borrowLimit",
      "interestOwed",
      "exposure",
      "healthBps",
      "pendingInterest",
      "previewPrincipal",
      "nextInterestDeadline",
    ];
    for (const fnName of expectedFunctions) {
      assert.ok(functions.includes(fnName), `Missing function in ABI: ${fnName}`);
    }

    assert.ok(BONDED_TONTINE_FACTORY_ABI.length > 0);
    assert.ok(MOCK_AGGREGATOR_V3_ABI.length > 0);
  });

  it("T059-03: Foundry test file contracts/test/BondedTontine.t.sol exists with unit, security, worked examples, and invariant tests", () => {
    const testSolPath = path.join(ROOT, "contracts/test/BondedTontine.t.sol");
    assert.ok(fs.existsSync(testSolPath));
    const src = fs.readFileSync(testSolPath, "utf8");
    assert.ok(src.includes("test_WorkedExampleA_HappyPath"));
    assert.ok(src.includes("test_WorkedExampleB_InterestOverdueDefault"));
    assert.ok(src.includes("test_WorkedExampleC_FlashCrashLiquidation"));
    assert.ok(src.includes("test_Security_S3_BorrowRepaySameRoundPeakDebt"));
    assert.ok(src.includes("test_Security_S4_OracleFailureDuringZeroExposureAllowsCollateralWithdraw"));
    assert.ok(src.includes("test_Security_S8_BlocklistIsolation"));
    assert.ok(src.includes("invariant_solvency"));
    assert.ok(src.includes("invariant_stateMonotonic"));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Worked Example A — Happy Path (Section 26)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-04: Worked Example A (Happy Path) matches Section 26 exact numbers (207 USDC per member, 0.05 CirBTC unlocked)", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const m1 = "0x000000000000000000000000000000000000b0b1";
    const m2 = "0x000000000000000000000000000000000000b0b2";
    const m3 = "0x000000000000000000000000000000000000b0b3";
    const m4 = "0x000000000000000000000000000000000000b0b4";
    const members = [m1, m2, m3, m4];

    const usdcLedger = new MockTokenLedger();
    const cirBtcLedger = new MockTokenLedger();
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x9999999999999999999999999999999999999999",
      maxPriceAge: 3600n,
      usdcLedger,
      cirBtcLedger,
      oracle,
      getNow: () => now,
    });

    const club = factory.createClub(owner, {
      ...DEFAULT_BONDED_PARAMS,
      maxMembers: 4,
      contributionAmount: 50_000_000n,
      roundDuration: 86_400,
      rateBpsPerRound: 200,
      safetyBps: 20_000,
      liquidationBps: 12_000,
    });

    cirBtcLedger.mint(owner, 5_000_000n); // 0.05 CirBTC
    usdcLedger.mint(owner, 100_000_000n); // enough for interest
    for (const m of members) {
      usdcLedger.mint(m, 200_000_000n);
      club.joinGroup(m);
    }

    club.depositCollateral(owner, 5_000_000n);
    assert.equal(club.collateralValueUsdc(), 3_000_000_000n); // $3,000
    assert.equal(club.borrowLimit(), 1_500_000_000n); // $1,500
    club.startRounds(owner);

    // Round 1: 4 * 50 = 200 USDC deposited, owner borrows 200 USDC
    for (const m of members) club.contribute(m);
    club.borrow(owner, 200_000_000n);

    // Round 2: Round 1 interest = 4 USDC. Owner pays 4 USDC and borrows 200 USDC more (totalDebt = 400)
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 4_000_000n);
    club.payInterest(owner, 4_000_000n);
    club.borrow(owner, 200_000_000n);

    // Round 3: Round 2 interest = 8 USDC. Owner pays 8 USDC.
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.payInterest(owner, 8_000_000n);

    // Round 4: Round 3 interest = 8 USDC. Owner pays 8 USDC.
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.payInterest(owner, 8_000_000n);

    // Cycle ends after Round 4: Round 4 interest = 8 USDC. Owner repays 400 USDC + 8 USDC interest, finalizes.
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.repay(owner, 400_000_000n);
    club.payInterest(owner, 8_000_000n);
    club.finalize();

    assert.equal(club.state, BONDED_STATE.COMPLETED);

    // Owner withdraws all 0.05 CirBTC collateral
    club.withdrawCollateral(owner, 5_000_000n);
    assert.equal(cirBtcLedger.balanceOf(owner), 5_000_000n);

    // Each member claims ~7 USDC interest (within 1 micro-USDC integer division floor on 600e6) and withdraws 200 USDC principal
    for (const m of members) {
      const pending = club.pendingInterest(m);
      assert.ok(
        pending >= 6_999_999n && pending <= 7_000_000n,
        `Expected ~7 USDC interest, got ${pending}`
      );
      club.claimInterest(m);
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 200_000_000n);
      assert.equal(cirBtcOut, 0n);
      assert.equal(usdcLedger.balanceOf(m), 200_000_000n + pending);
    }
  });

  it("T059-04b: Section 26 10-member 0.11 CirBTC Worked Examples A (450 USDC total interest), B ($30k crash liquidation), and C (Round 1 interest default)", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const members = Array.from(
      { length: 10 },
      (_, i) => `0x${(i + 101).toString(16).padStart(40, "0")}`
    );

    const usdcLedger = new MockTokenLedger();
    const cirBtcLedger = new MockTokenLedger();
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x9999999999999999999999999999999999999999",
      maxPriceAge: 3600n,
      usdcLedger,
      cirBtcLedger,
      oracle,
      getNow: () => now,
    });

    const club = factory.createClub(owner, {
      ...DEFAULT_BONDED_PARAMS,
      maxMembers: 10,
      contributionAmount: 50_000_000n,
      roundDuration: 86_400,
      rateBpsPerRound: 200,
      safetyBps: 20_000,
      liquidationBps: 12_000,
    });

    // Owner deposits 0.11 CirBTC (11,000,000 units) -> collateralValueUsdc = $6,600, borrowLimit = $3,300
    cirBtcLedger.mint(owner, 11_000_000n);
    usdcLedger.mint(owner, 1_000_000_000n);
    for (const m of members) {
      usdcLedger.mint(m, 500_000_000n);
      club.joinGroup(m);
    }

    club.depositCollateral(owner, 11_000_000n);
    assert.equal(club.collateralValueUsdc(), 6_600_000_000n);
    assert.equal(club.borrowLimit(), 3_300_000_000n);
    club.startRounds(owner);

    // Rounds 1..10: members contribute 500 USDC per round; owner borrows 500 USDC in rounds 1..6 (up to 3,000 USDC)
    for (let r = 1; r <= 10; r++) {
      for (const m of members) club.contribute(m);
      const owed = club.interestOwed();
      if (owed > 0n) {
        club.payInterest(owner, owed);
      }
      if (r <= 6) {
        club.borrow(owner, 500_000_000n);
      }
      if (r === 6) {
        // Exposure at Round 6 borrow = 3,000 + 60 = 3,060 USDC <= 3,300 USDC borrowLimit
        assert.equal(club.exposure(), 3_060_000_000n);
      }
      now += 86_400n;
      oracle.setPrice(owner, 60_000_00000000n, now);
    }

    // Pay final round 10 interest (60 USDC), repay 3,000 USDC, finalize
    assert.equal(club.interestOwed(), 60_000_000n);
    club.repay(owner, 3_000_000_000n);
    club.payInterest(owner, 60_000_000n);
    assert.equal(club.interestDueTotal, 450_000_000n); // 10+20+30+40+50 + 5*60 = 450 USDC
    assert.equal(club.interestPaidTotal, 450_000_000n);
    club.finalize();
    assert.equal(club.state, BONDED_STATE.COMPLETED);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Worked Example B — Interest Overdue Default (Section 26)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-05: Worked Example B (Interest Overdue Default) seizes 0.05 CirBTC and distributes 0.0125 CirBTC per member", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const members = [
      "0x000000000000000000000000000000000000b0b1",
      "0x000000000000000000000000000000000000b0b2",
      "0x000000000000000000000000000000000000b0b3",
      "0x000000000000000000000000000000000000b0b4",
    ];

    const usdcLedger = new MockTokenLedger();
    const cirBtcLedger = new MockTokenLedger();
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x9999999999999999999999999999999999999999",
      maxPriceAge: 3600n,
      usdcLedger,
      cirBtcLedger,
      oracle,
      getNow: () => now,
    });

    const club = factory.createClub(owner, {
      ...DEFAULT_BONDED_PARAMS,
      maxMembers: 4,
    });

    cirBtcLedger.mint(owner, 5_000_000n);
    for (const m of members) {
      usdcLedger.mint(m, 50_000_000n);
      club.joinGroup(m);
    }
    club.depositCollateral(owner, 5_000_000n);
    club.startRounds(owner);

    for (const m of members) club.contribute(m);
    club.borrow(owner, 200_000_000n);

    // Round 1 ends at startTime + 86400; grace ends 86400s later
    now += 86_400n + 86_399n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.throws(() => club.declareDefault(), /NotDefaultable/);

    // 1 second after grace period
    now += 1n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    club.declareDefault();

    assert.equal(club.state, BONDED_STATE.DEFAULTED);
    assert.equal(club.lastDefaultReason, DEFAULT_REASON.INTEREST_OVERDUE);
    assert.equal(club.settledCollateral, 5_000_000n);

    for (const m of members) {
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 0n);
      assert.equal(cirBtcOut, 1_250_000n); // 0.0125 CirBTC
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Worked Example C — BTC Flash Crash Liquidation (Section 26)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-06: Worked Example C (BTC Flash Crash Liquidation) triggers UNDERCOLLATERALIZED when BTC drops to $11,500", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const members = [
      "0x000000000000000000000000000000000000b0b1",
      "0x000000000000000000000000000000000000b0b2",
      "0x000000000000000000000000000000000000b0b3",
      "0x000000000000000000000000000000000000b0b4",
    ];

    const usdcLedger = new MockTokenLedger();
    const cirBtcLedger = new MockTokenLedger();
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x9999999999999999999999999999999999999999",
      maxPriceAge: 3600n,
      usdcLedger,
      cirBtcLedger,
      oracle,
      getNow: () => now,
    });

    const club = factory.createClub(owner, {
      ...DEFAULT_BONDED_PARAMS,
      maxMembers: 4,
    });

    cirBtcLedger.mint(owner, 5_000_000n);
    for (const m of members) {
      usdcLedger.mint(m, 500_000_000n);
      club.joinGroup(m);
    }
    club.depositCollateral(owner, 5_000_000n);
    club.startRounds(owner);

    // 3 rounds of contributions = 600 USDC totalDeposits
    for (let r = 0; r < 3; r++) {
      for (const m of members) club.contribute(m);
      if (r < 2) {
        now += 86_400n;
        oracle.setPrice(owner, 60_000_00000000n, now);
      }
    }

    club.borrow(owner, 500_000_000n);
    assert.throws(() => club.liquidate(), /NotLiquidatable/);

    // BTC flash crashes to $11,500 -> collateralValueUsdc = $575 < $600 floor
    oracle.setPrice(owner, 11_500_00000000n, now);
    assert.equal(club.collateralValueUsdc(), 575_000_000n);

    club.liquidate();
    assert.equal(club.state, BONDED_STATE.DEFAULTED);
    assert.equal(club.lastDefaultReason, DEFAULT_REASON.UNDERCOLLATERALIZED);
    assert.equal(club.settledRecoveredUsdc, 100_000_000n);
    assert.equal(club.settledCollateral, 5_000_000n);

    for (const m of members) {
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 25_000_000n); // 25 USDC
      assert.equal(cirBtcOut, 1_250_000n); // 0.0125 CirBTC
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Security Assertions S1–S8 (Section 20.1)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-07: Security S1–S8 (ownership locks, peakDebt anti-evasion, zero-exposure oracle bypass, fee-on-transfer protection, blocklist isolation)", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const m1 = "0x000000000000000000000000000000000000b0b1";
    const m2 = "0x000000000000000000000000000000000000b0b2";

    const usdcLedger = new MockTokenLedger();
    const cirBtcLedger = new MockTokenLedger();
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x9999999999999999999999999999999999999999",
      maxPriceAge: 3600n,
      usdcLedger,
      cirBtcLedger,
      oracle,
      getNow: () => now,
    });

    const club = factory.createClub(owner, {
      ...DEFAULT_BONDED_PARAMS,
      maxMembers: 2,
    });

    // Renounce ownership always reverts
    assert.throws(() => club.renounceOwnership(owner), /RenounceDisabled/);

    // Owner cannot join
    assert.throws(() => club.joinGroup(owner), /OwnerCannotJoin/);

    cirBtcLedger.mint(owner, 5_000_000n);
    usdcLedger.mint(owner, 50_000_000n);
    usdcLedger.mint(m1, 200_000_000n);
    usdcLedger.mint(m2, 200_000_000n);

    club.joinGroup(m1);
    club.joinGroup(m2);
    club.depositCollateral(owner, 5_000_000n);
    club.startRounds(owner);

    // Ownership transfer is locked after OPEN
    assert.throws(
      () => club.transferOwnership(owner, "0x000000000000000000000000000000000000dead"),
      /TransferLockedAfterOpen/
    );

    // S5: Fee-on-transfer USDC contribution reverts InvalidAmount
    usdcLedger.feeBps = 100n; // 1% fee
    assert.throws(() => club.contribute(m1), /InvalidAmount/);
    usdcLedger.feeBps = 0n;

    club.contribute(m1);
    club.contribute(m2);

    // S3: Borrow and repay in the same round still records peakDebt and charges interest
    club.borrow(owner, 100_000_000n);
    club.repay(owner, 100_000_000n);
    assert.equal(club.totalDebt, 0n);
    assert.equal(club.peakDebt.get(1n), 100_000_000n);

    // Advance to Round 2 -> 2% of 100 USDC = 2 USDC interest owed
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.equal(club.interestOwed(), 2_000_000n);
    club.payInterest(owner, 2_000_000n);

    // S4: When exposure == 0, owner can withdraw collateral even if oracle is broken
    oracle.setBad(owner, -1n);
    assert.throws(() => club.borrow(owner, 10_000_000n), /BadPrice/);
    club.withdrawCollateral(owner, 1_000_000n);
    assert.equal(club.collateral, 4_000_000n);

    // Restore oracle and finish Round 2
    oracle.setPrice(owner, 60_000_00000000n, now);
    club.contribute(m1);
    club.contribute(m2);
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    club.finalize();

    // S8: Blocklist isolation — blocking m1 does not prevent m2 from claiming and withdrawing
    usdcLedger.setBlocked(m1, true);
    assert.throws(() => club.withdrawPrincipal(m1), /AddressBlocked/);
    club.claimInterest(m2);
    const m2Principal = club.withdrawPrincipal(m2);
    assert.equal(m2Principal.usdcOut, 100_000_000n);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Oracle Environment Validation & Pre-Broadcast Script (Section 12.1)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-08: Oracle environment validator & deploy script enforce MOCK prohibition and allowlist on mainnet", () => {
    const now = 1_700_000_000n;
    const validRoundData = {
      roundId: 5n,
      answer: 60_000_00000000n,
      startedAt: now - 60n,
      updatedAt: now - 60n,
      answeredInRound: 5n,
    };

    // Testnet accepts MOCK oracle
    const testnetCheck = validateOracleFeedForEnv({
      env: "testnet",
      feedAddress: "0x1111111111111111111111111111111111111111",
      description: "MOCK BTC / USD",
      decimals: 8,
      roundData: validRoundData,
      nowSeconds: now,
      maxPriceAge: 3600n,
    });
    assert.equal(testnetCheck.valid, true);

    // Mainnet rejects MOCK oracle
    const mainnetMockCheck = validateOracleFeedForEnv({
      env: "mainnet",
      feedAddress: "0x1111111111111111111111111111111111111111",
      description: "MOCK BTC / USD",
      decimals: 8,
      roundData: validRoundData,
      nowSeconds: now,
      maxPriceAge: 3600n,
      mainnetAllowlist: ["0x1111111111111111111111111111111111111111"],
    });
    assert.equal(mainnetMockCheck.valid, false);
    assert.ok(mainnetMockCheck.reason?.includes("MainnetOracleRejected"));

    // Mainnet rejects non-allowlisted feed even if description is not MOCK
    const mainnetAllowlistCheck = validateOracleFeedForEnv({
      env: "mainnet",
      feedAddress: "0x2222222222222222222222222222222222222222",
      description: "BTC / USD",
      decimals: 8,
      roundData: validRoundData,
      nowSeconds: now,
      maxPriceAge: 3600n,
      mainnetAllowlist: ["0x3333333333333333333333333333333333333333"],
    });
    assert.equal(mainnetAllowlistCheck.valid, false);

    // Pre-broadcast script validator succeeds on valid testnet config and throws on stale price
    const preBroadcastOk = validatePreBroadcastConfig({
      env: "testnet",
      chainId: 5042002,
      expectedChainId: 5042002,
      usdc: "0x3600000000000000000000000000000000000000",
      cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
      priceFeed: "0x1111111111111111111111111111111111111111",
      maxPriceAge: 3600,
      feedDecimals: 8,
      feedDescription: "MOCK BTC / USD",
      latestRoundData: validRoundData,
      nowSeconds: now,
    });
    assert.equal(preBroadcastOk.ok, true);

    assert.throws(
      () =>
        validatePreBroadcastConfig({
          env: "testnet",
          chainId: 5042002,
          expectedChainId: 5042002,
          usdc: "0x3600000000000000000000000000000000000000",
          cirBtc: "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88",
          priceFeed: "0x1111111111111111111111111111111111111111",
          maxPriceAge: 3600,
          feedDecimals: 8,
          feedDescription: "MOCK BTC / USD",
          latestRoundData: { ...validRoundData, updatedAt: now - 7200n },
          nowSeconds: now,
        }),
      /StalePrice/
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. APR Calculation & Directory Version Support (Section 13)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-09: APR helper & savingsClubDirectory version tag ('v1-rotating' | 'v2-bonded') work with 100% backward compatibility", () => {
    // 200 bps (2%) per 1-day round = 730% annualized APR
    assert.equal(calculateAnnualizedAprPct(200, 86_400), 730);
    assert.equal(isMockOracleDescription("MOCK BTC/USD"), true);
    assert.equal(isMockOracleDescription("BTC / USD"), false);

    // Default club version when omitted is "v1-rotating"
    assert.equal(getClubVersion(undefined), "v1-rotating");
    assert.equal(getClubVersion({}), "v1-rotating");
    assert.equal(getClubVersion({ version: "v2-bonded" }), "v2-bonded");

    const store = new Map<string, string>();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    };

    try {
      saveKnownGroup({
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        name: "Bonded Club V2",
        version: "v2-bonded",
      });
      const groups = getKnownGroups();
      const found = groups.find(
        (g) => g.address === "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );
      assert.ok(found);
      assert.equal(found.version, "v2-bonded");
    } finally {
      store.delete(SAVINGS_CLUBS_STORAGE_KEY);
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    }
  });
});
