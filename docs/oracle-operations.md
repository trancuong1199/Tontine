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

## Supervised heartbeat on an authorized always-on host

`deploy/tontine-oracle.service` is a systemd **template**, not evidence that a service is running. The operator must confirm the host, the Node executable (Node 22.22+ with TypeScript stripping), a checkout with installed dependencies at `/opt/tontine`, and the dedicated `tontine-oracle` user/group. Adjust these deployment paths to the confirmed host before installing the unit. It preserves the existing mock value `$60,000` and refreshes every 1800 seconds, with a 15-second supervisor restart after process failure or host reboot via enablement.

Keep `DEPLOYER_PRIVATE_KEY` in `/etc/tontine/oracle.env` outside the checkout. The systemd manager reads this file; restrict it to root ownership and mode 0600, and do not print, commit, or copy its contents into logs. Verify the derived signer matches the feed's live `admin()` address and has gas before starting. The script also checks admin equality before writing. Do not request or send the key in chat.

After installing the reviewed unit on that host, the authorized operator runs `systemctl daemon-reload` and `systemctl enable --now tontine-oracle.service`. Check `systemctl is-active tontine-oracle.service` and the service journal for the first confirmed transaction. Use `node scripts/refresh-mock-oracle.mjs --status` to verify the unchanged mock price, updated timestamp and age below the contract limit; record the actual receipt and read-back. A later successful refresh must be observed before claiming repeated operation; one successful refresh does not prove uptime. `systemctl stop tontine-oracle.service` stops further writes.

Missing host access, an absent credential file or a signer that is not the oracle admin blocks activation independently of the frontend changes. In that case retain the template and report the exact missing access; do not label the prepared service as active.
