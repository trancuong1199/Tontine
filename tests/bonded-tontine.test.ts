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
  BONDED_TONTINE_ERROR_MESSAGES,
  calculateAnnualizedAprPct,
  isMockOracleDescription,
  validateBondedClubParams,
  validateOracleFeedForEnv,
  parseBondedTontineError,
} from "../src/lib/bondedTontine.ts";
import {
  MockOracleSimulator,
  MockTokenLedger,
  BondedTontineSimulator,
  BondedTontineFactorySimulator,
} from "./helpers/bondedSimulator.ts";
import {
  getClubVersion,
  getKnownGroups,
  saveKnownGroup,
  syncFactoryBondedClubs,
  SAVINGS_CLUBS_STORAGE_KEY,
} from "../src/lib/savingsClubDirectory.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  CANONICAL_FACTORY,
  ORACLE_INFO,
  ARC_TESTNET_BONDED_FACTORY,
  ARC_TESTNET_MOCK_FEED,
  BONDED_DISCLOSURE_COPY,
  MOCK_ORACLE_WARNING_COPY,
} from "../src/config/bonded-tontine.ts";
import { USDC_ADDRESS, CIRBTC_ADDRESS } from "../src/config/arc-constants.ts";
import { validatePreBroadcastConfig } from "../scripts/deploy-bonded-tontine-factory.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

describe("Task-059 / Task-060: BondedTontine Design Specification & Implementation Suite", () => {
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

    assert.ok(
      tontineRuntimeBytes > 1000 && tontineRuntimeBytes < 24_576,
      `BondedTontine runtime (${tontineRuntimeBytes} B) must be < 24576 B`
    );
    assert.ok(
      factoryRuntimeBytes > 1000 && factoryRuntimeBytes < 24_576,
      `BondedTontineFactory runtime (${factoryRuntimeBytes} B) must be < 24576 B`
    );
  });

  it("T059-02: BondedTontine ABI exposes all 21 custom errors (including DefaultPending), 14 events, and all write/view functions (including interestClaimedTotal)", () => {
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
      "DefaultPending",
    ];
    assert.equal(expectedErrors.length, 21);
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
      "interestClaimedTotal",
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
    assert.ok(src.includes("test_WorkedExampleB_InterestOverdueDefault_And_DefaultPendingGate"));
    assert.ok(src.includes("test_WorkedExampleC_FlashCrashLiquidation"));
    assert.ok(src.includes("test_ConstructorAndFactoryRevertOnWrongTokenDecimals"));
    assert.ok(src.includes("test_Security_S3_BorrowRepaySameRoundPeakDebt"));
    assert.ok(src.includes("test_Security_S4_OracleFailureDuringZeroExposureAllowsCollateralWithdraw"));
    assert.ok(src.includes("test_Security_S8_BlocklistIsolation"));
    assert.ok(src.includes("invariant_solvency"));
    assert.ok(src.includes("invariant_stateMonotonic"));
    assert.ok(!src.includes("block.timestamp"), "Foundry tests with via_ir must use vm.getBlockTimestamp()");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Worked Example A — Happy Path (Section 26)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-04: Worked Example A (Happy Path) matches Section 26 exact numbers and caps interestClaimedTotal <= interestPaidTotal", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const m1 = "0x000000000000000000000000000000000000b0b1";
    const m2 = "0x000000000000000000000000000000000000b0b2";
    const m3 = "0x000000000000000000000000000000000000b0b3";
    const m4 = "0x000000000000000000000000000000000000b0b4";
    const members = [m1, m2, m3, m4];

    const usdcLedger = new MockTokenLedger(6);
    const cirBtcLedger = new MockTokenLedger(8);
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
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

    cirBtcLedger.mint(owner, 5_000_000n);
    usdcLedger.mint(owner, 100_000_000n);
    for (const m of members) {
      usdcLedger.mint(m, 200_000_000n);
      club.joinGroup(m);
    }

    club.depositCollateral(owner, 5_000_000n);
    assert.equal(club.collateralValueUsdc(), 3_000_000_000n);
    assert.equal(club.borrowLimit(), 1_500_000_000n);
    club.startRounds(owner);

    for (const m of members) club.contribute(m);
    club.borrow(owner, 200_000_000n);

    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 4_000_000n);
    club.payInterest(owner, 4_000_000n);
    club.borrow(owner, 200_000_000n);

    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.payInterest(owner, 8_000_000n);

    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    for (const m of members) club.contribute(m);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.payInterest(owner, 8_000_000n);

    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.equal(club.interestOwed(), 8_000_000n);
    club.repay(owner, 400_000_000n);
    club.payInterest(owner, 8_000_000n);
    club.finalize();

    assert.equal(club.state, BONDED_STATE.COMPLETED);

    club.withdrawCollateral(owner, 5_000_000n);
    assert.equal(cirBtcLedger.balanceOf(owner), 5_000_000n);

    for (const m of members) {
      const pending = club.pendingInterest(m);
      assert.ok(pending >= 6_999_999n && pending <= 7_000_000n);
      club.claimInterest(m);
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 200_000_000n);
      assert.equal(cirBtcOut, 0n);
      assert.equal(usdcLedger.balanceOf(m), 200_000_000n + pending);
    }
    assert.ok(club.interestClaimedTotal <= club.interestPaidTotal);
  });

  it("T059-04b: Section 26 10-member 0.11 CirBTC Worked Example A (450 USDC total interest)", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const members = Array.from(
      { length: 10 },
      (_, i) => `0x${(i + 101).toString(16).padStart(40, "0")}`
    );

    const usdcLedger = new MockTokenLedger(6);
    const cirBtcLedger = new MockTokenLedger(8);
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
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
        assert.equal(club.exposure(), 3_060_000_000n);
      }
      now += 86_400n;
      oracle.setPrice(owner, 60_000_00000000n, now);
    }

    assert.equal(club.interestOwed(), 60_000_000n);
    club.repay(owner, 3_000_000_000n);
    club.payInterest(owner, 60_000_000n);
    assert.equal(club.interestDueTotal, 450_000_000n);
    assert.equal(club.interestPaidTotal, 450_000_000n);
    club.finalize();
    assert.equal(club.state, BONDED_STATE.COMPLETED);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Worked Example B — Interest Overdue Default & DefaultPending Gate
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-05: Worked Example B (Interest Overdue Default) enforces DefaultPending on contribute and seizes 0.05 CirBTC", () => {
    let now = 1_700_000_000n;
    const owner = "0x00000000000000000000000000000000000a11ce";
    const members = [
      "0x000000000000000000000000000000000000b0b1",
      "0x000000000000000000000000000000000000b0b2",
      "0x000000000000000000000000000000000000b0b3",
      "0x000000000000000000000000000000000000b0b4",
    ];

    const usdcLedger = new MockTokenLedger(6);
    const cirBtcLedger = new MockTokenLedger(8);
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
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
      usdcLedger.mint(m, 100_000_000n);
      club.joinGroup(m);
    }
    club.depositCollateral(owner, 5_000_000n);
    club.startRounds(owner);

    for (const m of members) club.contribute(m);
    club.borrow(owner, 200_000_000n);

    now += 86_400n + 86_399n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.throws(() => club.declareDefault(), /NotDefaultable/);

    // Once grace elapses, contribute() reverts DefaultPending before declareDefault() is called
    now += 1n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.throws(() => club.contribute(members[0]), /DefaultPending/);

    club.declareDefault();

    assert.equal(club.state, BONDED_STATE.DEFAULTED);
    assert.equal(club.lastDefaultReason, DEFAULT_REASON.INTEREST_OVERDUE);
    assert.equal(club.settledCollateral, 5_000_000n);

    for (const m of members) {
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 0n);
      assert.equal(cirBtcOut, 1_250_000n);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Worked Example C — BTC Flash Crash Liquidation
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

    const usdcLedger = new MockTokenLedger(6);
    const cirBtcLedger = new MockTokenLedger(8);
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
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

    for (let r = 0; r < 3; r++) {
      for (const m of members) club.contribute(m);
      if (r < 2) {
        now += 86_400n;
        oracle.setPrice(owner, 60_000_00000000n, now);
      }
    }

    club.borrow(owner, 500_000_000n);
    assert.throws(() => club.liquidate(), /NotLiquidatable/);

    oracle.setPrice(owner, 11_500_00000000n, now);
    assert.equal(club.collateralValueUsdc(), 575_000_000n);

    club.liquidate();
    assert.equal(club.state, BONDED_STATE.DEFAULTED);
    assert.equal(club.lastDefaultReason, DEFAULT_REASON.UNDERCOLLATERALIZED);
    assert.equal(club.settledRecoveredUsdc, 100_000_000n);
    assert.equal(club.settledCollateral, 5_000_000n);

    for (const m of members) {
      const { usdcOut, cirBtcOut } = club.withdrawPrincipal(m);
      assert.equal(usdcOut, 25_000_000n);
      assert.equal(cirBtcOut, 1_250_000n);
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

    const usdcLedger = new MockTokenLedger(6);
    const cirBtcLedger = new MockTokenLedger(8);
    const oracle = new MockOracleSimulator(owner, 8, 60_000_00000000n, "MOCK BTC/USD", now);

    const factory = new BondedTontineFactorySimulator({
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
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

    assert.throws(() => club.renounceOwnership(owner), /RenounceDisabled/);
    assert.throws(() => club.joinGroup(owner), /OwnerCannotJoin/);

    cirBtcLedger.mint(owner, 5_000_000n);
    usdcLedger.mint(owner, 50_000_000n);
    usdcLedger.mint(m1, 200_000_000n);
    usdcLedger.mint(m2, 200_000_000n);

    club.joinGroup(m1);
    club.joinGroup(m2);
    club.depositCollateral(owner, 5_000_000n);
    club.startRounds(owner);

    assert.throws(
      () => club.transferOwnership(owner, "0x000000000000000000000000000000000000dead"),
      /TransferLockedAfterOpen/
    );

    usdcLedger.feeBps = 100n;
    assert.throws(() => club.contribute(m1), /InvalidAmount/);
    usdcLedger.feeBps = 0n;

    club.contribute(m1);
    club.contribute(m2);

    club.borrow(owner, 100_000_000n);
    club.repay(owner, 100_000_000n);
    assert.equal(club.totalDebt, 0n);
    assert.equal(club.peakDebt.get(1n), 100_000_000n);

    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    assert.equal(club.interestOwed(), 2_000_000n);
    club.payInterest(owner, 2_000_000n);

    oracle.setBad(owner, -1n);
    assert.throws(() => club.borrow(owner, 10_000_000n), /BadPrice/);
    club.withdrawCollateral(owner, 1_000_000n);
    assert.equal(club.collateral, 4_000_000n);

    oracle.setPrice(owner, 60_000_00000000n, now);
    club.contribute(m1);
    club.contribute(m2);
    now += 86_400n;
    oracle.setPrice(owner, 60_000_00000000n, now);
    club.finalize();

    usdcLedger.setBlocked(m1, true);
    assert.throws(() => club.withdrawPrincipal(m1), /AddressBlocked/);
    club.claimInterest(m2);
    const m2Principal = club.withdrawPrincipal(m2);
    assert.equal(m2Principal.usdcOut, 100_000_000n);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Oracle Environment Validation & Pre-Broadcast Script (Section 12.1 & T7)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-08: Oracle environment validator & deploy script enforce MOCK prohibition, allowlist, token decimals (6 & 8), and deployed bytecode checks", () => {
    const now = 1_700_000_000n;
    const validRoundData = {
      roundId: 5n,
      answer: 60_000_00000000n,
      startedAt: now - 60n,
      updatedAt: now - 60n,
      answeredInRound: 5n,
    };

    const testnetCheck = validateOracleFeedForEnv({
      env: "testnet",
      feedAddress: ARC_TESTNET_MOCK_FEED,
      description: "MOCK BTC / USD",
      decimals: 8,
      roundData: validRoundData,
      nowSeconds: now,
      maxPriceAge: 3600n,
    });
    assert.equal(testnetCheck.valid, true);

    const mainnetMockCheck = validateOracleFeedForEnv({
      env: "mainnet",
      feedAddress: ARC_TESTNET_MOCK_FEED,
      description: "MOCK BTC / USD",
      decimals: 8,
      roundData: validRoundData,
      nowSeconds: now,
      maxPriceAge: 3600n,
      mainnetAllowlist: [ARC_TESTNET_MOCK_FEED],
    });
    assert.equal(mainnetMockCheck.valid, false);
    assert.ok(mainnetMockCheck.reason?.includes("MainnetOracleRejected"));

    const preBroadcastOk = validatePreBroadcastConfig({
      env: "testnet",
      chainId: ARC_TESTNET_CHAIN_ID,
      expectedChainId: ARC_TESTNET_CHAIN_ID,
      usdc: USDC_ADDRESS,
      cirBtc: CIRBTC_ADDRESS,
      usdcDecimals: 6,
      cirBtcDecimals: 8,
      usdcHasCode: true,
      cirBtcHasCode: true,
      priceFeed: ARC_TESTNET_MOCK_FEED,
      maxPriceAge: 3600,
      feedDecimals: 8,
      feedDescription: "MOCK BTC / USD",
      latestRoundData: validRoundData,
      nowSeconds: now,
    });
    assert.equal(preBroadcastOk.ok, true);

    // Reject wrong token decimals (non-6 USDC or non-8 cirBTC)
    assert.throws(
      () =>
        validatePreBroadcastConfig({
          env: "testnet",
          chainId: ARC_TESTNET_CHAIN_ID,
          expectedChainId: ARC_TESTNET_CHAIN_ID,
          usdc: USDC_ADDRESS,
          cirBtc: CIRBTC_ADDRESS,
          usdcDecimals: 18,
          cirBtcDecimals: 8,
          priceFeed: ARC_TESTNET_MOCK_FEED,
          maxPriceAge: 3600,
          feedDecimals: 8,
          feedDescription: "MOCK BTC / USD",
          latestRoundData: validRoundData,
          nowSeconds: now,
        }),
      /usdc\.decimals\(\) must be 6/
    );

    assert.throws(
      () =>
        validatePreBroadcastConfig({
          env: "testnet",
          chainId: ARC_TESTNET_CHAIN_ID,
          expectedChainId: ARC_TESTNET_CHAIN_ID,
          usdc: USDC_ADDRESS,
          cirBtc: CIRBTC_ADDRESS,
          usdcDecimals: 6,
          cirBtcDecimals: 6,
          priceFeed: ARC_TESTNET_MOCK_FEED,
          maxPriceAge: 3600,
          feedDecimals: 8,
          feedDescription: "MOCK BTC / USD",
          latestRoundData: validRoundData,
          nowSeconds: now,
        }),
      /cirBtc\.decimals\(\) must be 8/
    );

    // Reject cirBTC address with no code on-chain
    assert.throws(
      () =>
        validatePreBroadcastConfig({
          env: "testnet",
          chainId: ARC_TESTNET_CHAIN_ID,
          expectedChainId: ARC_TESTNET_CHAIN_ID,
          usdc: USDC_ADDRESS,
          cirBtc: CIRBTC_ADDRESS,
          usdcDecimals: 6,
          cirBtcDecimals: 8,
          cirBtcHasCode: false,
          priceFeed: ARC_TESTNET_MOCK_FEED,
          maxPriceAge: 3600,
          feedDecimals: 8,
          feedDescription: "MOCK BTC / USD",
          latestRoundData: validRoundData,
          nowSeconds: now,
        }),
      /cirBtc address has no deployed bytecode/
    );

    assert.throws(
      () =>
        validatePreBroadcastConfig({
          env: "testnet",
          chainId: ARC_TESTNET_CHAIN_ID,
          expectedChainId: ARC_TESTNET_CHAIN_ID,
          usdc: USDC_ADDRESS,
          cirBtc: CIRBTC_ADDRESS,
          priceFeed: ARC_TESTNET_MOCK_FEED,
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
  // 7. Canonical Config, Error Mapping, Directory Sync & UI Copy (T4, T6, T7)
  // ───────────────────────────────────────────────────────────────────────────
  it("T059-09: Canonical factory config, 21 bilingual error messages, UI disclosure copy, and directory version sync work accurately", async () => {
    assert.equal(calculateAnnualizedAprPct(200, 86_400), 730);
    assert.equal(isMockOracleDescription("MOCK BTC/USD"), true);
    assert.equal(isMockOracleDescription("BTC / USD"), false);

    // T4 canonical factory & oracle info
    assert.equal(CANONICAL_FACTORY[ARC_TESTNET_CHAIN_ID], ARC_TESTNET_BONDED_FACTORY);
    assert.equal(ORACLE_INFO[ARC_TESTNET_CHAIN_ID].feedAddress, ARC_TESTNET_MOCK_FEED);
    assert.equal(ORACLE_INFO[ARC_TESTNET_CHAIN_ID].isMock, true);

    // T6.9 bilingual error mapping for all 21 custom errors
    assert.equal(Object.keys(BONDED_TONTINE_ERROR_MESSAGES).length, 21);
    assert.equal(
      parseBondedTontineError(new Error("DefaultPending"), "vi"),
      "Nhóm đang chờ xử lý vỡ nợ, tạm thời không nhận thêm tiền góp"
    );
    assert.ok(
      parseBondedTontineError(new Error("ExceedsBorrowLimit"), "en").includes("Borrow amount exceeds")
    );
    assert.ok(
      parseBondedTontineError(new Error("CollateralLocked"), "vi").includes("Không thể rút cọc")
    );
    assert.ok(parseBondedTontineError(new Error("StalePrice"), "vi").includes("quá hạn"));
    assert.ok(parseBondedTontineError(new Error("BadPrice"), "en").includes("invalid"));
    assert.ok(parseBondedTontineError(new Error("NotLiquidatable"), "vi").includes("ngưỡng thanh lý"));

    // T6.8 & T6.11 UI disclosure and mock oracle warning copy
    assert.ok(BONDED_DISCLOSURE_COPY.vi.includes("Chủ hụi vay trong hạn mức cọc; ai cũng kích hoạt được thanh lý"));
    assert.equal(MOCK_ORACLE_WARNING_COPY.vi, "Giá thử nghiệm, không phải giá thị trường");

    // T6.10 directory version support & factory sync
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
      const mockReader = {
        readContract: async ({ functionName }: { functionName: string }) => {
          if (functionName === "clubsLength") return 1n;
          if (functionName === "clubAt") return "0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b";
          if (functionName === "groupName") return "Saigon Bonded Club V2";
          return null;
        },
      };

      const synced = await syncFactoryBondedClubs(
        mockReader,
        ARC_TESTNET_BONDED_FACTORY,
        BONDED_TONTINE_FACTORY_ABI,
        BONDED_TONTINE_ABI
      );
      assert.equal(synced.length, 1);
      assert.equal(synced[0].version, "v2-bonded");

      const groups = getKnownGroups();
      const found = groups.find(
        (g) => g.address === "0x3d35e830fe5ba48ff5b36dbba9ecebd3a7bad59b"
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
