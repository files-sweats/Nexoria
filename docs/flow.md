Flow summary:
- load network profile
- initialize Coinbase Wallet SDK provider
- create viem clients (wallet and public)
- read latest block and fee signals
- optionally read balances if wallet addresses are present
- check bytecode existence on a curated address list
- persist outputs to reports/latest.json and logs/run.log
