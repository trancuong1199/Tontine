// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RotatingSavings} from "../RotatingSavings.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Invariant handler – exposes bounded actions for the fuzzer to drive.
// Ghost variable tracks sum of all claimable[] balances so the invariant
// contract can assert: contract USDC balance >= ghostClaimable.
// ─────────────────────────────────────────────────────────────────────────────
contract SavingsHandler is Test {
    RotatingSavings public savings;
    MockERC20       public usdc;

    address[] public actors;
    uint256   public ghostClaimable;      // running sum of claimable[] credits
    uint256   public ghostUsdcIn;         // total USDC transferred into contract

    uint256 internal constant CONTRIBUTION = 10e6; // 10 USDC
    uint256 internal constant ROUND_DURATION = 1 days;

    constructor(RotatingSavings _savings, MockERC20 _usdc, address[] memory _actors) {
        savings  = _savings;
        usdc     = _usdc;
        actors   = _actors;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _seed(address actor, uint256 extra) internal {
        uint256 need = CONTRIBUTION + extra;
        uint256 have = usdc.balanceOf(actor);
        if (have < need) {
            uint256 top = need - have;
            usdc.mint(actor, top);
        }
        vm.prank(actor);
        usdc.approve(address(savings), type(uint256).max);
    }

    // ── handler actions ──────────────────────────────────────────────────────

    /// Contribute for the current round from a random actor index.
    function contribute(uint256 actorSeed) external {
        uint256 round = savings.currentRound();
        if (round == 0) return; // not started
        if (savings.state() != RotatingSavings.GroupState.ACTIVE) return;

        address actor = actors[actorSeed % actors.length];
        if (!savings.isMember(actor)) return;
        if (savings.isKicked(actor)) return;
        if (savings.hasWon(actor)) return;
        if (savings.getRoundContribution(round, actor) == CONTRIBUTION) return; // already contributed

        (, uint256 endTime, , , , ) = savings.getRoundSummary(round);
        if (block.timestamp > endTime) return;

        _seed(actor, 0);

        vm.prank(actor);
        savings.contribute(round);

        ghostUsdcIn += CONTRIBUTION;
    }

    /// Place a bid from a random actor.
    function placeBid(uint256 actorSeed, uint256 bidAmount) external {
        uint256 round = savings.currentRound();
        if (round == 0) return;
        if (savings.state() != RotatingSavings.GroupState.ACTIVE) return;

        address actor = actors[actorSeed % actors.length];
        if (!savings.isMember(actor)) return;
        if (savings.isKicked(actor)) return;
        if (savings.hasWon(actor)) return;
        if (savings.getRoundContribution(round, actor) != CONTRIBUTION) return; // must have contributed

        (, uint256 endTime, , , , ) = savings.getRoundSummary(round);
        if (block.timestamp > endTime) return;

        uint256 existingBid = savings.getRoundBid(round, actor);
        bidAmount = bound(bidAmount, existingBid + 1, existingBid + 100e6);

        _seed(actor, bidAmount - existingBid);

        vm.prank(actor);
        savings.placeBid(round, bidAmount);

        ghostUsdcIn += (bidAmount - existingBid);
    }

    /// Settle after deadline.
    function settleRound(uint256 warpSeed) external {
        uint256 round = savings.currentRound();
        if (round == 0) return;
        if (savings.state() != RotatingSavings.GroupState.ACTIVE) return;

        (, uint256 endTime, , , , bool settled) = savings.getRoundSummary(round);
        if (settled) return;

        // Warp past end if needed
        if (block.timestamp <= endTime) {
            vm.warp(endTime + 1 + (warpSeed % 3600));
        }

        // record claimable before
        uint256 claimableBefore = _sumClaimable();
        savings.settleRound(round);

        // ghost: new claimable credits appeared
        uint256 claimableAfter = _sumClaimable();
        if (claimableAfter > claimableBefore) {
            ghostClaimable += (claimableAfter - claimableBefore);
        }
    }

    /// Claim payout for a random actor who has claimable balance.
    function claimPayout(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256 amount = savings.claimable(actor);
        if (amount == 0) return;

        vm.prank(actor);
        savings.claimPayout();

        ghostClaimable -= amount;
    }

    // ── ghost helpers ────────────────────────────────────────────────────────

    function _sumClaimable() internal view returns (uint256 total) {
        for (uint256 i = 0; i < actors.length; i++) {
            total += savings.claimable(actors[i]);
        }
    }

    function sumClaimable() external view returns (uint256) {
        return _sumClaimable();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────
contract RotatingSavingsTest is Test {
    // ── constants ─────────────────────────────────────────────────────────────
    uint256 internal constant CONTRIBUTION   = 10e6;   // 10 USDC (6 decimals)
    uint256 internal constant ROUND_DURATION = 1 days;
    uint256 internal constant MAX_MEMBERS    = 5;

    // ── state ─────────────────────────────────────────────────────────────────
    RotatingSavings internal savings;
    MockERC20        internal usdc;

    address internal owner  = makeAddr("owner");
    address internal alice  = makeAddr("alice");
    address internal bob    = makeAddr("bob");
    address internal carol  = makeAddr("carol");
    address internal dave   = makeAddr("dave");
    address internal eve    = makeAddr("eve");
    address internal nobody = makeAddr("nobody");   // never joins

    // ── setUp ─────────────────────────────────────────────────────────────────
    function setUp() public {
        // Deploy a real MockERC20 at some address, then etch it onto the
        // canonical Arc Testnet USDC address so the contract's immutable
        // `usdc` pointer resolves to a working token.
        //
        // NOTE: The contract takes usdcToken as a constructor arg, so we pass
        // our mock's address directly — no vm.etch needed here.
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        vm.prank(owner);
        savings = new RotatingSavings(
            address(usdc),
            CONTRIBUTION,
            MAX_MEMBERS,
            ROUND_DURATION,
            "Test Hui"
        );

        // Seed USDC for participants and give unlimited approval.
        address[5] memory participants = [alice, bob, carol, dave, eve];
        for (uint256 i = 0; i < participants.length; i++) {
            usdc.mint(participants[i], 1_000e6); // 1000 USDC each
            vm.prank(participants[i]);
            usdc.approve(address(savings), type(uint256).max);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// Join alice+bob+carol (3 members) — leaves room for more.
    function _joinThree() internal {
        vm.prank(alice); savings.joinGroup();
        vm.prank(bob);   savings.joinGroup();
        vm.prank(carol); savings.joinGroup();
    }

    /// Join all five members.
    function _joinFive() internal {
        vm.prank(alice); savings.joinGroup();
        vm.prank(bob);   savings.joinGroup();
        vm.prank(carol); savings.joinGroup();
        vm.prank(dave);  savings.joinGroup();
        vm.prank(eve);   savings.joinGroup();
    }

    /// Start rounds with three joined members.
    function _startWithThree() internal {
        _joinThree();
        vm.prank(owner);
        savings.startRounds();
    }

    /// Have alice, bob, carol all contribute to `roundId`.
    function _contributeAll3(uint256 roundId) internal {
        vm.prank(alice); savings.contribute(roundId);
        vm.prank(bob);   savings.contribute(roundId);
        vm.prank(carol); savings.contribute(roundId);
    }

    /// Warp past the current round's deadline.
    function _warpPastDeadline() internal {
        (, uint256 endTime, , , , ) = savings.getRoundSummary(savings.currentRound());
        vm.warp(endTime + 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. DEPLOYMENT & INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    function test_Constructor_SetsImmutableParams() public view {
        assertEq(address(savings.usdc()),          address(usdc));
        assertEq(savings.usdcToken(),              address(usdc));
        assertEq(savings.contributionAmount(),     CONTRIBUTION);
        assertEq(savings.maxMembers(),             MAX_MEMBERS);
        assertEq(savings.roundDuration(),          ROUND_DURATION);
        assertEq(savings.groupName(),              "Test Hui");
        assertEq(uint256(savings.state()),         uint256(RotatingSavings.GroupState.OPEN));
        assertEq(savings.currentRound(),           0);
        assertEq(savings.activeMembers(),          0);
        assertEq(savings.owner(),                  owner);
    }

    function test_Constructor_RevertsOnZeroUsdcAddress() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidAddress.selector);
        new RotatingSavings(address(0), CONTRIBUTION, MAX_MEMBERS, ROUND_DURATION, "x");
    }

    function test_Constructor_RevertsOnZeroContribution() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        new RotatingSavings(address(usdc), 0, MAX_MEMBERS, ROUND_DURATION, "x");
    }

    function test_Constructor_RevertsOnZeroRoundDuration() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        new RotatingSavings(address(usdc), CONTRIBUTION, MAX_MEMBERS, 0, "x");
    }

    function test_Constructor_RevertsWhenMaxMembersLessThan2() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        new RotatingSavings(address(usdc), CONTRIBUTION, 1, ROUND_DURATION, "x");
    }

    function test_Constructor_RevertsWhenMaxMembersExceeds20() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        new RotatingSavings(address(usdc), CONTRIBUTION, 21, ROUND_DURATION, "x");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. joinGroup
    // ═══════════════════════════════════════════════════════════════════════

    function test_JoinGroup_HappyPath() public {
        vm.expectEmit(true, false, false, true, address(savings));
        emit RotatingSavings.MemberJoined(alice, 0);
        vm.prank(alice);
        savings.joinGroup();

        assertTrue(savings.isMember(alice));
        assertEq(savings.members(0), alice);
    }

    function test_JoinGroup_MultipleMembers_IndexesCorrect() public {
        _joinThree();
        assertEq(savings.members(0), alice);
        assertEq(savings.members(1), bob);
        assertEq(savings.members(2), carol);
    }

    function test_JoinGroup_RevertsIfNotOpen() public {
        _startWithThree();
        vm.prank(dave);
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector);
        savings.joinGroup();
    }

    function test_JoinGroup_RevertsIfAlreadyMember() public {
        vm.prank(alice);
        savings.joinGroup();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyMember.selector);
        savings.joinGroup();
    }

    function test_JoinGroup_RevertsIfMaxMembersReached() public {
        _joinFive(); // fills all 5 slots

        // nobody is a 6th address that never joined
        vm.prank(nobody);
        vm.expectRevert(RotatingSavings.MaxMembersReached.selector);
        savings.joinGroup();
    }

    function test_JoinGroup_RevertsAfterCancelled() public {
        vm.prank(owner);
        savings.cancelGroup();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector);
        savings.joinGroup();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. startRounds
    // ═══════════════════════════════════════════════════════════════════════

    function test_StartRounds_HappyPath() public {
        _joinThree();

        uint256 expectedEnd = block.timestamp + ROUND_DURATION;
        vm.expectEmit(false, false, false, true, address(savings));
        emit RotatingSavings.RoundsStarted(3, expectedEnd);

        vm.prank(owner);
        savings.startRounds();

        assertEq(uint256(savings.state()),    uint256(RotatingSavings.GroupState.ACTIVE));
        assertEq(savings.currentRound(),      1);
        assertEq(savings.activeMembers(),     3);

        (, uint256 endTime, , , , ) = savings.getRoundSummary(1);
        assertEq(endTime, expectedEnd);
    }

    function test_StartRounds_RevertsIfNotOwner() public {
        _joinThree();
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NotOwner.selector);
        savings.startRounds();
    }

    function test_StartRounds_RevertsIfNotOpen() public {
        _startWithThree();
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector);
        savings.startRounds();
    }

    function test_StartRounds_RevertsIfLessThan2Members() public {
        vm.prank(alice);
        savings.joinGroup();

        vm.prank(owner);
        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        savings.startRounds();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. contribute
    // ═══════════════════════════════════════════════════════════════════════

    function test_Contribute_HappyPath() public {
        _startWithThree();

        uint256 contractBalBefore = usdc.balanceOf(address(savings));
        uint256 aliceBalBefore    = usdc.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(savings));
        emit RotatingSavings.Contributed(1, alice, CONTRIBUTION);

        vm.prank(alice);
        savings.contribute(1);

        assertEq(usdc.balanceOf(address(savings)), contractBalBefore + CONTRIBUTION);
        assertEq(usdc.balanceOf(alice),            aliceBalBefore    - CONTRIBUTION);
        assertEq(savings.getRoundContribution(1, alice), CONTRIBUTION);
    }

    function test_Contribute_RevertsIfNotActive() public {
        // State is OPEN, no startRounds called
        vm.prank(alice);
        savings.joinGroup();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.GroupNotActive.selector);
        savings.contribute(1);
    }

    function test_Contribute_RevertsIfWrongRound() public {
        _startWithThree();
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.RoundNotCurrent.selector);
        savings.contribute(2);
    }

    function test_Contribute_RevertsIfNotMember() public {
        _startWithThree();
        vm.prank(nobody);
        vm.expectRevert(RotatingSavings.NotMember.selector);
        savings.contribute(1);
    }

    function test_Contribute_RevertsIfAlreadyContributed() public {
        _startWithThree();
        vm.prank(alice);
        savings.contribute(1);

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyContributed.selector);
        savings.contribute(1);
    }

    function test_Contribute_RevertsAfterDeadline() public {
        _startWithThree();
        _warpPastDeadline();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.RoundStillOpen.selector);
        savings.contribute(1);
    }

    function test_Contribute_RevertsIfKicked() public {
        _startWithThree();
        // alice doesn't contribute within the deadline → she gets kicked at settle
        // bob and carol DO contribute so the round can settle with some contributions
        vm.prank(bob);   savings.contribute(1);
        vm.prank(carol); savings.contribute(1);
        _warpPastDeadline();
        savings.settleRound(1); // alice is auto-kicked, bob wins (earliest index after alice kicked)

        assertTrue(savings.isKicked(alice));
        assertEq(savings.currentRound(), 2);

        // alice now tries to contribute to round 2 — should revert with NotMember (kicked)
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NotMember.selector);
        savings.contribute(2);
    }

    function test_Contribute_RevertsIfAlreadyWon() public {
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1);
        // alice won (join order tie-break, no bids)
        assertTrue(savings.hasWon(alice));

        // round 2: alice tries to contribute
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyWon.selector);
        savings.contribute(2);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. placeBid
    // ═══════════════════════════════════════════════════════════════════════

    function test_PlaceBid_HappyPath() public {
        _startWithThree();
        vm.prank(bob);
        savings.contribute(1);

        uint256 bobBalBefore = usdc.balanceOf(bob);

        vm.expectEmit(true, true, false, true, address(savings));
        emit RotatingSavings.BidPlaced(1, bob, 5e6);

        vm.prank(bob);
        savings.placeBid(1, 5e6);

        assertEq(savings.getRoundBid(1, bob),      5e6);
        assertEq(usdc.balanceOf(bob),              bobBalBefore - 5e6);
        assertEq(usdc.balanceOf(address(savings)), CONTRIBUTION + 5e6);
    }

    function test_PlaceBid_CanIncreaseBid() public {
        _startWithThree();
        vm.prank(bob); savings.contribute(1);

        vm.prank(bob); savings.placeBid(1, 5e6);
        uint256 bobBalAfterFirst = usdc.balanceOf(bob);

        // Increase to 8e6: only 3e6 delta is taken
        vm.prank(bob); savings.placeBid(1, 8e6);
        assertEq(savings.getRoundBid(1, bob), 8e6);
        assertEq(usdc.balanceOf(bob), bobBalAfterFirst - 3e6);
    }

    function test_PlaceBid_RevertsIfNotContributed() public {
        _startWithThree();
        // alice hasn't contributed
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyContributed.selector);
        savings.placeBid(1, 5e6);
    }

    function test_PlaceBid_RevertsIfZeroBid() public {
        _startWithThree();
        vm.prank(alice); savings.contribute(1);

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.InsufficientBid.selector);
        savings.placeBid(1, 0);
    }

    function test_PlaceBid_RevertsIfBidNotHigherThanCurrent() public {
        _startWithThree();
        vm.prank(alice); savings.contribute(1);
        vm.prank(alice); savings.placeBid(1, 5e6);

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.InsufficientBid.selector);
        savings.placeBid(1, 5e6); // same bid, not strictly higher
    }

    function test_PlaceBid_RevertsAfterDeadline() public {
        _startWithThree();
        vm.prank(alice); savings.contribute(1);
        _warpPastDeadline();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.RoundStillOpen.selector);
        savings.placeBid(1, 5e6);
    }

    function test_PlaceBid_RevertsIfNotMember() public {
        _startWithThree();
        vm.prank(nobody);
        vm.expectRevert(RotatingSavings.NotMember.selector);
        savings.placeBid(1, 5e6);
    }

    function test_PlaceBid_RevertsIfGroupNotActive() public {
        _joinThree();
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.GroupNotActive.selector);
        savings.placeBid(1, 5e6);
    }

    function test_PlaceBid_RevertsIfAlreadyWon() public {
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1);
        // alice won round 1

        // round 2
        vm.prank(bob);   savings.contribute(2);
        // alice tries to bid in round 2
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.AlreadyWon.selector);
        savings.placeBid(2, 5e6);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. settleRound
    // ═══════════════════════════════════════════════════════════════════════

    function test_SettleRound_NoBids_WinnerIsEarliestMember() public {
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();

        vm.expectEmit(true, true, false, true, address(savings));
        emit RotatingSavings.RoundSettled(1, alice, 3 * CONTRIBUTION, 0);

        savings.settleRound(1);

        // alice should win (join index 0, no bids → tie broken by join order)
        assertTrue(savings.hasWon(alice));
        assertEq(savings.claimable(alice), 3 * CONTRIBUTION);
        // round advances
        assertEq(savings.currentRound(), 2);
    }

    function test_SettleRound_HighestBidderWins() public {
        _startWithThree();
        _contributeAll3(1);

        // carol bids highest
        vm.prank(carol); savings.placeBid(1, 8e6);
        // bob bids lower
        vm.prank(bob);   savings.placeBid(1, 4e6);

        _warpPastDeadline();
        savings.settleRound(1);

        // carol wins
        assertTrue(savings.hasWon(carol));

        // carol gets: totalPot + winnerBid(8e6) + remainder
        // distributableBonus = 4e6 (bob's bid), shared to alice+bob (non-winner contributors)
        // equalShare = 4e6/2 = 2e6 each
        uint256 expectedCarolPayout = 3 * CONTRIBUTION + 8e6 + 0; // no remainder
        assertEq(savings.claimable(carol), expectedCarolPayout);
        // alice and bob each get 2e6 bonus
        assertEq(savings.claimable(alice), 2e6);
        assertEq(savings.claimable(bob),   2e6);
    }

    function test_SettleRound_TieBidBrokenByJoinOrder() public {
        _startWithThree();
        _contributeAll3(1);

        // alice and bob bid the same
        vm.prank(alice); savings.placeBid(1, 5e6);
        vm.prank(bob);   savings.placeBid(1, 5e6);

        _warpPastDeadline();
        savings.settleRound(1);

        // alice joined first (index 0) → wins the tie
        assertTrue(savings.hasWon(alice));
    }

    function test_SettleRound_NonContributorsAutoKicked() public {
        _startWithThree();
        // only alice and carol contribute; bob doesn't
        vm.prank(alice); savings.contribute(1);
        vm.prank(carol); savings.contribute(1);
        _warpPastDeadline();

        vm.expectEmit(true, true, false, false, address(savings));
        emit RotatingSavings.MemberKicked(1, bob);

        savings.settleRound(1);

        assertTrue(savings.isKicked(bob));
        assertTrue(savings.wasKickedInRound(1, bob));
        assertEq(savings.activeMembers(), 1); // alice won, bob kicked → 3-1(won)-1(kicked) = 1
    }

    function test_SettleRound_EarlySettleWhenAllContributedAndBidExists() public {
        _startWithThree();
        _contributeAll3(1);
        // alice places a bid → early settle is possible
        vm.prank(alice); savings.placeBid(1, 3e6);

        // still within deadline
        (, uint256 endTime, , , , ) = savings.getRoundSummary(1);
        assertLt(block.timestamp, endTime);

        // anyone can call settleRound early
        savings.settleRound(1);

        (, , , , , bool settled) = savings.getRoundSummary(1);
        assertTrue(settled);
    }

    function test_SettleRound_RevertsBeforeDeadlineWithNoBid() public {
        _startWithThree();
        _contributeAll3(1);
        // no bids and deadline not reached → cannot early-settle
        vm.expectRevert(RotatingSavings.RoundStillOpen.selector);
        savings.settleRound(1);
    }

    function test_SettleRound_RevertsIfAlreadySettled() public {
        // Use a 2-member group so round 1 settlement keeps currentRound == 1
        // after alice wins (bob still active, but if we settle with both contributing
        // then currentRound advances to 2 — so instead we settle round 1 with nobody
        // contributing so group COMPLETES on round 1, keeping currentRound == 1).
        // Then a second settleRound(1) call hits the `round.settled` check.
        vm.prank(owner);
        RotatingSavings s2 = new RotatingSavings(
            address(usdc), CONTRIBUTION, 2, ROUND_DURATION, "Double"
        );
        vm.prank(alice); s2.joinGroup();
        vm.prank(bob);   s2.joinGroup();
        vm.prank(owner); s2.startRounds();

        // nobody contributes → both kicked → COMPLETED → currentRound stays at 1
        (, uint256 end1, , , , ) = s2.getRoundSummary(1);
        vm.warp(end1 + 1);
        s2.settleRound(1);

        (, , , , , bool settled) = s2.getRoundSummary(1);
        assertTrue(settled);
        assertEq(uint256(s2.state()), uint256(RotatingSavings.GroupState.COMPLETED));

        // Calling again on the same round while group is COMPLETED → GroupNotActive
        vm.expectRevert(RotatingSavings.GroupNotActive.selector);
        s2.settleRound(1);
    }

    function test_SettleRound_RevertsIfNotActive() public {
        _joinThree();
        vm.expectRevert(RotatingSavings.GroupNotActive.selector);
        savings.settleRound(1);
    }

    function test_SettleRound_RevertsIfWrongRound() public {
        _startWithThree();
        _warpPastDeadline();
        vm.expectRevert(RotatingSavings.RoundNotCurrent.selector);
        savings.settleRound(2);
    }

    function test_SettleRound_AllKickedYieldsNoWinner() public {
        _startWithThree();
        // nobody contributes
        _warpPastDeadline();

        vm.expectEmit(true, true, false, true, address(savings));
        emit RotatingSavings.RoundSettled(1, address(0), 0, 0);

        savings.settleRound(1);

        assertEq(savings.activeMembers(), 0);
        assertEq(uint256(savings.state()), uint256(RotatingSavings.GroupState.COMPLETED));
    }

    function test_SettleRound_CompletesAfterAllRounds() public {
        // 2-member group → 2 rounds → complete
        vm.prank(owner);
        RotatingSavings twoMember = new RotatingSavings(
            address(usdc), CONTRIBUTION, 2, ROUND_DURATION, "Mini Hui"
        );
        vm.prank(alice); twoMember.joinGroup();
        vm.prank(bob);   twoMember.joinGroup();

        vm.prank(alice); usdc.approve(address(twoMember), type(uint256).max);
        vm.prank(bob);   usdc.approve(address(twoMember), type(uint256).max);

        vm.prank(owner); twoMember.startRounds();

        // Round 1: both contribute
        vm.prank(alice); twoMember.contribute(1);
        vm.prank(bob);   twoMember.contribute(1);
        (, uint256 end1, , , , ) = twoMember.getRoundSummary(1);
        vm.warp(end1 + 1);
        twoMember.settleRound(1); // alice wins (join order)

        assertEq(twoMember.currentRound(), 2);

        // Round 2: only bob can contribute (alice already won)
        vm.prank(bob); twoMember.contribute(2);
        (, uint256 end2, , , , ) = twoMember.getRoundSummary(2);
        vm.warp(end2 + 1);
        twoMember.settleRound(2); // bob wins

        assertEq(uint256(twoMember.state()), uint256(RotatingSavings.GroupState.COMPLETED));
        assertTrue(twoMember.hasWon(alice));
        assertTrue(twoMember.hasWon(bob));
    }

    function test_SettleRound_ActiveMembersDecrements() public {
        _startWithThree();
        assertEq(savings.activeMembers(), 3);

        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1); // alice wins

        assertEq(savings.activeMembers(), 2);
    }

    function test_SettleRound_BidBonusDistributedCorrectly() public {
        // 3 members: alice, bob, carol
        // carol wins with bid 9e6; alice+bob bid 3e6 each
        // distributableBonus = 3e6+3e6 = 6e6 shared among alice+bob = 3e6 each
        // carol payout = 3*CONTRIBUTION + 9e6 + 0
        _startWithThree();
        _contributeAll3(1);
        vm.prank(alice); savings.placeBid(1, 3e6);
        vm.prank(bob);   savings.placeBid(1, 3e6);
        vm.prank(carol); savings.placeBid(1, 9e6);
        _warpPastDeadline();
        savings.settleRound(1);

        assertEq(savings.claimable(carol), 3 * CONTRIBUTION + 9e6);
        assertEq(savings.claimable(alice), 3e6);
        assertEq(savings.claimable(bob),   3e6);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. kickDefaulter
    // ═══════════════════════════════════════════════════════════════════════

    function test_KickDefaulter_HappyPath() public {
        _startWithThree();
        // alice and carol contribute; bob doesn't
        vm.prank(alice); savings.contribute(1);
        vm.prank(carol); savings.contribute(1);
        _warpPastDeadline();

        uint256 activeBefore = savings.activeMembers();

        vm.expectEmit(true, true, false, false, address(savings));
        emit RotatingSavings.MemberKicked(1, bob);

        savings.kickDefaulter(1, bob);

        assertTrue(savings.isKicked(bob));
        assertTrue(savings.wasKickedInRound(1, bob));
        assertEq(savings.activeMembers(), activeBefore - 1);
    }

    function test_KickDefaulter_RevertsBeforeDeadline() public {
        _startWithThree();
        vm.expectRevert(RotatingSavings.RoundStillOpen.selector);
        savings.kickDefaulter(1, bob);
    }

    function test_KickDefaulter_RevertsIfNotMember() public {
        _startWithThree();
        _warpPastDeadline();
        vm.expectRevert(RotatingSavings.NotMember.selector);
        savings.kickDefaulter(1, nobody);
    }

    function test_KickDefaulter_RevertsIfAlreadyContributed() public {
        _startWithThree();
        vm.prank(bob); savings.contribute(1);
        _warpPastDeadline();

        vm.expectRevert(RotatingSavings.AlreadyContributed.selector);
        savings.kickDefaulter(1, bob);
    }

    function test_KickDefaulter_RevertsIfAlreadyKicked() public {
        _startWithThree();
        _warpPastDeadline();
        savings.kickDefaulter(1, bob);

        vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);
        savings.kickDefaulter(1, bob);
    }

    function test_KickDefaulter_RevertsIfGroupNotActive() public {
        _joinThree();
        vm.expectRevert(RotatingSavings.GroupNotActive.selector);
        savings.kickDefaulter(1, bob);
    }

    function test_KickDefaulter_RevertsIfWrongRound() public {
        _startWithThree();
        _warpPastDeadline();
        vm.expectRevert(RotatingSavings.RoundNotCurrent.selector);
        savings.kickDefaulter(2, bob);
    }

    function test_KickDefaulter_RevertsIfAlreadyWon() public {
        // alice wins round 1; then we try to kick alice in round 2
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1); // alice wins

        // warp past round 2 deadline
        (, uint256 end2, , , , ) = savings.getRoundSummary(2);
        vm.warp(end2 + 1);

        vm.expectRevert(RotatingSavings.AlreadyWon.selector);
        savings.kickDefaulter(2, alice);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. claimPayout
    // ═══════════════════════════════════════════════════════════════════════

    function test_ClaimPayout_HappyPath() public {
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1); // alice wins

        uint256 aliceClaim  = savings.claimable(alice);
        uint256 aliceBalBefore = usdc.balanceOf(alice);
        assertGt(aliceClaim, 0);

        vm.expectEmit(true, false, false, true, address(savings));
        emit RotatingSavings.PayoutClaimed(alice, aliceClaim);

        vm.prank(alice);
        savings.claimPayout();

        assertEq(savings.claimable(alice), 0);
        assertEq(usdc.balanceOf(alice), aliceBalBefore + aliceClaim);
    }

    function test_ClaimPayout_RevertsIfNoPayout() public {
        _startWithThree();
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NoPayout.selector);
        savings.claimPayout();
    }

    function test_ClaimPayout_RevertsIfNotMember() public {
        vm.prank(nobody);
        vm.expectRevert(RotatingSavings.NotMember.selector);
        savings.claimPayout();
    }

    function test_ClaimPayout_CanOnlyClaimOnce() public {
        _startWithThree();
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1);

        vm.prank(alice);
        savings.claimPayout();

        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NoPayout.selector);
        savings.claimPayout();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. cancelGroup
    // ═══════════════════════════════════════════════════════════════════════

    function test_CancelGroup_HappyPath() public {
        vm.expectEmit(false, false, false, false, address(savings));
        emit RotatingSavings.GroupCancelled();

        vm.prank(owner);
        savings.cancelGroup();

        assertEq(uint256(savings.state()), uint256(RotatingSavings.GroupState.CANCELLED));
    }

    function test_CancelGroup_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(RotatingSavings.NotOwner.selector);
        savings.cancelGroup();
    }

    function test_CancelGroup_RevertsIfNotOpen() public {
        _startWithThree();
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.GroupNotOpen.selector);
        savings.cancelGroup();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 10. renounceOwnership
    // ═══════════════════════════════════════════════════════════════════════

    function test_RenounceOwnership_AlwaysReverts() public {
        vm.prank(owner);
        vm.expectRevert(RotatingSavings.RenounceOwnershipDisabled.selector);
        savings.renounceOwnership();
    }

    function test_RenounceOwnership_RevertsForNonOwner() public {
        // Ownable reverts first (OwnableUnauthorizedAccount) for non-owners
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        savings.renounceOwnership();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 11. Ownable2Step transfer / acceptance
    // ═══════════════════════════════════════════════════════════════════════

    function test_TransferOwnership_TwoStep() public {
        vm.prank(owner);
        savings.transferOwnership(alice);
        // Pending, not yet transferred
        assertEq(savings.owner(), owner);

        vm.prank(alice);
        savings.acceptOwnership();
        assertEq(savings.owner(), alice);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 12. Multi-round complete run (end-to-end)
    // ═══════════════════════════════════════════════════════════════════════

    function test_FullRun_ThreeRoundsThreeWinners() public {
        _startWithThree();

        // Round 1: alice wins (no bids, earliest join)
        _contributeAll3(1);
        _warpPastDeadline();
        savings.settleRound(1);
        assertTrue(savings.hasWon(alice));
        assertEq(savings.currentRound(), 2);

        // Round 2: bob bids and wins
        vm.prank(bob);   savings.contribute(2);
        vm.prank(carol); savings.contribute(2);
        vm.prank(bob);   savings.placeBid(2, 5e6);
        (, uint256 end2, , , , ) = savings.getRoundSummary(2);
        vm.warp(end2 + 1);
        savings.settleRound(2);
        assertTrue(savings.hasWon(bob));
        assertEq(savings.currentRound(), 3);

        // Round 3: only carol left
        vm.prank(carol); savings.contribute(3);
        (, uint256 end3, , , , ) = savings.getRoundSummary(3);
        vm.warp(end3 + 1);
        savings.settleRound(3);
        assertTrue(savings.hasWon(carol));

        assertEq(uint256(savings.state()), uint256(RotatingSavings.GroupState.COMPLETED));

        // All three claim
        uint256 aliceClaim = savings.claimable(alice);
        uint256 bobClaim   = savings.claimable(bob);
        uint256 carolClaim = savings.claimable(carol);

        assertGt(aliceClaim, 0);
        assertGt(bobClaim,   0);
        assertGt(carolClaim, 0);

        vm.prank(alice); savings.claimPayout();
        vm.prank(bob);   savings.claimPayout();
        vm.prank(carol); savings.claimPayout();

        // Contract should be fully drained
        assertEq(usdc.balanceOf(address(savings)), 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 13. FUZZ — contribute round-trips
    // ═══════════════════════════════════════════════════════════════════════

    /// PROPERTY: for any valid `n` members (2–5), after all contribute the
    /// contract balance equals n * contributionAmount.
    function testFuzz_ContractBalanceAfterAllContribute(uint8 memberCount) public {
        memberCount = uint8(bound(memberCount, 2, 5));

        address[] memory members_ = new address[](memberCount);
        for (uint256 i = 0; i < memberCount; i++) {
            members_[i] = makeAddr(string(abi.encodePacked("fuzz_member_", i)));
            usdc.mint(members_[i], 1_000e6);
            vm.prank(members_[i]);
            usdc.approve(address(savings), type(uint256).max);
            vm.prank(members_[i]);
            savings.joinGroup();
        }

        vm.prank(owner);
        savings.startRounds();

        for (uint256 i = 0; i < memberCount; i++) {
            vm.prank(members_[i]);
            savings.contribute(1);
        }

        assertEq(usdc.balanceOf(address(savings)), uint256(memberCount) * CONTRIBUTION);
    }

    /// PROPERTY: winner claimable = totalPot + winnerBid + dust, which is
    /// always >= totalPot (no bid also satisfies this).
    function testFuzz_WinnerPayoutAtLeastTotalPot(uint96 winnerBidAmt, uint96 loserBidAmt) public {
        _startWithThree();
        _contributeAll3(1);

        // Bound bids
        uint256 wBid = bound(winnerBidAmt, 1e6, 50e6);
        uint256 lBid = bound(loserBidAmt, 0, wBid - 1); // loser bids less

        // Give extra USDC for bids
        usdc.mint(carol, 100e6);
        usdc.mint(alice, 100e6);

        vm.prank(carol); savings.placeBid(1, wBid);
        if (lBid > 0) {
            vm.prank(alice); savings.placeBid(1, lBid);
        }

        _warpPastDeadline();
        savings.settleRound(1);

        // carol wins
        assertTrue(savings.hasWon(carol));
        uint256 carolClaimable = savings.claimable(carol);
        assertGe(carolClaimable, 3 * CONTRIBUTION); // at minimum the pot
    }

    /// PROPERTY: bid increment is correctly charged — balance delta equals bidAmount - prevBid.
    function testFuzz_BidDeltaChargedCorrectly(uint96 firstBid, uint96 secondBid) public {
        _startWithThree();
        vm.prank(alice); savings.contribute(1);

        uint256 fBid = bound(firstBid,  1e6, 20e6);
        uint256 sBid = bound(secondBid, fBid + 1, fBid + 30e6);

        usdc.mint(alice, 100e6);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice); savings.placeBid(1, fBid);
        uint256 balAfterFirst = usdc.balanceOf(alice);
        assertEq(balBefore - balAfterFirst, fBid);

        vm.prank(alice); savings.placeBid(1, sBid);
        uint256 balAfterSecond = usdc.balanceOf(alice);
        assertEq(balAfterFirst - balAfterSecond, sBid - fBid);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 14. INVARIANT — contract USDC balance >= sum of all claimable[]
    // ═══════════════════════════════════════════════════════════════════════

    // (Invariant test is in a separate contract below — see RotatingSavingsInvariantTest)

} // end RotatingSavingsTest


// ─────────────────────────────────────────────────────────────────────────────
// Invariant test contract (separate so `targetContract` is isolated)
// ─────────────────────────────────────────────────────────────────────────────
contract RotatingSavingsInvariantTest is Test {
    uint256 internal constant CONTRIBUTION   = 10e6;
    uint256 internal constant ROUND_DURATION = 1 days;

    RotatingSavings internal savings;
    MockERC20        internal usdc;
    SavingsHandler   internal handler;

    address internal owner_ = makeAddr("inv_owner");

    address[] internal actors;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        vm.prank(owner_);
        savings = new RotatingSavings(
            address(usdc),
            CONTRIBUTION,
            3,               // 3 members
            ROUND_DURATION,
            "Invariant Hui"
        );

        // Create 3 actor addresses and join
        for (uint256 i = 0; i < 3; i++) {
            address a = makeAddr(string(abi.encodePacked("inv_actor_", i)));
            actors.push(a);
            usdc.mint(a, 10_000e6);
            vm.prank(a);
            usdc.approve(address(savings), type(uint256).max);
            vm.prank(a);
            savings.joinGroup();
        }

        // Start rounds
        vm.prank(owner_);
        savings.startRounds();

        handler = new SavingsHandler(savings, usdc, actors);
        // Approve handler's actor spending via handler's pranks (already approved above)

        targetContract(address(handler));
    }

    /// INVARIANT: the contract's USDC balance is always >= the sum of all claimable[] entries.
    function invariant_ContractBalanceCoversTotalClaimable() public view {
        uint256 contractBal   = usdc.balanceOf(address(savings));
        uint256 totalClaimable = handler.sumClaimable();
        assertGe(
            contractBal,
            totalClaimable,
            "CONTRACT UNDERFUNDED: balance < sum(claimable)"
        );
    }

    /// INVARIANT: activeMembers never exceeds the original member count.
    function invariant_ActiveMembersNeverExceedsTotal() public view {
        assertLe(savings.activeMembers(), 3, "activeMembers exceeded total member count");
    }

    /// INVARIANT: a member cannot both hasWon and isKicked.
    function invariant_WonAndKickedMutuallyExclusive() public view {
        for (uint256 i = 0; i < actors.length; i++) {
            assertFalse(
                savings.hasWon(actors[i]) && savings.isKicked(actors[i]),
                "Member both won and kicked - impossible state"
            );
        }
    }

    /// INVARIANT: currentRound never exceeds the total number of members.
    function invariant_CurrentRoundNeverExceedsMemberCount() public view {
        if (savings.currentRound() > 0) {
            assertLe(savings.currentRound(), 3, "currentRound exceeded member count");
        }
    }
}
