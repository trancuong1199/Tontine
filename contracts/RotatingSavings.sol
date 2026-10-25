// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Arc Testnet USDC: 0x3600000000000000000000000000000000000000 (6 decimals)
contract RotatingSavings is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum GroupState {
        OPEN,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    struct Round {
        uint256 startTime;
        uint256 endTime;
        address winner;
        uint256 totalPot;
        uint256 totalBids;
        bool settled;
        mapping(address => uint256) contributions;
        mapping(address => uint256) bids;
        mapping(address => bool) kicked;
    }

    error NotMember();
    error AlreadyMember();
    error GroupNotOpen();
    error GroupNotActive();
    error RoundNotCurrent();
    error AlreadyContributed();
    error RoundStillOpen();
    error NoPayout();
    error AlreadyWon();
    error MaxMembersReached();
    error NotOwner();
    error InsufficientBid();
    error InvalidConfiguration();
    error InvalidAddress();
    error RenounceOwnershipDisabled();
    error MemberWasKicked();
    error GroupNotFinished();
    error CollateralNotRequired();
    error AlreadyVotedCancel();
    error InsufficientCancelVotes();
    error RoundEnded();

    event MemberJoined(address indexed member, uint256 memberIndex);
    event RoundsStarted(uint256 totalRounds, uint256 firstRoundEnd);
    event NewCycleStarted(uint256 indexed cycleStartRound, uint256 indexed firstRoundId, uint256 endTime);
    event Contributed(uint256 indexed roundId, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed roundId, address indexed member, uint256 totalBid);
    event RoundSettled(uint256 indexed roundId, address indexed winner, uint256 pot, uint256 winnerBid);
    event MemberKicked(uint256 indexed roundId, address indexed member);
    event PayoutClaimed(address indexed recipient, uint256 amount);
    event ContributionRefunded(uint256 indexed roundId, address indexed member, uint256 amount);
    event CollateralConfigured(uint256 collateralAmount);
    event CollateralDeposited(address indexed member, uint256 amount);
    event CollateralSlashed(uint256 indexed roundId, address indexed member, uint256 amount);
    event CollateralClaimed(address indexed member, uint256 amount);
    event CancelVoteCast(address indexed voter, uint256 currentVotes, uint256 requiredVotes);
    event GroupCancelled();

    IERC20 public immutable usdc;
    address public immutable usdcToken;
    uint256 public immutable contributionAmount;
    uint256 public immutable maxMembers;
    uint256 public immutable roundDuration;
    string public groupName;

    // TASK-043: CirBTC Collateral Vault (Circle Wrapped Bitcoin, 8 decimals)
    IERC20 public immutable cirBtc;
    address public immutable cirBtcToken;
    uint256 public cirBtcCollateralAmount; // Required collateral per member in satoshis (8 decimals). 0 if none.
    mapping(address => uint256) public cirBtcCollateral; // Locked collateral per member
    mapping(address => uint256) public claimableCirBtc;   // Slashed collateral dividend share claimable by honest members
    uint256 public totalSlashedCirBtc;

    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => bool) public hasWon;
    mapping(address => uint256) public claimable;

    // Tracks permanent defaults; once kicked, member is out of future rounds.
    mapping(address => bool) public isKicked;
    mapping(address => uint256) private memberIndexPlusOne;

    // Consensus cancel voting (Task-044: Prevent unilateral owner cancellation when >= 2 members)
    mapping(address => bool) public hasVotedCancel;
    uint256 public cancelVoteCount;

    mapping(uint256 => Round) private rounds;

    uint256 public currentRound;
    uint256 public cycleStartRound;
    /// @notice Number of members still eligible (not kicked and not yet won).
    uint256 public activeMembers;
    GroupState public state;

    modifier onlyGroupOwner() {
        if (msg.sender != owner()) revert NotOwner();
        _;
    }

    constructor(
        address usdcToken_,
        uint256 contributionAmount_,
        uint256 maxMembers_,
        uint256 roundDuration_,
        string memory groupName_,
        address cirBtcToken_
    ) Ownable(msg.sender) {
        if (usdcToken_ == address(0) || cirBtcToken_ == address(0)) revert InvalidAddress();
        if (contributionAmount_ == 0 || roundDuration_ == 0 || maxMembers_ < 2 || maxMembers_ > 20) {
            revert InvalidConfiguration();
        }

        usdcToken = usdcToken_;
        usdc = IERC20(usdcToken_);
        contributionAmount = contributionAmount_;
        maxMembers = maxMembers_;
        roundDuration = roundDuration_;
        groupName = groupName_;
        state = GroupState.OPEN;

        // Collateral token is fixed per deployment.
        cirBtcToken = cirBtcToken_;
        cirBtc = IERC20(cirBtcToken);
        cirBtcCollateralAmount = 0; // default 0 for backwards compatibility
    }

    /// @notice Configure required CirBTC collateral before members join
    function setCollateralAmount(uint256 collateralAmount_) external onlyGroupOwner {
        if (state != GroupState.OPEN) revert GroupNotOpen();
        if (members.length > 0) revert InvalidConfiguration();
        cirBtcCollateralAmount = collateralAmount_;
        emit CollateralConfigured(collateralAmount_);
    }

    /// @notice Deposit CirBTC security collateral explicitly for this savings club
    function depositCollateral(uint256 amount_) external nonReentrant {
        if (state != GroupState.OPEN && state != GroupState.ACTIVE) revert GroupNotOpen();
        if (!isMember[msg.sender]) revert NotMember();
        if (isKicked[msg.sender]) revert MemberWasKicked();
        uint256 depositAmt = amount_ > 0 ? amount_ : (cirBtcCollateralAmount > 0 ? cirBtcCollateralAmount : 100_000);
        cirBtcCollateral[msg.sender] += depositAmt;
        cirBtc.safeTransferFrom(msg.sender, address(this), depositAmt);
        emit CollateralDeposited(msg.sender, depositAmt);
    }

    function _handleCollateralDeposit(address member) internal {
        if (cirBtcCollateralAmount > 0) {
            IERC20 token = cirBtc;
            uint256 allowed = token.allowance(member, address(this));
            uint256 bal = token.balanceOf(member);
            if (allowed >= cirBtcCollateralAmount && bal >= cirBtcCollateralAmount) {
                cirBtcCollateral[member] += cirBtcCollateralAmount;
                token.safeTransferFrom(member, address(this), cirBtcCollateralAmount);
                emit CollateralDeposited(member, cirBtcCollateralAmount);
            }
        }
    }

    function _slashCollateral(uint256 roundId, address member) internal returns (uint256 slashed) {
        slashed = cirBtcCollateral[member];
        if (slashed > 0) {
            cirBtcCollateral[member] = 0;
            totalSlashedCirBtc += slashed;
            emit CollateralSlashed(roundId, member, slashed);
        }
    }

    function _distributeSlashedCirBtc(uint256 roundId, uint256 roundSlashed) internal {
        Round storage round = rounds[roundId];
        uint256 honestCount = 0;
        uint256 len = members.length;
        for (uint256 i = 0; i < len; i++) {
            address m = members[i];
            if (!isKicked[m] && round.contributions[m] == contributionAmount) {
                honestCount++;
            }
        }
        if (honestCount > 0) {
            uint256 share = roundSlashed / honestCount;
            for (uint256 i = 0; i < len; i++) {
                address m = members[i];
                if (!isKicked[m] && round.contributions[m] == contributionAmount) {
                    claimableCirBtc[m] += share;
                }
            }
        }
    }

    function joinGroup() external {
        if (state != GroupState.OPEN) revert GroupNotOpen();
        if (isMember[msg.sender]) revert AlreadyMember();
        if (members.length >= maxMembers) revert MaxMembersReached();

        isMember[msg.sender] = true;
        members.push(msg.sender);
        uint256 memberIndex = members.length - 1;
        memberIndexPlusOne[msg.sender] = memberIndex + 1;

        _handleCollateralDeposit(msg.sender);

        emit MemberJoined(msg.sender, memberIndex);
    }

    function startRounds() external onlyGroupOwner {
        if (state != GroupState.OPEN) revert GroupNotOpen();
        if (members.length < 2) revert InvalidConfiguration();

        state = GroupState.ACTIVE;
        currentRound = 1;
        activeMembers = members.length;

        Round storage round = rounds[1];
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + roundDuration;

        emit RoundsStarted(members.length, round.endTime);
    }

    /// @notice Start a new Tontine cycle on the same club after COMPLETED so members can continue contributing.
    /// @dev Resets `hasWon`, `isKicked`, and cancel votes for all members. Note that any CirBTC collateral
    /// slashed in a prior cycle is not restored; previously kicked members re-enter with 0 collateral unless
    /// they call `depositCollateral()` again.
    function startNewCycle() external {
        if (state != GroupState.COMPLETED) revert GroupNotOpen();
        if (!isMember[msg.sender] && msg.sender != owner()) revert NotMember();
        if (members.length < 2) revert InvalidConfiguration();

        uint256 len = members.length;
        for (uint256 i = 0; i < len; i++) {
            address m = members[i];
            hasWon[m] = false;
            isKicked[m] = false;
            hasVotedCancel[m] = false;
        }
        hasVotedCancel[owner()] = false;
        cancelVoteCount = 0;

        cycleStartRound = currentRound;
        currentRound += 1;
        state = GroupState.ACTIVE;
        activeMembers = len;

        Round storage nextRound = rounds[currentRound];
        nextRound.startTime = block.timestamp;
        nextRound.endTime = block.timestamp + roundDuration;

        emit RoundsStarted(len, nextRound.endTime);
        emit NewCycleStarted(cycleStartRound, currentRound, nextRound.endTime);
    }

    function contribute(uint256 roundId) external nonReentrant {
        if (state != GroupState.ACTIVE) revert GroupNotActive();
        if (roundId != currentRound) revert RoundNotCurrent();
        if (!isMember[msg.sender]) revert NotMember();
        if (isKicked[msg.sender]) revert NotMember();

        Round storage round = rounds[roundId];
        if (block.timestamp > round.endTime) revert RoundEnded();
        if (round.contributions[msg.sender] != 0) revert AlreadyContributed();

        round.contributions[msg.sender] = contributionAmount;

        usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);

        emit Contributed(roundId, msg.sender, contributionAmount);
    }

    /// @notice WARNING: Bids are publicly visible on-chain and can be front-run. A commit-reveal scheme would prevent this but adds complexity. Use with awareness of MEV risk.
    function placeBid(uint256 roundId, uint256 bidAmount) external nonReentrant {
        if (state != GroupState.ACTIVE) revert GroupNotActive();
        if (roundId != currentRound) revert RoundNotCurrent();
        if (!isMember[msg.sender]) revert NotMember();
        if (isKicked[msg.sender]) revert NotMember();
        if (hasWon[msg.sender]) revert AlreadyWon();

        Round storage round = rounds[roundId];
        if (block.timestamp > round.endTime) revert RoundEnded();
        if (round.contributions[msg.sender] != contributionAmount) revert AlreadyContributed();
        if (bidAmount == 0) revert InsufficientBid();

        uint256 currentBid = round.bids[msg.sender];
        if (bidAmount <= currentBid) revert InsufficientBid();

        uint256 delta = bidAmount - currentBid;
        round.bids[msg.sender] = bidAmount;

        usdc.safeTransferFrom(msg.sender, address(this), delta);

        emit BidPlaced(roundId, msg.sender, bidAmount);
    }

    /// @notice Settle the current round, awarding the pot to the highest bidder (or refunding if no bids).
    /// @dev Permissionless: anyone may settle after the deadline or when early settlement conditions hold.
    /// Cycle completion check `(currentRound - cycleStartRound) >= members.length` tracks the number of
    /// rounds elapsed within the current cycle (since `cycleStartRound` is set to the previous cycle's last round).
    function settleRound(uint256 roundId) external nonReentrant {
        if (state != GroupState.ACTIVE) revert GroupNotActive();
        if (roundId != currentRound) revert RoundNotCurrent();

        Round storage round = rounds[roundId];
        if (round.settled) revert InvalidConfiguration();

        bool hasBid = _hasAtLeastOneBid(roundId);
        bool canEarlySettle = _allRemainingContributedOrKicked(roundId) && hasBid;
        if (block.timestamp <= round.endTime && !canEarlySettle) revert RoundStillOpen();

        uint256 totalPot;
        uint256 totalBids;
        uint256 highestBid;
        address winner;
        uint256 roundSlashed;

        uint256 memberCount = members.length;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = members[i];
            if (isKicked[member]) continue;

            uint256 contribution = round.contributions[member];
            if (contribution != contributionAmount) {
                isKicked[member] = true;
                round.kicked[member] = true;
                if (activeMembers > 0) activeMembers -= 1;
                emit MemberKicked(roundId, member);
                roundSlashed += _slashCollateral(roundId, member);
                continue;
            }

            totalPot += contribution;

            if (hasWon[member]) {
                continue;
            }
            uint256 bid = round.bids[member];
            totalBids += bid;

            if (
                winner == address(0) ||
                bid > highestBid ||
                (bid == highestBid && memberIndexPlusOne[member] < memberIndexPlusOne[winner])
            ) {
                winner = member;
                highestBid = bid;
            }
        }

        if (roundSlashed > 0) {
            _distributeSlashedCirBtc(roundId, roundSlashed);
        }

        // Checks + effects first
        round.settled = true;
        round.totalPot = totalPot;
        round.totalBids = totalBids;
        round.winner = winner;

        if (winner != address(0)) {
            hasWon[winner] = true;
            if (activeMembers > 0) activeMembers -= 1;
        }

        // Complete when no eligible members remain (all won or kicked), or all rounds in current cycle done.
        bool noEligibleLeft = activeMembers == 0;
        if (noEligibleLeft || (currentRound - cycleStartRound) >= members.length) {
            state = GroupState.COMPLETED;
        } else {
            currentRound += 1;
            Round storage nextRound = rounds[currentRound];
            nextRound.startTime = block.timestamp;
            nextRound.endTime = block.timestamp + roundDuration;
        }

        if (winner != address(0)) {
            uint256 winnerBid = round.bids[winner];
            uint256 remainder = _distributeBonuses(roundId, winner, totalBids - winnerBid);
            uint256 winnerPayout = totalPot + winnerBid + remainder;
            claimable[winner] += winnerPayout;
            emit RoundSettled(roundId, winner, totalPot, winnerBid);
        } else {
            // Credit no-winner refunds without growing the settlement stack.
            _refundRound(roundId, false);
            emit RoundSettled(roundId, address(0), 0, 0);
        }
    }

    /// @dev Distributes `distributableBonus` equally among non-winner contributors.
    /// Returns any dust remainder (from integer division) to be added to winner payout.
    function _distributeBonuses(
        uint256 roundId,
        address winner,
        uint256 distributableBonus
    ) internal returns (uint256 remainder) {
        if (distributableBonus == 0) return 0;
        uint256 memberCount = members.length;
        uint256 recipientCount;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = members[i];
            if (member == winner) continue;
            if (isKicked[member] || hasWon[member]) continue;
            if (rounds[roundId].contributions[member] == contributionAmount) {
                recipientCount += 1;
            }
        }
        if (recipientCount == 0) return distributableBonus;
        uint256 equalShare = distributableBonus / recipientCount;
        if (equalShare == 0) return distributableBonus;
        uint256 distributed;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = members[i];
            if (member == winner) continue;
            if (isKicked[member] || hasWon[member]) continue;
            if (rounds[roundId].contributions[member] == contributionAmount) {
                claimable[member] += equalShare;
                distributed += equalShare;
            }
        }
        remainder = distributableBonus - distributed;
    }

    function kickDefaulter(uint256 roundId, address member) external {
        if (state != GroupState.ACTIVE) revert GroupNotActive();
        if (roundId != currentRound) revert RoundNotCurrent();
        if (!isMember[member]) revert NotMember();
        if (hasWon[member]) revert AlreadyWon();

        Round storage round = rounds[roundId];
        if (block.timestamp <= round.endTime) revert RoundStillOpen();
        if (round.contributions[member] == contributionAmount) revert AlreadyContributed();
        if (round.kicked[member] || isKicked[member]) revert InvalidConfiguration();

        round.kicked[member] = true;
        isKicked[member] = true;
        if (activeMembers > 0) activeMembers -= 1;

        emit MemberKicked(roundId, member);
    }

    function claimPayout() external nonReentrant {
        if (!isMember[msg.sender]) revert NotMember();

        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NoPayout();

        claimable[msg.sender] = 0;

        usdc.safeTransfer(msg.sender, amount);
        emit PayoutClaimed(msg.sender, amount);
    }

    /// @notice TASK-043: Claim back deposited CirBTC collateral + dividend shares from slashed defaulters
    function claimCollateral() external nonReentrant {
        if (!isMember[msg.sender]) revert NotMember();
        if (isKicked[msg.sender]) revert MemberWasKicked();
        if (state != GroupState.COMPLETED && state != GroupState.CANCELLED) revert GroupNotFinished();

        uint256 refundAmount = cirBtcCollateral[msg.sender];
        uint256 rewardShare = claimableCirBtc[msg.sender];
        uint256 totalClaim = refundAmount + rewardShare;
        if (totalClaim == 0) revert NoPayout();

        cirBtcCollateral[msg.sender] = 0;
        claimableCirBtc[msg.sender] = 0;

        cirBtc.safeTransfer(msg.sender, totalClaim);
        emit CollateralClaimed(msg.sender, totalClaim);
    }

    /// @notice TASK-043: Inspect member's CirBTC collateral status
    function getMemberCollateralStatus(address member) external view returns (
        uint256 lockedCollateral,
        uint256 claimableReward,
        bool eligibleToClaim
    ) {
        lockedCollateral = cirBtcCollateral[member];
        claimableReward = claimableCirBtc[member];
        eligibleToClaim = isMember[member] && !isKicked[member] && (state == GroupState.COMPLETED || state == GroupState.CANCELLED);
    }

    function requiredCancelVotes() public view returns (uint256) {
        uint256 count = members.length;
        if (count <= 1) return 1;
        return (count / 2) + 1;
    }

    /// @dev Refunds current contributions/bids exactly once on ACTIVE cancellation.
    function _refundCurrentRoundIfActive() internal {
        if (state != GroupState.ACTIVE || rounds[currentRound].settled) return;
        _refundRound(currentRound, true);
    }

    function _refundRound(uint256 roundId, bool clearBalances) internal {
        Round storage round = rounds[roundId];
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            uint256 refundAmount = round.contributions[member] + round.bids[member];
            if (refundAmount == 0) continue;
            if (clearBalances) {
                round.contributions[member] = 0;
                round.bids[member] = 0;
            }
            claimable[member] += refundAmount;
            emit ContributionRefunded(roundId, member, refundAmount);
        }
    }

    function voteCancelGroup() external {
        if (state != GroupState.OPEN && state != GroupState.ACTIVE) revert GroupNotOpen();
        if (!isMember[msg.sender] && msg.sender != owner()) revert NotMember();
        if (hasVotedCancel[msg.sender]) revert AlreadyVotedCancel();

        hasVotedCancel[msg.sender] = true;
        cancelVoteCount += 1;
        uint256 req = requiredCancelVotes();
        emit CancelVoteCast(msg.sender, cancelVoteCount, req);

        if (cancelVoteCount >= req) {
            _refundCurrentRoundIfActive();
            state = GroupState.CANCELLED;
            emit GroupCancelled();
        }
    }

    function cancelGroup() external onlyGroupOwner {
        if (state != GroupState.OPEN && state != GroupState.ACTIVE) revert GroupNotOpen();
        if (!hasVotedCancel[msg.sender]) {
            hasVotedCancel[msg.sender] = true;
            cancelVoteCount += 1;
        }
        uint256 req = requiredCancelVotes();
        emit CancelVoteCast(msg.sender, cancelVoteCount, req);

        if (members.length <= 1 || cancelVoteCount >= req) {
            _refundCurrentRoundIfActive();
            state = GroupState.CANCELLED;
            emit GroupCancelled();
        }
    }

    function renounceOwnership() public view override onlyOwner {
        revert RenounceOwnershipDisabled();
    }

    function getRoundSummary(
        uint256 roundId
    )
        external
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            address winner,
            uint256 totalPot,
            uint256 totalBids,
            bool settled
        )
    {
        Round storage round = rounds[roundId];
        return (round.startTime, round.endTime, round.winner, round.totalPot, round.totalBids, round.settled);
    }

    function getRoundContribution(uint256 roundId, address member) external view returns (uint256) {
        return rounds[roundId].contributions[member];
    }

    function getRoundBid(uint256 roundId, address member) external view returns (uint256) {
        return rounds[roundId].bids[member];
    }

    function wasKickedInRound(uint256 roundId, address member) external view returns (bool) {
        return rounds[roundId].kicked[member];
    }

    function _hasAtLeastOneBid(uint256 roundId) internal view returns (bool) {
        uint256 memberCount = members.length;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = members[i];
            if (isKicked[member] || hasWon[member]) continue;
            if (rounds[roundId].bids[member] > 0) {
                return true;
            }
        }
        return false;
    }

    function _allRemainingContributedOrKicked(uint256 roundId) internal view returns (bool) {
        uint256 memberCount = members.length;
        for (uint256 i = 0; i < memberCount; i++) {
            address member = members[i];

            if (isKicked[member]) continue;

            if (rounds[roundId].kicked[member]) continue;

            if (rounds[roundId].contributions[member] != contributionAmount) {
                return false;
            }
        }
        return true;
    }
}
