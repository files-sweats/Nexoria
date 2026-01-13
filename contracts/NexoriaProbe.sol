// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NexoriaProbe {
    // Static, copy-paste friendly metadata for read-only inspection
    string public constant NAME = "NexoriaProbe";
    string public constant VERSION = "1.0.0";

    uint256 public pingCount;
    bytes32 public lastPingHash;
    address public lastCaller;

    event Ping(address indexed caller, bytes32 indexed pingHash, uint256 indexed count);

    // Optional write method (not required by Nexoria, but useful for event/indexing checks)
    function ping(string calldata payload) external {
        bytes32 h = keccak256(abi.encodePacked(payload, msg.sender, block.number));
        pingCount += 1;
        lastPingHash = h;
        lastCaller = msg.sender;
        emit Ping(msg.sender, h, pingCount);
    }

    // Pure read helper for stable eth_call output
    function fingerprint() external pure returns (bytes32) {
        return keccak256("NEXORIA:PROBE:FINGERPRINT:V1");
    }
}
