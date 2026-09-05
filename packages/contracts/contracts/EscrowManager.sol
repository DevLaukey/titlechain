// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EscrowManager
 * @notice Manages multi-milestone escrow for property transactions.
 *         ETH is locked in this contract and released in stages as
 *         milestones are approved by the platform owner (registrar).
 */
contract EscrowManager is ReentrancyGuard, Ownable {
    // ─── Structs ────────────────────────────────────────────────────────────

    struct Milestone {
        string  description;
        uint256 amount;       // Wei
        bool    released;
        uint256 releasedAt;
    }

    struct Escrow {
        bytes32   transactionId;  // Off-chain Transaction UUID (as bytes32)
        address   buyer;
        address   seller;
        uint256   totalAmount;    // Wei
        uint256   releasedAmount;
        EscrowStatus status;
        Milestone[] milestones;
        uint256   createdAt;
        uint256   fundedAt;
    }

    enum EscrowStatus {
        Created,
        Funded,
        PartiallyReleased,
        Completed,
        Refunded
    }

    // ─── State ────────────────────────────────────────────────────────────

    uint256 public escrowCount;

    /// escrowId => Escrow
    mapping(uint256 => Escrow) private _escrows;

    /// transactionId => escrowId
    mapping(bytes32 => uint256) private _txToEscrow;

    // ─── Events ───────────────────────────────────────────────────────────

    event EscrowCreated(
        uint256 indexed escrowId,
        bytes32 indexed transactionId,
        address indexed buyer,
        address seller,
        uint256 totalAmount
    );

    event EscrowFunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    event EscrowCompleted(uint256 indexed escrowId, uint256 timestamp);

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    // ─── Errors ───────────────────────────────────────────────────────────

    error EscrowNotFound(uint256 escrowId);
    error InvalidStatus(EscrowStatus current, EscrowStatus required);
    error InvalidAmount(uint256 expected, uint256 sent);
    error MilestoneAlreadyReleased(uint256 milestoneIndex);
    error MilestoneIndexOutOfBounds(uint256 index);
    error NoMilestonesProvided();
    error MilestoneAmountMismatch(uint256 sum, uint256 total);
    error InvalidAddress();
    error TransactionAlreadyHasEscrow(bytes32 transactionId);
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── External Functions ───────────────────────────────────────────────

    /**
     * @notice Create a new escrow agreement for a transaction.
     * @param transactionId  Off-chain Transaction ID (bytes32 form of UUID).
     * @param buyer          Address of the buyer (funds source).
     * @param seller         Address of the seller (funds destination).
     * @param milestoneDescriptions  Description of each milestone.
     * @param milestoneAmounts       Wei amount for each milestone (must sum to totalAmount).
     * @return escrowId      Unique identifier for this escrow.
     */
    function createEscrow(
        bytes32 transactionId,
        address buyer,
        address seller,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneAmounts
    ) external onlyOwner returns (uint256 escrowId) {
        if (buyer == address(0) || seller == address(0)) revert InvalidAddress();
        if (milestoneDescriptions.length == 0) revert NoMilestonesProvided();
        if (milestoneDescriptions.length != milestoneAmounts.length) {
            revert NoMilestonesProvided();
        }
        if (_txToEscrow[transactionId] != 0) {
            revert TransactionAlreadyHasEscrow(transactionId);
        }

        uint256 total = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            total += milestoneAmounts[i];
        }

        escrowCount++;
        escrowId = escrowCount;

        Escrow storage e = _escrows[escrowId];
        e.transactionId = transactionId;
        e.buyer          = buyer;
        e.seller         = seller;
        e.totalAmount    = total;
        e.releasedAmount = 0;
        e.status         = EscrowStatus.Created;
        e.createdAt      = block.timestamp;
        e.fundedAt       = 0;

        for (uint256 i = 0; i < milestoneDescriptions.length; i++) {
            e.milestones.push(Milestone({
                description: milestoneDescriptions[i],
                amount:      milestoneAmounts[i],
                released:    false,
                releasedAt:  0
            }));
        }

        _txToEscrow[transactionId] = escrowId;

        emit EscrowCreated(escrowId, transactionId, buyer, seller, total);
    }

    /**
     * @notice Fund an escrow with ETH. Caller must be the buyer.
     * @param escrowId  The escrow to fund.
     */
    function fundEscrow(uint256 escrowId)
        external
        payable
        nonReentrant
    {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != EscrowStatus.Created) {
            revert InvalidStatus(e.status, EscrowStatus.Created);
        }
        if (msg.value != e.totalAmount) {
            revert InvalidAmount(e.totalAmount, msg.value);
        }
        // Any party may fund on behalf of buyer (platform can relay)
        e.status   = EscrowStatus.Funded;
        e.fundedAt = block.timestamp;

        emit EscrowFunded(escrowId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Release a specific milestone to the seller. Only platform owner.
     * @param escrowId          The escrow identifier.
     * @param milestoneIndex    Zero-based index of the milestone to release.
     */
    function releaseMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        nonReentrant
        onlyOwner
    {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.PartiallyReleased) {
            revert InvalidStatus(e.status, EscrowStatus.Funded);
        }
        if (milestoneIndex >= e.milestones.length) {
            revert MilestoneIndexOutOfBounds(milestoneIndex);
        }

        Milestone storage m = e.milestones[milestoneIndex];
        if (m.released) revert MilestoneAlreadyReleased(milestoneIndex);

        m.released   = true;
        m.releasedAt = block.timestamp;
        e.releasedAmount += m.amount;

        // Check if all milestones released
        bool allDone = true;
        for (uint256 i = 0; i < e.milestones.length; i++) {
            if (!e.milestones[i].released) {
                allDone = false;
                break;
            }
        }

        if (allDone) {
            e.status = EscrowStatus.Completed;
            emit EscrowCompleted(escrowId, block.timestamp);
        } else {
            e.status = EscrowStatus.PartiallyReleased;
        }

        emit MilestoneReleased(
            escrowId,
            milestoneIndex,
            e.seller,
            m.amount,
            block.timestamp
        );

        (bool success, ) = e.seller.call{value: m.amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Refund the remaining locked funds to the buyer. Only platform owner.
     * @param escrowId  The escrow to refund.
     */
    function refundEscrow(uint256 escrowId)
        external
        nonReentrant
        onlyOwner
    {
        Escrow storage e = _getEscrow(escrowId);
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.PartiallyReleased) {
            revert InvalidStatus(e.status, EscrowStatus.Funded);
        }

        uint256 refundAmount = e.totalAmount - e.releasedAmount;
        e.status = EscrowStatus.Refunded;

        emit EscrowRefunded(escrowId, e.buyer, refundAmount, block.timestamp);

        if (refundAmount > 0) {
            (bool success, ) = e.buyer.call{value: refundAmount}("");
            if (!success) revert TransferFailed();
        }
    }

    // ─── View Functions ───────────────────────────────────────────────────

    function getEscrow(uint256 escrowId)
        external
        view
        returns (
            bytes32 transactionId,
            address buyer,
            address seller,
            uint256 totalAmount,
            uint256 releasedAmount,
            EscrowStatus status,
            uint256 createdAt,
            uint256 fundedAt
        )
    {
        Escrow storage e = _getEscrow(escrowId);
        return (
            e.transactionId,
            e.buyer,
            e.seller,
            e.totalAmount,
            e.releasedAmount,
            e.status,
            e.createdAt,
            e.fundedAt
        );
    }

    function getMilestones(uint256 escrowId)
        external
        view
        returns (Milestone[] memory)
    {
        Escrow storage e = _getEscrow(escrowId);
        return e.milestones;
    }

    function getEscrowByTransaction(bytes32 transactionId)
        external
        view
        returns (uint256)
    {
        return _txToEscrow[transactionId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    function _getEscrow(uint256 escrowId)
        internal
        view
        returns (Escrow storage)
    {
        if (escrowId == 0 || escrowId > escrowCount) {
            revert EscrowNotFound(escrowId);
        }
        return _escrows[escrowId];
    }
}
