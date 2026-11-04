# BondedTontine — Báo cáo Review & Hoàn thiện (P0–P3)

## 1. Tóm tắt các bản sửa lỗi hợp đồng (T1)

1. **Cổng `DefaultPending` trong `contribute()` (`contracts/BondedTontine.sol`)**:
   - Trước khi nhận tiền góp của thành viên, `contribute()` gọi `_rollRounds()` và kiểm tra `_isDefaultOrLiquidationPending()`.
   - Nếu nhóm đã quá hạn lãi (`_interestOverdue()`), quá hạn tất toán (`_settlementOverdue()`), hoặc thiếu cọc theo giá mới nhất của oracle (`maxSupportedDebt < debtAndInterest`), hàm revert với lỗi `DefaultPending()` thay vì để thành viên nạp thêm USDC vào nhóm sắp vỡ nợ.
   - Nếu oracle tạm thời cũ hoặc lỗi, `_isDefaultOrLiquidationPending()` chỉ kiểm tra hai điều kiện quá hạn thời gian để không làm kẹt giao dịch góp tiền khi nhóm vẫn lành mạnh.
2. **Kiểm tra `decimals()` của token (`contracts/BondedTontine.sol`, `contracts/BondedTontineFactory.sol`)**:
   - Cả constructor của `BondedTontine` và `BondedTontineFactory` đều gọi `IERC20Metadata(usdc_).decimals()` và `IERC20Metadata(cirBtc_).decimals()` trong khối `try/catch`.
   - Bắt buộc `usdc.decimals() == 6` và `cirBtc.decimals() == 8`; nếu sai hoặc revert thì revert `InvalidConfiguration()`.
3. **Giới hạn `interestClaimedTotal` trong `claimInterest()` và `pendingInterest()` (`contracts/BondedTontine.sol`)**:
   - Bổ sung biến trạng thái `uint256 public interestClaimedTotal`.
   - Khi rút lãi hoặc đọc lãi chờ rút, số lượng rút tối đa được chặn bởi `interestPaidTotal - interestClaimedTotal`, đảm bảo sai số làm tròn của `Math.mulDiv` không bao giờ chạm vào phần gốc `totalDeposits - totalDebt`.

## 2. Cấu hình, Địa chỉ Token & Triển khai trên Arc Testnet (T2, T3, T4)

- Đã xóa bỏ hoàn toàn địa chỉ CirBTC cũ không có bytecode trên Arc Testnet và đồng bộ toàn bộ về `CIRBTC_ADDRESS = 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF` (`decimals() == 8`).
- `scripts/deploy-bonded-tontine-factory.mjs` đã được nâng cấp thành script deploy thật với `--env testnet|mainnet`, đọc RPC và địa chỉ token trực tiếp từ `src/onchain-facts.ts` và `src/config/arc-constants.ts`, kiểm tra `chainId`, bytecode và `decimals()` của cả 2 token trên chain trước khi phát giao dịch.
- Địa chỉ đã triển khai và xác minh trên **Arc Testnet (`5042002`)**:
  - `MockAggregatorV3`: `0x9c0866b4D6dB662038f805563b8f4CdECA626525` (`decimals = 8`, `description = "MOCK BTC / USD"`)
  - `BondedTontineFactory`: `0x8cE12D62b0bD565c92164aC7c847620Bfe710eb0` (`maxPriceAge = 3600`)
  - `BondedTontine` Club #0 (Open): `0x3D35E830fe5BA48Ff5b36DbBA9ecEbD3A7BAD59b`
  - `BondedTontine` Club #1 (Happy Path E2E — Completed): `0xe74069717317dbB86d423439fb9c219A5c5bf812`
  - `BondedTontine` Club #2 (Liquidation Demo E2E — Defaulted): `0xF9469568ebb287275009fcE3Db224a16273C5d05`

## 3. Tách Simulator & Nối Giao diện (T5, T6)

- Các class mô phỏng (`BondedTontineSimulator`, `BondedTontineFactorySimulator`, `MockTokenLedger`, `MockOracleSimulator`) đã được tách khỏi `src/lib/bondedTontine.ts` sang `tests/helpers/bondedSimulator.ts` và cập nhật đồng bộ với 3 bản sửa hợp đồng.
- Giao diện `BondedClubWorkspace` (`src/components/savings/BondedClubWorkspace.tsx`) và hook `useBondedClub` (`src/hooks/useBondedClub.ts`) đã được nối đầy đủ vào `src/App.tsx`:
  - Tạo nhóm qua `factory.createClub` bằng `useArcWriteContract` và đọc địa chỉ từ event `ClubCreated`.
  - Xử lý lỗi revert của các hàm đọc phụ thuộc oracle (`borrowLimit`, `healthBps`, `exposure`) mà không làm hỏng trang.
  - Đầy đủ bảng điều khiển Chủ hụi, Thành viên, và Keeper (`finalize`, `declareDefault`, `liquidate`), phê duyệt ERC-20 đúng bằng số lượng cần dùng.
  - Hiển thị huy hiệu xác minh `factory.isClub(club)` (chặn góp tiền vào nhóm chưa xác minh cho đến khi người dùng xác nhận) và huy hiệu cảnh báo `MOCK` oracle kèm tuổi giá và link explorer.
  - Ánh xạ song ngữ VI/EN cho toàn bộ 21 custom error trong ABI.

## 4. Lưu ý Build Solidity (`via_ir = true`) (T10)

- `foundry.toml` bật `via_ir = true` để biên dịch `BondedTontine` và `BondedTontineFactory` không bị lỗi `Stack too deep`.
- Tùy chọn `via_ir = true` làm thời gian build Solidity lâu hơn bình thường. Bytecode `ROTATING_SAVINGS_BYTECODE` của hợp đồng `RotatingSavings` hiện có hoàn toàn không bị thay đổi.
