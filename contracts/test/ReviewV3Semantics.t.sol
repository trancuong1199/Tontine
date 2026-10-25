// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {RotatingSavings} from "../RotatingSavings.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ReviewV3SemanticsTest is Test {
    RotatingSavings internal club;
    MockERC20 internal usdc;
    MockERC20 internal btc;
    address internal alice = makeAddr("v3-alice");
    address internal bob = makeAddr("v3-bob");
    address internal carol = makeAddr("v3-carol");
    address internal outsider = makeAddr("v3-outsider");

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        btc = new MockERC20("BTC", "BTC", 8);
        club = new RotatingSavings(address(usdc), 10e6, 3, 1 days, "V3", address(btc));
        club.setCollateralAmount(100000);
        address[3] memory actors = [alice, bob, carol];
        for (uint256 i; i < actors.length; i++) {
            usdc.mint(actors[i], 1000e6); btc.mint(actors[i], 100000);
            vm.startPrank(actors[i]);
            usdc.approve(address(club), type(uint256).max); btc.approve(address(club), 100000);
            club.joinGroup(); vm.stopPrank();
        }
        club.startRounds();
    }

    function test_ManualKickIsPermissionlessAfterDeadlineWithoutAutomaticSlash() public {
        vm.prank(outsider); vm.expectRevert(RotatingSavings.RoundStillOpen.selector); club.kickDefaulter(1, carol);
        vm.prank(alice); club.contribute(1);
        (,uint256 deadline,,,,) = club.getRoundSummary(1); vm.warp(deadline + 1);
        vm.prank(outsider); vm.expectRevert(RotatingSavings.NotMember.selector); club.kickDefaulter(1, outsider);
        vm.prank(outsider); vm.expectRevert(RotatingSavings.AlreadyContributed.selector); club.kickDefaulter(1, alice);
        vm.prank(outsider); club.kickDefaulter(1, carol);
        assertTrue(club.isKicked(carol));
        assertEq(club.cirBtcCollateral(carol), 100000, "manual kick does not slash collateral");
        assertEq(club.totalSlashedCirBtc(), 0);
    }

    function test_PreviousWinnerCannotBidOrBeManuallyKickedAndDoesNotReceiveNewBonus() public {
        address[3] memory actors = [alice, bob, carol];
        for(uint256 i; i < actors.length; i++) { vm.prank(actors[i]); club.contribute(1); }
        vm.prank(alice); club.placeBid(1, 3e6);
        vm.prank(bob); club.placeBid(1, 2e6);
        vm.prank(carol); club.placeBid(1, 1e6);
        vm.prank(outsider); club.settleRound(1);
        uint256 aliceBefore = club.claimable(alice);
        uint256 carolBefore = club.claimable(carol);
        assertEq(aliceBefore, 33e6);
        for(uint256 i; i < actors.length; i++) { vm.prank(actors[i]); club.contribute(2); }
        vm.prank(alice); vm.expectRevert(RotatingSavings.AlreadyWon.selector); club.placeBid(2, 1e6);
        vm.prank(outsider); vm.expectRevert(RotatingSavings.AlreadyWon.selector); club.kickDefaulter(2, alice);
        vm.prank(bob); club.placeBid(2, 3e6);
        vm.prank(carol); club.placeBid(2, 2e6);
        vm.prank(outsider); club.settleRound(2);
        assertEq(club.claimable(alice), aliceBefore, "prior winner receives no new loser bonus");
        assertEq(club.claimable(carol), carolBefore + 2e6);
    }
}
