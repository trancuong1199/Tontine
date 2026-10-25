# Task-047 — source integration review

Spec-v1; frozen5-file diff reviewed before signoff.

- REQ01: arc-constants changes only comment. It states EURC/cirBTC absent from facts, bindings in legacy swap/payment/router/vault, risk of partial global override, and deployment-only CirBTC override. Addresses/decimals/router/vault values unchanged; no new env variables or configuration behavior. Contract facade/per-club getter source untouched, existing task044 tests run in full npm regression.
- REQ02: swapSafety adds `isPositiveAmount`, delegating unchanged parseSwapAmount and catching exceptions. Modal disabled keeps isSwapping/disconnected and uses18/6/8 from shared constants for selected token; Treasury withdraw keeps loading and uses selected TOKEN_CONFIGS6/6/8. Only imports/predicate expressions change in consumers; handlers, approvals, amounts, simulation deposit and routing untouched.
- REQ03: arcAnalytics changes only documentation: scale18 internal chart aggregation for USDC6/native18, not ERC20 transfer/input decimals. New mixed-unit runtime verifies exact2234567000000000001n total, excludes EURC/cirBTC/failed/incoming and preserves input source units; task046 helper/component regressions run unchanged.

Guard component tests execute actual production component bodies and input/select callbacks with controlled React hook state. They suppress effects and inject Treasury vaultBalance strings (including malformed simulation state) to isolate button predicate; no wallet requests or transaction callbacks execute. They do not claim native HTML validation, browser layout, live RPC, or withdrawal end-to-end coverage. No Foundry execution is required because Solidity/artifact remain unchanged.
