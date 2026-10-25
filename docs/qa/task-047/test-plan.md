# Task-047 — independent QA plan

Spec-v1 Gate1 approved; tests prepared, waiting for frozen-source dispatch. Exact UI scope confirmed by Leader: ArcAppKitModal swap submit guard and MerchantTreasury **withdraw-all** guard, not deposit or RightSidebar. No implementation edits.

- Actual exported boolean validation wrapper uses existing parseSwapAmount acceptance; independently check empty/whitespace/junk/NaN/Infinity/exponent/negative/zero and positive decimals, token precision boundaries and amounts above2^53. No wallet call for pure validation.
- Bundle actual ArcAppKitModal with React state and wallet boundaries mocked; invoke real amount/select input callbacks then inspect actual submit disabled. Swap units: USDC18,EURC6,cirBTC8. Preserve disconnected and busy guards. Do not click transactions.
- Bundle actual MerchantTreasury; inject vaultBalance state through React hook boundary (including malformed simulated state), use actual asset selector callback and inspect real withdraw-all disabled. Vault ERC20 units6/6/8; preserve loading guard. This is guard rendering evidence, not a live read/withdraw simulation redesign.
- Source review checks unchanged local EURC/cirBTC defaults and binding caveat comment; Analytics normalization explanation native18/local-token decimals without logic change. Preserve3reviewdoc hashes.
- After freeze: source pre/post verify, targeted runtime then full npm,typecheck,build and real logs/exit. No Foundry rerun needed if Solidity/artifact untouched. No live RPC, wallet requests, transactions, or deploys.
