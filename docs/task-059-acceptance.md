# Leader Final Acceptance — Task-059 (`BondedTontine`)

- **Task ID**: `task-059`
- **Design Document**: [`docs/BondedTontine-design.md`](./BondedTontine-design.md)
- **Gate 5 Decision**: **ACCEPTED**
- **Git Push Policy**: **NOT PUSHED** (tuân thủ nghiêm ngặt yêu cầu `"xong không được push code nhé"` của Chủ dự án).

---

## Deliverables Verified

1. [`contracts/BondedTontine.sol`](../contracts/BondedTontine.sol) — Hợp đồng thông minh `BondedTontine` đầy đủ theo mục 10 của tài liệu thiết kế (runtime size: `12,676 bytes < 24,576 bytes`).
2. [`contracts/BondedTontineFactory.sol`](../contracts/BondedTontineFactory.sol) — Factory cấp `usdc`, `cirBtc`, `priceFeed`, `maxPriceAge` bất biến cho mọi club (runtime size: `15,997 bytes < 24,576 bytes`).
3. [`contracts/test/mocks/MockAggregatorV3.sol`](../contracts/test/mocks/MockAggregatorV3.sol) — Mock Chainlink AggregatorV3 cho môi trường test/testnet bắt buộc tiền tố `"MOCK"` (Phụ lục C).
4. [`contracts/test/BondedTontine.t.sol`](../contracts/test/BondedTontine.t.sol) — Bộ kiểm thử Foundry đầy đủ (Unit tests, Worked Examples A/B/C, Security Assertions S1–S8, Invariant handler `invariant_solvency` & `invariant_stateMonotonic`).
5. [`src/lib/bondedTontine.ts`](../src/lib/bondedTontine.ts) & [`src/lib/savingsClubDirectory.ts`](../src/lib/savingsClubDirectory.ts) — ABI, constants, APR/oracle validators, simulator và trường `version?: "v1-rotating" | "v2-bonded"` tương thích ngược 100%.
6. [`scripts/deploy-bonded-tontine-factory.mjs`](../scripts/deploy-bonded-tontine-factory.mjs) — Script kiểm tra điều kiện môi trường và oracle trước khi deploy theo mục 12 & 12.1.
7. [`tests/bonded-tontine.test.ts`](../tests/bonded-tontine.test.ts) — 10 bộ test thực thi trực tiếp cùng 480 test hiện có (tổng cộng **490/490 PASS**).
