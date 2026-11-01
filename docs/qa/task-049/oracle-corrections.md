# Task049 test oracle and fixture corrections

First failures are retained verbatim in `npm-run1.log` (19 failures), `forge-run1.log` (3 failures), and `new-runtime-run1.log` (1 fixture failure). No implementation was changed by Tester. Constructor migration and independent new tests were prepared before those runs.

| Prior expectation / test | Correction and requirement evidence |
| --- | --- |
| Constructor6 in old deployment ABI tests and 14 Foundry callers | Constructor7 includes explicit R; default0 preserves previous no-collateral fixture economics. New runtime decodes actual seven encoded constructor arguments, including 1 satoshi (REQ01/05). |
| TC-GUARD-03/04, AC02.8 | Permit explicit account between function/args and extra disabled guards; retain correct contribution args, deadline and positive-bid checks. Syntax-only updates; behavior remains required. |
| TC-GUARD-07 | Token allowance error now applies to USDC and CirBTC, so exact message uses “token”; unrelated AlreadyWon semantics retained. |
| TC-I18N-04 | New bilingual join success wording; no loss of success-language assertion. |
| TC-VAULT-01/04 | Deposited event amount is actual shortfall, not full requirement; create requires explicit none/custom, not default presets (REQ01/02/05). |
| TC-CREATE-03/05/06/07 | Require explicit policy, snapshot constructor7 args, duplicate deployment lock and successful receipt status. Existing name/USDC/member/duration validation retained; independent actual modal test covers receipt failure/retry and snapshot metadata (REQ01). |
| TC-JOIN-01/04/08 | Previously expected direct no-approval/no-collateral join body. New shared path reviews per-club CirBTC, approves exact shortfall when necessary and uses bounded join for marker1; USDC approval remains absent from join. Both contract entrypoints are nonReentrant and share enforced membership logic (REQ03/04/05). |
| TC-JOIN-07 | Allow async handler prefix while retaining USDC bid approval assertions. |
| T045/T046 three panel runtime tests | Add real persistent useRef boundary and known collateral quote. Quote follows funded/unknown fixture state. Warning now means below-required, includes partial collateral; zero display now exact8. Existing real preset clicks and permissionless notices retained (REQ02/06). |
| ArcReviewFixes custom-token deposit | Fully funded member's old overdeposit200000 now must revert InvalidConfiguration; claim remains exact locked100000. Second-token fixture constructorR500000 approves before bounded join instead of optional deposit under R0 (REQ05). |
| ReviewFollowup no-winner history | Slashed member explicitly tops up100000 after restart before contribute. Original one-time refund/history/no-recredit assertions retained (REQ06). |
| New creation runtime run1 | Mock receipt query omitted isLoading; actual wagmi provides boolean. Set explicit false default; did not relax disabled-state expectation. |
| New vault runtime/npm run2 | Passkey reads smart-account quote.balance; test had quote1000000 but EOA prop1. Set quote balance1 and recomputed deficit/after consistently, retaining exact1sat assertion. Logged run2 failure retained. |

Final npm run3 passes437/437; new runtime run3 passes10/10. Final Forge run2 passes106/106 after the three explicit policy-oracle corrections. First run reports are diagnostic evidence only, not final acceptance.
