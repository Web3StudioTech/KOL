// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CommunityVote
 * @notice Rug detection and community governance for KOL Passes
 * @dev When rug is detected, 72h vote opens.
 *      Holders vote BURN or COMMUNITY with real token balance.
 *      10% quorum required. Auto-burn if quorum not reached.
 *      Creator excluded from voting.
 */
contract CommunityVote is ReentrancyGuard, Ownable {

    uint256 public constant VOTE_DURATION  = 72 hours;
    uint256 public constant QUORUM_BPS     = 1000;    // 10%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_QUORUM     = 10;      // minimum 10 wallets

    // ── Vote state ────────────────────────────────────────────
    struct Vote {
        address token;
        address creator;            // excluded from voting
        string  rugTrigger;
        uint256 snapshotBlock;      // block when rug detected
        uint256 openedAt;
        uint256 expiresAt;
        uint256 totalEligibleWallets;
        uint256 burnVotes;          // weighted by token balance
        uint256 communityVotes;
        uint256 burnWalletCount;
        uint256 communityWalletCount;
        uint256 quorumRequired;     // minimum wallets to vote
        bool    quorumReached;
        bool    finalized;
        uint8   outcome;            // 0=pending, 1=burn, 2=community, 3=quorum_failed
    }

    mapping(address => Vote)   public votes;       // token → vote
    mapping(address => mapping(address => bool)) public hasVoted; // token → voter → voted

    // ── Events ────────────────────────────────────────────────
    event VoteOpened(
        address indexed token,
        string  rugTrigger,
        uint256 expiresAt,
        uint256 quorumRequired,
        uint256 timestamp
    );
    event VoteCast(
        address indexed token,
        address indexed voter,
        bool    isBurn,
        uint256 tokenBalance,
        uint256 timestamp
    );
    event VoteFinalized(
        address indexed token,
        uint8   outcome,
        uint256 burnVotes,
        uint256 communityVotes,
        bool    quorumReached,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Open vote — platform only ─────────────────────────────
    function openVote(
        address token,
        address creator,
        string calldata rugTrigger,
        uint256 totalEligibleWallets
    ) external onlyOwner {
        require(votes[token].token == address(0), "Vote already exists");
        require(totalEligibleWallets > 0,         "No eligible voters");
        require(token != address(0),              "Invalid token");

        // Minimum quorum of 10 wallets regardless of holder count
        uint256 computedQuorum = totalEligibleWallets * QUORUM_BPS / BPS_DENOMINATOR;
        uint256 quorumRequired = computedQuorum > MIN_QUORUM ? computedQuorum : MIN_QUORUM;

        votes[token] = Vote({
            token:                 token,
            creator:               creator,
            rugTrigger:            rugTrigger,
            snapshotBlock:         block.number,
            openedAt:              block.timestamp,
            expiresAt:             block.timestamp + VOTE_DURATION,
            totalEligibleWallets:  totalEligibleWallets,
            burnVotes:             0,
            communityVotes:        0,
            burnWalletCount:       0,
            communityWalletCount:  0,
            quorumRequired:        quorumRequired,
            quorumReached:         false,
            finalized:             false,
            outcome:               0
        });

        emit VoteOpened(token, rugTrigger, block.timestamp + VOTE_DURATION, quorumRequired, block.timestamp);
    }

    // ── Cast vote ─────────────────────────────────────────────
    function castVote(address token, bool burnChoice) external nonReentrant {
        Vote storage vote = votes[token];
        require(vote.token != address(0),        "Vote not found");
        require(!vote.finalized,                 "Vote finalized");
        require(block.timestamp < vote.expiresAt, "Vote expired");
        require(msg.sender != vote.creator,      "Creator cannot vote");
        require(!hasVoted[token][msg.sender],    "Already voted");

        // Read ACTUAL token balance onchain — not passed as parameter
        uint256 actualBalance = IERC20(token).balanceOf(msg.sender);
        require(actualBalance > 0, "No token balance");

        hasVoted[token][msg.sender] = true;

        if (burnChoice) {
            vote.burnVotes      += actualBalance;
            vote.burnWalletCount++;
        } else {
            vote.communityVotes      += actualBalance;
            vote.communityWalletCount++;
        }

        // Check quorum
        uint256 totalVoters = vote.burnWalletCount + vote.communityWalletCount;
        if (totalVoters >= vote.quorumRequired) {
            vote.quorumReached = true;
        }

        emit VoteCast(token, msg.sender, burnChoice, actualBalance, block.timestamp);
    }

    // ── Finalize vote — platform only ─────────────────────────
    function finalizeVote(address token) external onlyOwner {
        Vote storage vote = votes[token];
        require(vote.token != address(0), "Vote not found");
        require(!vote.finalized,          "Already finalized");
        require(block.timestamp >= vote.expiresAt, "Vote still active");

        uint8 outcome;

        if (!vote.quorumReached) {
            outcome = 3; // quorum_failed → auto-burn
        } else if (vote.burnVotes >= vote.communityVotes) {
            outcome = 1; // burn
        } else {
            outcome = 2; // community
        }

        vote.finalized = true;
        vote.outcome   = outcome;

        emit VoteFinalized(
            token,
            outcome,
            vote.burnVotes,
            vote.communityVotes,
            vote.quorumReached,
            block.timestamp
        );
    }

    // ── View functions ────────────────────────────────────────
    function getVote(address token) external view returns (Vote memory) {
        return votes[token];
    }

    function getVoteStatus(address token) external view returns (
        bool isActive,
        bool finalized,
        uint8 outcome,
        uint256 burnVotes,
        uint256 communityVotes,
        uint256 timeRemaining
    ) {
        Vote storage vote = votes[token];
        isActive      = !vote.finalized && block.timestamp < vote.expiresAt;
        finalized     = vote.finalized;
        outcome       = vote.outcome;
        burnVotes     = vote.burnVotes;
        communityVotes = vote.communityVotes;
        timeRemaining = vote.expiresAt > block.timestamp
            ? vote.expiresAt - block.timestamp
            : 0;
    }
}
