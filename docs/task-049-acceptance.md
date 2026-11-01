# Task-049 — Leader acceptance

Accepted locally on 2026-10-25 against the V2 source manifest frozen at `2026-10-25T15:52:57.529Z`.

Max's five requested changes are implemented: explicit none/custom collateral at creation, exact remaining collateral instead of wallet-capped deposits, exact pre-sign amounts and estimated remaining balance, exact CirBTC approval with explicit EOA follow-up consent, and mandatory collateral enforcement in newly compiled contracts. New joins bind the reviewed requirement to prevent an owner setting change from silently altering the debit. Existing deployed contracts retain their original behavior and receive a legacy notice.

Both wallet modes support reviewed top-ups. Restart does not automatically debit or restore collateral; new-contract participation requires sufficient locked collateral. Existing claim, kicked-member, cancellation and payout rules are preserved. Vault displays separate locked funds, rewards and wallet balance at eight decimal places.

## Gates and evidence

- Gate 1: BA specification approved, `docs/ba/task-049/spec-v1.md`.
- Gate 2: Developer baseline and V2 freeze of 21 paths, `docs/manifests/task-049/manifest.json`; earlier revision retained.
- Gate 3: Independent Tester PASS, `docs/qa/task-049/test-report.md`: 437 npm tests, 106 Foundry tests, TypeScript and production build all pass. Independent ABI, creation bytecode and runtime bytecode match.
- Gate 4: BA APPROVED all 7 requirements and 14 acceptance criteria, `docs/ba/task-049/coverage-review.md`.
- Gate 5: Leader accepts. Independent final manifest verification matched all 21 paths; `git diff --check` passed; local Vite endpoint returned HTTP 200.

No commit, push, live deployment or public transaction was performed. HEAD remains `a7b5aca26684faaa61e154966b2c19f2a4bfee4d`. The six deployment scripts were migrated and syntax-checked locally, not executed; they remain ignored/untracked under existing repository rules. The three original review documents were already absent when this task began; QA records that limitation rather than claiming current unchanged file hashes.

Validation used local Solidity execution and production component/hook tests with mocked wallet/RPC boundaries. No browser/native-wallet or mined public transaction was tested. Contract enforcement changes require a future deployment, which is outside this authorization. Dev server remains available at `http://localhost:5173/`.
