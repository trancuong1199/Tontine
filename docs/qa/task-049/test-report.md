# Task049 independent acceptance report

**PASS — Tester signoff**, 2026-10-25 UTC. Scope: spec-v1 on V2 manifest frozen `2026-10-25T15:52:57.529Z`, 21 implementation/artifact/script paths. No implementation changes by Tester; no commit, push, deployment or public transaction.

| Executed validation | Actual result | Evidence |
| --- | --- | --- |
| Manifest before / after final validation | 21/21 MATCH, exit0 both | pre-verify-run2.log/json; post-verify.log/json |
| Focused actual production runtime/components | 10 tests passed, 0 failed/skipped, exit0 | new-runtime-run3.log/json; tests/collateral-policy.test.ts |
| Full npm test | 437 tests passed, 0 failed/skipped, exit0 | npm-run3.log/json |
| TypeScript | exit0 | typecheck-run2.log/json |
| Production build | exit0 | build-run2.log/json |
| Full Foundry | 106 tests across6 suites passed, 0 failed/skipped, exit0 | forge-run2.log/json |
| New Solidity collateral suite | 15 passed, including fuzz; included in106 | contracts/test/CollateralPolicy.t.sol; forge-run2.log |
| Existing stateful invariants | 4 passed, each256 runs /128000 calls; included in106 | forge-run2.log |
| Independent compiled ABI / creation bytecode / runtime bytecode | all equal | artifact-comparison.json; temporary compiler output /tmp/task049-qa-out |
| Working diff whitespace | exit0 | diff-check.log/json |

Counts are individual test cases, not file wrappers; focused10 are included in full437 and new Solidity15/invariants4 are included in106. Build emitted dependency annotation and bundle-size warnings; it completed successfully. No mutating lint command was run.

## Requirement coverage

| Requirement / AC | Independent evidence |
| --- | --- |
| REQ01 / AC01a–b | Runtime strict parser + actual CreateClubModal encoding/explicit selection/1sat/receipt retry/submitted snapshot; actual App owner confirmed/rejected EOA and failed passkey receipt, fresh state/member guards, context resets; Forge constructor/setter guards. |
| REQ02 / AC02a–b | Runtime exact bigint/uint256/1sat, D/deficit/after, actual quote reader, both-panel actual previews, unknown/legacy/none; new V2 vault runtime checks separate rewards/locked and exact8 wallet; Forge rewards-not-locked. App onchain0 authority tested and integration source reviewed. |
| REQ03 / AC03a–b | Actual EOA callbacks capture exact per-club token/spender/D approval; receipt refresh produces no automatic second transaction; separate deposit and bounded/legacy join clicks; quote changes/insufficient/unknown/context/duplicate/error-retry checks. Existing guarded-write regression plus source review covers chain/sender binding. |
| REQ04 / AC04a–b | Actual passkey callbacks in both languages decode atomic calls: exact approve iff needed then one action, noapprove for none/adequate allowance; smart-account balance review, invalid quote guards, failed inner receipt with successful outer receipt and retry. Shared preview/runtime and source review cover legacy/unknown distinctions. |
| REQ05 / AC05a–c | 15 new real Solidity tests cover both joins, bounded requirement race despite unlimited allowance, transfer/allowance/balance failure rollback, nonReentrancy, no-token-call none, exact shortfall, zero/over/partial deposit, funded start/contribute/bid and no USDC mutation on rejection. |
| REQ06 / AC06a–b | Real slashed and withdrawn restart lifecycles require explicit ACTIVE topup; partial remains blocked, completed deposit/kicked claim reject; existing payout/cancellation/no-winner history regressions pass. Both-panel new-policy/legacy/loading/unknown fixtures and all Task048 capability regressions pass; claims remain independent per source review. |
| REQ07 / AC07a | Pre/post21 hashes, test-final-sha256.json, full logs/exit codes, independent native-solc0.8.28 artifact equality, constructor caller migration, documented old-oracle corrections, no live writes. |

First failures and reasons are preserved in `oracle-corrections.md` with original run1/run2 logs. First npm run1 had19 stale-oracle/fixture failures, Forge run1 had3 old collateral-policy expectations, and new runtime run1 omitted a receipt boolean in its mock. V2 runtime/npm run2 exposed inconsistent EOA-prop versus passkey-quote test balance; corrected the fixture to1sat without weakening assertions. Final acceptance uses only the successful runs listed above on unchanged V2 source hashes.

Three original review documents were already absent at baseline and remain absent (`review-docs-sha256-before.json` / `after.json` contain null). No current “unchanged file hash” claim is made for them, and they were not recreated. See `source-review.md` for integration evidence and limits: mocked wallet/RPC boundaries, local Solidity, no browser/live wallet/mined transaction validation; six deployment scripts were not executed. No unresolved implementation blocker was found; ready for BA coverage check and Leader acceptance.
