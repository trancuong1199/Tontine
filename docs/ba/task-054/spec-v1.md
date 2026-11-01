# BA Specification: Task-054 — Chuẩn Hóa Điều Hướng Tab Saving Clubs (Ngắn Gọn ?tab=app) & Xóa Bỏ Group Rác

- **Mã Task**: `task-054`
- **Phiên bản**: `v1.0`
- **Tác giả**: Business Analyst (BA)
- **Ngày lập**: 2026-10-28
- **Tình trạng**: APPROVED FOR DEVELOPMENT

---

## 1. Bối cảnh & Phân tích vấn đề

- **Hiện tượng người dùng báo cáo**:
  1. Khi bấm chuyển sang tab "Savings Clubs" (Ứng dụng), URL bị mất sạch params (`sao chuyển sang savingClubs không có params?`).
  2. Khi bấm 2 lần vào nút "Savings Clubs", URL lại bị gắn thêm địa chỉ contract cũ thành URL rất dài: `https://tontine-phi.vercel.app/?tab=app&group=0xa9ef08cf25dedca47e477759ea770e94bef13e39`.
  3. Người dùng yêu cầu: *"check lại nhé, param ngắn gọn thôi"*.
- **Nguyên nhân kỹ thuật**:
  - Khi chưa connect ví (`!address`), hook `useEffect` trước đó chạy lệnh `replaceState` xóa sạch toàn bộ URL về root pathname (`/`), làm mất query parameter nhận diện tab (`tab=app`).
  - Hàm `handleSelectTab("app")` trước đó tự động đọc `contractAddress` trong state và ép `group=contractAddress` vào URL ngay cả khi người dùng chỉ bấm nút đổi tab trên thanh điều hướng.
- **Giải pháp chuẩn hóa**:
  1. Khi người dùng bấm chuyển sang tab "Savings Clubs": URL luôn luôn hiển thị chuẩn và ngắn gọn là `?tab=app` (loại bỏ `group` cũ khỏi URL điều hướng tab).
  2. Bấm 1 lần, 2 lần hay n lần vào "Savings Clubs" thì URL vẫn duy trì đúng `?tab=app`, không bao giờ bị chèn lại `group=0xa9ef...`.
  3. Khi reload hoặc truy cập từ URL cũ có `group` mà chưa kết nối ví (`!address`), tự động thanh lọc `group` rác về đúng `?tab=app`.
  4. Khi ở tab "Home" (Trang chủ): URL được giữ sạch ở root pathname (`https://domain/`).

---

## 2. Tiêu chí Nghiệm thu (Acceptance Criteria - AC)

### AC-01: Chuyển tab Saving Clubs hiển thị đúng param ngắn gọn `?tab=app`
- **AC-01.1**: Hàm `handleSelectTab("app")` xóa bỏ param `group` và thiết lập duy nhất `tab=app`.
- **AC-01.2**: Click vào nút "Savings Clubs" nhiều lần vẫn giữ nguyên định dạng ngắn gọn `https://domain/?tab=app`, không bị chèn contract address rác.

### AC-02: Thanh lọc group rác khi chưa kết nối ví
- **AC-02.1**: Khi `!address` và URL có `group`, tự động chuẩn hóa về `?tab=app` ngắn gọn.
- **AC-02.2**: Khi `!address` và ở tab "Home", tự động giữ sạch pathname root (`/`).

### AC-03: Không gây lỗi hồi quy (Zero Regression)
- **AC-03.1**: Tất cả 452+ unit test của hệ thống chạy pass 100%.
