// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RotatingSavings} from "../RotatingSavings.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ReviewFollowupTest is Test {
    MockERC20 internal usdc;
    MockERC20 internal btc;
    RotatingSavings internal club;
    address internal alice = makeAddr("followup-alice");
    address internal bob = makeAddr("followup-bob");
    address internal carol = makeAddr("followup-carol");
    uint256 internal constant C = 10e6;

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        btc = new MockERC20("BTC", "BTC", 8);
        club = new RotatingSavings(address(usdc), C, 3, 1 days, "Follow-up", address(btc), 0);
        club.setCollateralAmount(100_000);
        address[3] memory actors = [alice, bob, carol];
        for (uint256 i; i < actors.length; i++) {
            usdc.mint(actors[i], 1000e6);
            btc.mint(actors[i], 1e8);
            vm.startPrank(actors[i]);
            usdc.approve(address(club), type(uint256).max);
            btc.approve(address(club), type(uint256).max);
            club.joinGroup();
            vm.stopPrank();
        }
        club.startRounds();
    }

    function _finishRound() internal {
        (, uint256 endTime,,,,) = club.getRoundSummary(club.currentRound());
        vm.warp(endTime + 1);
        club.settleRound(club.currentRound());
    }

    function _reachNoWinnerRound() internal {
        vm.prank(alice); club.contribute(1);
        vm.prank(bob); club.contribute(1);
        vm.prank(carol); club.contribute(1);
        _finishRound();
        assertTrue(club.hasWon(alice));
        vm.prank(alice); club.claimPayout();
        vm.prank(alice); club.contribute(2);
        _finishRound();
        (,, address winner,,,bool settled) = club.getRoundSummary(2);
        assertEq(winner, address(0)); assertTrue(settled);
    }

    function test_NoWinnerHistorySurvivesClaimAndLaterCycleCancellationWithoutRecredit() public {
        _reachNoWinnerRound();
        assertEq(club.getRoundContribution(2, alice), C);
        assertEq(club.getRoundBid(2, alice), 0);
        assertEq(club.claimable(alice), C);
        uint256 balance = usdc.balanceOf(alice);
        vm.prank(alice); club.claimPayout();
        assertEq(usdc.balanceOf(alice), balance + C);
        assertEq(club.claimable(alice), 0);
        assertEq(club.getRoundContribution(2, alice), C);
        vm.prank(alice); vm.expectRevert(RotatingSavings.NoPayout.selector); club.claimPayout();
        vm.expectRevert(RotatingSavings.GroupNotActive.selector); club.settleRound(2);
        club.startNewCycle();
        assertEq(club.currentRound(), 3);
        vm.expectRevert(RotatingSavings.RoundNotCurrent.selector); club.settleRound(2);
        // Task049: restart preserves the slash; explicit ACTIVE top-up precedes contribution.
        vm.prank(bob); club.depositCollateral(100_000);
        vm.prank(bob); club.contribute(3);
        vm.prank(alice); club.voteCancelGroup();
        vm.prank(bob); club.voteCancelGroup();
        assertEq(club.claimable(alice), 0, "settled refund must not be credited again");
        assertEq(club.claimable(bob), C);
        assertEq(club.getRoundContribution(2, alice), C, "historical settled data remains readable");
        assertEq(club.getRoundContribution(3, bob), 0, "active cancellation clears unprocessed mapping");
        vm.prank(bob); club.claimPayout();
        assertEq(usdc.balanceOf(address(club)), 0);
    }

    function test_StartNewCycleKeepsActualCollateralWithoutAutomaticDebitOrRestore() public {
        _reachNoWinnerRound();
        assertTrue(club.isKicked(bob)); assertTrue(club.isKicked(carol));
        assertEq(club.cirBtcCollateral(alice), 100_000);
        assertEq(club.cirBtcCollateral(bob), 0);
        assertEq(club.claimableCirBtc(alice), 200_000);
        address[3] memory actors = [alice, bob, carol];
        uint256[3] memory balances;
        uint256[3] memory allowances;
        for (uint256 i; i < actors.length; i++) {
            balances[i] = btc.balanceOf(actors[i]);
            allowances[i] = btc.allowance(actors[i], address(club));
        }
        uint256 vaultBalance = btc.balanceOf(address(club));
        uint256 previousUsdcClaim = club.claimable(alice);
        club.startNewCycle();
        for (uint256 i; i < actors.length; i++) {
            assertFalse(club.isKicked(actors[i])); assertFalse(club.hasWon(actors[i]));
            assertEq(btc.balanceOf(actors[i]), balances[i], "no auto-debit");
            assertEq(btc.allowance(actors[i], address(club)), allowances[i], "no implicit transferFrom");
        }
        assertEq(btc.balanceOf(address(club)), vaultBalance);
        assertEq(club.cirBtcCollateral(alice), 100_000, "retained collateral stays intact");
        assertEq(club.cirBtcCollateral(bob), 0, "slashed collateral is not restored");
        assertEq(club.claimableCirBtc(alice), 200_000);
        assertEq(club.claimable(alice), previousUsdcClaim);
    }
}
