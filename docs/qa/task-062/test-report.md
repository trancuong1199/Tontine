# Báo Cáo Kiểm Thử (QA Report) — Task-062: Chuẩn Hóa Tỷ Lệ An Toàn 120% & Loại Bỏ Ngưỡng Thanh Lý Giá

- **Task ID**: `task-062`
- **Nhánh Git**: `feat/task-062-safety-120-no-price-liquidation` (Chỉ lưu local, không push remote)
- **Tester**: Independent QA Agent / Antigravity
- **Thời gian kiểm thử**: 2026-11-20
- **Trạng thái**: **PASSED (100% Pass Rate)**

---

## 1. Mục tiêu Kiểm thử
1. Xác minh tỷ lệ an toàn ký quỹ mặc định (**Default Collateral Safety Ratio**) đã được chuyển thành **120%** (`12_000` bps) và hợp đồng chấp nhận dải `safetyBps` từ `10_000` (100%) đến `50_000` (500%).
2. Xác minh đã loại bỏ hoàn toàn **ngưỡng thanh lý theo giá** (`liquidationBps`) và hàm `liquidate()` kích hoạt theo giá sụt giảm khỏi:
   - `BondedTontine.sol` & `BondedTontineFactory.sol`
   - Unit tests Foundry & Test suites Node.js
   - Cấu hình frontend & Hooks (`useBondedClub.ts`, `bonded-tontine.ts`, `bondedTontine.ts`)
   - Giao diện tạo nhóm (`CreateBondedClubModal.tsx`) và workspace (`BondedClubWorkspace.tsx`)
3. Kiểm tra hồi quy toàn bộ hệ thống (Smart Contracts & Web App).

---

## 2. Kết quả Thực thi Lệnh Thực tế (Real Execution Evidence)

### 2.1. Foundry Contract Test Suite (`forge test`)
- **Lệnh thực thi**: `~/.foundry/bin/forge test`
- **Exit Code**: `0`
- **Kết quả tổng hợp**:
  - `BondedTontineTest`: **13/13 passed** (bao gồm worked examples A, B, C; solvency invariant, stateMonotonic invariant, bounds validation, decimal validation, ownership, blocklist).
  - `RotatingSavingsTest`: **69/69 passed**
  - `CollateralPolicyTest`: **15/15 passed**
  - `ReviewFollowupTest`: **2/2 passed**
  - `ReviewV3SemanticsTest`: **2/2 passed**
  - `SavingsHandler` invariants: **4/4 passed**
  - **Tổng cộng**: **119 passed, 0 failed, 0 skipped** across 7 suites.

### 2.2. Node.js & TypeScript Test Suite (`npm test`)
- **Lệnh thực thi**: `npm test`
- **Exit Code**: `0`
- **Kết quả**:
  - **555 tests passed, 0 failed, 0 skipped** (Thời gian chạy: ~7.0s)
  - Tất cả các bài test kiểm tra an toàn cọc, tạo nhóm, tính toán hạn mức vay theo 120%, và loại bỏ `liquidate` đều pass 100%.

### 2.3. Frontend Build Verification (`npm run build`)
- **Lệnh thực thi**: `npm run build`
- **Exit Code**: `0`
- **Kết quả**: TypeScript typecheck (`tsc --noEmit`) và Vite bundle hoàn tất thành công 100%, không phát sinh lỗi types hay bundle.

---

## 3. Bảng Đối Chiếu Ma Trận Nghiệp Vụ (Traceability Matrix)

| REQ / AC | Mô tả | Test Case | Kết quả | Bằng chứng |
| :--- | :--- | :--- | :--- | :--- |
| **AC-01.1** | `BondedTontine.sol` bỏ `liquidationBps`, nhận `safetyBps` 100%..500% | `test_ConstructorRevertsOnInvalidBounds` | PASS | Bounds `< 10000` revert, `>= 10000` thành công |
| **AC-01.2** | `BondedTontine.sol` loại bỏ hàm `liquidate()`, giá giảm không kích hoạt thanh lý | `test_WorkedExampleC_PriceDropDoesNotLiquidate_SettlementOverdueDefault` | PASS | Giá BTC giảm xuống $11,500 không bị thanh lý, đóng tiền thành công |
| **AC-01.3** | `BondedTontineFactory.sol` bỏ tham số `liquidationBps` khỏi `createClub` | `test_FactoryRegistryAndImmutables` | PASS | Gọi `createClub` 8 tham số thành công |
| **AC-02.1** | `src/config/bonded-tontine.ts`: `DEFAULT_SAFETY_RATIO_BPS = 12_000`, bỏ `DEFAULT_LIQUIDATION_RATIO_BPS` | `tests/bonded-tontine.test.ts` | PASS | Presets và default cập nhật chính xác |
| **AC-02.2** | `src/lib/bondedTontine.ts`: validate `safetyBps` 10000..50000, bỏ `liquidationBps` | `tests/bonded-tontine.test.ts` | PASS | Typecheck & validation pass |
| **AC-02.3** | `src/hooks/useBondedClub.ts`: không đọc hay gửi `liquidationBps` | `npm test` & `npm run build` | PASS | Multicall thành công với 25 hàm |
| **AC-03.1** | `CreateBondedClubModal.tsx`: bỏ ô nhập ngưỡng thanh lý, hiển thị 120% | `tests/bonded-state-ux-20261107.test.ts` | PASS | Essential terms hiển thị biên an toàn 120% |
| **AC-03.2** | `BondedClubWorkspace.tsx`: bỏ cảnh báo và nút thanh lý theo giá | Workspace render tests | PASS | Nút thanh lý theo giá bị ẩn, chỉ giữ vỡ nợ quá hạn |
| **AC-04.1** | `forge test` pass 100% | 7 contract test suites | PASS | 119/119 pass |
| **AC-04.2** | `npm test` pass 100% | 555 tests | PASS | 555/555 pass |

---

## 4. Kết luận & Khuyến nghị (Signoff)
- Toàn bộ yêu cầu của Task-062 đã được cài đặt và kiểm thử độc lập thành công.
- Không có breaking changes với các tính năng nộp tiền, vay vốn, trả lãi, hay bảo lãnh cọc CirBTC.
- Tuân thủ nghiêm ngặt quy định: Không push lên origin/remote. Nhánh làm việc: `feat/task-062-safety-120-no-price-liquidation`.
- Tester ký duyệt: **PASSED (Ready for Acceptance)**.
