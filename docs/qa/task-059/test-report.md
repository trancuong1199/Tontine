# QA Independent Test Report — Task-059 (`BondedTontine`)

- **Task ID**: `task-059`
- **Design Reference**: [`docs/BondedTontine-design.md`](../../BondedTontine-design.md)
- **BA Specification**: [`docs/ba/task-059/spec-v1.md`](../../ba/task-059/spec-v1.md)
- **Frozen Manifest**: [`docs/manifests/task-059/manifest.json`](../../manifests/task-059/manifest.json)
- **Status**: **PASS (490/490 tests passed, 0 failed, 0 skipped)**

---

## 1. Pre-Test & Post-Test SHA256 Verification

Command executed: `node scripts/manifest-tool.mjs verify task-059`

| File | Frozen SHA256 Prefix | Pre-Test | Post-Test |
| :--- | :--- | :---: | :---: |
| `contracts/BondedTontine.sol` | `71e4384f36b63e83...` | MATCH | MATCH |
| `contracts/BondedTontineFactory.sol` | `17cb0ad97b4525fb...` | MATCH | MATCH |
| `contracts/test/mocks/MockAggregatorV3.sol` | `56ad30eef45ffddb...` | MATCH | MATCH |
| `contracts/out/BondedTontine.sol/BondedTontine.json` | `0d7f515beb1bcdbe...` | MATCH | MATCH |
| `contracts/out/BondedTontineFactory.sol/BondedTontineFactory.json` | `baa63e202c7406d8...` | MATCH | MATCH |
| `contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json` | `ae55f16cad4ca4a8...` | MATCH | MATCH |
| `src/lib/bondedTontine.ts` | `b4dc43438cdadf38...` | MATCH | MATCH |
| `src/lib/savingsClubDirectory.ts` | `89c932634e17b466...` | MATCH | MATCH |
| `scripts/deploy-bonded-tontine-factory.mjs` | `5ce735d504e03404...` | MATCH | MATCH |
| `foundry.toml` | `73d8794ab2291808...` | MATCH | MATCH |

---

## 2. Bytecode & Compiler Verification (`solc` + `via_ir = true`)

- `BondedTontine`: init bytecode = `14,728 B`, runtime bytecode = `12,676 B` (`< 24,576 B` EIP-170 limit) — **PASS**
- `BondedTontineFactory`: init bytecode = `16,542 B`, runtime bytecode = `15,997 B` (`< 24,576 B` EIP-170 limit) — **PASS**
- `MockAggregatorV3`: init bytecode = `2,155 B`, runtime bytecode = `1,215 B` — **PASS**
- `contracts/test/BondedTontine.t.sol`: compiled with `solc` (`viaIR: true`, `evmVersion: "paris"`, `optimizer_runs: 200`) with **0 errors** — **PASS**

---

## 3. Test Suite Execution Summary (`tests/bonded-tontine.test.ts` + Full Regression)

| Test ID | Description | Result |
| :--- | :--- | :---: |
| `T059-01` | Compiled artifacts exist and runtime bytecode sizes are well below EIP-170 24,576-byte limit | PASS |
| `T059-02` | `BondedTontine` ABI exposes all 20 custom errors, 14 events, and all write/view functions from Section 10 | PASS |
| `T059-03` | Foundry test file `contracts/test/BondedTontine.t.sol` exists with unit, security, worked examples, and invariant tests | PASS |
| `T059-04` | Worked Example A (4-member Happy Path) matches exact numbers | PASS |
| `T059-04b` | Section 26 10-member `0.11 CirBTC` Worked Example A (450 USDC total interest, 3,060 USDC exposure at Round 6) | PASS |
| `T059-05` | Worked Example B (Interest Overdue Default) seizes collateral and distributes pro-rata CirBTC | PASS |
| `T059-06` | Worked Example C (BTC Flash Crash Liquidation) triggers `UNDERCOLLATERALIZED` and distributes USDC + CirBTC | PASS |
| `T059-07` | Security S1–S8 (ownership locks, `peakDebt` anti-evasion, zero-exposure oracle bypass, fee-on-transfer guard, blocklist isolation) | PASS |
| `T059-08` | Oracle environment validator & deploy script enforce `MOCK` prohibition and allowlist on mainnet | PASS |
| `T059-09` | APR helper & `savingsClubDirectory` version tag (`'v1-rotating' \| 'v2-bonded'`) preserve 100% backward compatibility | PASS |
| Full Suite | `npm test` (490 tests across all suites) & `npm run build` (`tsc --noEmit && vite build`) | PASS |

---

## 4. Tester Signoff (`worker_done`)

1. **Việc đã làm**: Thiết kế và chạy bộ kiểm thử độc lập `tests/bonded-tontine.test.ts` (10 test cases phủ toàn bộ F1–F8, S1–S8, Worked Examples A/B/C, Factory/Oracle validation, EIP-170 bytecode size) cùng toàn bộ 480 test hồi quy hiện có (tổng cộng 490/490 PASS) và xác minh SHA256 manifest trước/sau khi test.
2. **Phát hiện**: Cả `BondedTontine` (`12,676 B`) và `BondedTontineFactory` (`15,997 B`) đều nằm dưới giới hạn EIP-170 (`24,576 B`), không cần dùng EIP-1167 minimal proxy.
3. **Phần còn lại**: Không còn lỗi kỹ thuật; chuyển BA đối chiếu độ phủ nghiệp vụ (Gate 4).
