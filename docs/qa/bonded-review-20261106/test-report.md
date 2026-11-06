# Independent QA — bonded-review-20261106

Tester signoff: **PASS for code scope**, specification `docs/ba/bonded-review-20261106/spec-v2.md`, verified 2026-11-06. Live oracle refresh/deployment is not included in this signoff.

## Frozen source

Manifest: `docs/manifests/bonded-review-20261106/manifest.json` (29 implementation/documentation files). `hash-before.log` records initial handoff; `hash-retest-before.log` and `hash-after.log` confirm final revised source unchanged before/after final verification. Two initial bugs were returned to Developer through Leader; Tester did not edit implementation.

Final repaired files:
- `src/lib/bondedDisplay.ts`: `27447e38ba825519c1057a90b9ae158423fe53f30d93a42b6008a0e60bd30715`
- `src/lib/savingsClubDirectory.ts`: `8971d0754bbbed60bfad552fb7459540b85c9d1536432a0ab9bb2ba6d0667171`

## Executed commands and results

| Command | Exit | Actual result | Evidence |
|---|---:|---|---|
| `node scripts/manifest-tool.mjs verify bonded-review-20261106` before initial test | 0 | 29 matches | hash-before.log |
| `npm test` initial sandbox run | 1 | 46 test-file wrappers pass, 10 fail; see classification below | full-suite-initial.log |
| `node --experimental-strip-types tests/bonded-review-20261106.test.ts` initial suite | 0 | 11 pass | focused-initial.log |
| Same after adding tiny-ratio regression, before repair | 1 | 10 pass, 1 fail (positive tiny coverage shown as zero) | precision-regression-before-fix.log |
| `npm run typecheck` initial freeze | 0 | TypeScript pass | typecheck.log |
| `npm run build` initial freeze | 0 | TypeScript + production build pass | build.log |
| `node scripts/manifest-tool.mjs verify bonded-review-20261106` final before/after | 0/0 | All 29 match revised freeze | hash-retest-before.log, hash-after.log |
| `node --experimental-strip-types tests/bonded-review-20261106.test.ts` final | 0 | **12 pass, 0 fail, 0 skip** | focused-final.log |
| `npm run build` final freeze | 0 | TypeScript + Vite production build pass | build-final.log |
| `npm test` outside sandbox final freeze | 0 | **514 pass, 0 fail, 0 skip** | full-suite-unrestricted.log |

The final focused rerun includes a strengthened actual in-flight hide race after the full regression run; implementation did not change. Production build emits the existing large-chunk advisory; it is not a build failure. Full type-aware lint was not a clean baseline and was not used as a claimed green gate; Developer reports baseline comparison separately.

## REQ → AC → test → evidence

| Requirement | Independent verification | Result |
|---|---|---|
| REQ-01 / AC-01 | BRQ01 server-renders real LandingPage in English/Vietnamese against injected live fixture, loading and error snapshots; checks fixture name, 1.25% borrowing rate, 3/4 members, no old auction/absolute safety text or stale hardcoded fallbacks. Existing guide regression updated to current bonded facts. | Pass |
| REQ-02 / AC-02 | BRQ02 exact calculation: 20 sat units, BTC/USD60000, C10,N4 yields $0.012, maximum cycle160,0.0075%; feed decimals6 equivalence, zero collateral, missing price/decimals/denominator and positive sub-micro USD ratio. BRQ02/04 real collateral component SSR verifies quantity/value/ratio and historical disclosure. | Pass |
| REQ-03 / AC-03 | BRQ03 executes hour/day singular/plural and both subtitle translations; real directory SSR verifies distinct full addresses for identical names, cancelled removal with preserved row indexing, and all-cancelled empty state. Storage duplicate-address normalization remains covered by regression. | Pass |
| REQ-04 / AC-04 | Oracle freshness exact threshold, stale, missing, future timestamp, negative answer, incomplete round, recovery after newer data; real summary displays stale age/limit/mock disclosure and invalid values unavailable. CLI parser malformed args; main status/dry-run with mocked transport and fail-fast signer spies proves no signer access; interval>=maxAge rejects before signing. Runbook reviewed. | Pass for code; live refresh outside scope |
| REQ-05 / AC-05 | BRQ05 exercises real fetchBondedClubMembers with injected explorer429 and RPC failure, actual range errors, timeout, complete fallback and partial count; message preserves429 and does not invent range error; complete fallback clears errors. | Pass |
| REQ-06 / AC-06 | BRQ06 uses real storage functions: A/B/guest isolation across save/rename/remove/clear, uppercase account normalization and legacy global ignored; asynchronous factory sync writes original context and respects hide while groupName read is pending. Existing TC-DIR02 now passes uppercase0X removal. Source audit confirms keyed workspace/preview/directory, explicit account props, creation submitted-account/active-account guards and removal of implicit App autosave. | Pass; no full browser wallet-switch E2E |
| REQ-07 / AC-07 | BRQ07 executes canonical address/tx helper generation and scans runtime .ts/.tsx for duplicate Arc RPC/explorer endpoints; reviewed changed call sites. Registry source, XML namespaces, archived .arcstudio-backup files, external docs/service/social URLs are intentional exclusions. | Pass |

## Defects found and retested

1. `collateralCoverage(1n,100000000n,8,10000000n,4n)` initially returned USD `<0.000001` but percentage `0`. Positive tiny coverage now displays `<0.000001`; actual zero still displays zero. Initial failure evidence: `precision-regression-before-fix.log`; final BRQ02 passes.
2. `removeKnownGroup(targetAddr.toUpperCase())` initially rejected the uppercase `0X` prefix before normalization. Existing TC-DIR02 caught the regression; normalization repaired and final full suite passes. `digital-timer-and-directory-cleanup-updated.log` preserves failure; final full suite confirms pass. Explicit uppercase-account save is independently covered.

## Legacy-test updates and environment

Nine existing test files were updated, without removing coverage, to follow intentionally changed behavior: account/guest storage keys, explicit account arguments instead of mutable global setter, creation ownership guard instead of implicit global App autosave, live bonded featured card instead of fabricated legacy cards/zero-fraud metric, structured member diagnostic codes instead of hardcoded Vietnamese RPC error. `individual-club-delete` retains two-account removal coverage and now asserts a fresh account does not inherit entries.

Initial sandbox ten-members failure is `spawnSync /bin/sh EPERM`, matching Leader baseline. It is not accepted as a code failure or silently skipped: full suite was rerun outside sandbox and all514 actual tests passed. Initial final-focused operator test had a QA harness shebang parsing error; stripping the generated shebang fixed the harness only, and both read-only paths then passed. Intermediate logs are retained honestly.

No visual browser run, live wallet signing, oracle write, contract migration, deploy or heartbeat service activation occurred. SSR and mocked provider responses test application behavior deterministically; they do not prove current external provider availability or refresh the deployed stale oracle. The read-only live-chain facts supplied by Leader are used as test fixtures, not claimed as fresh Tester observations.
