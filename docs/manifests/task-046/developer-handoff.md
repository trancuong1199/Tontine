# Task-046 Developer handoff

Status: source frozen for independent QA against `docs/ba/task-046/spec-v1.md`. Manifest identifies 18 changed/new implementation files. Baseline snapshots captured all assigned existing sources before edits; `implementation.diff` excludes generated artifact JSON for readability. `src/onchain-money.ts` required no further change.

## Changes

- Shared Arc-pinned ERC-20 balance reader for ArcAppKitModal, RightSidebar, ArcAppKit, Dashboard and Analytics. Canonical USDC uses its six-decimal `balanceOf`; native balance is not added. Failure is null/unavailable, and mounted/request/account guards prevent outdated balance requests from replacing current-account data.
- Shared bigint display for USDC, EURC and cirBTC. Dashboard stores raw balances; approximate valuation/chart conversion is explicit, finite, and never derived from grouped display strings. No fake portfolio allocation is substituted on read failure; existing synthetic activity is labeled Sample. Existing estimated swap outputs reject nonfinite results without changing routing or transaction construction.
- Analytics deduplicates canonical USDC by case-insensitive contract address, keeps distinct-address tokens even with symbol USDC, ignores rows missing usable identity/decimals/raw data, and represents explorer native transaction values/fees with bigint18. Local records preserve supported token metadata and unknown fees remain null; only known fees are summed. USDC volume only includes successful outgoing USDC. Charts explicitly identify approximate token units or volume; table values and fee totals remain exact.
- Arc chain/RPC/explorer/native decimals/USDC facts are centralized with guards. EURC/CirBTC remain documented project defaults. RightSidebar wrapped-USDC routing, router/vault addresses and non-Arc configurations remain intact. Treasury token configuration and exact transaction amount display now consume the common definitions.
- Both savings panels use immutable shared presets in initial/raise paths, and show bilingual permissionless settlement/manual-kick rules. AlreadyWon explains the current-cycle restriction. Contract edits only document existing permissions and bonus eligibility; no access control, payout, slashing or cycle behavior changed.

## Developer validation

| Command | Result/evidence |
| --- | --- |
| `npm run typecheck` | exit 0, `developer-typecheck-final.log` |
| Forge build with solc 0.8.28, default optimizer, `--out /tmp/task046-build --cache-path /tmp/task046-cache --skip test --skip script` | exit 0, 16 files compiled; `developer-contract-build.log` |
| `npm run build` | exit 0 on the final frozen version, `developer-build-frozen.log` |
| `git diff --check` | exit 0, tool output |
| `node scripts/manifest-tool.mjs verify task-046` | exit 0, `developer-verify.log` |

The target artifact was copied from `/tmp/task046-build/RotatingSavings.sol/RotatingSavings.json` and reformatted with two-space indentation only. Existing dependency annotation/large-chunk and Solidity timestamp warnings remain. Tester owns all regression assertions and independent logs; Developer validation is not QA signoff.

No live deployment, transaction, commit or push was performed. The three untracked review documents remain unchanged. Live RPC/explorer availability and real wallet/device interaction are not established by local helper/build checks. Legacy swap transaction algorithms, vault algorithms and simulations were not redesigned by this balance/configuration task.
