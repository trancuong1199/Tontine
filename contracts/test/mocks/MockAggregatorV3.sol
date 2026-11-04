// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockAggregatorV3
/// @notice Chainlink AggregatorV3-compatible mock oracle for local tests and Arc Testnet only.
/// Never deploy to mainnet; description() must start with "MOCK".
contract MockAggregatorV3 {
    error OnlyAdmin();
    error InvalidDescription();

    uint8 public immutable decimals;
    string public description;
    uint256 public constant version = 1;
    address public immutable admin;

    uint80 private _roundId;
    int256 private _answer;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(uint8 decimals_, int256 initialAnswer, string memory description_) {
        bytes memory descBytes = bytes(description_);
        if (
            descBytes.length < 4 ||
            descBytes[0] != "M" ||
            descBytes[1] != "O" ||
            descBytes[2] != "C" ||
            descBytes[3] != "K"
        ) {
            revert InvalidDescription();
        }
        decimals = decimals_;
        description = description_;
        admin = msg.sender;
        _roundId = 1;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _answeredInRound = 1;
    }

    function setPrice(int256 answer) external onlyAdmin {
        _roundId += 1;
        _answer = answer;
        _updatedAt = block.timestamp;
        _answeredInRound = _roundId;
    }

    function setUpdatedAt(uint256 ts) external onlyAdmin {
        _updatedAt = ts;
    }

    function setBad(int256 answer) external onlyAdmin {
        _answer = answer;
    }

    function setAnsweredInRound(uint80 answeredInRound_) external onlyAdmin {
        _answeredInRound = answeredInRound_;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _answeredInRound);
    }
}
