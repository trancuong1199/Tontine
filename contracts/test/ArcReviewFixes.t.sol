// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RotatingSavings} from "../RotatingSavings.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @notice Independent behavioral coverage for task-044, spec-v1.
contract ArcReviewFixesTest is Test {
    MockERC20 internal usdc;
    MockERC20 internal btc;
    RotatingSavings internal club;
    address internal alice = makeAddr("review-alice");
    address internal bob = makeAddr("review-bob");
    address internal carol = makeAddr("review-carol");
    address internal outsider = makeAddr("review-outsider");
    uint256 internal constant C = 10e6;
    uint256 internal constant D = 1 days;

    function setUp() public {
        usdc = new MockERC20("Review USDC", "RUSD", 6);
        btc = new MockERC20("Review BTC", "RBTC", 8);
        club = new RotatingSavings(address(usdc), C, 3, D, "Review club", address(btc), 0);
        address[3] memory actors = [alice, bob, carol];
        for (uint256 i; i < actors.length; ++i) {
            usdc.mint(actors[i], 1000e6);
            btc.mint(actors[i], 1e8);
            vm.startPrank(actors[i]);
            usdc.approve(address(club), type(uint256).max);
            btc.approve(address(club), type(uint256).max);
            vm.stopPrank();
        }
    }

    function _join() internal {
        vm.prank(alice); club.joinGroup();
        vm.prank(bob); club.joinGroup();
        vm.prank(carol); club.joinGroup();
    }

    function _start() internal { _join(); club.startRounds(); }
    function _contribute(address actor, uint256 round) internal { vm.prank(actor); club.contribute(round); }
    function _vote(address actor) internal { vm.prank(actor); club.voteCancelGroup(); }
    function _pastDeadline() internal {
        (, uint256 endTime,,,,) = club.getRoundSummary(club.currentRound());
        vm.warp(endTime + 1);
    }

    function test_Cancel_OpenMajorityOwnerCannotUnilaterallyCancel() public {
        _join();
        club.cancelGroup();
        assertEq(club.cancelVoteCount(), 1);
        assertEq(uint256(club.state()), uint256(RotatingSavings.GroupState.OPEN));
        club.cancelGroup();
        assertEq(club.cancelVoteCount(), 1, "owner retry must not create another vote");
        _vote(alice);
        assertEq(uint256(club.state()), uint256(RotatingSavings.GroupState.CANCELLED));
    }

    function test_Cancel_VoterGuards() public {
        _start();
        vm.prank(outsider);
        vm.expectRevert(RotatingSavings.NotMember.selector);
        club.voteCancelGroup();
        _vote(alice);
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyVotedCancel.selector);
        club.voteCancelGroup();
        assertEq(club.cancelVoteCount(), 1);
    }

    function test_Cancel_ActiveRefundBidDeltaOnlyOnce() public {
        _start();
        _contribute(alice, 1);
        vm.prank(alice); club.placeBid(1, 2e6);
        vm.prank(alice); club.placeBid(1, 3e6);
        _contribute(bob, 1);
        assertEq(usdc.balanceOf(address(club)), 23e6);
        _vote(alice);
        assertEq(club.claimable(alice), 0);
        assertEq(uint256(club.state()), uint256(RotatingSavings.GroupState.ACTIVE));
        _vote(bob);
        assertEq(club.claimable(alice), 13e6);
        assertEq(club.claimable(bob), 10e6);
        assertEq(club.claimable(carol), 0);
        uint256 beforeAlice = usdc.balanceOf(alice);
        vm.prank(alice); club.claimPayout();
        assertEq(usdc.balanceOf(alice), beforeAlice + 13e6);
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NoPayout.selector);
        club.claimPayout();
        vm.prank(bob); club.claimPayout();
        assertEq(usdc.balanceOf(address(club)), 0);
    }

    function test_Cancel_ActiveOwnerFinalVoteRefunds() public {
        _start();
        _contribute(alice, 1);
        _vote(bob);
        club.cancelGroup();
        assertEq(uint256(club.state()), uint256(RotatingSavings.GroupState.CANCELLED));
        assertEq(club.claimable(alice), C);
    }

    function test_Cancel_PreservesPreviousPayoutAndCreditsCurrentRound() public {
        _start();
        _contribute(alice, 1); _contribute(bob, 1); _contribute(carol, 1);
        vm.prank(alice); club.placeBid(1, 1e6);
        club.settleRound(1);
        uint256 oldClaim = club.claimable(alice);
        assertEq(oldClaim, 31e6);
        _contribute(alice, 2); _contribute(bob, 2);
        vm.prank(bob); club.placeBid(2, 2e6);
        _vote(alice); _vote(bob);
        assertEq(club.claimable(alice), oldClaim + C);
        assertEq(club.claimable(bob), 12e6);
        assertEq(usdc.balanceOf(address(club)), club.claimable(alice) + club.claimable(bob));
        vm.prank(alice); club.claimPayout();
        vm.prank(bob); club.claimPayout();
        assertEq(usdc.balanceOf(address(club)), 0);
    }

    function test_Cancel_DoesNotReclaimAlreadyWithdrawnPayout() public {
        _start();
        _contribute(alice, 1); _contribute(bob, 1); _contribute(carol, 1);
        vm.prank(alice); club.placeBid(1, 1e6);
        club.settleRound(1);
        vm.prank(alice); club.claimPayout();
        uint256 alreadyPaidBalance = usdc.balanceOf(alice);
        _contribute(bob, 2);
        _vote(alice); _vote(bob);
        assertEq(usdc.balanceOf(alice), alreadyPaidBalance);
        assertEq(club.claimable(alice), 0);
        assertEq(club.claimable(bob), C);
    }

    function test_Cancel_TerminalStateGuardsPreventDuplicateRefund() public {
        _start(); _contribute(alice, 1); _vote(alice); _vote(bob);
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector); club.cancelGroup();
        vm.prank(carol); vm.expectRevert(RotatingSavings.GroupNotOpen.selector); club.voteCancelGroup();
        vm.prank(bob); vm.expectRevert(RotatingSavings.GroupNotActive.selector); club.contribute(1);
        vm.prank(alice); vm.expectRevert(RotatingSavings.GroupNotActive.selector); club.placeBid(1, 1e6);
        vm.expectRevert(RotatingSavings.GroupNotActive.selector); club.settleRound(1);
        assertEq(club.claimable(alice), C);
    }

    function test_Collateral_CustomConstructorTokenDepositAndClaim() public {
        assertEq(club.cirBtcToken(), address(btc));
        assertEq(address(club.cirBtc()), address(btc));
        club.setCollateralAmount(100_000);
        _start();
        assertEq(btc.balanceOf(address(club)), 300_000);
        // Task049: already fully funded members cannot overdeposit.
        vm.prank(alice); vm.expectRevert(RotatingSavings.InvalidConfiguration.selector); club.depositCollateral(200_000);
        _contribute(alice, 1);
        _vote(alice); _vote(bob);
        uint256 btcBefore = btc.balanceOf(alice);
        vm.prank(alice); club.claimCollateral();
        assertEq(btc.balanceOf(alice), btcBefore + 100_000);
        assertEq(club.cirBtcCollateral(alice), 0);
        assertEq(club.claimable(alice), C, "USDC liability is independent from BTC claim");
        vm.prank(alice); vm.expectRevert(RotatingSavings.NoPayout.selector); club.claimCollateral();
    }

    function test_Collateral_SecondConfiguredTokenIsUsed() public {
        MockERC20 tokenB = new MockERC20("Second BTC", "B", 8);
        RotatingSavings other = new RotatingSavings(address(usdc), C, 2, D, "B club", address(tokenB), 500_000);
        tokenB.mint(alice, 500_000);
        vm.startPrank(alice);
        tokenB.approve(address(other), 500_000); other.joinGroupWithCollateral(500_000);
        vm.stopPrank();
        other.cancelGroup();
        vm.prank(alice); other.claimCollateral();
        assertEq(tokenB.balanceOf(alice), 500_000);
        assertEq(tokenB.balanceOf(address(other)), 0);
        assertEq(other.cirBtcToken(), address(tokenB));
        assertEq(btc.balanceOf(address(other)), 0);
    }

    function test_Collateral_ZeroConstructorTokenRejected() public {
        vm.expectRevert(RotatingSavings.InvalidAddress.selector);
        new RotatingSavings(address(usdc), C, 2, D, "Invalid", address(0), 0);
    }

    function test_Cancel_EligibleCollateralRewardsRemainClaimable() public {
        club.setCollateralAmount(100_000);
        _start();
        _contribute(alice, 1); _contribute(bob, 1);
        _pastDeadline(); club.settleRound(1);
        assertTrue(club.isKicked(carol));
        assertEq(club.cirBtcCollateral(carol), 0);
        assertEq(club.claimableCirBtc(alice), 50_000);
        _vote(alice); _vote(bob);
        uint256 beforeBalance = btc.balanceOf(alice);
        vm.prank(alice); club.claimCollateral();
        assertEq(btc.balanceOf(alice), beforeBalance + 150_000);
        vm.prank(carol); vm.expectRevert(RotatingSavings.MemberWasKicked.selector); club.claimCollateral();
        assertEq(club.cirBtcCollateral(carol), 0);
    }

    function test_Time_ExactEndAcceptedThenExpiredErrors() public {
        _start();
        (, uint256 endTime,,,,) = club.getRoundSummary(1);
        vm.warp(endTime);
        _contribute(alice, 1);
        vm.prank(alice); club.placeBid(1, 1e6);
        vm.expectRevert(RotatingSavings.RoundStillOpen.selector); club.settleRound(1);
        vm.warp(endTime + 1);
        vm.prank(bob); vm.expectRevert(RotatingSavings.RoundEnded.selector); club.contribute(1);
        vm.prank(alice); vm.expectRevert(RotatingSavings.RoundEnded.selector); club.placeBid(1, 2e6);
        vm.prank(outsider); club.settleRound(1);
        assertEq(club.claimable(alice), 11e6);
    }

    function test_Cycle_ResetsOwnerNonmemberVoteAndKicksWithoutRestoringSlash() public {
        club.setCollateralAmount(100_000);
        _start();
        club.cancelGroup(); // owner's single vote must not cancel the cycle
        _pastDeadline(); club.settleRound(1); // no contributors: all kicked and collateral slashed
        assertEq(uint256(club.state()), uint256(RotatingSavings.GroupState.COMPLETED));
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector); club.cancelGroup();
        vm.expectEmit(true, true, false, true, address(club));
        emit RotatingSavings.NewCycleStarted(1, 2, block.timestamp + D);
        club.startNewCycle();
        assertEq(club.currentRound(), 2);
        assertEq(club.cancelVoteCount(), 0);
        assertFalse(club.hasVotedCancel(address(this)));
        assertFalse(club.isKicked(alice));
        assertFalse(club.hasWon(alice));
        assertEq(club.cirBtcCollateral(alice), 0);
        club.cancelGroup();
        assertEq(club.cancelVoteCount(), 1);
    }

    function testFuzz_CancelRefundConservesDeposits(uint96 first, uint96 extra) public {
        uint256 bid = bound(uint256(first), 1, 100e6);
        uint256 increase = bound(uint256(extra), 1, 100e6);
        _start(); _contribute(alice, 1); _contribute(bob, 1);
        vm.prank(alice); club.placeBid(1, bid);
        vm.prank(alice); club.placeBid(1, bid + increase);
        _vote(alice); _vote(bob);
        assertEq(club.claimable(alice), C + bid + increase);
        assertEq(club.claimable(bob), C);
        assertEq(usdc.balanceOf(address(club)), 2 * C + bid + increase);
    }
}
