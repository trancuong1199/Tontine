# Arc Testnet mock oracle operation

The default club uses the configured MockAggregatorV3 feed. Its `maxPriceAge` is immutable: UI changes cannot refresh it or make stale prices usable for borrowing. A historical collateral estimate is informational and never replaces valid contract valuation.

Inspect without a key or transaction:

```sh
node scripts/refresh-mock-oracle.mjs --status
node scripts/refresh-mock-oracle.mjs --dry-run --price 60000 --interval 1800
```

The output includes feed, price, update timestamp, age and the default club's age limit. Dry-run checks configuration and reads chain data; it does not sign. This task does not deploy or start a background service and does not update the live feed.

The oracle admin can supply `DEPLOYER_PRIVATE_KEY` through their secure environment and run:

```sh
node scripts/refresh-mock-oracle.mjs --price 60000 --interval 1800
```

The price is a test value, not a market quote. Confirm the intended test price before writing. All arguments and the interval versus on-chain age limit are checked before wallet creation and writes. With the current 3600-second limit, 1800 seconds allows retry margin. A single successful write becomes stale again; an operator must supervise a recurring process, watch failures, provide gas and maintain signing access. Restart with read-only status to investigate outages. Refreshing does not increase the deposited collateral or its coverage.

Runtime Arc RPC/explorer links now use the facts registry or `arc-constants` helpers. Static documentation, faucet/bridge service links, other chain URLs, SVG XML namespaces and archived `.arcstudio-backup` files are intentionally not rewritten.
