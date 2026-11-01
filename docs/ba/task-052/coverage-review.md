# BA Coverage Review: Task-052 — Xóa Nút Open Directory Khi Chưa Login & Thiết Lập Tiếng Anh Làm Ngôn Ngữ Mặc Định

- **Task ID**: `task-052`
- **Phiên bản Spec đối chiếu**: `docs/ba/task-052/spec-v1.md`
- **Người thực hiện**: Business Analyst (BA)
- **Ngày thực hiện**: 2026-10-28

---

## 1. Ma trận Đối chiếu Yêu cầu Nghiệp vụ (Traceability Matrix)

| REQ ID | Tiêu chí Nghiệm thu (AC) | Hiện thực trong Mã nguồn | Test Case Kiểm thử | Bằng chứng Xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-01** | **AC-01.1**: Thẻ Unauthenticated chỉ chứa nút `Connect Wallet` | `src/App.tsx` (dòng 1083-1092) | `tests/task-052-default-english-and-auth-view.test.ts` (TC-AUTH-01) | Test pass 1.44ms, nút Connect Wallet duy nhất hiển thị | **ĐẠT** |
| **REQ-01** | **AC-01.2**: Xóa bỏ hoàn toàn nút `Open Club Directory` khi chưa login | `src/App.tsx` | `tests/task-052-default-english-and-auth-view.test.ts` (TC-AUTH-01) | Test pass, assert `!unauthBlock.includes("Open Club Directory")` | **ĐẠT** |
| **REQ-02** | **AC-02.1**: Mặc định Tiếng Anh (`en`) khi `localStorage` rỗng | `src/lib/i18n.ts` (dòng 11-22) | `tests/task-052-default-english-and-auth-view.test.ts` (TC-I18N-02) | Test pass 0.25ms, trả về `'en'` | **ĐẠT** |
| **REQ-02** | **AC-02.2**: Mặc định Tiếng Anh khi môi trường không có `window` | `src/lib/i18n.ts` | `tests/task-052-default-english-and-auth-view.test.ts` (TC-I18N-03) | Test pass 0.14ms, trả về `'en'` | **ĐẠT** |
| **REQ-02** | **AC-02.3**: Lưu trữ và đọc bền vững khi người dùng chọn Tiếng Việt | `src/lib/i18n.ts` | `tests/task-052-default-english-and-auth-view.test.ts` (TC-I18N-04) | Test pass 0.19ms, lưu và khôi phục chuẩn xác | **ĐẠT** |

---

## 2. Kết luận BA

- **Độ phủ yêu cầu (Coverage)**: 100% (5/5 tiêu chuẩn đạt).
- **Mã băm SHA256**: Khớp hoàn toàn với manifest đóng băng.
- Đủ điều kiện chuyển giao Leader ký duyệt nghiệm thu cuối cùng.
