// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KOLSwap
 * @notice OnchainKOL post-graduation AMM — own DEX on Robinhood Chain
 * @dev x*y=k pools. Creator + KOL earn forever after graduation.
 *      Only platform (owner) can create pools — triggered by graduation.
 *
 * Same fee split as BondingCurve:
 *   0.90% → Platform
 *   0.15% → Token creator (royalty forever)
 *   0.15% → KOL reward pool
 *   0.05% → Referrer
 */
contract KOLSwap is ReentrancyGuard, Ownable, Pausable {

    using SafeERC20 for IERC20;

    // ── Fee constants ─────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS  = 90;
    uint256 public constant CREATOR_FEE_BPS   = 15;
    uint256 public constant KOL_POOL_FEE_BPS  = 15;
    uint256 public constant REFERRAL_FEE_BPS  = 5;
    uint256 public constant BPS_DENOMINATOR   = 10000;
    uint256 public constant TOTAL_FEE_BPS     = 125;
    uint256 public constant MIN_TRADE         = 0.01 ether;

    // ── KOL reward multipliers ────────────────────────────────
    uint256 public constant KOL_MULTIPLIER_BPS      = 10000; // 1.0x
    uint256 public constant PRO_KOL_MULTIPLIER_BPS  = 12500; // 1.25x
    uint256 public constant GOLD_KOL_MULTIPLIER_BPS = 15000; // 1.5x

    // ── Hardcoded fee wallets ─────────────────────────────────
    address payable public immutable PLATFORM_FEE_WALLET;
    address payable public immutable KOL_POOL_WALLET;

    // ── Pool state ────────────────────────────────────────────
    struct Pool {
        address token;
        address payable creator;
        uint256 ethReserve;
        uint256 tokenReserve;
        uint256 totalVolumeUsd;
        uint256 totalFeesEth;
        bool    isActive;
        uint256 createdAt;
    }

    mapping(address => Pool) public pools; // token → pool

    // ── Events ────────────────────────────────────────────────
    event PoolCreated(
        address indexed token,
        address indexed creator,
        uint256 initialEth,
        uint256 initialTokens,
        uint256 timestamp
    );
    event SwapExecuted(
        address indexed token,
        address indexed user,
        uint256 ethIn,
        uint256 tokensOut,
        bool    isBuy,
        uint256 newPrice,
        uint256 timestamp
    );
    event KolRewardPaid(
        address indexed kol,
        uint256 amount,
        uint8   badgeTier,
        uint256 timestamp
    );
    event PoolDeactivated(address indexed token, uint256 timestamp);

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address payable _platformFeeWallet,
        address payable _kolPoolWallet
    ) Ownable(msg.sender) {
        require(_platformFeeWallet != address(0), "Invalid platform wallet");
        require(_kolPoolWallet != address(0),     "Invalid KOL pool wallet");
        PLATFORM_FEE_WALLET = _platformFeeWallet;
        KOL_POOL_WALLET     = _kolPoolWallet;
    }

    // ── Create pool — platform only ───────────────────────────
    // Called automatically when token graduates from BondingCurve
    function createPool(
        address token,
        address payable creator,
        uint256 tokenAmount
    ) external payable onlyOwner nonReentrant {
        require(pools[token].token == address(0), "Pool exists");
        require(msg.value > 0,                    "Zero ETH");
        require(tokenAmount > 0,                  "Zero tokens");
        require(creator != address(0),            "Invalid creator");

        // Pull tokens from bonding curve
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        pools[token] = Pool({
            token:          token,
            creator:        creator,
            ethReserve:     msg.value,
            tokenReserve:   tokenAmount,
            totalVolumeUsd: 0,
            totalFeesEth:   0,
            isActive:       true,
            createdAt:      block.timestamp
        });

        emit PoolCreated(token, creator, msg.value, tokenAmount, block.timestamp);
    }

    // ── Buy tokens on KOLSwap ─────────────────────────────────
    function swapEthForTokens(
        address token,
        uint256 minTokensOut,
        address referrer,
        uint256 ethPriceUsd
    ) external payable nonReentrant whenNotPaused {
        Pool storage pool = pools[token];
        require(pool.isActive,          "Pool not active");
        require(msg.value >= MIN_TRADE, "Below minimum");

        uint256 ethIn       = msg.value;
        uint256 platformFee = ethIn * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        uint256 creatorFee  = ethIn * CREATOR_FEE_BPS  / BPS_DENOMINATOR;
        uint256 kolFee      = ethIn * KOL_POOL_FEE_BPS / BPS_DENOMINATOR;
        uint256 referralFee = ethIn * REFERRAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 totalFees   = platformFee + creatorFee + kolFee + referralFee;
        uint256 ethAfterFees = ethIn - totalFees;

        // x*y=k: tokens_out = token_reserve * eth_after / (eth_reserve + eth_after)
        uint256 newEthReserve = pool.ethReserve + ethAfterFees;
        uint256 tokensOut = pool.tokenReserve * ethAfterFees / newEthReserve;

        require(tokensOut > 0,             "Zero tokens out");
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut < pool.tokenReserve, "Insufficient liquidity");

        // Distribute fees
        _distributeFees(pool.creator, referrer, platformFee, creatorFee, kolFee, referralFee);

        // Update reserves
        pool.ethReserve    = newEthReserve;
        pool.tokenReserve -= tokensOut;
        pool.totalFeesEth += totalFees;

        // Track volume
        uint256 volumeUsd = ethIn * ethPriceUsd / 1e18;
        pool.totalVolumeUsd += volumeUsd;

        // Transfer tokens to buyer
        IERC20(token).safeTransfer(msg.sender, tokensOut);

        emit SwapExecuted(token, msg.sender, ethIn, tokensOut, true, _getPoolPrice(pool), block.timestamp);
    }

    // ── Sell tokens on KOLSwap ────────────────────────────────
    function swapTokensForEth(
        address token,
        uint256 tokensIn,
        uint256 minEthOut,
        address referrer,
        uint256 ethPriceUsd
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[token];
        require(pool.isActive, "Pool not active");
        require(tokensIn > 0,  "Zero tokens in");

        // eth_out = eth_reserve * tokens_in / (token_reserve + tokens_in)
        uint256 newTokenReserve = pool.tokenReserve + tokensIn;
        uint256 ethOut = pool.ethReserve * tokensIn / newTokenReserve;

        require(ethOut > 0,              "Zero ETH out");
        require(ethOut <= pool.ethReserve, "Insufficient liquidity");

        uint256 platformFee  = ethOut * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        uint256 creatorFee   = ethOut * CREATOR_FEE_BPS  / BPS_DENOMINATOR;
        uint256 kolFee       = ethOut * KOL_POOL_FEE_BPS / BPS_DENOMINATOR;
        uint256 referralFee  = ethOut * REFERRAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 totalFees    = platformFee + creatorFee + kolFee + referralFee;
        uint256 ethAfterFees = ethOut - totalFees;

        require(ethAfterFees >= minEthOut, "Slippage exceeded");

        // Pull tokens FIRST (checks-effects-interactions)
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);

        // Update reserves
        pool.tokenReserve  = newTokenReserve;
        pool.ethReserve   -= ethOut;
        pool.totalFeesEth += totalFees;

        // Track volume
        uint256 volumeUsd = ethOut * ethPriceUsd / 1e18;
        pool.totalVolumeUsd += volumeUsd;

        // Distribute fees then send ETH to seller
        _distributeFees(pool.creator, referrer, platformFee, creatorFee, kolFee, referralFee);
        payable(msg.sender).transfer(ethAfterFees);

        emit SwapExecuted(token, msg.sender, tokensIn, ethAfterFees, false, _getPoolPrice(pool), block.timestamp);
    }

    // ── Pay KOL reward — platform only ───────────────────────
    function payKolReward(
        address payable kolWallet,
        uint256 baseReward,
        uint8   badgeTier
    ) external onlyOwner nonReentrant {
        require(kolWallet != address(0),   "Invalid KOL wallet");
        require(baseReward > 0,            "Zero reward");
        require(badgeTier >= 1 && badgeTier <= 3, "Invalid badge tier");
        require(address(this).balance >= baseReward, "Insufficient balance");

        // Apply badge multiplier
        uint256 multiplier = badgeTier == 3
            ? GOLD_KOL_MULTIPLIER_BPS
            : badgeTier == 2
                ? PRO_KOL_MULTIPLIER_BPS
                : KOL_MULTIPLIER_BPS;

        uint256 finalReward = baseReward * multiplier / 10000;
        require(address(KOL_POOL_WALLET).balance >= finalReward, "Insufficient KOL pool");

        kolWallet.transfer(finalReward);

        emit KolRewardPaid(kolWallet, finalReward, badgeTier, block.timestamp);
    }

    // ── Deactivate pool — platform only ──────────────────────
    function deactivatePool(address token) external onlyOwner {
        pools[token].isActive = false;
        emit PoolDeactivated(token, block.timestamp);
    }

    // ── Internal helpers ──────────────────────────────────────
    function _distributeFees(
        address payable creator,
        address referrer,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 kolFee,
        uint256 referralFee
    ) internal {
        PLATFORM_FEE_WALLET.transfer(platformFee);
        KOL_POOL_WALLET.transfer(kolFee);
        creator.transfer(creatorFee);

        if (referrer != address(0) && referrer != msg.sender) {
            payable(referrer).transfer(referralFee);
        } else {
            PLATFORM_FEE_WALLET.transfer(referralFee);
        }
    }

    function _getPoolPrice(Pool storage pool) internal view returns (uint256) {
        if (pool.tokenReserve == 0) return 0;
        return pool.ethReserve * 1e18 / pool.tokenReserve;
    }

    // ── View functions ────────────────────────────────────────
    function getPool(address token) external view returns (Pool memory) {
        return pools[token];
    }

    function getPoolPrice(address token) external view returns (uint256) {
        return _getPoolPrice(pools[token]);
    }

    function quoteTokensOut(address token, uint256 ethIn) external view returns (uint256) {
        Pool storage pool = pools[token];
        if (!pool.isActive) return 0;
        uint256 totalFees    = ethIn * TOTAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethIn - totalFees;
        uint256 newEthReserve = pool.ethReserve + ethAfterFees;
        return pool.tokenReserve * ethAfterFees / newEthReserve;
    }

    function quoteEthOut(address token, uint256 tokensIn) external view returns (uint256) {
        Pool storage pool = pools[token];
        if (!pool.isActive) return 0;
        uint256 newTokenReserve = pool.tokenReserve + tokensIn;
        uint256 ethOut = pool.ethReserve * tokensIn / newTokenReserve;
        uint256 totalFees = ethOut * TOTAL_FEE_BPS / BPS_DENOMINATOR;
        return ethOut - totalFees;
    }

    // ── Pause / unpause ───────────────────────────────────────
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}
