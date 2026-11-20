// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BondedTontine, AggregatorV3Interface} from "./BondedTontine.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title BondedTontineFactory
/// @notice Immutable factory that supplies canonical USDC, CirBTC, Chainlink-compatible BTC/USD price feed,
/// and maxPriceAge to every BondedTontine club so club owners cannot inject a fake oracle feed.
contract BondedTontineFactory {
    error InvalidConfiguration();
    error NameTaken();

    address public immutable usdc;
    address public immutable cirBtc;
    address public immutable priceFeed;
    uint256 public immutable maxPriceAge;

    mapping(address => bool) public isClub;
    address[] private _clubs;
    /// @notice Group names already used on this factory, keyed by nameKey() (ASCII case-insensitive).
    mapping(bytes32 => bool) public nameTaken;

    event ClubCreated(address indexed club, address indexed owner, string groupName);

    constructor(
        address usdc_,
        address cirBtc_,
        address priceFeed_,
        uint256 maxPriceAge_
    ) {
        if (
            usdc_ == address(0) ||
            cirBtc_ == address(0) ||
            usdc_ == cirBtc_ ||
            priceFeed_ == address(0) ||
            maxPriceAge_ < 1 hours ||
            maxPriceAge_ > 48 hours
        ) {
            revert InvalidConfiguration();
        }

        uint8 usdcDec;
        try IERC20Metadata(usdc_).decimals() returns (uint8 d) {
            usdcDec = d;
        } catch {
            revert InvalidConfiguration();
        }
        if (usdcDec != 6) revert InvalidConfiguration();

        uint8 cirBtcDec;
        try IERC20Metadata(cirBtc_).decimals() returns (uint8 d) {
            cirBtcDec = d;
        } catch {
            revert InvalidConfiguration();
        }
        if (cirBtcDec != 8) revert InvalidConfiguration();

        uint8 dec;
        try AggregatorV3Interface(priceFeed_).decimals() returns (uint8 d) {
            dec = d;
        } catch {
            revert InvalidConfiguration();
        }
        if (dec > 18) revert InvalidConfiguration();

        usdc = usdc_;
        cirBtc = cirBtc_;
        priceFeed = priceFeed_;
        maxPriceAge = maxPriceAge_;
    }

    function createClub(
        string calldata groupName,
        uint256 contributionAmount,
        uint256 maxMembers,
        uint256 totalRounds,
        uint256 roundDuration,
        uint256 rateBpsPerRound,
        uint256 safetyBps,
        uint256 interestGrace,
        uint256 settlementGrace
    ) external returns (address club) {
        bytes32 key = nameKey(groupName);
        if (nameTaken[key]) revert NameTaken();
        nameTaken[key] = true;
        club = address(
            new BondedTontine(
                msg.sender,
                usdc,
                cirBtc,
                priceFeed,
                maxPriceAge,
                groupName,
                contributionAmount,
                maxMembers,
                totalRounds,
                roundDuration,
                rateBpsPerRound,
                safetyBps,
                interestGrace,
                settlementGrace
            )
        );
        isClub[club] = true;
        _clubs.push(club);
        emit ClubCreated(club, msg.sender, groupName);
    }

    /// @notice Case-insensitive key for a group name: ASCII A-Z are lowercased before hashing.
    function nameKey(string memory groupName) public pure returns (bytes32) {
        bytes memory b = bytes(groupName);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (c >= 0x41 && c <= 0x5A) {
                b[i] = bytes1(uint8(c) + 32);
            }
        }
        return keccak256(b);
    }

    function isNameAvailable(string calldata groupName) external view returns (bool) {
        return !nameTaken[nameKey(groupName)];
    }

    function clubsLength() external view returns (uint256) {
        return _clubs.length;
    }

    function clubAt(uint256 i) external view returns (address) {
        return _clubs[i];
    }
}
