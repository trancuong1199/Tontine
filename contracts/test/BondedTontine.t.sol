// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BondedTontine} from "../BondedTontine.sol";
import {BondedTontineFactory} from "../BondedTontineFactory.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";

/// @dev Blocklistable ERC-20 mock for testing S8 (Blocklist isolation) and decimals validation.
contract BlocklistableMockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isBlocked;

    error AddressBlocked(address account);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function setBlocked(address account, bool blocked) external {
        isBlocked[account] = blocked;
    }

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (isBlocked[msg.sender] || isBlocked[to]) {
            revert AddressBlocked(isBlocked[msg.sender] ? msg.sender : to);
        }
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (isBlocked[from] || isBlocked[to]) {
            revert AddressBlocked(isBlocked[from] ? from : to);
        }
        require(balanceOf[from] >= amount, "ERC20: insufficient");
        require(allowance[from][msg.sender] >= amount, "ERC20: allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/// @dev Invariant handler for BondedTontine (Section 20.2 & P3).
contract BondedTontineHandler is Test {
    BondedTontine public club;
    BlocklistableMockERC20 public usdc;
    BlocklistableMockERC20 public cirBtc;
    MockAggregatorV3 public oracle;
    address public owner;
    address[] public members;
    BondedTontine.State public lastObservedState;

    constructor(
        BondedTontine _club,
        BlocklistableMockERC20 _usdc,
        BlocklistableMockERC20 _cirBtc,
        MockAggregatorV3 _oracle,
        address _owner,
        address[] memory _members
    ) {
        club = _club;
        usdc = _usdc;
        cirBtc = _cirBtc;
        oracle = _oracle;
        owner = _owner;
        members = _members;
        lastObservedState = _club.state();
    }

    function _checkStateMonotonic() internal {
        BondedTontine.State cur = club.state();
        if (
            lastObservedState == BondedTontine.State.COMPLETED ||
            lastObservedState == BondedTontine.State.DEFAULTED ||
            lastObservedState == BondedTontine.State.CANCELLED
        ) {
            assertEq(uint256(cur), uint256(lastObservedState), "Terminal state must never change");
        }
        if (lastObservedState == BondedTontine.State.ACTIVE) {
            assertTrue(cur != BondedTontine.State.OPEN && cur != BondedTontine.State.CANCELLED);
        }
        lastObservedState = cur;
    }

    function contribute(uint256 memberSeed) external {
        if (club.state() != BondedTontine.State.ACTIVE) return;
        address m = members[memberSeed % members.length];
        if (!club.isMember(m)) return;
        uint256 amt = club.contributionAmount();
        usdc.mint(m, amt);
        vm.startPrank(m);
        usdc.approve(address(club), amt);
        try club.contribute() {} catch {}
        vm.stopPrank();
        _checkStateMonotonic();
    }

    function borrow(uint256 amount) external {
        if (club.state() != BondedTontine.State.ACTIVE) return;
        amount = bound(amount, 1, 10_000e6);
        vm.prank(owner);
        try club.borrow(amount) {} catch {}
        _checkStateMonotonic();
    }

    function repay(uint256 amount) external {
        if (club.state() != BondedTontine.State.ACTIVE) return;
        uint256 debt = club.totalDebt();
        if (debt == 0) return;
        amount = bound(amount, 1, debt);
        usdc.mint(owner, amount);
        vm.startPrank(owner);
        usdc.approve(address(club), amount);
        try club.repay(amount) {} catch {}
        vm.stopPrank();
        _checkStateMonotonic();
    }

    function payInterest(uint256 amount) external {
        if (club.state() != BondedTontine.State.ACTIVE) return;
        uint256 due = club.interestOwed();
        if (due == 0) return;
        amount = bound(amount, 1, due);
        usdc.mint(owner, amount);
        vm.startPrank(owner);
        usdc.approve(address(club), amount);
        try club.payInterest(amount) {} catch {}
        vm.stopPrank();
        _checkStateMonotonic();
    }

    function claimInterest(uint256 memberSeed) external {
        address m = members[memberSeed % members.length];
        vm.prank(m);
        try club.claimInterest() {} catch {}
        _checkStateMonotonic();
    }

    function warpTime(uint256 delta) external {
        delta = bound(delta, 60, 2 days);
        vm.warp(vm.getBlockTimestamp() + delta);
        (, int256 currentAnswer, , , ) = oracle.latestRoundData();
        oracle.setPrice(currentAnswer);
        _checkStateMonotonic();
    }
}

contract BondedTontineTest is Test {
    BlocklistableMockERC20 public usdc;
    BlocklistableMockERC20 public cirBtc;
    MockAggregatorV3 public oracle;
    BondedTontineFactory public factory;
    BondedTontine public club;

    address public clubOwner = address(0xA11CE);
    address public member1 = address(0xB0B1);
    address public member2 = address(0xB0B2);
    address public member3 = address(0xB0B3);
    address public member4 = address(0xB0B4);
    address public keeper = address(0xCAFE);

    uint256 public constant CONTRIBUTION = 50e6; // 50 USDC
    uint256 public constant MAX_MEMBERS = 4;
    uint256 public constant ROUND_DURATION = 1 days; // 86400
    uint256 public constant RATE_BPS = 200; // 2% per round
    uint256 public constant SAFETY_BPS = 20_000; // 200%
    uint256 public constant LIQUIDATION_BPS = 12_000; // 120%
    uint256 public constant INTEREST_GRACE = 1 days;
    uint256 public constant SETTLEMENT_GRACE = 2 days;
    uint256 public constant MAX_PRICE_AGE = 3600;
    int256 public constant INITIAL_BTC_PRICE = 60_000e8; // $60,000 with 8 decimals

    BondedTontineHandler public handler;

    function setUp() public {
        vm.warp(1_700_000_000);

        usdc = new BlocklistableMockERC20("USD Coin", "USDC", 6);
        cirBtc = new BlocklistableMockERC20("Circle BTC", "CirBTC", 8);
        oracle = new MockAggregatorV3(8, INITIAL_BTC_PRICE, "MOCK BTC/USD");

        factory = new BondedTontineFactory(
            address(usdc),
            address(cirBtc),
            address(oracle),
            MAX_PRICE_AGE
        );

        vm.prank(clubOwner);
        address clubAddr = factory.createClub(
            "Saigon Bonded Club #1",
            CONTRIBUTION,
            MAX_MEMBERS,
            ROUND_DURATION,
            RATE_BPS,
            SAFETY_BPS,
            LIQUIDATION_BPS,
            INTEREST_GRACE,
            SETTLEMENT_GRACE
        );
        club = BondedTontine(clubAddr);

        // Mint tokens to owner & members
        cirBtc.mint(clubOwner, 10e8); // 10 BTC
        usdc.mint(clubOwner, 100_000e6);

        address[4] memory mList = [member1, member2, member3, member4];
        for (uint256 i = 0; i < mList.length; i++) {
            usdc.mint(mList[i], 100_000e6);
            vm.prank(mList[i]);
            usdc.approve(address(club), type(uint256).max);
        }

        vm.startPrank(clubOwner);
        cirBtc.approve(address(club), type(uint256).max);
        usdc.approve(address(club), type(uint256).max);
        vm.stopPrank();

        address[] memory handlerMembers = new address[](4);
        handlerMembers[0] = member1;
        handlerMembers[1] = member2;
        handlerMembers[2] = member3;
        handlerMembers[3] = member4;
        handler = new BondedTontineHandler(club, usdc, cirBtc, oracle, clubOwner, handlerMembers);
        targetContract(address(handler));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Constructor & Factory Tests (including Decimals 6 & 8 Validation)
    // ─────────────────────────────────────────────────────────────────────────

    function test_FactoryRegistryAndImmutables() public view {
        assertEq(factory.clubsLength(), 1);
        assertEq(factory.clubAt(0), address(club));
        assertTrue(factory.isClub(address(club)));
        assertEq(club.owner(), clubOwner);
        assertEq(address(club.usdc()), address(usdc));
        assertEq(address(club.cirBtc()), address(cirBtc));
        assertEq(address(club.priceFeed()), address(oracle));
        assertEq(club.feedDecimals(), 8);
    }

    function test_ConstructorRevertsOnInvalidBounds() public {
        vm.expectRevert(BondedTontine.InvalidConfiguration.selector);
        new BondedTontine(
            clubOwner,
            address(usdc),
            address(cirBtc),
            address(oracle),
            MAX_PRICE_AGE,
            "Bad Club",
            0, // invalid contributionAmount
            MAX_MEMBERS,
            ROUND_DURATION,
            RATE_BPS,
            SAFETY_BPS,
            LIQUIDATION_BPS,
            INTEREST_GRACE,
            SETTLEMENT_GRACE
        );
    }

    function test_ConstructorAndFactoryRevertOnWrongTokenDecimals() public {
        BlocklistableMockERC20 badUsdc = new BlocklistableMockERC20("Bad USDC", "USDC", 18);
        BlocklistableMockERC20 badCirBtc = new BlocklistableMockERC20("Bad BTC", "BTC", 6);

        vm.expectRevert(BondedTontineFactory.InvalidConfiguration.selector);
        new BondedTontineFactory(address(badUsdc), address(cirBtc), address(oracle), MAX_PRICE_AGE);

        vm.expectRevert(BondedTontineFactory.InvalidConfiguration.selector);
        new BondedTontineFactory(address(usdc), address(badCirBtc), address(oracle), MAX_PRICE_AGE);

        vm.expectRevert(BondedTontine.InvalidConfiguration.selector);
        new BondedTontine(
            clubOwner,
            address(badUsdc),
            address(cirBtc),
            address(oracle),
            MAX_PRICE_AGE,
            "Bad USDC Decimals",
            CONTRIBUTION,
            MAX_MEMBERS,
            ROUND_DURATION,
            RATE_BPS,
            SAFETY_BPS,
            LIQUIDATION_BPS,
            INTEREST_GRACE,
            SETTLEMENT_GRACE
        );

        vm.expectRevert(BondedTontine.InvalidConfiguration.selector);
        new BondedTontine(
            clubOwner,
            address(usdc),
            address(badCirBtc),
            address(oracle),
            MAX_PRICE_AGE,
            "Bad CirBTC Decimals",
            CONTRIBUTION,
            MAX_MEMBERS,
            ROUND_DURATION,
            RATE_BPS,
            SAFETY_BPS,
            LIQUIDATION_BPS,
            INTEREST_GRACE,
            SETTLEMENT_GRACE
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. OPEN State Tests (joinGroup, removeMember, cancelOpen, startRounds)
    // ─────────────────────────────────────────────────────────────────────────

    function test_OpenState_OwnerCannotJoin_And_StartRequiresMinMembersAndCollateral() public {
        vm.prank(clubOwner);
        vm.expectRevert(BondedTontine.OwnerCannotJoin.selector);
        club.joinGroup();

        vm.prank(member1);
        club.joinGroup();

        vm.prank(clubOwner);
        vm.expectRevert(BondedTontine.InvalidConfiguration.selector);
        club.startRounds();

        vm.prank(member2);
        club.joinGroup();

        vm.prank(clubOwner);
        vm.expectRevert(BondedTontine.InvalidConfiguration.selector);
        club.startRounds();

        vm.prank(clubOwner);
        club.depositCollateral(10_000_000); // 0.1 BTC

        vm.prank(clubOwner);
        club.startRounds();

        assertEq(uint256(club.state()), uint256(BondedTontine.State.ACTIVE));
        assertEq(club.totalRounds(), MAX_MEMBERS);
        assertEq(club.currentRoundIndex(), 1);
    }

    function test_CancelOpenReturnsCollateralToOwner() public {
        vm.startPrank(clubOwner);
        club.depositCollateral(25_000_000); // 0.25 BTC
        uint256 balBefore = cirBtc.balanceOf(clubOwner);
        club.cancelOpen();
        uint256 balAfter = cirBtc.balanceOf(clubOwner);
        vm.stopPrank();

        assertEq(uint256(club.state()), uint256(BondedTontine.State.CANCELLED));
        assertEq(balAfter - balBefore, 25_000_000);
        assertEq(club.collateral(), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Worked Example A — Happy Path (Section 26)
    // ─────────────────────────────────────────────────────────────────────────

    function test_WorkedExampleA_HappyPath() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();
        vm.prank(member3);
        club.joinGroup();
        vm.prank(member4);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000);
        assertEq(club.collateralValueUsdc(), 3_000e6);
        assertEq(club.borrowLimit(), 1_500e6);

        club.startRounds();
        vm.stopPrank();

        // Round 1
        vm.prank(member1);
        club.contribute();
        vm.prank(member2);
        club.contribute();
        vm.prank(member3);
        club.contribute();
        vm.prank(member4);
        club.contribute();

        vm.prank(clubOwner);
        club.borrow(200e6);

        // Advance to Round 2
        vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
        oracle.setPrice(INITIAL_BTC_PRICE);

        vm.prank(member1);
        club.contribute();
        assertEq(club.interestOwed(), 4e6);

        vm.prank(member2);
        club.contribute();
        vm.prank(member3);
        club.contribute();
        vm.prank(member4);
        club.contribute();

        vm.startPrank(clubOwner);
        club.payInterest(4e6);
        club.borrow(200e6);
        vm.stopPrank();

        // Advance to Round 3
        vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
        oracle.setPrice(INITIAL_BTC_PRICE);

        vm.prank(member1);
        club.contribute();
        assertEq(club.interestOwed(), 8e6);
        vm.prank(member2);
        club.contribute();
        vm.prank(member3);
        club.contribute();
        vm.prank(member4);
        club.contribute();

        vm.prank(clubOwner);
        club.payInterest(8e6);

        // Advance to Round 4
        vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
        oracle.setPrice(INITIAL_BTC_PRICE);

        vm.prank(member1);
        club.contribute();
        assertEq(club.interestOwed(), 8e6);
        vm.prank(member2);
        club.contribute();
        vm.prank(member3);
        club.contribute();
        vm.prank(member4);
        club.contribute();

        vm.prank(clubOwner);
        club.payInterest(8e6);

        // End of Round 4
        vm.warp(club.startTime() + (MAX_MEMBERS * ROUND_DURATION) + 1);
        oracle.setPrice(INITIAL_BTC_PRICE);

        assertEq(club.interestOwed(), 8e6);

        vm.startPrank(clubOwner);
        club.repay(400e6);
        club.payInterest(8e6);
        club.finalize();
        vm.stopPrank();

        assertEq(uint256(club.state()), uint256(BondedTontine.State.COMPLETED));

        address[4] memory mList = [member1, member2, member3, member4];
        for (uint256 i = 0; i < 4; i++) {
            uint256 pending = club.pendingInterest(mList[i]);
            assertApproxEqAbs(pending, 7e6, 7);

            uint256 balBefore = usdc.balanceOf(mList[i]);
            vm.startPrank(mList[i]);
            club.claimInterest();
            club.withdrawPrincipal();
            vm.stopPrank();
            uint256 balAfter = usdc.balanceOf(mList[i]);

            assertEq(balAfter - balBefore, 200e6 + pending);
        }
        assertLe(club.interestClaimedTotal(), club.interestPaidTotal());
        assertLe(club.interestPaidTotal() - club.interestClaimedTotal(), 10);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Worked Example B — Interest Overdue Default & DefaultPending Gate
    // ─────────────────────────────────────────────────────────────────────────

    function test_WorkedExampleB_InterestOverdueDefault_And_DefaultPendingGate() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();
        vm.prank(member3);
        club.joinGroup();
        vm.prank(member4);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000); // 0.05 BTC
        club.startRounds();
        vm.stopPrank();

        // Round 1
        vm.prank(member1);
        club.contribute();
        vm.prank(member2);
        club.contribute();
        vm.prank(member3);
        club.contribute();
        vm.prank(member4);
        club.contribute();

        vm.prank(clubOwner);
        club.borrow(200e6);

        uint256 t1 = club.startTime() + ROUND_DURATION;
        vm.warp(t1);
        oracle.setPrice(INITIAL_BTC_PRICE);
        assertEq(club.interestOwed(), 4e6);

        // Before T1 + interestGrace, declareDefault reverts NotDefaultable
        vm.warp(t1 + INTEREST_GRACE - 1);
        oracle.setPrice(INITIAL_BTC_PRICE);
        vm.expectRevert(BondedTontine.NotDefaultable.selector);
        club.declareDefault();

        // At T1 + interestGrace + 1, interest is overdue:
        // contribute() must revert with DefaultPending!
        vm.warp(t1 + INTEREST_GRACE + 1);
        oracle.setPrice(INITIAL_BTC_PRICE);
        vm.prank(member1);
        vm.expectRevert(BondedTontine.DefaultPending.selector);
        club.contribute();

        // Keeper calls declareDefault()
        vm.prank(keeper);
        club.declareDefault();

        assertEq(uint256(club.state()), uint256(BondedTontine.State.DEFAULTED));
        assertEq(club.settledCollateral(), 5_000_000);

        address[4] memory mList = [member1, member2, member3, member4];
        for (uint256 i = 0; i < 4; i++) {
            uint256 btcBefore = cirBtc.balanceOf(mList[i]);
            vm.prank(mList[i]);
            club.withdrawPrincipal();
            uint256 btcAfter = cirBtc.balanceOf(mList[i]);
            assertEq(btcAfter - btcBefore, 1_250_000);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Worked Example C — BTC Flash Crash Liquidation & DefaultPending Gate
    // ─────────────────────────────────────────────────────────────────────────

    function test_WorkedExampleC_FlashCrashLiquidation() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();
        vm.prank(member3);
        club.joinGroup();
        vm.prank(member4);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000); // 0.05 BTC
        club.startRounds();
        vm.stopPrank();

        for (uint256 r = 0; r < 3; r++) {
            vm.prank(member1);
            club.contribute();
            vm.prank(member2);
            club.contribute();
            vm.prank(member3);
            club.contribute();
            vm.prank(member4);
            club.contribute();
            if (r < 2) {
                vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
                oracle.setPrice(INITIAL_BTC_PRICE);
            }
        }

        uint256 due = club.interestOwed();
        if (due > 0) {
            vm.prank(clubOwner);
            club.payInterest(due);
        }
        vm.prank(clubOwner);
        club.borrow(500e6);
        assertEq(club.totalDebt(), 500e6);

        vm.expectRevert(BondedTontine.NotLiquidatable.selector);
        club.liquidate();

        // BTC drops to $11,500 -> collateralUsd = $575 < $600 liquidation floor
        oracle.setPrice(11_500e8);
        assertEq(club.collateralValueUsdc(), 575e6);

        // Advance to Round 4: while undercollateralized, contribute() reverts DefaultPending
        vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
        oracle.setPrice(11_500e8);
        vm.prank(clubOwner);
        club.payInterest(club.interestOwed()); // pay interest so only undercollateralization is pending
        vm.prank(member1);
        vm.expectRevert(BondedTontine.DefaultPending.selector);
        club.contribute();

        vm.prank(keeper);
        club.liquidate();

        assertEq(uint256(club.state()), uint256(BondedTontine.State.DEFAULTED));
        assertEq(club.settledRecoveredUsdc(), 100e6);
        assertEq(club.settledCollateral(), 5_000_000);

        uint256 usdcBefore = usdc.balanceOf(member1);
        uint256 btcBefore = cirBtc.balanceOf(member1);
        vm.prank(member1);
        club.withdrawPrincipal();
        assertEq(usdc.balanceOf(member1) - usdcBefore, 25e6);
        assertEq(cirBtc.balanceOf(member1) - btcBefore, 1_250_000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Security Assertions S1–S8 (Section 20.1)
    // ─────────────────────────────────────────────────────────────────────────

    function test_Security_S3_BorrowRepaySameRoundPeakDebt() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000);
        club.startRounds();
        vm.stopPrank();

        vm.prank(member1);
        club.contribute();
        vm.prank(member2);
        club.contribute();

        vm.startPrank(clubOwner);
        club.borrow(100e6);
        assertEq(club.peakDebt(1), 100e6);
        club.repay(100e6);
        assertEq(club.totalDebt(), 0);
        assertEq(club.peakDebt(1), 100e6);
        vm.stopPrank();

        vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
        oracle.setPrice(INITIAL_BTC_PRICE);
        assertEq(club.interestOwed(), 2e6);
    }

    function test_Security_S4_OracleFailureDuringZeroExposureAllowsCollateralWithdraw() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000);
        club.startRounds();
        vm.stopPrank();

        oracle.setPrice(-1);

        vm.prank(member1);
        club.contribute();

        vm.prank(clubOwner);
        vm.expectRevert(BondedTontine.BadPrice.selector);
        club.borrow(10e6);

        vm.expectRevert(BondedTontine.BadPrice.selector);
        club.liquidate();

        vm.prank(clubOwner);
        club.withdrawCollateral(2_000_000);
        assertEq(club.collateral(), 3_000_000);
    }

    function test_Security_S8_BlocklistIsolation() public {
        vm.prank(member1);
        club.joinGroup();
        vm.prank(member2);
        club.joinGroup();

        vm.startPrank(clubOwner);
        club.depositCollateral(5_000_000);
        club.startRounds();
        vm.stopPrank();

        for (uint256 r = 0; r < MAX_MEMBERS; r++) {
            vm.prank(member1);
            club.contribute();
            vm.prank(member2);
            club.contribute();
            if (r == 0) {
                vm.prank(clubOwner);
                club.borrow(100e6);
            }
            uint256 owed = club.interestOwed();
            if (owed > 0) {
                vm.prank(clubOwner);
                club.payInterest(owed);
            }
            vm.warp(vm.getBlockTimestamp() + ROUND_DURATION);
            oracle.setPrice(INITIAL_BTC_PRICE);
        }

        uint256 due = club.interestOwed();
        vm.startPrank(clubOwner);
        club.repay(100e6);
        if (due > 0) club.payInterest(due);
        club.finalize();
        vm.stopPrank();

        usdc.setBlocked(member1, true);

        vm.prank(member1);
        vm.expectRevert();
        club.withdrawPrincipal();

        vm.startPrank(member2);
        club.claimInterest();
        club.withdrawPrincipal();
        vm.stopPrank();
        assertTrue(club.principalWithdrawn(member2));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Invariant Tests (Section 20.2 & P3)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Solvency invariant: contract USDC balance >= unborrowed deposits + unclaimed interest.
    function invariant_solvency() public view {
        uint256 totalDep = club.totalDeposits();
        uint256 debt = club.totalDebt();
        uint256 unborrowed = totalDep > debt ? totalDep - debt : 0;

        uint256 unclaimedInterest =
            club.pendingInterest(member1) +
            club.pendingInterest(member2) +
            club.pendingInterest(member3) +
            club.pendingInterest(member4);

        assertLe(club.interestClaimedTotal(), club.interestPaidTotal());

        if (club.state() == BondedTontine.State.ACTIVE || club.state() == BondedTontine.State.OPEN) {
            assertGe(usdc.balanceOf(address(club)), unborrowed + unclaimedInterest);
        }
    }

    /// @notice State monotonicity invariant: terminal states never transition back.
    function invariant_stateMonotonic() public view {
        BondedTontine.State cur = club.state();
        BondedTontine.State last = handler.lastObservedState();
        if (
            last == BondedTontine.State.COMPLETED ||
            last == BondedTontine.State.DEFAULTED ||
            last == BondedTontine.State.CANCELLED
        ) {
            assertEq(uint256(cur), uint256(last));
        }
    }
}
