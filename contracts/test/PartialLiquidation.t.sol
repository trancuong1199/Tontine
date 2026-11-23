// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BondedTontine} from "../BondedTontine.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";

/// @title task-063 independent Tester suite: partial CirBTC liquidation (spec docs/ba/task-063/spec-v1.md)
/// @dev Expected values are derived from the spec formulas (BR-02..BR-05) and hand-computed constants,
///      not from the implementation's internal helpers.
contract PartialLiquidationTest is Test {
    MockERC20 internal usdc;
    MockERC20 internal cirBtc;
    MockAggregatorV3 internal oracle;
    BondedTontine internal club;

    address internal owner_ = makeAddr("pl-owner");
    address internal liquidator = makeAddr("pl-liquidator");
    address[4] internal members;

    uint256 internal constant CONTRIB = 1_000e6;
    uint256 internal constant ROUNDS = 4;
    uint256 internal constant ROUND = 1 days;
    uint256 internal constant RATE = 200; // 2%/round
    uint256 internal constant IGRACE = 1 days;
    uint256 internal constant SGRACE = 2 days;
    uint256 internal constant MAX_AGE = 3600;
    uint256 internal constant COLL = 2e7; // 0.2 cirBTC
    uint256 internal constant BORROW = 3_000e6;
    uint256 internal constant SCALE = 1e10; // 10**(feedDecimals 8 + 2)
    uint256 internal constant BONUS = 10_500;

    function setUp() public {
        vm.warp(1_700_000_000);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        cirBtc = new MockERC20("Circle BTC", "cirBTC", 8);
        oracle = new MockAggregatorV3(8, 60_000e8, "MOCK BTC/USD");
        members[0] = makeAddr("pl-m0");
        members[1] = makeAddr("pl-m1");
        members[2] = makeAddr("pl-m2");
        members[3] = makeAddr("pl-m3");
        usdc.mint(liquidator, 1_000_000e6);
        usdc.mint(owner_, 1_000_000e6);
        cirBtc.mint(owner_, 100e8);
        club = _deploy(12_000, "PL Club");
    }

    // ───────────────────────────── helpers ─────────────────────────────

    function _deploy(uint256 safety, string memory name) internal returns (BondedTontine c) {
        c = new BondedTontine(
            owner_, address(usdc), address(cirBtc), address(oracle), MAX_AGE, name,
            CONTRIB, 4, ROUNDS, ROUND, RATE, safety, IGRACE, SGRACE
        );
        for (uint256 i; i < 4; i++) {
            vm.prank(members[i]);
            c.joinGroup();
            usdc.mint(members[i], 100_000e6);
            vm.prank(members[i]);
            usdc.approve(address(c), type(uint256).max);
        }
        vm.startPrank(owner_);
        cirBtc.approve(address(c), type(uint256).max);
        usdc.approve(address(c), type(uint256).max);
        vm.stopPrank();
        vm.prank(liquidator);
        usdc.approve(address(c), type(uint256).max);
    }

    /// Deposit collateral, start, all members contribute round 1, owner borrows.
    function _activate(BondedTontine c, uint256 borrowAmt) internal {
        vm.startPrank(owner_);
        c.depositCollateral(COLL);
        c.startRounds();
        vm.stopPrank();
        _contributeAll(c);
        if (borrowAmt > 0) {
            vm.prank(owner_);
            c.borrow(borrowAmt);
        }
    }

    function _contributeAll(BondedTontine c) internal {
        for (uint256 i; i < 4; i++) {
            vm.prank(members[i]);
            c.contribute();
        }
    }

    /// Set the oracle price so that collateral value is exactly `valueUsdc` (COLL = 2e7 => price = value * 500).
    function _setValue(uint256 valueUsdc) internal {
        oracle.setPrice(int256(valueUsdc * SCALE / COLL));
    }

    function _price() internal view returns (uint256 p) {
        (, int256 a, , , ) = oracle.latestRoundData();
        p = uint256(a);
    }

    /// Independent spec-model of BR-04/BR-05 used for the oracle comparison.
    function _model(BondedTontine c, uint256 requested) internal view returns (uint256 repaid, uint256 seized) {
        uint256 debt = c.totalDebt();
        uint256 col = c.collateral();
        if (c.state() != BondedTontine.State.ACTIVE || debt == 0 || col == 0 || requested == 0) return (0, 0);
        uint256 p = _price();
        uint256 v = col * p / SCALE;
        uint256 d = debt + c.interestOwed();
        uint256 s = c.safetyBps();
        uint256 thr = (10_000 + s) / 2;
        if (v * 10_000 >= thr * d) return (0, 0);
        uint256 cap = debt;
        if (s > BONUS) {
            uint256 num = s * d - 10_000 * v;
            uint256 den = s - BONUS;
            uint256 need = (num + den - 1) / den;
            if (need < cap) cap = need;
        }
        repaid = requested < cap ? requested : cap;
        uint256 sv = repaid * BONUS / 10_000;
        if (sv >= v) {
            seized = col;
            repaid = v * 10_000 / BONUS;
            if (repaid > debt) repaid = debt;
        } else {
            seized = sv * SCALE / p;
        }
    }

    function _assertConservation(BondedTontine c) internal view {
        assertEq(cirBtc.balanceOf(address(c)), c.collateral(), "cirBTC balance == collateral");
        assertEq(
            usdc.balanceOf(address(c)),
            c.totalDeposits() - c.totalDebt() + c.interestPaidTotal() - c.interestClaimedTotal(),
            "USDC balance == deposits - debt + interest paid - claimed"
        );
    }

    // ───────────────────────────── AC-01a ─────────────────────────────

    function test_AC01a_NotLiquidatableWhenHealthy() public {
        _activate(club, BORROW);
        assertGt(club.healthBps(), club.liquidationThresholdBps());
        assertFalse(club.isLiquidatable());
        assertEq(club.maxLiquidatableDebt(), 0);
        (uint256 r, uint256 s) = club.previewLiquidation(1_000e6);
        assertEq(r, 0);
        assertEq(s, 0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.NotLiquidatable.selector);
        club.liquidate(1_000e6);
    }

    function test_AC01a_ExactlyAtThresholdNotLiquidatable_JustBelowIs() public {
        _activate(club, BORROW);
        _setValue(3_300e6); // health exactly 11000 bps == threshold
        assertEq(club.healthBps(), 11_000);
        assertFalse(club.isLiquidatable());
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.NotLiquidatable.selector);
        club.liquidate(1e6);

        oracle.setPrice(int256(3_300e6 * SCALE / COLL) - 1);
        assertTrue(club.isLiquidatable());
        vm.prank(liquidator);
        club.liquidate(1e6);
    }

    function test_AC01a_NotLiquidatableWithoutDebt() public {
        _activate(club, 0);
        _setValue(1e6); // collateral nearly worthless, but no debt
        assertFalse(club.isLiquidatable());
        assertEq(club.maxLiquidatableDebt(), 0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.NotLiquidatable.selector);
        club.liquidate(1e6);

        // borrow then fully repay at a healthy price, then crash -> still no debt
        oracle.setPrice(60_000e8);
        vm.startPrank(owner_);
        club.borrow(1_000e6);
        club.repay(1_000e6);
        vm.stopPrank();
        _setValue(1e6);
        assertFalse(club.isLiquidatable());
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.NotLiquidatable.selector);
        club.liquidate(1e6);
    }

    function test_AC01a_WrongStateOutsideActive() public {
        // OPEN
        vm.prank(owner_);
        club.depositCollateral(COLL);
        assertFalse(club.isLiquidatable());
        assertEq(club.maxLiquidatableDebt(), 0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.WrongState.selector);
        club.liquidate(1e6);

        // CANCELLED
        BondedTontine c2 = _deploy(12_000, "PL Cancel");
        vm.prank(owner_);
        c2.cancelOpen();
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.WrongState.selector);
        c2.liquidate(1e6);

        // DEFAULTED (debt still outstanding, price crashed)
        BondedTontine c3 = _deploy(12_000, "PL Default");
        _activate(c3, BORROW);
        vm.warp(block.timestamp + ROUND + IGRACE + 1);
        _setValue(2_000e6);
        c3.declareDefault();
        assertEq(uint256(c3.state()), uint256(BondedTontine.State.DEFAULTED));
        assertFalse(c3.isLiquidatable());
        assertEq(c3.maxLiquidatableDebt(), 0);
        (uint256 r, ) = c3.previewLiquidation(1e6);
        assertEq(r, 0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.WrongState.selector);
        c3.liquidate(1e6);

        // COMPLETED
        BondedTontine c4 = _deploy(12_000, "PL Done");
        _activate(c4, 0);
        vm.warp(block.timestamp + ROUNDS * ROUND);
        oracle.setPrice(60_000e8);
        c4.finalize();
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.WrongState.selector);
        c4.liquidate(1e6);
    }

    // ───────────────────────────── AC-01f ─────────────────────────────

    function test_AC01f_ZeroRepayRevertsInvalidAmount() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        assertTrue(club.isLiquidatable());
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.InvalidAmount.selector);
        club.liquidate(0);
        (uint256 r, uint256 s) = club.previewLiquidation(0);
        assertEq(r, 0);
        assertEq(s, 0);
    }

    function test_AC01f_StalePriceReverts() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.warp(block.timestamp + MAX_AGE + 1);
        assertFalse(club.isLiquidatable());
        assertEq(club.maxLiquidatableDebt(), 0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.StalePrice.selector);
        club.liquidate(1_000e6);
    }

    function test_AC01f_BadPriceReverts() public {
        _activate(club, BORROW);
        oracle.setBad(0);
        assertFalse(club.isLiquidatable());
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.BadPrice.selector);
        club.liquidate(1_000e6);

        oracle.setPrice(16_000e8);
        oracle.setAnsweredInRound(0);
        vm.prank(liquidator);
        vm.expectRevert(BondedTontine.BadPrice.selector);
        club.liquidate(1_000e6);
    }

    // ───────────────── AC-01b / AC-01c / AC-01d / AC-01g (safety 120%) ─────────────────

    function test_AC01bcdg_MaxLiquidationHandComputed() public {
        _activate(club, BORROW);
        _setValue(3_200e6); // price $16,000, health 10666 bps < 11000
        assertEq(_price(), 16_000e8);
        assertEq(club.liquidationThresholdBps(), 11_000);
        assertEq(club.LIQUIDATION_BONUS_BPS(), 500);
        assertEq(club.healthBps(), 10_666);
        assertTrue(club.isLiquidatable());

        // Hand-computed: ceil((12000*3000e6 - 10000*3200e6) / 1500) = ceil(2666666666.67)
        uint256 expRepay = 2_666_666_667;
        // floor(2666666667 * 1.05) = 2800000000 ; 2800000000 * 1e10 / 16000e8 = 17_500_000 sats
        uint256 expSeize = 17_500_000;
        assertEq(club.maxLiquidatableDebt(), expRepay);
        (uint256 pr, uint256 ps) = club.previewLiquidation(type(uint256).max);
        assertEq(pr, expRepay);
        assertEq(ps, expSeize);

        uint256 lu = usdc.balanceOf(liquidator);
        uint256 lc = cirBtc.balanceOf(liquidator);
        uint256 cu = usdc.balanceOf(address(club));
        uint256 cc = cirBtc.balanceOf(address(club));
        uint256 interestBefore = club.interestOwed();

        vm.expectEmit(true, false, false, true, address(club));
        emit BondedTontine.PartiallyLiquidated(liquidator, expRepay, expSeize, BORROW - expRepay, COLL - expSeize);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(10_000e6); // AC-01d over-request capped

        assertEq(r, expRepay, "repaid capped to max");
        assertEq(s, expSeize);
        assertEq(lu - usdc.balanceOf(liquidator), expRepay, "liquidator USDC out");
        assertEq(cirBtc.balanceOf(liquidator) - lc, expSeize, "liquidator cirBTC in");
        assertEq(usdc.balanceOf(address(club)) - cu, expRepay, "club USDC in");
        assertEq(cc - cirBtc.balanceOf(address(club)), expSeize, "club cirBTC out");
        assertEq(club.totalDebt(), BORROW - expRepay);
        assertEq(club.collateral(), COLL - expSeize);
        assertEq(club.interestOwed(), interestBefore, "BR-06 interest unchanged");
        assertEq(club.peakDebt(1), BORROW, "BR-06 peak debt kept");
        assertEq(uint256(club.state()), uint256(BondedTontine.State.ACTIVE), "BR-07 stays ACTIVE");
        // AC-01c
        assertGe(club.healthBps() + 1, 12_000, "health restored to safety");
        assertEq(club.healthBps(), 12_000);
        assertFalse(club.isLiquidatable());
        _assertConservation(club);
    }

    function test_AC01b_PartialSmallRepayExactDeltas() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        uint256 repay = 500e6;
        // floor(500e6*1.05)=525e6 ; 525e6*1e10/16000e8 = 3_281_250 sats
        (uint256 pr, uint256 ps) = club.previewLiquidation(repay);
        assertEq(pr, repay);
        assertEq(ps, 3_281_250);
        uint256 lu = usdc.balanceOf(liquidator);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(repay);
        assertEq(r, repay);
        assertEq(s, 3_281_250);
        assertEq(lu - usdc.balanceOf(liquidator), repay);
        assertEq(cirBtc.balanceOf(liquidator), 3_281_250);
        assertEq(club.totalDebt(), BORROW - repay);
        assertEq(club.collateral(), COLL - 3_281_250);
        // Health improves but stays below safety; still liquidatable for the remainder.
        assertLt(club.healthBps(), 12_000);
        assertGt(club.healthBps(), 10_666);
        _assertConservation(club);
    }

    function test_AC01b_OwnerMayLiquidateToo() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.prank(owner_);
        (uint256 r, ) = club.liquidate(100e6);
        assertEq(r, 100e6);
    }

    function test_AC01g_WithInterestOwedViewsMatchAndInterestUnchanged() public {
        _activate(club, BORROW);
        vm.warp(block.timestamp + ROUND); // round 2, round-1 interest (60 USDC) owed, not yet overdue
        oracle.setPrice(60_000e8);
        assertEq(club.interestOwed(), 60e6);
        // D = 3060e6; choose V = 3200e6 => health 10457 < 11000
        _setValue(3_200e6);
        uint256 maxR = club.maxLiquidatableDebt();
        // ceil((12000*3060e6 - 1e4*3200e6)/1500) = ceil(3146666666.67) -> capped to totalDebt 3000e6
        assertEq(maxR, BORROW);
        (uint256 mr, uint256 ms) = _model(club, type(uint256).max);
        (uint256 pr, uint256 ps) = club.previewLiquidation(type(uint256).max);
        assertEq(pr, mr);
        assertEq(ps, ms);
        // repaid*1.05 = 3150 < 3200 -> not bad debt; seize 3150e6*1e10/16000e8
        assertEq(ps, 19_687_500);

        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(type(uint256).max);
        assertEq(r, pr);
        assertEq(s, ps);
        assertEq(club.totalDebt(), 0);
        assertEq(club.interestOwed(), 60e6, "BR-06 interest still owed");
        assertEq(club.interestDue(1), 60e6);
        _assertConservation(club);
    }

    function test_AC01g_PreviewMatchesForManyAmounts() public {
        _activate(club, BORROW);
        _setValue(3_100e6);
        uint256[5] memory amts = [uint256(1), 1e6, 777e6, 2_900e6, type(uint256).max];
        for (uint256 i; i < amts.length; i++) {
            (uint256 mr, uint256 ms) = _model(club, amts[i]);
            (uint256 pr, uint256 ps) = club.previewLiquidation(amts[i]);
            assertEq(pr, mr, "preview repaid vs spec model");
            assertEq(ps, ms, "preview seized vs spec model");
        }
        assertEq(club.maxLiquidatableDebt(), _modelMax(club));
        uint256 snap = vm.snapshotState();
        for (uint256 i; i < amts.length; i++) {
            vm.revertToState(snap);
            (uint256 pr, uint256 ps) = club.previewLiquidation(amts[i]);
            vm.prank(liquidator);
            (uint256 r, uint256 s) = club.liquidate(amts[i]);
            assertEq(r, pr);
            assertEq(s, ps);
        }
    }

    function _modelMax(BondedTontine c) internal view returns (uint256 r) {
        (r, ) = _model(c, type(uint256).max);
    }

    // ───────────────────────────── AC-01e bad debt ─────────────────────────────

    function test_AC01e_BadDebtSeizesAllCollateral() public {
        _activate(club, BORROW);
        _setValue(3_000e6); // V == debt < debt*1.05
        uint256 expRepay = uint256(3_000e6) * 10_000 / 10_500; // 2857142857
        assertEq(expRepay, 2_857_142_857);
        (uint256 pr, uint256 ps) = club.previewLiquidation(type(uint256).max);
        assertEq(pr, expRepay);
        assertEq(ps, COLL);
        uint256 lu = usdc.balanceOf(liquidator);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(type(uint256).max);
        assertEq(r, expRepay);
        assertEq(s, COLL);
        assertEq(lu - usdc.balanceOf(liquidator), expRepay);
        assertEq(cirBtc.balanceOf(liquidator), COLL);
        assertEq(club.collateral(), 0);
        assertEq(club.totalDebt(), BORROW - expRepay, "remaining debt stays");
        assertEq(uint256(club.state()), uint256(BondedTontine.State.ACTIVE));
        assertFalse(club.isLiquidatable(), "no collateral left");
        _assertConservation(club);

        // remaining debt resolved via declareDefault later; members split USDC pool
        vm.warp(block.timestamp + ROUND + IGRACE + 1);
        oracle.setPrice(15_000e8);
        club.declareDefault();
        assertEq(club.settledRecoveredUsdc(), 4 * CONTRIB - (BORROW - expRepay));
        assertEq(club.settledCollateral(), 0);
        uint256 total;
        for (uint256 i; i < 4; i++) {
            uint256 b = usdc.balanceOf(members[i]);
            vm.prank(members[i]);
            club.withdrawPrincipal();
            total += usdc.balanceOf(members[i]) - b;
        }
        // pro-rata floor division in withdrawPrincipal leaves at most 1 unit of dust per member
        assertApproxEqAbs(total, 4 * CONTRIB - (BORROW - expRepay), 4);
        assertLe(total, 4 * CONTRIB - (BORROW - expRepay));
        assertEq(usdc.balanceOf(address(club)), 4 * CONTRIB - (BORROW - expRepay) - total);
    }

    function test_AC01e_DeepCrashRequestBelowBadDebtThresholdIsPartial() public {
        _activate(club, BORROW);
        _setValue(1_500e6); // deep crash, health 50%
        // small request: 1.05*1000 = 1050 < 1500 -> partial, not all collateral
        (uint256 pr, uint256 ps) = club.previewLiquidation(1_000e6);
        assertEq(pr, 1_000e6);
        assertEq(ps, uint256(1_050e6) * SCALE / _price());
        assertLt(ps, COLL);
        // request above V/1.05 -> all collateral, repay = floor(1500e6/1.05)
        (pr, ps) = club.previewLiquidation(2_000e6);
        assertEq(ps, COLL);
        assertEq(pr, uint256(1_500e6) * 10_000 / 10_500);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(2_000e6);
        assertEq(r, pr);
        assertEq(s, COLL);
    }

    // ─────────────────── different safetyBps (10000 / 12000 / 20000) ───────────────────

    function test_Safety10000_ThresholdIs100_CapIsTotalDebt() public {
        BondedTontine c = _deploy(10_000, "PL S100");
        _activate(c, BORROW);
        assertEq(c.liquidationThresholdBps(), 10_000);
        _setValue(3_000e6); // health exactly 100%
        assertFalse(c.isLiquidatable());
        _setValue(2_900e6); // 96.67%
        assertTrue(c.isLiquidatable());
        // safetyBps <= 10500: cap = totalDebt; max request => bad-debt (all collateral)
        (uint256 mr, uint256 ms) = c.previewLiquidation(type(uint256).max);
        assertEq(ms, COLL);
        assertEq(mr, uint256(2_900e6) * 10_000 / 10_500);
        // partial request
        (uint256 pr, uint256 ps) = c.previewLiquidation(1_000e6);
        assertEq(pr, 1_000e6);
        assertEq(ps, uint256(1_050e6) * SCALE / _price());
        vm.prank(liquidator);
        (uint256 r, uint256 s) = c.liquidate(1_000e6);
        assertEq(r, pr);
        assertEq(s, ps);
        _assertConservation(c);
    }

    function test_Safety20000_ThresholdIs150_RestoresTo200() public {
        BondedTontine c = _deploy(20_000, "PL S200");
        _activate(c, BORROW);
        assertEq(c.liquidationThresholdBps(), 15_000);
        _setValue(4_500e6); // exactly 150%
        assertFalse(c.isLiquidatable());
        _setValue(4_200e6); // 140%
        assertTrue(c.isLiquidatable());
        // ceil((20000*3000e6 - 1e4*4200e6)/9500) = ceil(1894736842.1) = 1894736843
        assertEq(c.maxLiquidatableDebt(), 1_894_736_843);
        vm.prank(liquidator);
        (uint256 r, ) = c.liquidate(type(uint256).max);
        assertEq(r, 1_894_736_843);
        assertGe(c.healthBps() + 1, 20_000);
        assertFalse(c.isLiquidatable());
        _assertConservation(c);
    }

    function test_Safety12000_ThresholdIs110() public view {
        assertEq(club.liquidationThresholdBps(), 11_000);
    }

    function test_SafetyOddRoundsDown() public {
        BondedTontine c = _deploy(10_501, "PL Odd");
        assertEq(c.liquidationThresholdBps(), 10_250); // (10000+10501)/2 floor
    }

    // ───────────────────────────── AC-01h follow-on flows ─────────────────────────────

    function test_AC01h_AfterLiquidationClubCompletesAndMembersWhole() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.prank(liquidator);
        (uint256 r, ) = club.liquidate(type(uint256).max);

        // Owner repays remaining debt and keeps paying interest; members keep contributing.
        vm.startPrank(owner_);
        club.repay(club.totalDebt());
        vm.stopPrank();
        for (uint256 k = 2; k <= ROUNDS; k++) {
            vm.warp(club.startTime() + (k - 1) * ROUND);
            oracle.setPrice(16_000e8);
            _contributeAll(club);
            uint256 owed = club.interestOwed();
            if (owed > 0) {
                vm.prank(owner_);
                club.payInterest(owed);
            }
            _assertConservation(club);
        }
        vm.warp(club.startTime() + ROUNDS * ROUND);
        oracle.setPrice(16_000e8);
        uint256 owed2 = club.interestOwed();
        if (owed2 > 0) {
            vm.prank(owner_);
            club.payInterest(owed2);
        }
        // only round 1 carried debt (peak 3000) => 60 USDC total interest
        assertEq(club.interestPaidTotal(), 60e6);
        assertGt(r, 0);

        uint256 ownerColBefore = cirBtc.balanceOf(owner_);
        uint256 col = club.collateral();
        club.finalize();
        assertEq(uint256(club.state()), uint256(BondedTontine.State.COMPLETED));
        vm.prank(owner_);
        club.withdrawCollateral(col);
        assertEq(cirBtc.balanceOf(owner_) - ownerColBefore, COLL - 17_500_000, "owner keeps the rest");

        for (uint256 i; i < 4; i++) {
            uint256 b = usdc.balanceOf(members[i]);
            vm.startPrank(members[i]);
            club.withdrawPrincipal();
            club.claimInterest();
            vm.stopPrank();
            assertEq(usdc.balanceOf(members[i]) - b, 4 * CONTRIB + 15e6, "principal + interest");
        }
        assertEq(usdc.balanceOf(address(club)), 0);
        assertEq(cirBtc.balanceOf(address(club)), 0);
    }

    function test_AC01h_AfterLiquidationDefaultAccountingCorrect() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(type(uint256).max);

        vm.warp(club.startTime() + ROUND + IGRACE);
        oracle.setPrice(16_000e8);
        club.declareDefault();
        assertEq(club.settledRecoveredUsdc(), 4 * CONTRIB - (BORROW - r));
        assertEq(club.settledCollateral(), COLL - s);

        uint256 usdcOut;
        uint256 cirOut;
        for (uint256 i; i < 4; i++) {
            uint256 bu = usdc.balanceOf(members[i]);
            uint256 bc = cirBtc.balanceOf(members[i]);
            vm.prank(members[i]);
            club.withdrawPrincipal();
            usdcOut += usdc.balanceOf(members[i]) - bu;
            cirOut += cirBtc.balanceOf(members[i]) - bc;
        }
        // pro-rata floor division leaves at most 1 unit of dust per member, never over-pays
        assertApproxEqAbs(usdcOut, 4 * CONTRIB - (BORROW - r), 4);
        assertLe(usdcOut, 4 * CONTRIB - (BORROW - r));
        assertApproxEqAbs(cirOut, COLL - s, 4);
        assertLe(cirOut, COLL - s);
        assertEq(usdc.balanceOf(address(club)), 4 * CONTRIB - (BORROW - r) - usdcOut);
        assertEq(cirBtc.balanceOf(address(club)), COLL - s - cirOut);
        // Members' recovery is still >= their principal at the liquidation price.
        uint256 value = usdcOut + cirOut * 16_000e8 / SCALE;
        assertGe(value, 4 * CONTRIB);
    }

    /// Compare two identical clubs after a price drop; only one is liquidated, then price keeps falling
    /// and both default. Members of the liquidated club recover more value.
    function test_AC01h_MembersBetterOffUnderFurtherCrash() public {
        BondedTontine a = club;
        BondedTontine b = _deploy(12_000, "PL Twin");
        _activate(a, BORROW);
        _activate(b, BORROW);
        _setValue(3_200e6);
        vm.prank(liquidator);
        a.liquidate(type(uint256).max);

        vm.warp(a.startTime() + ROUND + IGRACE);
        oracle.setPrice(8_000e8); // further 50% crash
        a.declareDefault();
        b.declareDefault();
        uint256 va = a.settledRecoveredUsdc() + a.settledCollateral() * 8_000e8 / SCALE;
        uint256 vb = b.settledRecoveredUsdc() + b.settledCollateral() * 8_000e8 / SCALE;
        assertGt(va, vb, "liquidation protects members under further crash");
        assertLt(vb, 4 * CONTRIB, "un-liquidated club members take a loss");
    }

    function test_AC01h_ContributeAndBorrowStillWorkAfterLiquidation() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.prank(liquidator);
        club.liquidate(type(uint256).max);
        vm.warp(club.startTime() + ROUND);
        oracle.setPrice(16_000e8);
        _contributeAll(club);
        uint256 owed = club.interestOwed();
        vm.startPrank(owner_);
        club.payInterest(owed);
        club.depositCollateral(1e7);
        club.borrow(100e6);
        vm.stopPrank();
        _assertConservation(club);
    }

    function test_SequentialLiquidationsAfterFurtherDrops() public {
        _activate(club, BORROW);
        _setValue(3_200e6);
        vm.prank(liquidator);
        club.liquidate(type(uint256).max);
        // further 10% drop on remaining collateral: health ~108% (< 110%, but still > 105% so not bad debt)
        uint256 p2 = _price() * 90 / 100;
        oracle.setPrice(int256(p2));
        assertTrue(club.isLiquidatable());
        (uint256 mr, uint256 ms) = _model(club, type(uint256).max);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = club.liquidate(type(uint256).max);
        assertEq(r, mr);
        assertEq(s, ms);
        assertLt(s, club.collateral() + s, "partial, not all collateral");
        assertGt(club.collateral(), 0);
        assertGe(club.healthBps() + 1, 12_000);
        _assertConservation(club);

        // a further crash below 105% coverage becomes the bad-debt case: all collateral seized
        oracle.setPrice(int256(p2 * 80 / 100));
        (mr, ms) = _model(club, type(uint256).max);
        vm.prank(liquidator);
        (r, s) = club.liquidate(type(uint256).max);
        assertEq(r, mr);
        assertEq(s, ms);
        assertEq(club.collateral(), 0);
        _assertConservation(club);
    }

    // ───────────────────────────── fuzz ─────────────────────────────

    function testFuzz_LiquidationConservationAndBonusBound(
        uint8 safetySeed,
        uint256 priceSeed,
        uint256 repaySeed,
        bool accrueInterest
    ) public {
        uint256[6] memory safeties = [uint256(10_000), 10_500, 11_000, 12_000, 15_000, 20_000];
        uint256 safety = safeties[safetySeed % 6];
        BondedTontine c = _deploy(safety, "PL Fuzz");
        _activate(c, BORROW);
        if (accrueInterest) {
            vm.warp(block.timestamp + ROUND);
        }
        uint256 price = bound(priceSeed, 1e8, 60_000e8);
        oracle.setPrice(int256(price));
        uint256 requested = bound(repaySeed, 1, 10_000e6);

        (uint256 mr, uint256 ms) = _model(c, requested);
        (uint256 pr, uint256 ps) = c.previewLiquidation(requested);
        assertEq(pr, mr, "preview repaid == spec model");
        assertEq(ps, ms, "preview seized == spec model");
        uint256 maxR = c.maxLiquidatableDebt();
        assertEq(c.isLiquidatable(), maxR > 0);

        uint256 debt0 = c.totalDebt();
        uint256 col0 = c.collateral();
        uint256 int0 = c.interestOwed();

        if (pr == 0) {
            vm.prank(liquidator);
            vm.expectRevert(BondedTontine.NotLiquidatable.selector);
            c.liquidate(requested);
            return;
        }

        uint256 lu = usdc.balanceOf(liquidator);
        uint256 lc = cirBtc.balanceOf(liquidator);
        vm.prank(liquidator);
        (uint256 r, uint256 s) = c.liquidate(requested);

        assertEq(r, pr);
        assertEq(s, ps);
        assertLe(r, requested, "never takes more USDC than requested");
        assertLe(r, maxR, "capped");
        assertEq(lu - usdc.balanceOf(liquidator), r);
        assertEq(cirBtc.balanceOf(liquidator) - lc, s);
        assertEq(c.totalDebt(), debt0 - r);
        assertEq(c.collateral(), col0 - s);
        assertEq(c.interestOwed(), int0, "interest owed untouched");
        _assertConservation(c);

        // Liquidator never receives more than repaid * 1.05 in value (+2 micro-USDC rounding in bad debt).
        uint256 seizedValue = s * price / SCALE;
        assertLe(seizedValue, r * BONUS / 10_000 + 2, "bonus bound");
        if (s < col0) {
            assertLe(seizedValue, r * BONUS / 10_000, "partial seize never over-pays");
        }

        // Max, non-bad-debt, cap below totalDebt => health back to safety (+-1 bps).
        bool hitCap = requested >= maxR;
        bool badDebt = s == col0;
        uint256 d0 = debt0 + int0;
        bool capIsFormula = safety > BONUS && (safety * d0 - 10_000 * (col0 * price / SCALE) + (safety - BONUS) - 1) / (safety - BONUS) < debt0;
        if (hitCap && !badDebt && capIsFormula) {
            assertGe(c.healthBps() + 1, safety, "health restored");
        }
    }
}
