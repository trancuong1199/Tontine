# Task-048 — independent Tester signoff

**PASS**,2026-10-25. Spec `docs/ba/task-048/spec-v1.md`;7-file source manifest frozen `2026-10-25T15:06:25.378Z`. All7 SHA256 matched before and after testing. No implementation changes by Tester.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Source integrity | Pre/post exit0,7 matches each | `pre-verify-run1.log/.json`, `post-verify.log/.json` |
| Focused capability/hook/panels | Final5 pass,0 fail,0 skip;exit0 | `new-runtime-run2.log/.json` |
| Full npm | Final427 pass,0 fail,0 skip;exit0 | `npm-run2.log/.json` |
| Typecheck / build | Both exit0 | `typecheck-run1.log/.json`, `build-run1.log/.json` |
| Review docs | All3 unchanged | `review-docs-sha256-before.json`, `review-docs-sha256-after.json` |
| Contract/artifact | Unchanged from HEAD | `contracts-unchanged.json` |
| Independent live diagnosis | Read-only curl batch succeeded;legacy evidence reproduced | `live-readonly-request.json`, `live-readonly-response.json` |

Counts are individual cases, not test-file wrappers. The5 focused cases are included in427 npm cases. No Foundry rerun was required because Solidity/artifact did not change; previous results are not reported as a new run. Build has dependency annotation/chunk-size warnings only.

## REQ/AC evidence

| Requirement | Evidence |
| --- | --- |
| REQ01 / AC01a–b | Actual classifier accepts0n/positive, marks pending/refetch checking, code3 getter revert and typed zero-data unsupported. Actual installed viem getContractError fixtures reproduce code3 and generic-32603 both wrapped as ContractFunctionRevertedError; only definite revert is unsupported. Timeout/rate-limit/message-only/ambiguous revert wrappers remain error, including stale cached data. Actual useCycleCapability verifies selected address+Arc chain+getter, no previous placeholder, pending address change,unsupported,error/retry and supported transition. Club/claims queries remain separate in source. |
| REQ02 / AC02a–b | Both actual panels rendered across4 states×2 languages. Injected restart only supported; passkey never has restart action. Unsupported/checking/error notices distinct; false restart promise absent; checking retry disabled,error retry invokes callback. Create-club,payout and collateral callbacks remain usable across all statuses. Actual App source asserts both panels receive selected-club capability and retry. Supported task045 collateral regressions preserved. |
| REQ03 / AC03a–b | Actual guarded hook checks chain switch before simulation, correct sender/Arc/address/function/args, then one wallet write. Duplicate during preflight and wallet render gap blocked; caller onSettled forwarded and unlocks. Revert/offline/switch rejection cause no write,error and clear pending; subsequent retry succeeds. Account/chain change during simulation and account change during switch rejected; mismatched request sender rejected. Approve/contribute/claimPayout/claimCollateral retain no-simulation forwarding. No gas/fee fields added. |
| REQ04 / AC04a | Real logs/exit counts,pre/post7 hashes,3 unchanged reviews,independent recorded RPC evidence,contracts unchanged,no live write/deploy/confirmation. |

## Read-only deployed-club evidence

Recorded RPC response independently confirms selected club state2/currentRound2/activeMembers0,maxMembers2,caller owner+member,positive native gas balance and equal latest/pending nonce. members(0) and members(1) return valid addresses;members(2) reverts. cycleStartRound, startNewCycle eth_call and eth_estimateGas all return code3 execution reverted. Deployed code9,386bytes lacks the two expected selectors (bytecode hex-string SHA256 recorded). Together with getter failure this supports unsupported deployed cycle API, rather than a missing native-balance diagnosis. This batch contains only eth_call,eth_estimateGas,eth_getBalance,eth_getTransactionCount,eth_getCode,eth_chainId; no wallet operation or broadcast.

## Harness corrections and limits

First focused run4/5 and npm426/427 failed only the typed-zero-data fixture (`new-runtime-run1.log`, `npm-run1.log`, matching exit1 JSON). Test imported viem ESM errors but esbuild CJS-loaded helper used a separate viem class identity; diagnostic showed constructor equality=false and ESM instance instanceof CJS constructor=false. Classifier test now directly imports actual production TypeScript in ESM with its viem fixtures. Expected typed-zero-data/code3 unsupported and generic internal-RPC error outcomes were preserved, with no implementation/oracle weakening; final reruns pass on unchanged source.

Two existing harness compatibility edits: task044 @wagmi/core mock exports simulateContract that throws if old non-restart regression unexpectedly calls it; task045 panel base fixture explicitly sets capability supported so its collateral-notice regression continues exercising supported clubs. Existing assertions remain. Test hashes saved in `test-sha256.json`.

Component/hook tests use mocked React/wagmi/wallet boundaries and execute real production bodies/callbacks. Query target/no-placeholder assertions do not claim full TanStack cache E2E; App propagation is source-reviewed. No browser/native wallet/OKX prompt behavior or actual mined restart was exercised. Simulation may become stale before mining. See `source-review.md`; BA owns coverage check and Leader final acceptance.
