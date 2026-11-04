// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice Minimal Chainlink AggregatorV3 interface used by BondedTontine and BondedTontineFactory.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/// @title BondedTontine
/// @notice Rotating contribution club where members deposit fixed USDC each round and earn fixed per-round interest,
/// while the club owner borrows within a CirBTC-collateralized credit limit with permissionless default/liquidation.
contract BondedTontine is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        OPEN,
        ACTIVE,
        COMPLETED,
        DEFAULTED,
        CANCELLED
    }

    enum DefaultReason {
        INTEREST_OVERDUE,
        SETTLEMENT_OVERDUE,
        UNDERCOLLATERALIZED
    }

    // Custom Errors (Section 10.9)
    error WrongState();
    error NotMember();
    error AlreadyMember();
    error GroupFull();
    error AlreadyContributed();
    error RoundNotActive();
    error InvalidConfiguration();
    error InvalidAmount();
    error InsufficientLiquidity();
    error ExceedsBorrowLimit();
    error CollateralLocked();
    error NothingToClaim();
    error NotDefaultable();
    error NotLiquidatable();
    error NotFinalizable();
    error BadPrice();
    error StalePrice();
    error OwnerCannotJoin();
    error RenounceDisabled();
    error TransferLockedAfterOpen();

    // Events (Section 10.8)
    event CollateralDeposited(address indexed owner, uint256 amount);
    event CollateralWithdrawn(address indexed owner, uint256 amount);
    event MemberJoined(address indexed member);
    event MemberRemoved(address indexed member);
    event RoundsStarted(uint256 startTime, uint256 totalRounds);
    event Contributed(uint256 indexed roundId, address indexed member, uint256 amount);
    event Borrowed(uint256 indexed roundId, uint256 amount, uint256 totalDebt);
    event Repaid(uint256 amount, uint256 totalDebt);
    event InterestPaid(uint256 amount, uint256 interestPaidTotal);
    event InterestClaimed(address indexed member, uint256 amount);
    event GroupCompleted(uint256 settledRecoveredUsdc);
    event GroupDefaulted(DefaultReason reason, uint256 totalDebt, uint256 collateralSeized);
    event GroupCancelled();
    event PrincipalWithdrawn(address indexed member, uint256 usdcOut, uint256 cirBtcOut);

    // Immutable Parameters (Section 10.1)
    IERC20 public immutable usdc;
    IERC20 public immutable cirBtc;
    AggregatorV3Interface public immutable priceFeed;
    uint8 public immutable feedDecimals;
    uint256 public immutable maxPriceAge;
    string public groupName;
    uint256 public immutable contributionAmount;
    uint256 public immutable maxMembers;
    uint256 public immutable totalRounds;
    uint256 public immutable roundDuration;
    uint256 public immutable rateBpsPerRound;
    uint256 public immutable safetyBps;
    uint256 public immutable liquidationBps;
    uint256 public immutable interestGrace;
    uint256 public immutable settlementGrace;

    // Storage Layout (Section 10.3)
    State public state;
    uint256 public startTime;
    mapping(address => bool) public isMember;
    uint256 public memberCount;
    mapping(address => uint256) public deposit;
    uint256 public totalDeposits;
    mapping(uint256 => mapping(address => bool)) public contributed;
    uint256 public accInterestPerShare;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public interestClaimable;
    uint256 public collateral;
    uint256 public totalDebt;
    mapping(uint256 => uint256) public peakDebt;
    mapping(uint256 => uint256) public interestDue;
    uint256 public lastRolledRound;
    uint256 public interestDueTotal;
    uint256 public interestPaidTotal;
    uint256 public settledTotalDeposits;
    uint256 public settledRecoveredUsdc;
    uint256 public settledCollateral;
    mapping(address => bool) public principalWithdrawn;

    modifier inState(State s) {
        if (state != s) revert WrongState();
        _;
    }

    constructor(
        address owner_,
        address usdc_,
        address cirBtc_,
        address priceFeed_,
        uint256 maxPriceAge_,
        string memory groupName_,
        uint256 contributionAmount_,
        uint256 maxMembers_,
        uint256 roundDuration_,
        uint256 rateBpsPerRound_,
        uint256 safetyBps_,
        uint256 liquidationBps_,
        uint256 interestGrace_,
        uint256 settlementGrace_
    ) Ownable(owner_ == address(0) ? msg.sender : owner_) {
        if (
            owner_ == address(0) ||
            usdc_ == address(0) ||
            cirBtc_ == address(0) ||
            cirBtc_ == usdc_ ||
            priceFeed_ == address(0)
        ) {
            revert InvalidConfiguration();
        }

        uint8 dec;
        try AggregatorV3Interface(priceFeed_).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            revert InvalidConfiguration();
        }
        if (dec > 18) revert InvalidConfiguration();

        uint256 nameLen = bytes(groupName_).length;
        if (
            nameLen == 0 ||
            nameLen > 32 ||
            contributionAmount_ == 0 ||
            maxMembers_ < 2 ||
            maxMembers_ > 20 ||
            roundDuration_ < 60 ||
            roundDuration_ > 365 days ||
            rateBpsPerRound_ < 1 ||
            rateBpsPerRound_ > 1000 ||
            safetyBps_ < 15000 ||
            safetyBps_ > 50000 ||
            liquidationBps_ < 11000 ||
            liquidationBps_ > safetyBps_ - 2000 ||
            interestGrace_ > 7 days ||
            settlementGrace_ < 1 hours ||
            settlementGrace_ > 14 days ||
            maxPriceAge_ < 1 hours ||
            maxPriceAge_ > 48 hours
        ) {
            revert InvalidConfiguration();
        }

        usdc = IERC20(usdc_);
        cirBtc = IERC20(cirBtc_);
        priceFeed = AggregatorV3Interface(priceFeed_);
        feedDecimals = dec;
        maxPriceAge = maxPriceAge_;
        groupName = groupName_;
        contributionAmount = contributionAmount_;
        maxMembers = maxMembers_;
        totalRounds = maxMembers_;
        roundDuration = roundDuration_;
        rateBpsPerRound = rateBpsPerRound_;
        safetyBps = safetyBps_;
        liquidationBps = liquidationBps_;
        interestGrace = interestGrace_;
        settlementGrace = settlementGrace_;
        state = State.OPEN;
    }

    // =========================================================================
    // Ownership Guards (Section 10.2 & 14)
    // =========================================================================

    function transferOwnership(address newOwner) public override onlyOwner {
        if (state != State.OPEN) revert TransferLockedAfterOpen();
        if (newOwner == address(0)) revert InvalidConfiguration();
        if (isMember[newOwner]) revert AlreadyMember();
        super.transferOwnership(newOwner);
    }

    function acceptOwnership() public override {
        if (state != State.OPEN) revert TransferLockedAfterOpen();
        if (isMember[msg.sender]) revert AlreadyMember();
        super.acceptOwnership();
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    // =========================================================================
    // Write Functions (Section 10.5)
    // =========================================================================

    function depositCollateral(uint256 amount) external onlyOwner nonReentrant {
        if (state != State.OPEN && state != State.ACTIVE) revert WrongState();
        if (amount == 0) revert InvalidAmount();
        if (state == State.ACTIVE) {
            _rollRounds();
        }

        uint256 beforeBal = cirBtc.balanceOf(address(this));
        cirBtc.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = cirBtc.balanceOf(address(this)) - beforeBal;
        if (received == 0) revert InvalidAmount();

        collateral += received;
        emit CollateralDeposited(msg.sender, received);
    }

    function withdrawCollateral(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0 || amount > collateral) revert InvalidAmount();

        if (state == State.ACTIVE) {
            _rollRounds();
            uint256 exp = exposure();
            if (exp > 0) {
                uint256 remainingCollateral = collateral - amount;
                uint256 newLimit = Math.mulDiv(
                    _collateralValueUsdcFor(remainingCollateral),
                    10000,
                    safetyBps
                );
                if (exp > newLimit) revert CollateralLocked();
            }
        }

        collateral -= amount;
        cirBtc.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function joinGroup() external inState(State.OPEN) {
        if (msg.sender == owner() || msg.sender == pendingOwner()) revert OwnerCannotJoin();
        if (isMember[msg.sender]) revert AlreadyMember();
        if (memberCount >= maxMembers) revert GroupFull();

        isMember[msg.sender] = true;
        memberCount += 1;
        emit MemberJoined(msg.sender);
    }

    function removeMember(address addr) external onlyOwner inState(State.OPEN) {
        if (!isMember[addr]) revert NotMember();
        isMember[addr] = false;
        memberCount -= 1;
        emit MemberRemoved(addr);
    }

    function cancelOpen() external onlyOwner inState(State.OPEN) nonReentrant {
        state = State.CANCELLED;
        uint256 col = collateral;
        if (col > 0) {
            collateral = 0;
            cirBtc.safeTransfer(msg.sender, col);
            emit CollateralWithdrawn(msg.sender, col);
        }
        emit GroupCancelled();
    }

    function startRounds() external onlyOwner inState(State.OPEN) {
        if (memberCount < 2 || collateral == 0) revert InvalidConfiguration();
        state = State.ACTIVE;
        startTime = block.timestamp;
        emit RoundsStarted(startTime, maxMembers);
    }

    function contribute() external nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        uint256 idx = currentRoundIndex();
        if (idx < 1 || idx > maxMembers) revert RoundNotActive();
        if (!isMember[msg.sender]) revert NotMember();
        if (contributed[idx][msg.sender]) revert AlreadyContributed();

        _updateMember(msg.sender);
        contributed[idx][msg.sender] = true;

        uint256 beforeBal = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);
        uint256 received = usdc.balanceOf(address(this)) - beforeBal;
        if (received != contributionAmount) revert InvalidAmount();

        deposit[msg.sender] += received;
        totalDeposits += received;
        rewardDebt[msg.sender] = Math.mulDiv(deposit[msg.sender], accInterestPerShare, 1e18);

        emit Contributed(idx, msg.sender, received);
    }

    function claimInterest() external nonReentrant {
        if (state == State.ACTIVE) {
            _rollRounds();
        }
        _updateMember(msg.sender);
        uint256 claimable = interestClaimable[msg.sender];
        if (claimable == 0) revert NothingToClaim();

        interestClaimable[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, claimable);
        emit InterestClaimed(msg.sender, claimable);
    }

    function borrow(uint256 amount) external onlyOwner nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        uint256 idx = currentRoundIndex();
        if (idx < 1 || idx > maxMembers) revert RoundNotActive();
        if (amount == 0) revert InvalidAmount();
        if (amount > totalDeposits - totalDebt) revert InsufficientLiquidity();

        uint256 newDebt = totalDebt + amount;
        uint256 newPeak = newDebt > peakDebt[idx] ? newDebt : peakDebt[idx];
        uint256 owed = interestDueTotal - interestPaidTotal;
        uint256 currentRoundInterest = Math.mulDiv(newPeak, rateBpsPerRound, 10000);
        uint256 exposureAfter = newDebt + owed + currentRoundInterest;

        if (exposureAfter > borrowLimit()) revert ExceedsBorrowLimit();

        totalDebt = newDebt;
        peakDebt[idx] = newPeak;
        usdc.safeTransfer(msg.sender, amount);
        emit Borrowed(idx, amount, newDebt);
    }

    function repay(uint256 amount) external onlyOwner nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        if (amount == 0 || amount > totalDebt) revert InvalidAmount();

        totalDebt -= amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Repaid(amount, totalDebt);
    }

    function payInterest(uint256 amount) external onlyOwner nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        uint256 unpaid = interestDueTotal - interestPaidTotal;
        if (amount == 0 || amount > unpaid) revert InvalidAmount();

        interestPaidTotal += amount;
        accInterestPerShare += Math.mulDiv(amount, 1e18, totalDeposits);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit InterestPaid(amount, interestPaidTotal);
    }

    function finalize() external nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        if (!cycleEnded() || totalDebt > 0 || interestPaidTotal < interestDueTotal) {
            revert NotFinalizable();
        }
        _settle(false, DefaultReason.INTEREST_OVERDUE);
    }

    function declareDefault() external nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        bool intOverdue = _interestOverdue();
        bool settleOverdue = block.timestamp >=
            startTime + (maxMembers * roundDuration) + settlementGrace &&
            (totalDebt > 0 || interestPaidTotal < interestDueTotal);

        if (!intOverdue && !settleOverdue) revert NotDefaultable();

        DefaultReason reason = intOverdue
            ? DefaultReason.INTEREST_OVERDUE
            : DefaultReason.SETTLEMENT_OVERDUE;
        _settle(true, reason);
    }

    function liquidate() external nonReentrant inState(State.ACTIVE) {
        _rollRounds();
        uint256 debtAndInterest = totalDebt + (interestDueTotal - interestPaidTotal);
        uint256 maxSupportedDebt = Math.mulDiv(collateralValueUsdc(), 10000, liquidationBps);
        if (debtAndInterest == 0 || maxSupportedDebt >= debtAndInterest) {
            revert NotLiquidatable();
        }
        _settle(true, DefaultReason.UNDERCOLLATERALIZED);
    }

    function withdrawPrincipal() external nonReentrant {
        if (state != State.COMPLETED && state != State.DEFAULTED) revert WrongState();
        uint256 dep = deposit[msg.sender];
        if (dep == 0 || principalWithdrawn[msg.sender]) revert NothingToClaim();

        principalWithdrawn[msg.sender] = true;
        uint256 usdcOut = Math.mulDiv(dep, settledRecoveredUsdc, settledTotalDeposits);
        uint256 cirOut = Math.mulDiv(dep, settledCollateral, settledTotalDeposits);

        if (usdcOut > 0) {
            usdc.safeTransfer(msg.sender, usdcOut);
        }
        if (cirOut > 0) {
            cirBtc.safeTransfer(msg.sender, cirOut);
        }
        emit PrincipalWithdrawn(msg.sender, usdcOut, cirOut);
    }

    // =========================================================================
    // View Functions (Section 10.6)
    // =========================================================================

    function currentRoundIndex() public view returns (uint256) {
        if (state != State.ACTIVE) return 0;
        uint256 elapsed = block.timestamp - startTime;
        uint256 idx = (elapsed / roundDuration) + 1;
        if (idx > maxMembers) {
            return maxMembers + 1;
        }
        return idx;
    }

    function cycleEnded() public view returns (bool) {
        if (startTime == 0) return false;
        return block.timestamp >= startTime + (maxMembers * roundDuration);
    }

    function collateralValueUsdc() public view returns (uint256) {
        return _collateralValueUsdcFor(collateral);
    }

    function borrowLimit() public view returns (uint256) {
        return Math.mulDiv(collateralValueUsdc(), 10000, safetyBps);
    }

    function interestOwed() public view returns (uint256) {
        (uint256 dueTotal, ) = _previewRolledState();
        return dueTotal > interestPaidTotal ? dueTotal - interestPaidTotal : 0;
    }

    function exposure() public view returns (uint256) {
        (uint256 dueTotal, uint256 currentPeak) = _previewRolledState();
        uint256 owed = dueTotal > interestPaidTotal ? dueTotal - interestPaidTotal : 0;
        uint256 currentRoundInterest = Math.mulDiv(currentPeak, rateBpsPerRound, 10000);
        return totalDebt + owed + currentRoundInterest;
    }

    function healthBps() public view returns (uint256) {
        uint256 debtAndInterest = totalDebt + interestOwed();
        if (debtAndInterest == 0) return type(uint256).max;
        return Math.mulDiv(collateralValueUsdc(), 10000, debtAndInterest);
    }

    function pendingInterest(address addr) external view returns (uint256) {
        uint256 accrued = Math.mulDiv(deposit[addr], accInterestPerShare, 1e18);
        uint256 newlyAccrued = accrued > rewardDebt[addr] ? accrued - rewardDebt[addr] : 0;
        return interestClaimable[addr] + newlyAccrued;
    }

    function previewPrincipal(address addr) external view returns (uint256 usdcOut, uint256 cirBtcOut) {
        uint256 dep = deposit[addr];
        if (dep == 0 || principalWithdrawn[addr]) return (0, 0);
        if (state == State.COMPLETED || state == State.DEFAULTED) {
            if (settledTotalDeposits == 0) return (0, 0);
            usdcOut = Math.mulDiv(dep, settledRecoveredUsdc, settledTotalDeposits);
            cirBtcOut = Math.mulDiv(dep, settledCollateral, settledTotalDeposits);
            return (usdcOut, cirBtcOut);
        }
        if (state == State.ACTIVE && totalDeposits > 0) {
            uint256 availableUsdc = totalDeposits > totalDebt ? totalDeposits - totalDebt : 0;
            usdcOut = Math.mulDiv(dep, availableUsdc, totalDeposits);
            return (usdcOut, 0);
        }
        return (0, 0);
    }

    function nextInterestDeadline() external view returns (uint256) {
        if (state != State.ACTIVE) return 0;
        uint256 idx = currentRoundIndex();
        uint256 cumulativeDue = 0;
        for (uint256 k = 1; k <= maxMembers; k++) {
            uint256 roundDue;
            if (k <= lastRolledRound) {
                roundDue = interestDue[k];
            } else if (k < idx) {
                uint256 pk = totalDebt > peakDebt[k] ? totalDebt : peakDebt[k];
                roundDue = Math.mulDiv(pk, rateBpsPerRound, 10000);
            } else if (k == idx) {
                uint256 pk = totalDebt > peakDebt[k] ? totalDebt : peakDebt[k];
                roundDue = Math.mulDiv(pk, rateBpsPerRound, 10000);
            } else {
                roundDue = Math.mulDiv(totalDebt, rateBpsPerRound, 10000);
            }
            cumulativeDue += roundDue;
            if (cumulativeDue > interestPaidTotal) {
                return startTime + (k * roundDuration) + interestGrace;
            }
        }
        return startTime + (maxMembers * roundDuration) + settlementGrace;
    }

    // =========================================================================
    // Internal Logic (Section 10.7)
    // =========================================================================

    function _rollRounds() internal {
        uint256 idx = currentRoundIndex();
        for (uint256 k = lastRolledRound + 1; k < idx && k <= maxMembers; k++) {
            if (totalDebt > peakDebt[k]) {
                peakDebt[k] = totalDebt;
            }
            uint256 due = Math.mulDiv(peakDebt[k], rateBpsPerRound, 10000);
            interestDue[k] = due;
            interestDueTotal += due;
            lastRolledRound = k;
        }
        if (idx >= 1 && idx <= maxMembers) {
            if (totalDebt > peakDebt[idx]) {
                peakDebt[idx] = totalDebt;
            }
        }
    }

    function _previewRolledState() internal view returns (uint256 dueTotal, uint256 currentPeak) {
        dueTotal = interestDueTotal;
        if (state != State.ACTIVE) {
            return (dueTotal, 0);
        }
        uint256 idx = currentRoundIndex();
        for (uint256 k = lastRolledRound + 1; k < idx && k <= maxMembers; k++) {
            uint256 pk = totalDebt > peakDebt[k] ? totalDebt : peakDebt[k];
            dueTotal += Math.mulDiv(pk, rateBpsPerRound, 10000);
        }
        if (idx >= 1 && idx <= maxMembers) {
            currentPeak = totalDebt > peakDebt[idx] ? totalDebt : peakDebt[idx];
        }
    }

    function _interestOverdue() internal view returns (bool) {
        uint256 dueThrough = 0;
        for (uint256 k = 1; k <= lastRolledRound; k++) {
            if (startTime + (k * roundDuration) + interestGrace > block.timestamp) {
                break;
            }
            dueThrough += interestDue[k];
        }
        return interestPaidTotal < dueThrough;
    }

    function _updateMember(address m) internal {
        uint256 accrued = Math.mulDiv(deposit[m], accInterestPerShare, 1e18);
        if (accrued > rewardDebt[m]) {
            interestClaimable[m] += accrued - rewardDebt[m];
        }
        rewardDebt[m] = accrued;
    }

    function _settle(bool defaulted, DefaultReason reason) internal {
        settledTotalDeposits = totalDeposits;
        if (defaulted && totalDeposits > 0) {
            state = State.DEFAULTED;
            settledRecoveredUsdc = totalDeposits - totalDebt;
            uint256 seized = collateral;
            settledCollateral = seized;
            collateral = 0;
            emit GroupDefaulted(reason, totalDebt, seized);
        } else if (defaulted) {
            state = State.DEFAULTED;
            emit GroupDefaulted(reason, totalDebt, 0);
        } else {
            state = State.COMPLETED;
            settledRecoveredUsdc = totalDeposits;
            emit GroupCompleted(settledRecoveredUsdc);
        }
    }

    function _price() internal view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        if (answer <= 0 || updatedAt == 0 || updatedAt > block.timestamp || answeredInRound < roundId) {
            revert BadPrice();
        }
        if (block.timestamp - updatedAt > maxPriceAge) {
            revert StalePrice();
        }
        return uint256(answer);
    }

    function _collateralValueUsdcFor(uint256 collateralAmount) internal view returns (uint256) {
        return Math.mulDiv(collateralAmount, _price(), 10 ** (uint256(feedDecimals) + 2));
    }
}
