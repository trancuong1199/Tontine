# Task-050 — Leader acceptance

Accepted locally against the V2 three-file manifest frozen at `2026-10-25T16:13:34.120Z`.

Both wallet panels now use one compact collateral card. The default view shows status, the shortfall or locked amount, and the estimated remaining or current wallet balance. Full amounts, rewards, addresses, policy explanations and refresh are in native Details/Chi tiết, closed by default. Short warnings and eligible top-up/claim controls stay visible. Exact amounts, transaction handlers and financial guards are preserved.

BA spec and final coverage: `docs/ba/task-050/spec-v1.md` and `coverage-review.md`, Gate 4 APPROVED for all 3 requirements and 5 acceptance criteria. Independent Tester PASS: `docs/qa/task-050/test-report.md`, 25 focused cases included in 437 passing npm cases, typecheck/build exit 0, and pre/post 3 matching source hashes. All other 18 Task049 source/artifact/script paths remain unchanged. Initial typography failures were fixed by restoring minimum 12px text, with original tests and failure evidence retained.

Leader reviewed the source diff and the actual shared component rendered with representative fixture data and production CSS in isolated headless Chrome at 390px width. The card fits, details is collapsed, and amounts remain readable; this was a standalone visual check, not a logged-in wallet test. Vite at localhost:5173 returned HTTP 200 and final whitespace checks passed.

Gate 5 accepted. No commit, push, deployment, contract change or live transaction was performed. Prior Task049 local changes remain intact.
