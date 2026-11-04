# Task-059 Dispatch — Triển khai BondedTontine theo `docs/BondedTontine-design.md`

- **Task ID**: `task-059`
- **Yêu cầu từ Chủ dự án**: Kiểm tra `docs/BondedTontine-design.md` và triển khai đầy đủ hệ thống `BondedTontine` (Smart Contracts, Factory, Mock Oracle, Foundry Tests, Frontend SDK & Directory Versioning, Deploy Validator Script, và QA Suite). **Lưu ý bắt buộc: Không được push code sau khi hoàn thành.**

## Phân công File Ownership
- **BA**: `docs/ba/task-059/spec-v1.md`, `docs/ba/task-059/coverage-review.md`
- **Developer**:
  - `contracts/BondedTontine.sol`
  - `contracts/BondedTontineFactory.sol`
  - `contracts/test/mocks/MockAggregatorV3.sol`
  - `contracts/out/BondedTontine.sol/BondedTontine.json`
  - `contracts/out/BondedTontineFactory.sol/BondedTontineFactory.json`
  - `contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json`
  - `src/lib/bondedTontine.ts`
  - `src/lib/savingsClubDirectory.ts`
  - `scripts/deploy-bonded-tontine-factory.mjs`
- **Tester**:
  - `contracts/test/BondedTontine.t.sol`
  - `tests/bonded-tontine.test.ts`
  - `docs/qa/task-059/test-report.md`
