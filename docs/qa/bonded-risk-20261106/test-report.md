# Independent QA — bonded-risk-20261106

**Code signoff: PASS for R1–R7 and the prepared R8 script/service safeguards. Operational activation: BLOCKED / not achieved.** Specification: `docs/ba/bonded-risk-20261106/spec-v1.md`. Tested 2026-11-06 on frozen13-file new-task manifest and refreshed22-file `task-059` manifest; both verified unchanged before and after all final checks.

## Execution evidence

| Actual command | Exit | Result / local evidence |
|---|---:|---|
| `node scripts/manifest-tool.mjs verify bonded-risk-20261106` before/after | 0 / 0 |13 matches, `hash-before.log`, `hash-after.log`|
| `node scripts/manifest-tool.mjs verify task-059` before/after |0 / 0|22 matches, `task059-before.log`, `task059-after.log`|
| `node --experimental-strip-types tests/bonded-risk-20261106.test.ts` |0|**9 pass,0 fail,0 skip**, `focused-final.log`|
| `node --experimental-strip-types tests/bonded-review-20261106.test.ts` |0|12 pass,0 fail,0 skip, `review-final.log`|
| `npm test` outside sandbox |0|**523 pass,0 fail,0 skip**, `full-final.log`|
| `npm run typecheck` |0|TypeScript passed, `typecheck.log`|
| `npm run build` |0|Production build passed; existing dependency annotation/large-chunk advisories, `build.log`|
| `systemd-analyze verify deploy/tontine-oracle.service` |0|Syntax verification, `systemd-verify.log`; does not mean installed/active|
| `node docs/qa/bonded-risk-20261106/integrity-check.mjs` |0|Exact22 paths, preserved baseline metadata,82 snapshots+5 logs retained/untracked, `integrity-check.log`|
| `git check-ignore --no-index …` on retained snapshot/log |0|Both ignored, `ignored-evidence.log`|

## Coverage and actual behavior

| REQ / AC | Test and evidence | Outcome |
|---|---|---|
|R1 / AC1|First four focused tests execute the real `BondedClubWorkspace` JSX handlers with state/ref/layout-effect lifecycle harness, mocked only wallet/provider/hook boundaries. Low,zero,stale,unknown quotes show unchecked acknowledgement; disabled Join and Contribute remain blocked when handlers are called programmatically; no `approve` or main call occurs. Tick permits `joinGroup`, or exact-amount `approve` then `contribute`. During a deferred approval receipt, account/club/quote changes, uncheck, loading or unmount prevent `contribute`. Exact100% and above100% need no acknowledgement; financial loading/error/unavailable cannot sign even after ticking. A→B→A does not resurrect acknowledgement; age-only unchanged fresh quote preserves it. Claim Interest and Withdraw Principal handlers work without acknowledgement. Warning copy/red presentation and existing eligibility gates reviewed in source.|Pass|
|R2 / AC2|Real liquidity component SSR with fully borrowed40USDC, over-debt50USDC, zero pool, unavailable/loading/error. Available principal clamps to zero and labels distinguish deposited principal/debt/available liquidity with no withdrawal promise. Actual `useBondedClub` hook is executed with failed debt multicall followed by failed required individual debt read; error is retained and `financialsAvailable` stays false instead of producing a valid zero snapshot.|Pass|
|R3 / AC3|Adaptive formatter3333.333333→3333.33;0.0075 preserved; tiny positive `<0.000001`; actual zero0. Prior suite also verifies $0.012/$160, different feed decimals and missing denominator.|Pass|
|R4 / AC4|English/Vietnamese combined explorer429/range/timeout/partial error chooses concise429 primary with retry, retains incomplete marker, omits spurious range-primary text. Prior suite tests complete RPC recovery clears error and partial remains partial.|Pass|
|R5 / AC5|Source inventory verifies Header shared chain name, AppKit shared pool helper and network utilities; no repeated requested RPC/explorer/chain/pool literal. Existing AppKit/network helper regression retained and passes full suite.|Pass|
|R6 / AC6|Prior real directory SSR strengthened: two Same name titles each contain their own shortened address (`0x1234...7890`, `0x2345...8901`), full identity retained; cancelled filtering, empty state and storage dedup coverage still pass.|Pass|
|R7 / AC7|Git HEAD `task-059` original manifest captured locally; same22 path set and every baselineSha256/isNew value preserved. Current source hashes verified. Git staged deletion inventory is exactly87 previous-task artifact paths:82 baseline source snapshots and5 long logs; all remain on disk, none remain tracked; other task059 historical baseline artifacts remain tracked. Ignore evidence and concise manifests/reports preserved.|Pass|
|R8 / AC8 code portion|Service file uses60000/1800, restart supervision and protected external environment file; systemd syntax passes. Operator script status path runs without signing; non-admin signer rejects before wallet creation (test would throw if signing client constructed). No real key or write used.|Pass prepared safeguards only|
|R8 / AC8 activation|Leader reports no signing key/environment or confirmed always-on host/credential path; pending user host information. No installed service, successful refresh receipt, live freshness read-back, recurring uptime or activation evidence exists in this dispatch.|Blocked / not achieved|

## Regression updates and limitations

Two existing test files changed to match intended behavior: previous review fixture now supplies required `financialsAvailable:true` and verifies address-bearing duplicate titles; AppKit assertion now checks `addrUrl(ARC_USDC_EURC_POOL)` instead of requiring the removed literal. Existing tests were not skipped or removed. Initial sandbox suite had those obsolete assertions plus known ten-members `spawnSync EPERM`; the final unrestricted suite passed all523 actual tests.

No implementation files or Git index entries were edited by Tester. No production/chain transactions, deployment or service installation occurred. Component lifecycle/handler and SSR tests are deterministic executable tests, not a visual browser or real-wallet E2E run. Current external oracle/provider availability and long-term daemon uptime are not inferred from mocked boundary tests. Re-freezing task059 identifies current source; it does not reassert historical QA for superseded hashes.

Local logs/snapshot inventories remain ignored and are referenced above for audit; only this concise report, test source and small integrity checker need tracking. No secrets are present in evidence.
