# QA Test Report: Task-053 — Khắc Phục Lỗi Hiển Thị Club & URL Khi Chưa Connect Wallet

- **Task ID**: `task-053`
- **Mục tiêu**: Kiểm thử độc lập:
  1. Khi chưa connect wallet (`!address`), Main Content tuyệt đối không được render bất kể URL có query param `group` hay không.
  2. Khi chưa connect wallet (`!address`), màn hình luôn hiển thị thẻ Unauthenticated View với duy nhất nút `Connect Wallet`.
  3. URL query param `tab` và `view` được tự động thanh lọc để URL luôn sạch gọn `https://domain/`.
  4. 100% test case hệ thống (452 tests) tiếp tục pass.
- **Người thực hiện**: Independent QA Tester
- **Ngày thực hiện**: 2026-10-28
- **SHA256 Manifest Status**: Đã xác nhận trước và sau kiểm thử khớp 100% (`node scripts/manifest-tool.mjs verify task-053`).

---

## 1. Kết quả thực thi Test Suite Tập trung (tests/task-053-unauthenticated-guard-and-url-clean.test.ts)

Lệnh thực thi:
`node --experimental-strip-types --test tests/task-053-unauthenticated-guard-and-url-clean.test.ts`

| Test Case | Tiêu chuẩn AC | Nội dung kiểm tra | Kết quả | Thời gian |
| :--- | :--- | :--- | :---: | :---: |
| **TC-GUARD-01** | AC-01.1 | `App.tsx` bắt buộc `Boolean(address)` trước khi render Main Content, bảo đảm chưa kết nối ví không lộ club | **PASS** | 1.39ms |
| **TC-GUARD-02** | AC-01.2 | `App.tsx` luôn render Unauthenticated View khi `!address` bất kể URL có `group` hay không | **PASS** | 0.60ms |
| **TC-CLEAN-01** | AC-02.1 | `App.tsx` tự động dọn sạch query param về gốc `pathname` khi chưa kết nối ví | **PASS** | 0.58ms |
| **TC-CLEAN-02** | AC-02.2 | `App.tsx` tự động loại bỏ param `tab=app` và `view` để giữ URL luôn sạch gọn | **PASS** | 0.52ms |

- **Tổng số tests**: 4
- **Passed**: 4 (100%)
- **Failed**: 0
- **Exit Code**: 0

---

## 2. Kết quả kiểm thử hồi quy toàn bộ hệ thống (Regression Suite)

Lệnh thực thi:
`npm test`

- **Tổng số tests**: 452
- **Passed**: 452 (100%)
- **Failed**: 0
- **Skipped**: 0
- **Exit Code**: 0

---

## 3. Kết luận nghiệm thu QA

Mã nguồn đáp ứng chính xác tiêu chí bảo vệ giao diện khi chưa đăng nhập và thanh lọc URL.
