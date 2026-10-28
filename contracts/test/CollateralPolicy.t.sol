// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {Test} from "forge-std/Test.sol";
import {RotatingSavings} from "../RotatingSavings.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// Fault injection only for defensive checks whose preconditions normal join prevents.
contract PolicyHarness is RotatingSavings {
    constructor(address u, address b, uint256 r) RotatingSavings(u, 10e6, 3, 1 days, "Policy", b, r) {}
    function memberCount() external view returns(uint256) { return members.length; }
    function seedLocked(address who, uint256 value) external { cirBtcCollateral[who] = value; }
    function seedReward(address who, uint256 value) external { claimableCirBtc[who] = value; }
}
contract PolicyToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public fail;
    bool public attack;
    bool public reentered;
    RotatingSavings public target;
    function mint(address a,uint256 n) external { balanceOf[a]+=n; }
    function approve(address s,uint256 n) external returns(bool) { allowance[msg.sender][s]=n;return true; }
    function configure(bool f,bool a,RotatingSavings t) external {fail=f;attack=a;target=t;}
    function transfer(address to,uint256 n) external returns(bool) {require(balanceOf[msg.sender]>=n);balanceOf[msg.sender]-=n;balanceOf[to]+=n;return true;}
    function transferFrom(address from,address to,uint256 n) external returns(bool) {
        require(!fail,"token rejected transfer");
        if(attack){(bool ok,)=address(target).call(abi.encodeCall(target.joinGroup,()));reentered=ok;}
        require(balanceOf[from]>=n,"balance");require(allowance[from][msg.sender]>=n,"allowance");
        allowance[from][msg.sender]-=n;balanceOf[from]-=n;balanceOf[to]+=n;return true;
    }
}
contract CollateralPolicyTest is Test {
    MockERC20 internal usdc;
    PolicyToken internal btc;
    PolicyHarness internal club;
    address internal alice=makeAddr("policy-alice");
    address internal bob=makeAddr("policy-bob");
    address internal carol=makeAddr("policy-carol");
    uint256 internal constant R=100000;
    function setUp() public {
        usdc=new MockERC20("USDC","USDC",6);btc=new PolicyToken();club=new PolicyHarness(address(usdc),address(btc),R);
        address[3] memory actors=[alice,bob,carol];
        for(uint256 i;i<3;i++){btc.mint(actors[i],10*R);usdc.mint(actors[i],1000e6);vm.startPrank(actors[i]);btc.approve(address(club),type(uint256).max);usdc.approve(address(club),type(uint256).max);vm.stopPrank();}
    }
    function _join(address a) internal {vm.prank(a);club.joinGroupWithCollateral(R);}
    function _start() internal {_join(alice);_join(bob);club.startRounds();}
    function _expire() internal {(,uint256 end,,,,)=club.getRoundSummary(club.currentRound());vm.warp(end+1);club.settleRound(club.currentRound());}
    function _assertNotJoined(address a,uint256 wallet) internal view {assertFalse(club.isMember(a));assertEq(club.memberCount(),0);assertEq(club.cirBtcCollateral(a),0);assertEq(btc.balanceOf(a),wallet);assertEq(btc.balanceOf(address(club)),0);}

    function test_ConstructorMarkerAndSetterRestrictions() public {
        assertEq(club.collateralPolicyVersion(),1);assertEq(club.cirBtcCollateralAmount(),R);
        vm.prank(alice);vm.expectRevert(RotatingSavings.NotOwner.selector);club.setCollateralAmount(0);
        club.setCollateralAmount(0);assertEq(club.cirBtcCollateralAmount(),0);club.setCollateralAmount(R);
        _join(alice);vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);club.setCollateralAmount(R+1);
    }
    function test_JoinBothEntrypointsPullExactRequirementAndRepeatCannotDebit() public {
        vm.prank(alice);club.joinGroup();_join(bob);
        assertEq(btc.balanceOf(alice),9*R);assertEq(btc.balanceOf(bob),9*R);assertEq(btc.balanceOf(address(club)),2*R);
        assertEq(club.cirBtcCollateral(alice),R);assertEq(club.memberCount(),2);
        vm.prank(alice);vm.expectRevert(RotatingSavings.AlreadyMember.selector);club.joinGroupWithCollateral(R);assertEq(btc.balanceOf(alice),9*R);
    }
    function test_BoundedJoinRejectsOwnerRequirementChangeEvenWithUnlimitedAllowance() public {
        for(uint256 i;i<2;i++){club.setCollateralAmount(i==0?2*R:R/2);vm.prank(alice);vm.expectRevert(RotatingSavings.CollateralQuoteChanged.selector);club.joinGroupWithCollateral(R);_assertNotJoined(alice,10*R);}
        club.setCollateralAmount(2*R);vm.prank(alice);club.joinGroupWithCollateral(2*R);assertEq(btc.balanceOf(alice),8*R);
    }
    function test_JoinInsufficientAllowanceRollsBackMembershipAndAccounting() public {
        vm.prank(alice);btc.approve(address(club),R-1);vm.prank(alice);vm.expectRevert();club.joinGroupWithCollateral(R);_assertNotJoined(alice,10*R);assertEq(btc.allowance(alice,address(club)),R-1);
        vm.prank(alice);btc.approve(address(club),R);_join(alice);assertEq(btc.allowance(alice,address(club)),0);
    }
    function test_JoinInsufficientBalanceRollsBackBothEntrypoints() public {
        address poor=makeAddr("poor");btc.mint(poor,R-1);vm.prank(poor);btc.approve(address(club),type(uint256).max);
        vm.prank(poor);vm.expectRevert();club.joinGroup();_assertNotJoined(poor,R-1);
        vm.prank(poor);vm.expectRevert();club.joinGroupWithCollateral(R);_assertNotJoined(poor,R-1);
    }
    function test_TransferFailureAndJoinReentrancyAreGuarded() public {
        btc.configure(true,false,club);vm.prank(alice);vm.expectRevert();club.joinGroupWithCollateral(R);_assertNotJoined(alice,10*R);
        btc.configure(false,true,club);_join(alice);assertFalse(btc.reentered());assertFalse(club.isMember(address(btc)));assertEq(club.memberCount(),1);assertEq(club.cirBtcCollateral(alice),R);
    }
    function test_ExplicitNoneRequiresNoApprovalOrTokenCall() public {
        club.setCollateralAmount(0);btc.configure(true,false,club);vm.prank(alice);btc.approve(address(club),0);
        vm.prank(alice);club.joinGroupWithCollateral(0);vm.prank(bob);club.joinGroup();club.startRounds();
        vm.prank(alice);club.contribute(1);vm.prank(alice);club.placeBid(1,1e6);
        assertEq(btc.balanceOf(address(club)),0);assertEq(btc.balanceOf(alice),10*R);
        vm.prank(alice);vm.expectRevert(RotatingSavings.CollateralNotRequired.selector);club.depositCollateral(1);
    }
    function test_PrelockedJoinCollectsOnlyShortfallAndFullyLockedCollectsNothing() public {
        club.seedLocked(alice,40000);btc.mint(address(club),40000);_join(alice);assertEq(btc.balanceOf(alice),940000);assertEq(club.cirBtcCollateral(alice),R);
        club.seedLocked(bob,R);btc.mint(address(club),R);btc.configure(true,false,club);_join(bob);assertEq(btc.balanceOf(bob),10*R);assertEq(club.cirBtcCollateral(bob),R);
    }
    function test_StartRoundsChecksEveryMemberDefensively() public {
        _join(alice);_join(bob);club.seedLocked(bob,R-1);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.startRounds();assertEq(uint256(club.state()),0);assertEq(club.currentRound(),0);
        club.seedLocked(bob,R);club.startRounds();assertEq(uint256(club.state()),1);
    }
    function test_DepositZeroOverRemainingAndNotMemberNeverChangeBalances() public {
        _join(alice);club.seedLocked(alice,40000);uint256 balance=btc.balanceOf(alice);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);club.depositCollateral(0);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);club.depositCollateral(60001);
        vm.prank(bob);vm.expectRevert(RotatingSavings.NotMember.selector);club.depositCollateral(1);
        assertEq(club.cirBtcCollateral(alice),40000);assertEq(btc.balanceOf(alice),balance);
        vm.prank(alice);club.depositCollateral(60000);assertEq(club.cirBtcCollateral(alice),R);assertEq(btc.balanceOf(alice),balance-60000);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InvalidConfiguration.selector);club.depositCollateral(1);
    }
    function test_SlashedRestartRequiresExplicitActiveTopupBeforeContributeAndBid() public {
        _start();_expire();assertEq(uint256(club.state()),2);assertTrue(club.isKicked(alice));assertEq(club.cirBtcCollateral(alice),0);
        uint256 balance=btc.balanceOf(alice);uint256 allowance=btc.allowance(alice,address(club));
        vm.prank(alice);vm.expectRevert(RotatingSavings.GroupNotOpen.selector);club.depositCollateral(R);
        vm.prank(alice);vm.expectRevert(RotatingSavings.MemberWasKicked.selector);club.claimCollateral();
        club.startNewCycle();assertEq(btc.balanceOf(alice),balance);assertEq(btc.allowance(alice,address(club)),allowance);assertEq(club.cirBtcCollateral(alice),0);
        uint256 round=club.currentRound();uint256 usd=usdc.balanceOf(alice);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.contribute(round);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.placeBid(round,1e6);
        assertEq(usdc.balanceOf(alice),usd);assertEq(club.getRoundContribution(round,alice),0);assertEq(club.getRoundBid(round,alice),0);
        vm.prank(alice);club.depositCollateral(40000);vm.prank(alice);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.contribute(round);
        vm.prank(alice);club.depositCollateral(60000);vm.prank(alice);club.contribute(round);vm.prank(alice);club.placeBid(round,1e6);assertEq(club.getRoundContribution(round,alice),10e6);assertEq(club.getRoundBid(round,alice),1e6);
    }
    function test_ClaimedCollateralIsNotAutomaticallyRestoredAtRestart() public {
        _start();for(uint256 round=1;round<=2;round++){vm.prank(alice);club.contribute(round);vm.prank(bob);club.contribute(round);_expire();}
        vm.prank(alice);club.claimCollateral();assertEq(club.cirBtcCollateral(alice),0);uint256 balance=btc.balanceOf(alice);club.startNewCycle();assertEq(btc.balanceOf(alice),balance);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.contribute(3);
        vm.prank(alice);club.depositCollateral(R);vm.prank(alice);club.contribute(3);assertEq(club.cirBtcCollateral(alice),R);
    }
    function test_RewardsDoNotSubstituteForLockedCollateral() public {
        _start();club.seedLocked(alice,R-1);club.seedReward(alice,10*R);uint256 balance=usdc.balanceOf(alice);
        vm.prank(alice);vm.expectRevert(RotatingSavings.InsufficientCollateral.selector);club.contribute(1);assertEq(usdc.balanceOf(alice),balance);
        vm.prank(alice);club.depositCollateral(1);vm.prank(alice);club.contribute(1);assertEq(club.claimableCirBtc(alice),10*R);
    }
    function test_DepositTransferFailureRollsBackAndKickedCannotTopup() public {
        _start();club.seedLocked(alice,0);btc.configure(true,false,club);vm.prank(alice);vm.expectRevert();club.depositCollateral(R);assertEq(club.cirBtcCollateral(alice),0);
        btc.configure(false,false,club);(,uint256 end,,,,)=club.getRoundSummary(1);vm.warp(end+1);club.kickDefaulter(1,alice);
        vm.prank(alice);vm.expectRevert(RotatingSavings.MemberWasKicked.selector);club.depositCollateral(R);
    }
    function testFuzz_DepositAtMostShortfallConservesLockedAndWallet(uint96 held,uint96 amount) public {
        _join(alice);uint256 locked=bound(uint256(held),0,R-1);uint256 deposit=bound(uint256(amount),1,R-locked);club.seedLocked(alice,locked);uint256 balance=btc.balanceOf(alice);uint256 vault=btc.balanceOf(address(club));
        vm.prank(alice);club.depositCollateral(deposit);assertEq(club.cirBtcCollateral(alice),locked+deposit);assertLe(club.cirBtcCollateral(alice),R);assertEq(btc.balanceOf(alice),balance-deposit);assertEq(btc.balanceOf(address(club)),vault+deposit);
    }
}
