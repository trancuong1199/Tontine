# Task-047 Developer handoff

Ready for independent QA against `docs/ba/task-047/spec-v1.md`. Exactly five assigned source files were snapshotted before edits and frozen in `manifest.json`; source edits have stopped. `implementation.diff` is the full baseline-relative source diff.

Added `isPositiveAmount(amount: string, decimals: number): boolean` in `swapSafety.ts`, delegating to the unchanged `parseSwapAmount` and catching exceptions. The ArcAppKitModal disabled predicate now uses native/wrapped USDC18, EURC6 or CirBTC8 according to the selected input token, while retaining the existing busy/connection guards. MerchantTreasury withdraw uses the selected ERC-20 TOKEN_CONFIGS decimals6/6/8 and retains its loading guard. Parser grammar, extra-trailing-zero behavior, transaction handlers, routing and simulation arithmetic are unchanged.

Comments explain why project EURC/CirBTC defaults cannot be partially overridden globally and distinguish the existing new-club-only CirBTC override. The analytics comment clarifies that scale18 is only the internal chart aggregation unit for USDC6/native18 records, without changing its algorithm or token transfer units.

Developer commands executed:

- `npm run typecheck`: exit 0, `developer-typecheck.log`.
- `git diff --check`: exit 0, tool output.
- `node scripts/manifest-tool.mjs verify task-047`: exit 0, `developer-verify.log`.

Full npm regression/build and consumer runtime tests remain assigned to the independent Tester; Developer did not duplicate those checks for this narrow cleanup. No Solidity edit/rebuild, live transaction/deployment, commit/push or change to the three untracked review documents was made.
