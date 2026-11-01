# QA Test Report: Task-052 — Xóa Nút Open Directory Khi Chưa Login & Thiết Lập Tiếng Anh Làm Ngôn Ngữ Mặc Định

- **Task ID**: `task-052`
- **Mục tiêu**: Kiểm thử độc lập:
  1. Thẻ Unauthenticated View trong `App.tsx` chỉ hiển thị nút `Connect Wallet`, xóa bỏ hoàn toàn nút `Open Club Directory`.
  2. Mặc định hệ thống sử dụng Tiếng Anh (`en`) khi người dùng mới truy cập hoặc `localStorage` rỗng/chưa có key `hui_language`.
  3. Duy trì 100% tính tương thích ngược và không gây lỗi hồi quy trên toàn bộ test suite.
- **Người thực hiện**: Independent QA Tester
- **Ngày thực hiện**: 2026-10-28
- **SHA256 Manifest Status**: Đã xác nhận trước và sau kiểm thử khớp 100% (`node scripts/manifest-tool.mjs verify task-052`).

---

## 1. Kết quả thực thi Test Suite Tập trung (tests/task-052-default-english-and-auth-view.test.ts)

Lệnh thực thi:
`node --experimental-strip-types --test tests/task-052-default-english-and-auth-view.test.ts`

| Test Case | Tiêu chuẩn AC | Nội dung kiểm tra | Kết quả | Thời gian |
| :--- | :--- | :--- | :---: | :---: |
| **TC-AUTH-01** | AC-01.1, AC-01.2 | Thẻ Unauthenticated trong `App.tsx` chỉ render nút `Connect Wallet`, không render `Open Club Directory` / `Mở Danh sách nhóm` | **PASS** | 1.44ms |
| **TC-I18N-02** | AC-02.1 | `getStoredLanguage()` mặc định trả về `'en'` khi `localStorage` rỗng | **PASS** | 0.25ms |
| **TC-I18N-03** | AC-02.2 | `getStoredLanguage()` trả về `'en'` khi môi trường không có `window` (SSR/Node) | **PASS** | 0.14ms |
| **TC-I18N-04** | AC-02.3 | `getStoredLanguage()` tôn trọng trạng thái lưu khi người dùng chuyển đổi giữa `'vi'` và `'en'` | **PASS** | 0.19ms |

- **Tổng số tests**: 4
- **Passed**: 4 (100%)
- **Failed**: 0
- **Exit Code**: 0

---

## 2. Kết quả kiểm thử hồi quy toàn bộ hệ thống (Regression Suite)

Lệnh thực thi:
`npm test`

- **Tổng số tests**: 448
- **Passed**: 448 (100%)
- **Failed**: 0
- **Skipped**: 0
- **Exit Code**: 0

---

## 3. Kết luận nghiệm thu QA

Mã nguồn đáp ứng chính xác yêu cầu của Chủ dự án và bảo toàn 100% tính toàn vẹn hệ thống.
