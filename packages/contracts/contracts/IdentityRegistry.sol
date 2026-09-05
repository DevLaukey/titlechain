// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @notice On-chain KYC identity registry.
 *         Stores a hash of KYC documents for each wallet address
 *         and tracks verification status set by the platform owner (registrar).
 */
contract IdentityRegistry is Ownable {
    // ─── Structs ────────────────────────────────────────────────────────────

    enum VerificationStatus {
        Unregistered,
        Pending,
        Verified,
        Revoked
    }

    struct Identity {
        address wallet;
        string  kycHash;          // SHA-256 or IPFS CID of KYC document bundle
        VerificationStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 revokedAt;
        string  notes;
    }

    // ─── State ────────────────────────────────────────────────────────────

    /// wallet address => Identity
    mapping(address => Identity) private _identities;

    uint256 public totalRegistered;
    uint256 public totalVerified;

    // ─── Events ───────────────────────────────────────────────────────────

    event IdentityRegistered(
        address indexed wallet,
        string  kycHash,
        uint256 timestamp
    );

    event IdentityVerified(
        address indexed wallet,
        string  notes,
        uint256 timestamp
    );

    event IdentityRevoked(
        address indexed wallet,
        string  reason,
        uint256 timestamp
    );

    event KycHashUpdated(
        address indexed wallet,
        string  previousHash,
        string  newHash,
        uint256 timestamp
    );

    // ─── Errors ───────────────────────────────────────────────────────────

    error AlreadyRegistered(address wallet);
    error NotRegistered(address wallet);
    error AlreadyVerified(address wallet);
    error AlreadyRevoked(address wallet);
    error InvalidAddress();
    error EmptyKycHash();

    // ─── Constructor ──────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── External Functions ───────────────────────────────────────────────

    /**
     * @notice Register a wallet address with its KYC document hash.
     *         Can be called by the user themselves or the platform owner.
     * @param wallet    The wallet address to register.
     * @param kycHash   Hash of the KYC document bundle (IPFS CID or SHA-256).
     */
    function registerIdentity(address wallet, string calldata kycHash) external {
        if (wallet == address(0)) revert InvalidAddress();
        if (bytes(kycHash).length == 0) revert EmptyKycHash();

        // Only the wallet owner or platform owner may register
        if (msg.sender != wallet && msg.sender != owner()) revert InvalidAddress();

        if (_identities[wallet].status != VerificationStatus.Unregistered) {
            revert AlreadyRegistered(wallet);
        }

        _identities[wallet] = Identity({
            wallet:       wallet,
            kycHash:      kycHash,
            status:       VerificationStatus.Pending,
            registeredAt: block.timestamp,
            verifiedAt:   0,
            revokedAt:    0,
            notes:        ""
        });

        totalRegistered++;

        emit IdentityRegistered(wallet, kycHash, block.timestamp);
    }

    /**
     * @notice Verify an identity. Only platform owner (registrar).
     * @param wallet  The wallet address to verify.
     * @param notes   Optional notes from the registrar.
     */
    function verifyIdentity(address wallet, string calldata notes)
        external
        onlyOwner
    {
        Identity storage id = _getIdentity(wallet);
        if (id.status == VerificationStatus.Verified) revert AlreadyVerified(wallet);
        if (id.status == VerificationStatus.Revoked) revert AlreadyRevoked(wallet);

        id.status     = VerificationStatus.Verified;
        id.verifiedAt = block.timestamp;
        id.notes      = notes;

        totalVerified++;

        emit IdentityVerified(wallet, notes, block.timestamp);
    }

    /**
     * @notice Revoke a previously verified identity. Only platform owner.
     * @param wallet  The wallet address to revoke.
     * @param reason  Reason for revocation.
     */
    function revokeIdentity(address wallet, string calldata reason)
        external
        onlyOwner
    {
        Identity storage id = _getIdentity(wallet);
        if (id.status == VerificationStatus.Revoked) revert AlreadyRevoked(wallet);

        if (id.status == VerificationStatus.Verified) {
            totalVerified--;
        }

        id.status    = VerificationStatus.Revoked;
        id.revokedAt = block.timestamp;
        id.notes     = reason;

        emit IdentityRevoked(wallet, reason, block.timestamp);
    }

    /**
     * @notice Update the KYC hash for a wallet (e.g. after document re-submission).
     * @param wallet      The wallet address.
     * @param newKycHash  Updated KYC document hash.
     */
    function updateKycHash(address wallet, string calldata newKycHash) external {
        if (bytes(newKycHash).length == 0) revert EmptyKycHash();
        if (msg.sender != wallet && msg.sender != owner()) revert InvalidAddress();

        Identity storage id = _getIdentity(wallet);
        string memory previousHash = id.kycHash;
        id.kycHash = newKycHash;

        emit KycHashUpdated(wallet, previousHash, newKycHash, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────────

    /**
     * @notice Get the full identity record for a wallet.
     */
    function getIdentity(address wallet)
        external
        view
        returns (Identity memory)
    {
        if (_identities[wallet].status == VerificationStatus.Unregistered) {
            revert NotRegistered(wallet);
        }
        return _identities[wallet];
    }

    /**
     * @notice Check if a wallet is verified.
     */
    function isVerified(address wallet) external view returns (bool) {
        return _identities[wallet].status == VerificationStatus.Verified;
    }

    /**
     * @notice Get the verification status of a wallet.
     */
    function getStatus(address wallet)
        external
        view
        returns (VerificationStatus)
    {
        return _identities[wallet].status;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    function _getIdentity(address wallet)
        internal
        view
        returns (Identity storage)
    {
        if (_identities[wallet].status == VerificationStatus.Unregistered) {
            revert NotRegistered(wallet);
        }
        return _identities[wallet];
    }
}
