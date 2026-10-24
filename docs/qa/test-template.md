# Báo cáo Kiểm thử Độc lập: <Tên Task / Tính năng>
**Task ID**: `<task-id>`  
**Dispatch ID**: `<dispatch-id>`  
**Tester**: `<QA Agent>`  
**Spec Version kiểm tra**: `<spec-v1.0>`  
**Thời điểm kiểm tra**: `<YYYY-MM-DD HH:mm:ss>`  
**Trạng thái**: `[PASS | FAIL | BLOCKED]`  

---

## 1. Kiểm tra Tính Toàn Vẹn Mã Nguồn (SHA256 Integrity)
- **Manifest bàn giao từ Developer**: `docs/manifests/<task-id>/manifest.json`
- **Kết quả so sánh SHA256 trước khi test**: `[MATCH | MISMATCH]`
- **Chi tiết hash từng file**:
  - `<file_path>`: `<sha256_hash>` (Khớp bàn giao)

---

## 2. Kịch bản Kiểm thử & Kết quả Thực thi

| Mã Test | Mô tả Kịch bản | AC Liên quan | Lệnh thực chạy | Exit Code | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | Kiểm tra Happy path | AC-01 | `...` | 0 | PASS | Khớp mong đợi |
| TC-02 | Kiểm tra Case lỗi / biên | AC-02 | `...` | 0 | PASS | Khớp mong đợi |
| TC-03 | Kiểm tra Regression | N/A | `...` | 0 | PASS | Toàn bộ suite pass |

---

## 3. Log thực thi chi tiết (Execution Logs)
```text
<Dán log kết quả lệnh thực tế ở đây>
```

---

## 4. Xác nhận SHA256 sau khi Test
- **Kết quả so sánh SHA256 sau khi test**: `[MATCH | MISMATCH]`
- Khẳng định mã nguồn không bị chỉnh sửa trong quá trình kiểm thử.

---

## 5. Kết luận & Signoff
- **Tổng số test**: `<N>` | **Pass**: `<N>` | **Fail**: `0` | **Skip**: `0`
- **Ý kiến Tester**: `[ĐẠT CHUẨN (Signoff) | KHÔNG ĐẠT (Reject)]`
- **Chuyển giao**: Bàn giao kết quả cho BA đối chiếu nghiệp vụ thông qua Leader.
