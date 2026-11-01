# Existing test adjustments and first failure

Only `tests/collateral-policy.test.ts` and `tests/review-followup.test.ts` were adapted. No new suite or test case was added. Baseline hashes of four relevant existing test files are saved separately.

The existing panel harness now executes the actual production CollateralPreview child when traversing elements/text. The existing vault case checks a single shared card, native details without open, VI/EN summary, exact8 breakdown including1sat, shortfall/funded/none/unknown/legacy/deficit display, collapsed full addresses, refresh callback, and topup/eligible claim outside details. Claims remain visible with unknown policy; kicked claims remain unavailable. Existing money-operation cases keep their exact call targets, amounts, consent, receipt, duplicate/stale quote and retry assertions.

The old five-value preview assertion now checks R/L/D/B/rewards in details and verifies expected after-balance in the compact summary. The Task045 zero-locked assertion selects the semantic locked dl row instead of a removed decorative span; its exact zero requirement remains. Existing deadline/preset/claim/approval logic was not relaxed.

V1 focused25 tests, typecheck and build passed. Full npm V1 failed2/437: TC-TYPO-04 and TC-TYPO-05 prohibit text below12px. These were actual presentation regressions, not obsolete oracles. Leader returned only CollateralPreview to Developer; Developer replaced four text-[11px] classes with text-xs and refroze the same3 paths. Tester did not edit source or alter these typography assertions. V1 npm.log/json and tested-manifest-v1.json remain as evidence; final V2 logs are separate.

The initial combined focused command reported4 file wrappers. Direct per-file TAP runs are provided to show actual25 case results (collateral10, cycle5, review5, vault5); no wrapper count is presented as case coverage.
