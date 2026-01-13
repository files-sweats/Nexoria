// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NexoriaAnchor {
    // Immutable data makes eth_call checks predictable across runs
    bytes32 public immutable seed;
    address public immutable deployer;

    constructor(bytes32 _seed) {
        seed = _seed;
        deployer = msg.sender;
    }

    // Read-only: returns a compact snapshot Nexoria can log
    function snapshot()
        external
        view
        returns (
            bytes32 _seed,
            address _deployer,
            uint256 blockNumber,
            uint256 timestamp
        )
    {
        return (seed, deployer, block.number, block.timestamp);
    }

    // Read-only: stable hash useful for “expected output” comparisons
    function anchorHash() external view returns (bytes32) {
        return keccak256(abi.encodePacked("NEXORIA:ANCHOR:V1", seed, deployer));
    }
}
