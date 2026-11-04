# Đặc Tả Nghiệp Vụ & Kỹ Thuật (BA Spec v1) — Task-059: BondedTontine

## 1. Mục tiêu (Goals)
Triển khai mô hình **BondedTontine** theo thiết kế chi tiết tại [`docs/BondedTontine-design.md`](../../BondedTontine-design.md):
- Thành viên góp USDC cố định mỗi vòng và hưởng lãi suất cố định mỗi vòng (`rateBpsPerRound`) từ chủ hụi (Owner).
- Chủ hụi (Owner) nạp tài sản thế chấp **CirBTC** (`depositCollateral`) và là người duy nhất được vay USDC (`borrow`) trong hạn mức an toàn (`borrowLimit = collateralValueUsdc * 10000 / safetyBps`).
- Lãi mỗi vòng tính trên **đỉnh dư nợ của vòng** (`peakDebt[k] * rateBpsPerRound / 10000`) và phân bổ cho thành viên theo cổ phần tích lũy (`accInterestPerShare`).
- Kích hoạt vỡ nợ/thanh lý **Permissionless** (`declareDefault` khi quá hạn lãi hoặc quá hạn tất toán; `liquidate` khi giá trị cọc giảm dưới `liquidationBps`).
- `BondedTontineFactory` cấp cố định `usdc`, `cirBtc`, `priceFeed`, `maxPriceAge` để bịt lỗ hổng Owner tự truyền feed giả.

## 2. Yêu cầu Chức năng (REQ) & Bảo mật (SEC)
- **REQ-01 (F1–F3)**: Khởi tạo nhóm qua `BondedTontineFactory.createClub`, kiểm tra toàn bộ biên tham số tại constructor (`InvalidConfiguration`), Owner nạp CirBTC, thành viên `joinGroup`, Owner `startRounds` khi `memberCount >= 2 && collateral > 0`.
- **REQ-02 (F4–F6)**: Thành viên `contribute` mỗi vòng; Owner `borrow`, `repay`, `payInterest`; thành viên `claimInterest`.
- **REQ-03 (F7–F8)**: Kết thúc chu kỳ chuẩn qua `finalize` (`COMPLETED`) hoặc kích hoạt vỡ nợ qua `declareDefault` / `liquidate` (`DEFAULTED`), thành viên rút gốc và cọc qua `withdrawPrincipal`.
- **REQ-04 (S1–S8)**: Đảm bảo toàn bộ 8 bất biến bảo mật S1–S8, kiểm tra tuổi giá oracle (`BadPrice`, `StalePrice`), khóa `transferOwnership` sau `OPEN` (`TransferLockedAfterOpen`) và vô hiệu hóa `renounceOwnership` (`RenounceDisabled`).
- **REQ-05 (Migration & SDK)**: Cung cấp module TypeScript `src/lib/bondedTontine.ts`, hỗ trợ trường `version` trong `src/lib/savingsClubDirectory.ts`, và script kiểm tra điều kiện deploy `scripts/deploy-bonded-tontine-factory.mjs`.

## 3. Tiêu chí Nghiệm thu (Acceptance Criteria)
- **AC-01**: `contracts/BondedTontine.sol`, `contracts/BondedTontineFactory.sol`, `contracts/test/mocks/MockAggregatorV3.sol` biên dịch sạch bằng `solc` (0 lỗi), kích thước runtime bytecode của cả Club và Factory đều `< 24,576` bytes (EIP-170).
- **AC-02**: Bộ test Foundry `contracts/test/BondedTontine.t.sol` và bộ test thực thi `tests/bonded-tontine.test.ts` kiểm chứng đầy đủ F1–F8, S1–S8 và các kịch bảnWorked Examples A, B, C trong mục 26 của Design Doc.
- **AC-03**: Toàn bộ test suite của dự án (`npm test`) và bản build production (`npm run build`) PASS 100%, không push code lên git remote.
