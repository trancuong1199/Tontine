# Task-047 — independent Tester report

**PASS — independent Tester signoff**,2026-10-25. Spec `docs/ba/task-047/spec-v1.md`; manifest5files frozen `2026-10-25T14:32:39.399Z`. No implementation or legacy test-oracle edits by Tester.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Source preverify | 5 matches,exit0 | `pre-verify-run1.log/.json` |
| Targeted new guard/runtime | 4 pass,0 fail,0 skip;exit0 | `new-runtime-run1.log/.json`; `tests/guard-followup.test.ts` |
| Reused task046 balance/Analytics runtime | 9 pass,0 fail,0 skip;exit0 | `analytics-runtime-run1.log/.json` |
| Full npm | 422 pass,0 fail,0 skip;exit0 | `npm-run1.log/.json` |
| Typecheck | exit0 | `typecheck-run1.log/.json` |
| Production build | exit0 | `build-run1.log/.json` |
| Source postverify/reviewdocs | 5 matches,exit0;3 reviewdocs unchanged | `post-verify.log/.json`, `review-docs-sha256-after.json` |
| Solidity/artifact | unchanged from HEAD | `contracts-unchanged.json` |

Counts are individual cases, not test-file wrappers. The4 new and9 reused targeted cases are included in422 npm cases. No Foundry rerun: contract and artifact unchanged, as authorized for this frontend/comment scope; previous91 contract results are not represented as a new run.

| REQ/AC | Independent coverage |
| --- | --- |
| REQ01 / AC01a–b | Source diff confirms arc-constants comments only: absent facts, legacy binding risk and deployment-only override. No addresses/decimals/router/vault/override behavior changed. Task044 deployment/per-club and task046 config regressions included in full npm. See `source-review.md`. |
| REQ02 / AC02a–c | Actual isPositiveAmount wrapper and unchanged parseSwapAmount tested with empty/whitespace/junk/NaN/Infinity/exponent/zero/negative/sign/grouping,positive fractions,raw units and >2^53. Overprecision nonzero rejected; extra representable trailing zeros accepted. Actual Modal input/select callbacks and submit disabled use selected18/6/8; disconnected/busy preserved. Actual Merchant asset selector + controlled vaultBalance state and withdraw-all disabled use6/6/8; loading preserved. Both guard render tests assert zero wallet calls. |
| REQ03 / AC03a–b | Diff comment-only, no algorithm change. New mixed USDC6/native18 test sums2234567000000000001n, excludes non-USDC/failed/incoming and preserves source raw units. Reused9 runtime cases also cover actual Analytics production rendering/normalization. |

Component tests control React hook state and suppress effects to isolate guards; malformed Treasury balances are injected at state boundary. They execute production render and input/select callbacks, not copied predicates. This is not native HTML validation/browser layout, live read/write wallet integration, or a change to simulation deposit arithmetic. No live RPC,transaction,deployment performed. BA owns business coverage check and Leader final acceptance.

Final source SHA256 matches all5 handed-off files; test SHA saved in `test-sha256.json`. Build has dependency annotation/chunk-size warnings only, no errors. No failed tests,skips,oracle correction or unresolved blocker.
