# BA Coverage Review: Task-053 — Khắc Phục Lỗi Hiển Thị Club & URL Khi Chưa Connect Wallet

- **Task ID**: `task-053`
- **Phiên bản Spec đối chiếu**: `docs/ba/task-053/spec-v1.md`
- **Người thực hiện**: Business Analyst (BA)
- **Ngày thực hiện**: 2026-10-28

---

## 1. Ma trận Đối chiếu Yêu cầu Nghiệp vụ (Traceability Matrix)

| REQ ID | Tiêu chí Nghiệm thu (AC) | Hiện thực trong Mã nguồn | Test Case Kiểm thử | Bằng chứng Xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **AC-01** | **AC-01.1**: Bắt buộc `Boolean(address)` trước khi render Main Content | `src/App.tsx` (dòng 1141) | `tests/task-053-unauthenticated-guard-and-url-clean.test.ts` (TC-GUARD-01) | Test pass 1.39ms, chặn 100% hiển thị club khi chưa có ví | **ĐẠT** |
| **AC-01** | **AC-01.2**: Luôn hiển thị Unauthenticated View khi `!address` | `src/App.tsx` (dòng 1076) | `tests/task-053-unauthenticated-guard-and-url-clean.test.ts` (TC-GUARD-02) | Test pass 0.60ms, không bị bypass bởi `hasExplicitGroup` | **ĐẠT** |
| **AC-02** | **AC-02.1**: Tự động thanh lọc URL về gốc khi chưa kết nối ví | `src/App.tsx` (dòng 178-180) | `tests/task-053-unauthenticated-guard-and-url-clean.test.ts` (TC-CLEAN-01) | Test pass 0.58ms, đưa URL về `window.location.pathname` | **ĐẠT** |
| **AC-02** | **AC-02.2**: Loại bỏ `tab=app` và `view` khỏi URL khi đã kết nối | `src/App.tsx` (dòng 181-186) | `tests/task-053-unauthenticated-guard-and-url-clean.test.ts` (TC-CLEAN-02) | Test pass 0.52ms, xóa param `tab` và `view` | **ĐẠT** |
| **AC-03** | **AC-03.1**: Không gây hồi quy hệ thống (Zero Regression) | Toàn bộ codebase | Toàn bộ suite `npm test` | 452/452 tests PASS, 0 errors | **ĐẠT** |

---

## 2. Kết luận BA

- **Độ phủ yêu cầu (Coverage)**: 100% (5/5 tiêu chí đạt chuẩn).
- Đủ điều kiện chuyển giao Leader ký duyệt nghiệm thu.
