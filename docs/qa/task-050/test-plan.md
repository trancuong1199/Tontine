# Task050 independent QA plan

Preparation only; await approved spec and source freeze before final execution. Ownership: tests and this QA directory; no implementation edits. Preserve Task049 evidence and source work.

Adapt existing Task049 collateral runtime cases to render the actual shared collateral child within each production panel. Keep the same cases for exact required/locked/shortfall/wallet/after values, separate rewards, unknown/legacy/none, deficit, EOA separate approval/receipt/action, passkey batch and failed receipt behavior. Existing card case will check one shared card, native details default closed, concise visible values and eligible claim outside the collapsed section even when policy data is unknown. No new cosmetic test suite.

Update existing Task045 panel fixture/selectors only where the shared component moves content; keep actual preset actions and lifecycle notices. Run relevant existing Task048 capability regression so claim/restart restrictions remain covered. Record structural test corrections with their reason rather than deleting functional assertions.

Final validation after Leader dispatch: pre/post manifest verification, focused existing collateral/cycle/review suites, typecheck and production build with actual logs/exit codes. Solidity is unchanged so no Forge rerun is planned. Test hashes before edits are captured in test-baseline-sha256.json; final hashes and signoff will follow execution. No commit/push/deploy/live wallet action.
