# Task-046 — independent Tester signoff

**PASS**, 2026-10-25. Tested spec `docs/ba/task-046/spec-v1.md` and the 18-file manifest frozen at `2026-10-25T13:06:53.528Z`. Source SHA256 verified before and after execution; all18 matched. Tester edited tests/docs only. No implementation changes were made to obtain pass.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Pre/post source integrity | exit0 / exit0,18 matches each | `pre-verify-run1.log`, `post-verify.log`, matching JSON |
| New TS balance/Analytics/config runtime | 9 pass,0 fail,0 skip; exit0 | `new-runtime-run1.log/.json`; `tests/arc-review-v3.test.ts` |
| Actual savings panel/formatter/preset runtime | 5 pass,0 fail,0 skip; exit0 (4 task045 plus1 task046) | `panels-runtime-run1.log/.json`; `tests/review-followup.test.ts` |
| Full npm final run | 418 pass,0 fail,0 skip; exit0 | `npm-run2.log/.json` |
| Typecheck | exit0 | `typecheck-run1.log/.json` |
| Production build | exit0 | `build-run1.log/.json` |
| Full Foundry | 91 pass,0 fail,0 skip across5 suites; exit0 | `forge-run1.log/.json` |
| Independently compiled artifact | ABI,creation bytecode and deployed bytecode all equal | `artifact-comparison.json` |
| Original review docs | all3 SHA256 unchanged | `review-docs-sha256-before.json`, `review-docs-sha256-after.json` |

Counts are individual test cases, not file wrapper results. Focused TS cases are included in418 npm cases, not additional unique tests. Foundry91 consists of69 base unit tests,4 invariant cases,14 task044,2 task045 and2 task046. Temporary compiler output/cache at `/tmp/task046-qa-out` and `/tmp/task046-qa-cache` kept the handed-off artifact untouched. Native Solidity compiler0.8.28; exact commands and actual start/end/exit values are in each JSON.

## Independent coverage

| REQ/AC | Runtime evidence and source integration |
| --- | --- |
| REQ-01 / AC01a–c | `T046 ERC20 reader` injects ethers ContractRunner.call and decodes actual balanceOf requests/canonical token address/account; getBalance is forbidden. Arc provider RPC/chain verified. Balance formatter raw huge/zero/micro/rounding and null; partial/all read errors remain null. Actual Dashboard effects/ref/state/render checks huge USDC,0.00 vs unavailable and no call to wrong-chain injected provider. All5 consumers inspected to use shared reader and no native fallback/grouped-string reparsing; see `source-review.md`. |
| REQ-02 / AC02a–c | Holdings helper mixedcase canonical duplicate, duplicate other address, fake USDC symbol, WUSDC identity and malformed rows. Normalizer checks native18 exact amounts/fees, local USDC/EURC/cirBTC decimals, unknown/malformed symbols, invalid timestamp/amount, known-fee sum and outgoing USDC-only volume. Actual Analytics mock fetch/render checks2 holdings with1 canonical pie row, separate same-symbol token, exact row/fee strings, unknown local fee cells, finite chart data, approximate label and RPC-error view. |
| REQ-03 / AC03a–c | Facts/config equality,native18/ERC206 distinction, missing-USDC guard,local token/WUSDC defaults; actual arcNetwork/arcChain modules bundled and checked,non-Arc generic add-chain request preserves supplied metadata. Merchant shared TOKEN_CONFIGS and WUSDC router binding source-reviewed. Existing npm task044 deployment override/per-club regressions pass. |
| REQ-04 / AC04a–c | Both actual wallet panels render permissionless VI/EN notice. New Foundry outsider kick checks early/deadline/member/contribution guards and no manual collateral slash; prior winner cannot bid/manual-kick or receive subsequent bonus. Actual AlreadyWon parser matches current-cycle bid/kick message. Contract diff comments-only and guide translations reviewed. |
| REQ-05 / AC05a–b | Shared presets frozen1/2/5/10; both initial and raise branches use same export. Actual button callbacks execute in both panels; initial values and raise deltas with1000USDC,6dp and >2^53 preserve exact inputs. |
| REQ-06 / AC06a–b | Pre/post18 hashes,real runtime/full package/typecheck/build/Foundry logs,independent artifact match,3 unchanged review docs,no live transactions. |

## First-run failure and oracle correction

Full npm run1 had417 pass/1 fail,exit1 (`npm-run1.log/.json`). `TC-GUARD-07` in `tests/allowance-and-expiration-guard.test.ts` expected the old AlreadyWon message claiming a pre-Task018 contract; actual code returned the current-cycle bid/kick restriction required by task046 AC04c. Leader explicitly approved correcting that obsolete expectation. The test still executes the actual `parseContractError` with `AlreadyWon()` and checks the resulting message; other error checks remain. No test was removed or skipped, and no implementation changed. Final npm run2 passed418/418 on the same frozen source. Test file SHA256 values are saved in `test-sha256.json`.

Build emits existing dependency annotation/chunk-size warnings, without an error. Component evidence is production render/callback execution with mocked React state/effect/ref lifecycle and mocked RPC/explorer boundaries; it is not browser E2E, real wallet/WebAuthn or live-network availability evidence. ArcAppKitModal/RightSidebar/ArcAppKit wiring is source-reviewed rather than full component lifecycle coverage. BA must perform the business coverage check; Leader owns final acceptance.
