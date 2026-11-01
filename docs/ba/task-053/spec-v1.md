# BA Specification: Task-053 — Khắc Phục Lỗi Hiển Thị Club & URL Khi Chưa Connect Wallet

- **Mã Task**: `task-053`
- **Phiên bản**: `v1.0`
- **Tác giả**: Business Analyst (BA)
- **Ngày lập**: 2026-10-28
- **Tình trạng**: APPROVED FOR DEVELOPMENT

---

## 1. Bối cảnh & Vấn đề

- **Vấn đề báo cáo**:
  1. Khi truy cập hoặc reload trang mà chưa kết nối ví (`!address`), thanh địa chỉ URL vẫn còn query parameter dài: `https://tontine-phi.vercel.app/?tab=app&group=0xa9ef08cf25dedca47e477759ea770e94bef13e39`.
  2. Giao diện lại hiển thị toàn bộ thông tin chi tiết của nhóm hụi (ClubCard, Members Roster, ActionPanel) ngay cả khi ví chưa kết nối (`Connect Wallet` hiển thị trên Header).
- **Nguyên tắc nghiệp vụ cốt lõi (Core Business Rule)**:
  - *"Dự án chỉ hiển thị khi đúng ví nào đã tạo hoặc tham gia"*.
  - Khi chưa đăng nhập (`!address`): **TUYỆT ĐỐI KHÔNG HIỂN THỊ THÔNG TIN CLUB TRÊN MÀN HÌNH CHÍNH**.
  - URL của người dùng chưa đăng nhập phải được tự động thanh lọc sạch sẽ về gốc root pathname (`https://domain/`), không để sót `tab=app` hay `group=0x...` từ phiên trước.

---

## 2. Tiêu chí Nghiệm thu (Acceptance Criteria - AC)

### AC-01: Ngăn chặn triệt để hiển thị Club khi chưa kết nối ví
- **AC-01.1**: Khối nội dung chính (Main Content gồm `ClubCard`, `ActionPanel`, `ClubMembersRoster`, `RoundHistory`) bắt buộc phải có điều kiện `Boolean(address)`. Khi `!address`, khối này tuyệt đối không được render.
- **AC-01.2**: Khi `!address`, màn hình luôn luôn hiển thị thẻ Unauthenticated View ("Connect Wallet to View Your Clubs") với duy nhất nút `Connect Wallet`.

### AC-02: Tự động thanh lọc URL khi chưa đăng nhập và loại bỏ `tab=app`
- **AC-02.1**: Khi `!address`, `useEffect` trong `App.tsx` tự động đưa URL về gốc `window.location.pathname`, dọn sạch các query parameters `tab` và `group` cũ.
- **AC-02.2**: Khi đã kết nối, nếu URL có chứa `tab=app` hoặc `view`, hệ thống dọn sạch các param này để URL luôn ngắn gọn, tinh gọn, không rườm rà.

### AC-03: Không gây lỗi hồi quy (Regression Guard)
- **AC-03.1**: Toàn bộ các test suite kiểm tra trước đó tiếp tục PASS 100%.
