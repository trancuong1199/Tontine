# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-036

## Khắc Phục Lỗi Z-Index & Lớp Hiển Thị Modal Đổi Tên Nhóm Hụi (Modal Stacking Context & Z-Index Visual Fixes)

- **Task ID**: `task-036`
- **Người thực hiện kiểm thử**: Independent Tester (`qa-agent`)
- **Ngày kiểm thử**: `2026-10-19`
- **Tài liệu tham chiếu**:
  - Đặc tả kỹ thuật: [`docs/ba/task-036/spec-v1.0.md`](file:///home/avada/tontine/docs/ba/task-036/spec-v1.0.md)
  - Mã băm đóng băng (Manifest): [`docs/manifests/task-036/manifest.json`](file:///home/avada/tontine/docs/manifests/task-036/manifest.json)
  - Bộ kiểm thử mới: [`tests/modal-zindex-and-layering.test.ts`](file:///home/avada/tontine/tests/modal-zindex-and-layering.test.ts)
- **Kết luận chung**: **PASS & SIGNOFF (Gate 3)**

---

## 1. Xác Minh Tính Toàn Vẹn Mã Nguồn (SHA256 Manifest Integrity)

Công cụ `scripts/manifest-tool.mjs` được thực thi trước và sau khi chạy test để đối chiếu với mã băm đã đóng băng:

```bash
$ node scripts/manifest-tool.mjs verify task-036
[Verify] Verifying manifest for Task: task-036 (Frozen at: 2026-10-19T05:53:11.488Z)
[MATCH] tailwind.config.js (b0e9b8214aab4b57...)
[MATCH] src/components/savings/EditClubNameModal.tsx (8c7f49a8a90d560a...)
[MATCH] src/components/savings/ClubDirectoryModal.tsx (522ed5a63e2fa09f...)

 All files verified successfully! Integrity confirmed.
```

- **Mã băm trước kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Mã băm sau kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Kiểm thử trực quan DOM thật qua Chrome Headless**: Xác nhận `window.getComputedStyle(dialog).zIndex === "100"`, toàn bộ modal dialog hiển thị chính giữa màn hình và nổi trên mọi phần tử.

---

## 2. Kết Quả Kiểm Thử Chi Tiết Từng Tiêu Chí Nghiệm Thu

| Test ID | AC Tham Chiếu | Mục Tiêu & Mô Tả Kiểm Thử | Kết Quả Thực Tế | Exit Code | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-ZINDEX-01` | **AC-01.1** | `tailwind.config.js` cấu hình đầy đủ thang đo `zIndex` mở rộng (`60`, `70`, `80`, `90`, `100`). | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-02` | **AC-01.2** | File CSS production chứa định nghĩa class `.z-100{z-index:100}` hợp lệ. | PASS (1.2ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-03` | **AC-02.1** | `EditClubNameModal.tsx` áp dụng `z-100`, loại bỏ triệt để class không tồn tại `z-60`. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-04` | **AC-02.2** | Backdrop của `EditClubNameModal.tsx` áp dụng `bg-black/80 backdrop-blur-sm` chuẩn. | PASS (0.3ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-05` | **AC-02.3** | Hộp thoại modal định vị chính giữa màn hình với `flex items-center justify-center` và `max-w-md`. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-06` | **AC-03.1** | Modal xác nhận xóa nhóm trong `ClubDirectoryModal.tsx` áp dụng `z-100` nổi bật trên `z-50`. | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-07` | **AC-03.2** | Modal xác nhận xóa chặn nổi bọt sự kiện click backdrop (`e.stopPropagation()`). | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-ZINDEX-08` | **AC-04.1** | Toàn bộ 355 bài kiểm thử cũ tiếp tục PASS 100% (Zero Regression). | PASS (355/355) | 0 | **ĐẠT** |
| `TC-ZINDEX-09` | **AC-04.2** | Toàn bộ 7 bài kiểm thử mới trong `tests/modal-zindex-and-layering.test.ts` PASS 100%. | PASS (7/7) | 0 | **ĐẠT** |
| `TC-ZINDEX-10` | **AC-04.3** | Quá trình build `npm run build` thành công, không có lỗi TypeScript hay cú pháp. | PASS (Exit 0) | 0 | **ĐẠT** |

---

## 3. Tổng Hợp Kết Quả Thực Thi Hệ Thống

```bash
$ npm test
ℹ tests 362
ℹ suites 0
ℹ pass 362
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3572.229618
```

- **Tổng số test cases**: 362 tests
- **Số lượng Passed**: 362 / 362 (100%)
- **Số lượng Failed**: 0
- **Regression**: 0%
- **Production Build (`npm run build`)**: Thành công (Exit 0), CSS sinh class `.z-100{z-index:100}` chuẩn xác.

---

## 4. Kết Luận & Ký Duyệt

Bộ kiểm thử độc lập xác nhận:
1. `EditClubNameModal` nay đã được gán `z-index: 100`, hoàn toàn vượt lên trên khối `<main>` (`z-index: 10`) và các modal danh bạ (`z-index: 50`).
2. Hiện tượng modal bị chìm phía sau `ClubCard` và chỉ lộ 2 nút bấm ở khe hở bên dưới đã được xóa bỏ triệt để. Modal nay hiển thị đầy đủ, sáng rõ ở chính giữa màn hình.

**Tester Signoff**: APPROVED ✅ (Gate 3 Closed)
