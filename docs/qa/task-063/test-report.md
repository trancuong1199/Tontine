# Test report: TASK-063 Partial CirBTC liquidation

**Tester**: independent Tester agent · **Date**: 2026-11-23 · **Spec**: `docs/ba/task-063/spec-v1.md` (v1) · **Manifest**: `docs/manifests/task-063/manifest.json` (frozen 2026-11-23T07:27:02.409Z)

## 1. Integrity (SHA256)
| Step | Command | Exit | Result |
|---|---|---|---|
| Before testing | `node scripts/manifest-tool.mjs verify task-063` | 0 | 7/7 MATCH |
| After testing | `node scripts/manifest-tool.mjs verify task-063` | 0 | 7/7 MATCH |

No implementation file was modified by the Tester. Files the Tester created or changed:
- `contracts/test/PartialLiquidation.t.sol` (new, 24 tests including 1 fuzz test)
- `tests/partial-liquidation-ui.test.ts` (new, 7 tests)
- `tests/bonded-minimal-ui-20261108.test.ts` (MIN-03 assertion updated, see section 4)

## 2. Commands and results
| Command | Exit | Pass | Fail | Skip |
|---|---|---|---|---|
| `export PATH=$HOME/.foundry/bin:$PATH; forge test --out <scratch>/out --cache-path <scratch>/cache` (full suite, 8 suites) | 0 | 146 | 0 | 0 |
| `forge test --match-contract PartialLiquidationTest --fuzz-runs 2000` (extra fuzz depth) | 0 | 24 | 0 | 0 |
| `npm test` | 0 | 562 | 0 | 0 |
| `npm run build` (`tsc --noEmit && vite build`) | 0 | built | - | - |

The `forge test` run wrote its output and cache to a scratch directory so it would not rewrite the frozen `contracts/out/BondedTontine.sol/BondedTontine.json`, which the manifest covers. The freshly compiled `BondedTontine` artifact was compared with the frozen one: ABI, creation bytecode and deployed bytecode are **identical**. This confirms the ABI the frontend imports matches the source under test. Build warnings are limited to the existing Vite chunk-size warning.

## 3. Traceability: REQ → AC → test → evidence
| REQ | AC | Test(s) | Evidence |
|---|---|---|---|
| REQ-01 | AC-01a healthy / no debt / not ACTIVE | `test_AC01a_NotLiquidatableWhenHealthy`, `test_AC01a_ExactlyAtThresholdNotLiquidatable_JustBelowIs`, `test_AC01a_NotLiquidatableWithoutDebt`, `test_AC01a_WrongStateOutsideActive` (OPEN, CANCELLED, DEFAULTED, COMPLETED → `WrongState`; views return 0) | PASS |
| REQ-01 | AC-01b exact USDC/cirBTC deltas, state deltas, event | `test_AC01bcdg_MaxLiquidationHandComputed` (hand-computed: repay 2,666,666,667, seize 17,500,000 sats, `PartiallyLiquidated` via `expectEmit`), `test_AC01b_PartialSmallRepayExactDeltas`, `test_AC01b_OwnerMayLiquidateToo`, fuzz | PASS |
| REQ-01 | AC-01c health ≥ safetyBps after max (±1 bps) | `test_AC01bcdg_...` (exactly 12000), `test_Safety20000_ThresholdIs150_RestoresTo200`, `test_SequentialLiquidationsAfterFurtherDrops`, fuzz (when cap < totalDebt and not bad debt) | PASS |
| REQ-01 | AC-01d over-request capped | `test_AC01bcdg_...` (request 10,000 USDC → capped), fuzz (`repaid ≤ requested`, `repaid ≤ maxLiquidatableDebt`) | PASS |
| REQ-01 | AC-01e bad debt: seize all, repay = floor(V·10000/10500) | `test_AC01e_BadDebtSeizesAllCollateral` (2,857,142,857; then `declareDefault` and withdrawals), `test_AC01e_DeepCrashRequestBelowBadDebtThresholdIsPartial`, `test_Safety10000_...`, second step of `test_SequentialLiquidations...` | PASS |
| REQ-01 | AC-01f repay=0 → `InvalidAmount`; stale → `StalePrice` (also `BadPrice`) | `test_AC01f_ZeroRepayRevertsInvalidAmount`, `test_AC01f_StalePriceReverts`, `test_AC01f_BadPriceReverts` | PASS |
| REQ-01 | AC-01g views match `liquidate` | `test_AC01g_PreviewMatchesForManyAmounts` (5 amounts, snapshot/revert), `test_AC01g_WithInterestOwedViewsMatchAndInterestUnchanged` (BR-06), fuzz (preview == independent spec model == liquidate result; `isLiquidatable == (max > 0)`) | PASS |
| REQ-01 | AC-01h flows and settlement after liquidation | `test_AC01h_AfterLiquidationClubCompletesAndMembersWhole` (repay, contribute rounds 2-4, payInterest, finalize; each member gets 4000 + 15 USDC; owner withdraws the remaining collateral), `test_AC01h_AfterLiquidationDefaultAccountingCorrect`, `test_AC01h_MembersBetterOffUnderFurtherCrash`, `test_AC01h_ContributeAndBorrowStillWorkAfterLiquidation` | PASS |
| REQ-01 | BR-02 threshold for safety 10000 / 12000 / 20000 (and odd values) | `test_Safety10000_ThresholdIs100_CapIsTotalDebt`, `test_Safety12000_ThresholdIs110`, `test_Safety20000_...`, `test_SafetyOddRoundsDown`; fuzz over {10000, 10500, 11000, 12000, 15000, 20000} | PASS |
| REQ-01 | Conservation and bonus bound (fuzz) | `testFuzz_LiquidationConservationAndBonusBound`: price 1-60,000 USD, repay 1e-6-10,000 USDC, with or without interest owed; asserts club USDC = deposits − debt + interestPaid − claimed and club cirBTC = collateral; seized value ≤ repaid·1.05 (exact for partial, +2 µUSDC rounding when all collateral is seized); interest owed unchanged. 256 runs in the suite, plus 2000 runs separately | PASS |
| REQ-02 | AC-02a hook fields, null on legacy | `tests/partial-liquidation-ui.test.ts` › AC-02a, plus the ABI prerequisite test | PASS |
| REQ-02 | AC-02b panel: threshold, button, input defaulting to max, est. cirBTC, exact approval, disabled reason | AC-02b (3 tests: panel, `canLiquidate` gates and reasons, `handleLiquidate` default/cap/exact approval/call order) + `npm run build` type-check | PASS |
| REQ-02 | AC-02c copy no longer says price drops never liquidate | AC-02c (banned phrases absent in config/i18n/workspace, new VI/EN copy present) | PASS |
| REQ-03 | AC-03a/b/c | full `forge test` 146/146, `npm test` 562/562, `npm run build` exit 0 | PASS |

## 4. Changed existing test (MIN-03)
`tests/bonded-minimal-ui-20261108.test.ts` MIN-03 asserted the literal `open={(canFinalize || canDeclareDefault) || undefined}`. Task-063 intentionally opens the keeper panel when liquidation is possible as well. The assertion now expects `open={(canFinalize || canDeclareDefault || canLiquidate) || undefined}` (with a comment). The rest of MIN-03 is unchanged.

## 5. Blockers
**None.** No implementation bug was found. The first run had 4 failures, and all 4 were mistakes in the Tester's own tests, fixed before the final run:
- Borrowing after a price crash hit `ExceedsBorrowLimit`.
- Exact-equality assertions did not allow for the existing floor rounding in `withdrawPrincipal`.
- A "further drop" scenario actually fell into the bad-debt branch.

## 6. Observations (non-blocking, for BA/Leader)
1. **The bonus costs members something if the club later defaults at the same price.** The 5% bonus is paid from collateral that a later `declareDefault` would otherwise give to members. Example (safety 120%, debt 3000, price $16k), members' recovery valued at the same price:
   - With a max liquidation: ≈ 4066.67 USDC.
   - Without liquidation: 4200 USDC.
   - Both are still ≥ the 4000 principal.

   If the price keeps falling, liquidation clearly protects members: after a further 50% drop, the liquidated club recovers more value and the un-liquidated club falls below principal (`test_AC01h_MembersBetterOffUnderFurtherCrash`). This follows BR-03 as written.
2. **Clubs with `safetyBps ≤ 10500` cannot get a partial max liquidation.** The cap is `totalDebt` (BR-04). With no interest owed, any liquidation at the max amount therefore hits the bad-debt branch and seizes all collateral. A liquidator can still request a smaller amount for a partial liquidation. This is consistent with the spec.
3. **Dust edges, no harm to members:**
   - A very small repay can round `seized` to 0. The liquidator pays USDC and receives nothing, which only reduces debt.
   - Collateral worth less than 1 µUSDC gives `repaid = 0`, so the call reverts `NotLiquidatable`.
4. **Floor rounding in `withdrawPrincipal` (existing behavior):** pro-rata division leaves at most 1 unit of dust per member in the club. It never over-pays.

## 7. Signoff
**Tester signoff: PASS for task-063.** Every AC (AC-01a–h, AC-02a–c, AC-03a–c) has passing evidence from real runs, and the manifest hashes match before and after testing. The next step is the BA coverage check (Gate 4).
