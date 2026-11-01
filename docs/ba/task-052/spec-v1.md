# BA Specification: Task-052 — Xóa Nút Open Directory Khi Chưa Login & Thiết Lập Tiếng Anh Làm Ngôn Ngữ Mặc Định

- **Mã Task**: `task-052`
- **Phiên bản**: `v1.0`
- **Tác giả**: Business Analyst (BA)
- **Ngày lập**: 2026-10-28
- **Tình trạng**: APPROVED FOR DEVELOPMENT

---

## 1. Bối cảnh & Mục tiêu Nghiệp vụ

1. **Vấn đề 1**:
   - Khi người dùng chưa kết nối ví (`!address`), màn hình unauthenticated "Connect Wallet to View Your Clubs" hiện đang hiển thị 2 nút: `Connect Wallet` và `Open Club Directory`.
   - Theo phản hồi từ Chủ dự án, người dùng chưa đăng nhập không nên có nút xem danh sách nhóm công khai; thay vào đó chỉ tập trung vào hành động cốt lõi là kết nối ví để xem đúng các nhóm mình đã tạo hoặc tham gia.
   - **Mục tiêu 1**: Loại bỏ nút `Open Club Directory` khỏi thẻ Unauthenticated View trong `App.tsx`. Duy nhất hiển thị nút `Connect Wallet`.

2. **Vấn đề 2**:
   - Hiện tại ứng dụng đang mặc định tải Tiếng Việt (`vi`) khi người dùng mới truy cập lần đầu.
   - Chủ dự án yêu cầu: "để mặc định là tiếng anh nhé".
   - **Mục tiêu 2**: Đặt Tiếng Anh (`en`) làm ngôn ngữ mặc định toàn hệ thống khi chưa có lựa chọn lưu trong `localStorage`. Vẫn duy trì nút chuyển ngữ trên Header cho phép người dùng đổi sang Tiếng Việt tùy thích.

---

## 2. Quy tắc Nghiệp vụ (Business Rules - BR)

- **BR-01 (Strict Unauthenticated View)**: Khi người dùng chưa kết nối ví (`!address`) và truy cập trực tiếp (không qua invite link `?group=0x...`), chỉ hiển thị thông điệp yêu cầu kết nối ví cùng 1 nút hành động duy nhất là `Connect Wallet`. Không hiển thị nút mở danh sách nhóm (`Open Club Directory`).
- **BR-02 (Default Language is English)**:
  - Khi `localStorage.getItem("hui_language")` chưa có giá trị hoặc không hợp lệ, hệ thống phải tự động trả về `"en"`.
  - Môi trường không có `window` (SSR/Node.js) fallback về `"en"`.
  - Người dùng có thể chủ động chuyển sang `"vi"` và lựa chọn đó sẽ được ghi nhớ bền vững qua `localStorage`.

---

## 3. Danh sách Yêu cầu (Requirements - REQ) & Tiêu chí Nghiệm thu (AC)

### REQ-01: Tinh gọn thẻ Unauthenticated trong App.tsx
- **AC-01.1**: Thẻ Unauthenticated (`!isLoading && !hasNoActiveClub && !address && !hasExplicitGroup`) chỉ chứa duy nhất nút `Connect Wallet` (kết nối ví).
- **AC-01.2**: Nút `Open Club Directory` bị loại bỏ hoàn toàn khỏi khối chưa đăng nhập, đảm bảo người dùng chưa login không bị phân tâm.

### REQ-02: Thiết lập Tiếng Anh làm ngôn ngữ mặc định
- **AC-02.1**: Hàm `getStoredLanguage()` trong `src/lib/i18n.ts` trả về `"en"` khi `localStorage` rỗng hoặc môi trường không có window.
- **AC-02.2**: Người dùng mới truy cập ứng dụng lần đầu thấy giao diện tiếng Anh (`Connect Wallet`, `Rotating Savings`, ...).
- **AC-02.3**: Khi chuyển đổi sang Tiếng Việt, trạng thái được lưu và duy trì chính xác.

---

## 4. Traceability Matrix Sơ bộ

| REQ ID | AC | Module Phụ trách | Test Case Dự kiến |
| :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1, AC-01.2 | `src/App.tsx` | `tests/task-052-default-english-and-auth-view.test.ts` (TC-AUTH-01) |
| **REQ-02** | AC-02.1, AC-02.2 | `src/lib/i18n.ts` | `tests/task-052-default-english-and-auth-view.test.ts` (TC-I18N-DEFAULT) |
