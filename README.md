# File: README.md
# Nexoria

## Overview
Nexoria is a read-only Base network inspector that focuses on two things:
- quick validation of connectivity, indexing visibility, and explorer reachability
- predictable, copy-paste friendly output that can be dropped into issues, reports, or build logs

Built for Base.

## Why This Repository Exists
When you are wiring up wallet connections and network reads, the hardest part is usually not writing code. It is proving that your environment can reliably:
- connect to a wallet provider
- resolve chain metadata (block, fees, gas signals)
- confirm whether a contract is deployed at an address
- produce stable explorer links for reviewers

Nexoria is meant to be the smallest practical repo that does those checks without ever creating a transaction or modifying chain state.

## What Nexoria Does
- connects to Coinbase Wallet (browser environment) to discover addresses
- reads ETH balances for connected addresses using viem
- reads latest block number, timestamp, gas price, base fee, and a short fee history window
- checks bytecode existence at target addresses from samples/targets.json
- prints Basescan links for addresses, blocks, and contract code pages
- writes a structured JSON report to reports/latest.json and a plain log to logs/run.log

## What Nexoria Never Does
- it does not send transactions
- it does not sign messages
- it does not write onchain state

## Supported Networks
Nexoria is intended for Base Mainnet usage, with Base Sepolia used as a controlled validation environment.
- Base Mainnet explorer reference: https://basescan.org
- Base Sepolia explorer reference: https://sepolia.basescan.org

## Base Sepolia Details
- Network: Base Sepolia
- chainId (decimal): 84532
- Explorer: https://sepolia.basescan.org

## Data Sources And Trust Model
- wallet addresses come from Coinbase Wallet via an EIP-1193 provider
- chain reads come from public RPC endpoints configured in the script and config files
- explorer links are printed only for convenience and do not affect read logic

## Internal Flow
1) Select a network profile (mainnet or sepolia)
2) Initialize Coinbase Wallet SDK and create an EIP-1193 provider
3) Create two viem clients:
   - wallet client for address discovery
   - public client for all chain reads
4) Load bytecode target addresses from samples/targets.json
5) Read block and fee signals (block number, timestamp, gas price, base fee when available, fee history)
6) If wallet addresses are available, read balances and print address links
7) Check bytecode at each target address and print address and code links
8) Emit a machine-readable report to reports/latest.json and a human log to logs/run.log

## Outputs
- console output: plain lines meant for copy-paste into GitHub issues
- reports/latest.json: structured snapshot for tooling, parsing, or CI
- logs/run.log: a captured run log for quick diffing

## Repository Structure
- app/Nexoria.mjs
- contracts/
  - your_contract.sol
- docs/
  - overview.md
  - flow.md
- config/
  - base-mainnet.json
  - base-sepolia.json
- scripts/
  - export-report.mjs
- reports/
  - latest.json
- logs/
  - run.log
- samples/
  - targets.json
- env/
  - example.env
- snapshots/
  - fee-history.snapshot.json

## Author Contacts
- GitHub: https://github.com/files-sweats
  
- X: https://x.com/kamigarcia0d
  
- Email: files.sweats.0f@icloud.com

## License
BSD 3-Clause License

## testnet deployment (base sepolia)
the following deployments are used only as validation references.

network: base sepolia  
chainId (decimal): 84532  
explorer: https://sepolia.basescan.org  

contract #1 address:  
your_address  

deployment and verification:
- https://sepolia.basescan.org/address/your_address
- https://sepolia.basescan.org/your_address/0#code  

contract #2 address:  
your_address  

deployment and verification:
- https://sepolia.basescan.org/address/your_address
- https://sepolia.basescan.org/your_address/0#code  

these deployments provide a controlled environment for validating base tooling and read-only onchain access prior to base mainnet usage.
