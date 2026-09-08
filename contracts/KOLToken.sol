// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KOLToken
 * @notice ERC20 token deployed by BondingCurve on each launch
 * @dev Fixed supply. Mint authority held by BondingCurve contract.
 *      Mint authority is renounced after initial supply minted.
 */
contract KOLToken is ERC20, Ownable {

    string public uri;      // metadata URI (image, socials)
    uint256 public immutable LAUNCH_TIME;

    constructor(
        string memory name,
        string memory symbol,
        string memory _uri,
        address bondingCurve,
        uint256 totalSupply
    ) ERC20(name, symbol) Ownable(bondingCurve) {
        uri = _uri;
        LAUNCH_TIME = block.timestamp;

        // Mint entire supply to bonding curve
        _mint(bondingCurve, totalSupply);

        // Ownership stays with BondingCurve so it can transfer tokens
        // Mint authority is not retained — no more minting possible
    }

    // ── No mint function — fixed supply forever ───────────────
    // Total supply is set at deployment and cannot change
}
