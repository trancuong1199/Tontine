# BA Coverage Review — Task-059 (`BondedTontine`)

- **Task ID**: `task-059`
- **Design Doc**: [`docs/BondedTontine-design.md`](../../BondedTontine-design.md)
- **Spec Version**: [`docs/ba/task-059/spec-v1.md`](./spec-v1.md)
- **QA Report**: [`docs/qa/task-059/test-report.md`](../../qa/task-059/test-report.md)
- **Gate 4 Status**: **APPROVED (100% REQ/BR/AC Coverage)**

---

## Traceability Matrix (`REQ → AC → Test → Evidence`)

| REQ / BR | Requirement Summary | Acceptance Criteria | Test Cases | Status |
| :--- | :--- | :--- | :--- | :---: |
| `REQ-01` / `BR-01..03` | `BondedTontine.sol` state machine (`OPEN`, `ACTIVE`, `COMPLETED`, `DEFAULTED`, `CANCELLED`), constructor bounds, ownership locks (`Ownable2Step`, locked after `OPEN`, `renounceOwnership` disabled) | `AC-01.1..AC-01.3` | `T059-01`, `T059-02`, `T059-07`, `BondedTontine.t.sol` | PASS |
| `REQ-02` / `BR-04..06` | Round contributions (`contribute`), `peakDebt[round]` tracking, `accInterestPerShare` pro-rata interest distribution (`payInterest`, `claimInterest`) | `AC-02.1..AC-02.3` | `T059-04`, `T059-04b`, `T059-07` (`S3`), `BondedTontine.t.sol` | PASS |
| `REQ-03` / `BR-07..09` | Collateralized borrowing (`borrowLimit`, `exposure`), `withdrawCollateral` (`exposure == 0` bypasses oracle), permissionless `declareDefault`, `liquidate`, `finalize`, `withdrawPrincipal` | `AC-03.1..AC-03.4` | `T059-04..07` (`S4`, `S8`), `BondedTontine.t.sol` | PASS |
| `REQ-04` / `BR-10..11` | `BondedTontineFactory.sol` immutable token/oracle injection, `MockAggregatorV3.sol` `"MOCK"` prefix enforcement, pre-broadcast oracle validator (`scripts/deploy-bonded-tontine-factory.mjs`) | `AC-04.1..AC-04.3` | `T059-01`, `T059-08`, `BondedTontine.t.sol` | PASS |
| `REQ-05` / `BR-12` | TypeScript SDK (`src/lib/bondedTontine.ts`) & `src/lib/savingsClubDirectory.ts` `version?: "v1-rotating" \| "v2-bonded"` with zero regression on existing `RotatingSavings` | `AC-05.1..AC-05.2` | `T059-09` + 480 regression tests | PASS |

---

## BA Signoff (`worker_done`)

1. **Việc đã làm**: Đối chiếu toàn bộ yêu cầu từ `docs/BondedTontine-design.md` và `spec-v1.md` với implementation và bằng chứng kiểm thử tại `docs/qa/task-059/test-report.md`.
2. **Phát hiện**: Đạt 100% độ phủ REQ, BR, AC và Security Assertions S1–S8 mà không làm ảnh hưởng tới 480 test hiện hữu của `RotatingSavings`.
3. **Phần còn lại**: Chuyển Leader nghiệm thu cuối cùng (Gate 5).
