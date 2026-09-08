// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KOLPass
 * @notice OnchainKOL Pass NFT — ERC721 on Robinhood Chain
 * @dev 10,000 maximum supply. FCFS — first token to $1M volume gets Pass #1.
 *      Minted automatically by platform when milestone reached.
 *      Tradeable on any NFT marketplace.
 *      Burned passes reduce total supply (more scarce for remaining holders).
 *
 * Pass status:
 *   0 = Active
 *   1 = Frozen (rug detected, vote in progress)
 *   2 = Burned (community voted burn or quorum failed)
 *   3 = Community (transferred to community multisig)
 */
contract KOLPass is ERC721URIStorage, Ownable {

    uint256 public constant MAX_SUPPLY          = 10_000;
    uint256 public constant VOLUME_THRESHOLD_USD = 1_000_000; // $1M

    uint256 public totalMinted;
    uint256 public totalBurned;

    // Pass metadata
    struct PassRecord {
        address token;          // which token earned this pass
        address originalCreator; // original token creator
        uint256 totalVolumeAtMint;
        uint256 mintedAt;
        uint8   status;         // 0=active, 1=frozen, 2=burned, 3=community
    }

    mapping(uint256 => PassRecord) public passRecords; // passId → record
    mapping(address => uint256)    public tokenToPass;  // token → passId (0 if none)

    // ── Events ────────────────────────────────────────────────
    event PassMinted(
        uint256 indexed passId,
        address indexed token,
        address indexed creator,
        uint256 totalVolumeUsd,
        uint256 timestamp
    );
    event PassFrozen(uint256 indexed passId, string reason, uint256 timestamp);
    event PassBurned(uint256 indexed passId, uint256 timestamp);
    event PassTransferredToCommunity(uint256 indexed passId, address community, uint256 timestamp);

    // ── Constructor ───────────────────────────────────────────
    constructor() ERC721("OnchainKOL Pass", "KOLPASS") Ownable(msg.sender) {}

    // ── Mint pass — platform only ─────────────────────────────
    function mintPass(
        address token,
        address creator,
        uint256 totalVolumeUsd,
        string calldata tokenUri
    ) external onlyOwner returns (uint256 passId) {
        require(totalMinted < MAX_SUPPLY,                        "Max supply reached");
        require(totalVolumeUsd >= VOLUME_THRESHOLD_USD,          "Volume threshold not met");
        require(tokenToPass[token] == 0,                         "Pass already minted");
        require(token != address(0) && creator != address(0),    "Invalid addresses");

        totalMinted++;
        passId = totalMinted;

        passRecords[passId] = PassRecord({
            token:              token,
            originalCreator:    creator,
            totalVolumeAtMint:  totalVolumeUsd,
            mintedAt:           block.timestamp,
            status:             0 // active
        });

        tokenToPass[token] = passId;

        // Mint NFT to creator wallet
        _safeMint(creator, passId);
        _setTokenURI(passId, tokenUri);

        emit PassMinted(passId, token, creator, totalVolumeUsd, block.timestamp);
    }

    // ── Freeze pass — platform only ───────────────────────────
    // Called when rug detected, while community vote runs
    function freezePass(uint256 passId, string calldata reason) external onlyOwner {
        require(_exists(passId),                      "Pass not found");
        require(passRecords[passId].status == 0,      "Not active");
        passRecords[passId].status = 1;
        emit PassFrozen(passId, reason, block.timestamp);
    }

    // ── Burn pass — platform only ─────────────────────────────
    // Called after community vote: BURN outcome or quorum failed
    function burnPass(uint256 passId) external onlyOwner {
        require(_exists(passId),                      "Pass not found");
        require(passRecords[passId].status == 1,      "Not frozen");

        passRecords[passId].status = 2;
        totalBurned++;

        _burn(passId);

        emit PassBurned(passId, block.timestamp);
    }

    // ── Transfer to community — platform only ────────────────
    // Called after community vote: COMMUNITY outcome
    function transferToCommunity(
        uint256 passId,
        address communityWallet
    ) external onlyOwner {
        require(_exists(passId),                      "Pass not found");
        require(passRecords[passId].status == 1,      "Not frozen");
        require(communityWallet != address(0),        "Invalid community wallet");

        passRecords[passId].status = 3;

        // Transfer NFT to community multisig
        address currentHolder = ownerOf(passId);
        _transfer(currentHolder, communityWallet, passId);

        emit PassTransferredToCommunity(passId, communityWallet, block.timestamp);
    }

    // ── View functions ────────────────────────────────────────
    function totalSupply() external view returns (uint256) {
        return totalMinted - totalBurned;
    }

    function getPassRecord(uint256 passId) external view returns (PassRecord memory) {
        return passRecords[passId];
    }

    function getPassForToken(address token) external view returns (uint256) {
        return tokenToPass[token];
    }

    function _exists(uint256 passId) internal view returns (bool) {
        return passId > 0 && passId <= totalMinted && passRecords[passId].status != 2;
    }
}
