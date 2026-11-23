# Spec: TASK-063 — Partial CirBTC liquidation to protect member contributions
**Task ID**: `task-063` · **Version**: `v1` · **Status**: Ready for Development
**Requested by**: project owner (Max), 2026-11-23. **Reverses part of task-062** (BR-03 "no price-based liquidation"): price-based liquidation comes back, but it is *partial and minimal*, not a full seizure.

## 1. Problem & value
Under task-062, if the CirBTC price falls, nothing happens until the owner is overdue on interest/settlement. By then the collateral may be worth less than the USDC the owner borrowed out of the members' pool, so members take a loss.
Partial liquidation lets anyone repay part of the owner's principal debt in USDC, receiving CirBTC plus a small bonus. USDC flows back into the pool, so the members' principal stays fully backed, and the owner keeps all collateral beyond what is needed to restore safety.

Actors: owner (borrower), members (lenders), liquidator (anyone, including members/keepers/owner).

```mermaid
flowchart TD
  P[CirBTC price falls] --> H{health < liquidationThresholdBps?}
  H -->|No| N[No action - NotLiquidatable]
  H -->|Yes| L[Liquidator calls liquidate(repay)]
  L --> C[repay capped at maxLiquidatableDebt]
  C --> S[seize = repay x 1.05 / price, capped at collateral]
  S --> T[USDC in -> totalDebt down; CirBTC out to liquidator]
  T --> R[health back to about safetyBps; club stays ACTIVE]
```

## 2. Business rules
- **BR-01** Liquidation only in `ACTIVE`, only when `totalDebt > 0`, and only with a fresh, valid oracle price (otherwise `BadPrice`/`StalePrice`).
- **BR-02** `liquidationThresholdBps = (10000 + safetyBps) / 2` (safety 120% gives a 110% threshold). Liquidatable when `collateralValue * 10000 < threshold * (totalDebt + interestOwed)`. There is no new constructor parameter, and `createClub` keeps its 9 params.
- **BR-03** `LIQUIDATION_BONUS_BPS = 500` (5%). The liquidator receives CirBTC worth `repay * 10500 / 10000` at the oracle price, rounded down.
- **BR-04** Partial: `maxLiquidatableDebt = min(totalDebt, ceil((safetyBps*D - 10000*V) / (safetyBps - 10500)))`, where D = totalDebt + interestOwed and V = collateral value. That is the minimum repayment that returns health to at least `safetyBps`. If `safetyBps <= 10500`, the cap is `totalDebt`. The requested amount is silently capped to the max.
- **BR-05** If the seized amount would exceed the collateral (bad debt), seize all collateral and set `repay = floor(V * 10000 / 10500)`. The remaining debt stays and is resolved by `declareDefault` later.
- **BR-06** The liquidator repays principal (`totalDebt`) only. Interest owed is unchanged, and interest already accrued on `peakDebt` stays due.
- **BR-07** The club stays `ACTIVE` after liquidation, and all existing flows (contribute/finalize/declareDefault/withdrawPrincipal) keep working.

## 3. Requirements & acceptance criteria
- **REQ-01 Contract** — AC-01a: `liquidate(uint256)` reverts with `NotLiquidatable` when health ≥ threshold, debt is 0, or the state is not ACTIVE (WrongState). AC-01b: a liquidation moves exactly `repay` USDC liquidator→club and `seize` CirBTC club→liquidator; `totalDebt` and `collateral` decrease by the same amounts, and `PartiallyLiquidated` is emitted. AC-01c: after a max liquidation (non-bad-debt), `healthBps() >= safetyBps` (±1 bps rounding). AC-01d: a request above the max is capped. AC-01e: in the bad-debt case all collateral is seized and `repay` follows BR-05. AC-01f: `repay=0` reverts `InvalidAmount`; a stale price reverts `StalePrice`. AC-01g: views `liquidationThresholdBps()`, `maxLiquidatableDebt()`, `previewLiquidation(uint256)` match `liquidate` results. AC-01h: after liquidation, members can still finalize/withdraw, and settlement accounting stays correct.
- **REQ-02 Frontend** — AC-02a: `useBondedClub` reads `liquidationThresholdBps` and `maxLiquidatableDebt` (null on legacy clubs without these functions). AC-02b: the workspace keeper section shows the threshold and a "Partial liquidation" button with an amount input (defaulting to max), an estimated CirBTC to receive, exact USDC approval, and a disabled reason. AC-02c: disclosure/i18n copy no longer claims price drops never trigger liquidation.
- **REQ-03 Tests** — AC-03a: `forge test` passes 100%. AC-03b: `npm test` passes 100%. AC-03c: `npm run build` passes.

## 4. Out of scope
Factory/club redeployment (blocked until the leaked deployer key is rotated and the mock oracle is redeployed under a new admin), DEX-based auto-selling of CirBTC, and the legacy JS simulator in `tests/bonded-tontine.test.ts`.

## 5. Traceability
| REQ | AC | Test | Evidence |
|---|---|---|---|
| REQ-01 | AC-01a..h | `contracts/test/PartialLiquidation.t.sol` | `docs/qa/task-063/test-report.md` |
| REQ-02 | AC-02a..c | `tests/partial-liquidation-ui.test.ts` + build | `docs/qa/task-063/test-report.md` |
| REQ-03 | AC-03a..c | forge test / npm test / npm run build | `docs/qa/task-063/test-report.md` |
