// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PropertyRegistry
 * @notice On-chain registry for real estate property titles.
 *         Stores a metadata hash (IPFS CID or SHA-256) and the current owner
 *         for each property. Ownership transfers are recorded immutably on-chain.
 */
contract PropertyRegistry is Ownable, Pausable {
    // ─── Structs ────────────────────────────────────────────────────────────

    struct PropertyRecord {
        string  titleNumber;    // Unique off-chain reference (e.g. "TC-2024-NGR-AB12")
        string  metadataHash;   // IPFS CID or SHA-256 hash of property metadata JSON
        address currentOwner;   // Ethereum address of current title holder
        bool    exists;
        uint256 registeredAt;
        uint256 lastTransferAt;
    }

    // ─── State ────────────────────────────────────────────────────────────

    /// onChainId => PropertyRecord
    mapping(bytes32 => PropertyRecord) private _properties;

    /// titleNumber string => onChainId
    mapping(string => bytes32) private _titleToId;

    /// owner address => list of onChainIds
    mapping(address => bytes32[]) private _ownerProperties;

    uint256 public totalProperties;

    // ─── Events ───────────────────────────────────────────────────────────

    event PropertyRegistered(
        bytes32 indexed onChainId,
        string  titleNumber,
        address indexed owner,
        string  metadataHash,
        uint256 timestamp
    );

    event PropertyTransferred(
        bytes32 indexed onChainId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event MetadataUpdated(
        bytes32 indexed onChainId,
        string  previousHash,
        string  newHash,
        uint256 timestamp
    );

    // ─── Errors ───────────────────────────────────────────────────────────

    error PropertyAlreadyExists(string titleNumber);
    error PropertyNotFound(bytes32 onChainId);
    error NotPropertyOwner(bytes32 onChainId, address caller);
    error InvalidAddress();
    error EmptyMetadataHash();
    error EmptyTitleNumber();

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── External Functions ───────────────────────────────────────────────

    /**
     * @notice Register a new property on-chain.
     * @param titleNumber    Human-readable title reference string.
     * @param metadataHash   IPFS CID or SHA-256 hash of property JSON metadata.
     * @param propertyOwner  Ethereum address of the initial title holder.
     * @return onChainId     Unique bytes32 identifier for this property.
     */
    function registerProperty(
        string calldata titleNumber,
        string calldata metadataHash,
        address propertyOwner
    ) external onlyOwner whenNotPaused returns (bytes32 onChainId) {
        if (bytes(titleNumber).length == 0) revert EmptyTitleNumber();
        if (bytes(metadataHash).length == 0) revert EmptyMetadataHash();
        if (propertyOwner == address(0)) revert InvalidAddress();

        if (_titleToId[titleNumber] != bytes32(0)) {
            revert PropertyAlreadyExists(titleNumber);
        }

        onChainId = keccak256(
            abi.encodePacked(titleNumber, block.timestamp, propertyOwner)
        );

        _properties[onChainId] = PropertyRecord({
            titleNumber:    titleNumber,
            metadataHash:   metadataHash,
            currentOwner:   propertyOwner,
            exists:         true,
            registeredAt:   block.timestamp,
            lastTransferAt: block.timestamp
        });

        _titleToId[titleNumber] = onChainId;
        _ownerProperties[propertyOwner].push(onChainId);
        totalProperties++;

        emit PropertyRegistered(
            onChainId,
            titleNumber,
            propertyOwner,
            metadataHash,
            block.timestamp
        );
    }

    /**
     * @notice Transfer property title to a new owner.
     * @param onChainId  The property's on-chain identifier.
     * @param newOwner   Ethereum address of the new title holder.
     */
    function transferProperty(
        bytes32 onChainId,
        address newOwner
    ) external whenNotPaused {
        PropertyRecord storage record = _properties[onChainId];
        if (!record.exists) revert PropertyNotFound(onChainId);
        if (newOwner == address(0)) revert InvalidAddress();

        // Only current owner OR contract owner (registrar) may transfer
        if (msg.sender != record.currentOwner && msg.sender != owner()) {
            revert NotPropertyOwner(onChainId, msg.sender);
        }

        address previousOwner = record.currentOwner;
        record.currentOwner  = newOwner;
        record.lastTransferAt = block.timestamp;

        _ownerProperties[newOwner].push(onChainId);

        emit PropertyTransferred(onChainId, previousOwner, newOwner, block.timestamp);
    }

    /**
     * @notice Update the metadata hash for a property (e.g. after document update).
     * @param onChainId      The property's on-chain identifier.
     * @param newMetadataHash Updated IPFS CID or hash.
     */
    function updateMetadata(
        bytes32 onChainId,
        string calldata newMetadataHash
    ) external whenNotPaused {
        PropertyRecord storage record = _properties[onChainId];
        if (!record.exists) revert PropertyNotFound(onChainId);
        if (bytes(newMetadataHash).length == 0) revert EmptyMetadataHash();
        if (msg.sender != record.currentOwner && msg.sender != owner()) {
            revert NotPropertyOwner(onChainId, msg.sender);
        }

        string memory previousHash = record.metadataHash;
        record.metadataHash = newMetadataHash;

        emit MetadataUpdated(onChainId, previousHash, newMetadataHash, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────

    /**
     * @notice Get property details by on-chain ID.
     */
    function getProperty(bytes32 onChainId)
        external
        view
        returns (PropertyRecord memory)
    {
        if (!_properties[onChainId].exists) revert PropertyNotFound(onChainId);
        return _properties[onChainId];
    }

    /**
     * @notice Resolve a title number string to its on-chain ID.
     */
    function getOnChainId(string calldata titleNumber)
        external
        view
        returns (bytes32)
    {
        return _titleToId[titleNumber];
    }

    /**
     * @notice Get all on-chain IDs owned by an address.
     */
    function getPropertiesByOwner(address propertyOwner)
        external
        view
        returns (bytes32[] memory)
    {
        return _ownerProperties[propertyOwner];
    }

    /**
     * @notice Check if a property exists.
     */
    function propertyExists(bytes32 onChainId) external view returns (bool) {
        return _properties[onChainId].exists;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
