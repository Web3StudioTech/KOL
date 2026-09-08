// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./KOLToken.sol";

/**
 * Platform wallet:  0x9649353758F1496c97CdC70bAd4fB5bE44b03d59
 * KOL pool wallet: 0xDfAe28f1d849648CA69B6570CeE2ae1C901eC3Cc
 *
 * @title BondingCurve
 * @notice OnchainKOL token launchpad on Robinhood Chain
 *
 * Every token deployed ends in ...6b6f6c (kol in hex)
 * using CREATE2 with browser-mined salt — zero cost.
 *
 * Fee split (1% total per trade):
 *   0.70% → Platform fee wallet
 *   0.15% → Token creator (royalty forever)
 *   0.10% → KOL reward pool
 *   0.05% → Referrer (or platform if none)
 *
 * KOL calls: free, max 3/day, both bonding + KOLSwap phases
 * Graduation: $69K market cap → KOLSwap
 * KOL Pass:   $1M cumulative volume, max 10,000 FCFS
 */
contract BondingCurve is ReentrancyGuard, Ownable, Pausable {

    using SafeERC20 for IERC20;

    // ── Fee constants — 1% total ──────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS = 25;   // 0.25%   // 0.70%
    uint256 public constant CREATOR_FEE_BPS  = 70;   // 0.70%   // 0.15%
    uint256 public constant KOL_FEE_BPS      = 5;    // 0.05%   // 0.10%
    uint256 public constant REFERRAL_FEE_BPS = 5;    // 0.05%
    uint256 public constant TOTAL_FEE_BPS    = 100;  // 1.00%
    uint256 public constant BPS_DENOMINATOR  = 10000;

    // ── Bonding curve constants ───────────────────────────────
    uint256 public constant INITIAL_VIRTUAL_ETH    = 30 ether;
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 1_073_000_000 * 1e18;
    uint256 public constant TOTAL_SUPPLY           = 1_000_000_000 * 1e18;
    uint256 public constant LAUNCH_FEE             = 0.02 ether;
    uint256 public constant MIN_TRADE              = 0.001 ether;
    uint256 public constant GRADUATION_USD_TARGET  = 69_000;

    // ── KOL call constants ────────────────────────────────────
    uint256 public constant MAX_CALLS_PER_DAY    = 3;
    uint256 public constant KOL_MIN_FOLLOWERS    = 5000;
    uint256 public constant TRADER_VOLUME_USD    = 50_000; // $50K for Trader badge

    // ── Rug detection ─────────────────────────────────────────
    uint256 public constant RUG_SELL_BPS         = 5000;  // 50%

    // ── KOL Pass ──────────────────────────────────────────────
    uint256 public constant KOL_PASS_VOLUME_USD  = 1_000_000; // $1M
    uint256 public constant KOL_PASS_MAX         = 10_000;

    // ── Vanity address suffix — "kol" in hex ─────────────────
    // Every deployed token address ends in 0x6b6f6c
    uint24  public constant KOL_SUFFIX           = 0x6b6f6c;

    // ── Hardcoded fee wallets ─────────────────────────────────
    address payable public immutable PLATFORM_WALLET;
    address payable public immutable KOL_POOL_WALLET;

    // ── Platform state ────────────────────────────────────────
    uint256 public totalTokensLaunched;
    uint256 public totalVolumeUsd;
    uint256 public kolPassesIssued;
    address public kolSwapAddress;
    address public kolPassAddress;

    // ── Curve state per token ─────────────────────────────────
    struct Curve {
        address token;
        address payable creator;
        uint256 virtualEth;
        uint256 virtualTokens;
        uint256 realEth;
        uint256 realTokens;
        uint256 totalVolumeUsd;
        bool    isGraduated;
        bool    isRugFlagged;
        bool    kolPassEarned;
        uint256 kolPassNumber;
        uint256 createdAt;
    }

    // ── KOL state ─────────────────────────────────────────────
    struct KOL {
        bool    isVerified;
        bool    isBanned;
        uint256 followerCount;
        uint256 totalCallsAllTime;
        uint256 callsToday;
        uint256 lastCallDay;     // unix day number
        uint256 accurateCallCount;
        uint256 totalCallCount;
    }

    // ── Trader state ──────────────────────────────────────────
    struct Trader {
        uint256 totalVolumeUsd;
        bool    hasBadge;        // Trader badge at $50K
    }

    // ── KOL Call state ────────────────────────────────────────
    struct KolCall {
        address kol;
        address token;
        string  thesis;
        uint256 priceAtCall;
        uint256 mktcapUsdAtCall;
        uint8   accuracyStatus; // 0=pending 1=hit 2=partial 3=miss
        bool    rewardPaid;
        uint256 calledAt;
        bool    isGraduatedCall; // true if called on KOLSwap phase
    }

    // ── Mappings ──────────────────────────────────────────────
    mapping(address => Curve)   public curves;
    mapping(address => KOL)     public kols;
    mapping(address => Trader)  public traders;
    mapping(bytes32 => KolCall) public kolCalls;

    // token → list of call IDs
    mapping(address => bytes32[]) public tokenCalls;

    // kol → token → already called
    mapping(address => mapping(address => bool)) public hasCalledToken;

    // kol → day → call count (extra safety check)
    mapping(address => mapping(uint256 => uint256)) public dailyCallCount;

    // ── Events ────────────────────────────────────────────────
    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string ticker,
        uint256 timestamp
    );
    event TokensBought(
        address indexed token,
        address indexed buyer,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 newPrice,
        uint256 timestamp
    );
    event TokensSold(
        address indexed token,
        address indexed seller,
        uint256 tokensIn,
        uint256 ethOut,
        uint256 newPrice,
        uint256 timestamp
    );
    event TokenGraduated(
        address indexed token,
        uint256 totalEth,
        uint256 totalVolumeUsd,
        uint256 timestamp
    );
    event RugDetected(
        address indexed token,
        address indexed creator,
        string  trigger,
        uint256 timestamp
    );
    event KolPassEarned(
        address indexed token,
        address indexed creator,
        uint256 passNumber,
        uint256 totalVolumeUsd,
        uint256 timestamp
    );
    event KolCallSubmitted(
        bytes32 indexed callId,
        address indexed kol,
        address indexed token,
        uint256 priceAtCall,
        string  thesis,
        uint256 timestamp
    );
    event KolCallResolved(
        bytes32 indexed callId,
        uint8   status,
        uint256 multiplier,
        uint256 timestamp
    );
    event KolVerified(address indexed kol, uint256 followerCount, uint256 timestamp);
    event TraderBadgeEarned(address indexed trader, uint256 totalVolumeUsd, uint256 timestamp);

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address payable _platformWallet,
        address payable _kolPoolWallet
    ) Ownable(msg.sender) {
        require(_platformWallet  != address(0), "Invalid platform wallet");
        require(_kolPoolWallet   != address(0), "Invalid KOL pool wallet");
        PLATFORM_WALLET  = _platformWallet;
        KOL_POOL_WALLET  = _kolPoolWallet;
    }

    // ── Launch token with CREATE2 vanity address ──────────────
    /**
     * @param name     Token name
     * @param ticker   Token ticker
     * @param uri      Metadata URI (image, socials stored offchain)
     * @param salt     Browser-mined salt that produces ...kol address
     */
    function launchToken(
        string  calldata name,
        string  calldata ticker,
        string  calldata uri,
        bytes32          salt
    ) external payable nonReentrant whenNotPaused returns (address tokenAddr) {
        require(msg.value >= LAUNCH_FEE,             "Insufficient launch fee");
        require(bytes(name).length   > 0 && bytes(name).length   <= 32, "Invalid name");
        require(bytes(ticker).length > 0 && bytes(ticker).length <= 10, "Invalid ticker");

        // Deploy token using CREATE2 with browser-mined salt
        bytes memory bytecode = abi.encodePacked(
            type(KOLToken).creationCode,
            abi.encode(name, ticker, uri, address(this), TOTAL_SUPPLY)
        );

        assembly {
            tokenAddr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(tokenAddr != address(0), "Deploy failed");

        // Verify address ends in ...kol (0x6b6f6c)
        require(
            uint24(uint160(tokenAddr)) == KOL_SUFFIX,
            "Address does not end in kol — mine a new salt"
        );

        // Initialize curve
        Curve storage curve  = curves[tokenAddr];
        curve.token          = tokenAddr;
        curve.creator        = payable(msg.sender);
        curve.virtualEth     = INITIAL_VIRTUAL_ETH;
        curve.virtualTokens  = INITIAL_VIRTUAL_TOKENS;
        curve.realEth        = 0;
        curve.realTokens     = 0;
        curve.totalVolumeUsd = 0;
        curve.isGraduated    = false;
        curve.isRugFlagged   = false;
        curve.kolPassEarned  = false;
        curve.kolPassNumber  = 0;
        curve.createdAt      = block.timestamp;

        // Send launch fee to platform
        PLATFORM_WALLET.transfer(LAUNCH_FEE);

        // Refund excess ETH
        if (msg.value > LAUNCH_FEE) {
            payable(msg.sender).transfer(msg.value - LAUNCH_FEE);
        }

        totalTokensLaunched++;

        emit TokenLaunched(tokenAddr, msg.sender, name, ticker, block.timestamp);
    }

    // ── Buy tokens ────────────────────────────────────────────
    function buy(
        address token,
        uint256 minTokensOut,
        address referrer,
        uint256 ethPriceUsd   // from Chainlink, passed by frontend
    ) external payable nonReentrant whenNotPaused {
        Curve storage curve = curves[token];
        require(curve.token    != address(0), "Token not found");
        require(!curve.isGraduated,           "Token graduated to KOLSwap");
        require(!curve.isRugFlagged,          "Token rug flagged");
        require(msg.value      >= MIN_TRADE,  "Below minimum trade");

        uint256 ethIn        = msg.value;
        uint256 platformFee  = ethIn * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        uint256 creatorFee   = ethIn * CREATOR_FEE_BPS  / BPS_DENOMINATOR;
        uint256 kolFee       = ethIn * KOL_FEE_BPS      / BPS_DENOMINATOR;
        uint256 referralFee  = ethIn * REFERRAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethIn - platformFee - creatorFee - kolFee - referralFee;

        // x*y=k
        uint256 newVirtualEth = curve.virtualEth + ethAfterFees;
        uint256 tokensOut     = curve.virtualTokens * ethAfterFees / newVirtualEth;

        require(tokensOut > 0,                    "Zero tokens out");
        require(tokensOut >= minTokensOut,        "Slippage exceeded");
        require(tokensOut <= curve.virtualTokens, "Insufficient liquidity");

        // Distribute fees
        _distributeFees(curve.creator, referrer, platformFee, creatorFee, kolFee, referralFee);

        // Update curve
        curve.virtualEth     = newVirtualEth;
        curve.realEth       += ethAfterFees;
        curve.virtualTokens -= tokensOut;
        curve.realTokens    += tokensOut;

        // Track volume
        uint256 volumeUsd    = ethIn * ethPriceUsd / 1e18;
        curve.totalVolumeUsd += volumeUsd;
        totalVolumeUsd       += volumeUsd;

        // Track trader volume + badge
        _trackTraderVolume(msg.sender, volumeUsd);

        // Transfer tokens
        IERC20(token).transfer(msg.sender, tokensOut);

        // Check graduation
        uint256 marketCapUsd = _computeMarketCap(curve, ethPriceUsd);
        if (marketCapUsd >= GRADUATION_USD_TARGET && !curve.isGraduated) {
            curve.isGraduated = true;
            emit TokenGraduated(token, curve.realEth, curve.totalVolumeUsd, block.timestamp);
        }

        // Check KOL Pass milestone
        _checkKolPass(curve, token);

        emit TokensBought(token, msg.sender, ethIn, tokensOut, _getPrice(curve), block.timestamp);
    }

    // ── Sell tokens ───────────────────────────────────────────
    function sell(
        address token,
        uint256 tokensIn,
        uint256 minEthOut,
        address referrer,
        uint256 ethPriceUsd
    ) external nonReentrant whenNotPaused {
        Curve storage curve = curves[token];
        require(curve.token != address(0), "Token not found");
        require(!curve.isGraduated,        "Token graduated to KOLSwap");
        require(tokensIn > 0,              "Zero tokens in");

        uint256 newVirtualTokens = curve.virtualTokens + tokensIn;
        uint256 ethOut           = curve.virtualEth * tokensIn / newVirtualTokens;

        require(ethOut > 0,              "Zero ETH out");
        require(ethOut <= curve.realEth, "Insufficient liquidity");

        uint256 platformFee  = ethOut * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        uint256 creatorFee   = ethOut * CREATOR_FEE_BPS  / BPS_DENOMINATOR;
        uint256 kolFee       = ethOut * KOL_FEE_BPS      / BPS_DENOMINATOR;
        uint256 referralFee  = ethOut * REFERRAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethOut - platformFee - creatorFee - kolFee - referralFee;

        require(ethAfterFees >= minEthOut, "Slippage exceeded");

        // Rug check — creator selling 50%+
        if (msg.sender == curve.creator) {
            uint256 balance   = IERC20(token).balanceOf(msg.sender);
            uint256 totalHeld = balance + tokensIn;
            if (totalHeld > 0 && tokensIn * BPS_DENOMINATOR / totalHeld >= RUG_SELL_BPS) {
                if (!curve.isRugFlagged) {
                    curve.isRugFlagged = true;
                    emit RugDetected(token, curve.creator, "CreatorMassSell", block.timestamp);
                }
            }
        }

        // Pull tokens first
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);

        // Update curve
        curve.virtualTokens  = newVirtualTokens;
        curve.virtualEth    -= ethOut;
        curve.realEth       -= ethOut;
        curve.realTokens    -= tokensIn;

        // Track volume
        uint256 volumeUsd    = ethOut * ethPriceUsd / 1e18;
        curve.totalVolumeUsd += volumeUsd;
        _trackTraderVolume(msg.sender, volumeUsd);

        // Distribute fees then pay seller
        _distributeFees(curve.creator, referrer, platformFee, creatorFee, kolFee, referralFee);
        payable(msg.sender).transfer(ethAfterFees);

        emit TokensSold(token, msg.sender, tokensIn, ethAfterFees, _getPrice(curve), block.timestamp);
    }

    // ── Submit KOL call ───────────────────────────────────────
    // Free to call. Max 3 per day. Both bonding + KOLSwap phases.
    function submitKolCall(
        address token,
        string calldata thesis,
        bool isGraduatedCall   // true if calling on KOLSwap phase
    ) external nonReentrant whenNotPaused returns (bytes32 callId) {
        Curve storage curve = curves[token];
        require(curve.token != address(0),             "Token not found");
        require(!curve.isRugFlagged,                   "Token rug flagged");
        require(msg.sender != curve.creator,           "Cannot call own token");
        require(!hasCalledToken[msg.sender][token],    "Already called this token");
        require(bytes(thesis).length <= 280,           "Thesis too long");

        // Verify KOL status
        KOL storage kol = kols[msg.sender];
        require(kol.isVerified,  "Not a verified KOL");
        require(!kol.isBanned,   "KOL is banned");

        // Check daily call limit (max 3 per day)
        uint256 today = block.timestamp / 1 days;
        if (kol.lastCallDay != today) {
            kol.callsToday   = 0;
            kol.lastCallDay  = today;
        }
        require(kol.callsToday < MAX_CALLS_PER_DAY, "Daily call limit reached (3 max)");

        // Get price snapshot — cannot fake this
        uint256 priceAtCall;
        uint256 mktcapAtCall;

        if (!isGraduatedCall) {
            // Bonding curve phase
            require(!curve.isGraduated || isGraduatedCall, "Use graduated call flag");
            priceAtCall   = _getPrice(curve);
            mktcapAtCall  = curve.totalVolumeUsd;
        } else {
            // KOLSwap phase — price comes from KOLSwap contract
            require(curve.isGraduated, "Token not graduated yet");
            priceAtCall   = IKOLSwap(kolSwapAddress).getPoolPrice(token);
            mktcapAtCall  = curve.totalVolumeUsd;
        }

        // Generate call ID
        callId = keccak256(abi.encodePacked(
            msg.sender, token, block.timestamp, block.number
        ));

        // Record call
        KolCall storage call  = kolCalls[callId];
        call.kol              = msg.sender;
        call.token            = token;
        call.thesis           = thesis;
        call.priceAtCall      = priceAtCall;
        call.mktcapUsdAtCall  = mktcapAtCall;
        call.accuracyStatus   = 0; // pending
        call.rewardPaid       = false;
        call.calledAt         = block.timestamp;
        call.isGraduatedCall  = isGraduatedCall;

        // Update KOL state
        kol.callsToday++;
        kol.lastCallDay        = today;
        kol.totalCallsAllTime++;
        hasCalledToken[msg.sender][token] = true;
        tokenCalls[token].push(callId);

        emit KolCallSubmitted(callId, msg.sender, token, priceAtCall, thesis, block.timestamp);
    }

    // ── Resolve KOL call accuracy — platform only ─────────────
    // Called by backend cron job 24h after each call
    function resolveKolCall(
        bytes32 callId,
        uint256 currentPrice,
        uint8   status       // 1=hit 2=partial 3=miss
    ) external onlyOwner {
        KolCall storage call = kolCalls[callId];
        require(call.kol != address(0),       "Call not found");
        require(call.accuracyStatus == 0,     "Already resolved");
        require(status >= 1 && status <= 3,   "Invalid status");
        require(
            block.timestamp >= call.calledAt + 24 hours,
            "Too early to resolve"
        );

        call.accuracyStatus = status;

        // Update KOL accuracy stats
        KOL storage kol = kols[call.kol];
        kol.totalCallCount++;
        if (status == 1 || status == 2) {
            kol.accurateCallCount++;
        }

        uint256 multiplier = currentPrice > 0 && call.priceAtCall > 0
            ? currentPrice * 100 / call.priceAtCall
            : 0;

        emit KolCallResolved(callId, status, multiplier, block.timestamp);
    }

    // ── Verify KOL — platform only ────────────────────────────
    // Called after Twitter verification confirms 5,000+ followers
    function verifyKol(
        address wallet,
        uint256 followerCount
    ) external onlyOwner {
        require(followerCount >= KOL_MIN_FOLLOWERS, "Insufficient followers");
        KOL storage kol    = kols[wallet];
        kol.isVerified     = true;
        kol.followerCount  = followerCount;
        emit KolVerified(wallet, followerCount, block.timestamp);
    }

    // ── Update KOL follower count — platform only ─────────────
    function updateFollowerCount(address wallet, uint256 followerCount) external onlyOwner {
        kols[wallet].followerCount = followerCount;
        // Revoke if drops below threshold
        if (followerCount < KOL_MIN_FOLLOWERS) {
            kols[wallet].isVerified = false;
        }
    }

    // ── Ban / unban ───────────────────────────────────────────
    function setBanned(address wallet, bool banned) external onlyOwner {
        kols[wallet].isBanned = banned;
    }

    // ── Flag rug — platform only ──────────────────────────────
    function flagRug(address token, string calldata trigger) external onlyOwner {
        require(curves[token].token != address(0), "Token not found");
        curves[token].isRugFlagged = true;
        emit RugDetected(token, curves[token].creator, trigger, block.timestamp);
    }

    // ── Set KOLSwap address ───────────────────────────────────
    function setKolSwap(address _kolSwap) external onlyOwner {
        require(_kolSwap != address(0), "Invalid address");
        kolSwapAddress = _kolSwap;
    }

    // ── Set KOL Pass address ──────────────────────────────────
    function setKolPass(address _kolPass) external onlyOwner {
        require(_kolPass != address(0), "Invalid address");
        kolPassAddress = _kolPass;
    }

    // ── Pause / unpause ───────────────────────────────────────
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Internal helpers ──────────────────────────────────────
    function _distributeFees(
        address payable creator,
        address referrer,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 kolFee,
        uint256 referralFee
    ) internal {
        PLATFORM_WALLET.transfer(platformFee);
        KOL_POOL_WALLET.transfer(kolFee);
        creator.transfer(creatorFee);
        if (referrer != address(0) && referrer != msg.sender) {
            payable(referrer).transfer(referralFee);
        } else {
            PLATFORM_WALLET.transfer(referralFee);
        }
    }

    function _trackTraderVolume(address trader, uint256 volumeUsd) internal {
        Trader storage t   = traders[trader];
        t.totalVolumeUsd  += volumeUsd;
        if (!t.hasBadge && t.totalVolumeUsd >= TRADER_VOLUME_USD) {
            t.hasBadge = true;
            emit TraderBadgeEarned(trader, t.totalVolumeUsd, block.timestamp);
        }
    }

    function _getPrice(Curve storage curve) internal view returns (uint256) {
        if (curve.virtualTokens == 0) return 0;
        return curve.virtualEth * 1e18 / curve.virtualTokens;
    }

    function _computeMarketCap(
        Curve storage curve,
        uint256 ethPriceUsd
    ) internal view returns (uint256) {
        uint256 priceWei      = _getPrice(curve);
        uint256 mcapWei       = priceWei * TOTAL_SUPPLY / 1e18;
        return mcapWei * ethPriceUsd / 1e18;
    }

    function _checkKolPass(Curve storage curve, address token) internal {
        if (
            !curve.kolPassEarned &&
            curve.totalVolumeUsd >= KOL_PASS_VOLUME_USD &&
            curve.isGraduated &&
            kolPassesIssued < KOL_PASS_MAX
        ) {
            curve.kolPassEarned = true;
            kolPassesIssued++;
            curve.kolPassNumber = kolPassesIssued;
            emit KolPassEarned(
                token, curve.creator,
                kolPassesIssued, curve.totalVolumeUsd,
                block.timestamp
            );
        }
    }

    // ── View functions ────────────────────────────────────────
    function getCurve(address token) external view returns (Curve memory) {
        return curves[token];
    }

    function getKol(address wallet) external view returns (KOL memory) {
        return kols[wallet];
    }

    function getTrader(address wallet) external view returns (Trader memory) {
        return traders[wallet];
    }

    function getTokenCalls(address token) external view returns (bytes32[] memory) {
        return tokenCalls[token];
    }

    function getCall(bytes32 callId) external view returns (KolCall memory) {
        return kolCalls[callId];
    }

    function getPrice(address token) external view returns (uint256) {
        return _getPrice(curves[token]);
    }

    function quoteTokensOut(address token, uint256 ethIn) external view returns (uint256) {
        Curve storage curve  = curves[token];
        if (curve.token == address(0)) return 0;
        uint256 fees         = ethIn * TOTAL_FEE_BPS / BPS_DENOMINATOR;
        uint256 ethAfterFees = ethIn - fees;
        uint256 newVirtual   = curve.virtualEth + ethAfterFees;
        return curve.virtualTokens * ethAfterFees / newVirtual;
    }

    function quoteEthOut(address token, uint256 tokensIn) external view returns (uint256) {
        Curve storage curve  = curves[token];
        if (curve.token == address(0)) return 0;
        uint256 newVirtual   = curve.virtualTokens + tokensIn;
        uint256 ethOut       = curve.virtualEth * tokensIn / newVirtual;
        uint256 fees         = ethOut * TOTAL_FEE_BPS / BPS_DENOMINATOR;
        return ethOut - fees;
    }

    function getKolAccuracy(address wallet) external view returns (uint256 pct) {
        KOL storage kol = kols[wallet];
        if (kol.totalCallCount == 0) return 0;
        return kol.accurateCallCount * 100 / kol.totalCallCount;
    }

    function getRemainingCallsToday(address wallet) external view returns (uint256) {
        KOL storage kol = kols[wallet];
        uint256 today   = block.timestamp / 1 days;
        if (kol.lastCallDay != today) return MAX_CALLS_PER_DAY;
        return kol.callsToday >= MAX_CALLS_PER_DAY
            ? 0
            : MAX_CALLS_PER_DAY - kol.callsToday;
    }

    receive() external payable {}
}

// ── Interface for KOLSwap price reads ────────────────────────
interface IKOLSwap {
    function getPoolPrice(address token) external view returns (uint256);
}
