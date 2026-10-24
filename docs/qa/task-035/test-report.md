# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-035

## Khắc Phục Lỗi Nút Sửa Tên Nhóm Hụi (Edit Club Name Button Fixes & Reactive Stability)

- **Task ID**: `task-035`
- **Người thực hiện kiểm thử**: Independent Tester (`qa-agent`)
- **Ngày kiểm thử**: `2026-10-19`
- **Tài liệu tham chiếu**:
  - Đặc tả kỹ thuật: [`docs/ba/task-035/spec-v1.0.md`](file:///home/avada/tontine/docs/ba/task-035/spec-v1.0.md)
  - Mã băm đóng băng (Manifest): [`docs/manifests/task-035/manifest.json`](file:///home/avada/tontine/docs/manifests/task-035/manifest.json)
  - Bộ kiểm thử mới: [`tests/edit-club-name-fixes.test.ts`](file:///home/avada/tontine/tests/edit-club-name-fixes.test.ts)
- **Kết luận chung**: **PASS & SIGNOFF (Gate 3)**

---

## 1. Xác Minh Tính Toàn Vẹn Mã Nguồn (SHA256 Manifest Integrity)

Công cụ `scripts/manifest-tool.mjs` được thực thi trước và sau khi chạy test để đối chiếu với mã băm đã đóng băng:

```bash
$ node scripts/manifest-tool.mjs verify task-035
[Verify] Verifying manifest for Task: task-035 (Frozen at: 2026-10-19T04:37:21.988Z)
[MATCH] src/components/savings/EditClubNameModal.tsx (fe183bba85279728...)
[MATCH] src/lib/savingsClubDirectory.ts (0a41dd2b3b690efc...)
[MATCH] src/App.tsx (34bc5f1aca667cea...)

 All files verified successfully! Integrity confirmed.
```

- **Mã băm trước kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Mã băm sau kiểm thử**: `MATCH 100%` (Exit Code 0)
- **Đảm bảo không sửa source code implementation**: 100% tuân thủ.

---

## 2. Kết Quả Kiểm Thử Chi Tiết Từng Tiêu Chí Nghiệm Thu

| Test ID | AC Tham Chiếu | Mục Tiêu & Mô Tả Kiểm Thử | Kết Quả Thực Tế | Exit Code | Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-FIX-01` | **AC-01.1** | `EditClubNameModal.tsx` sử dụng `prevIsOpenRef` và `prevAddressRef` để chỉ khởi tạo `nameInput` khi modal mở hoặc đổi nhóm. | PASS (0.5ms) | 0 | **ĐẠT** |
| `TC-FIX-02` | **AC-01.2** | Dependency array của hook `useEffect` loại bỏ object reference không ổn định, ngăn chặn reset ô nhập khi timer tick mỗi giây. | PASS (0.3ms) | 0 | **ĐẠT** |
| `TC-FIX-03` | **AC-01.3** | Backdrop container của modal chặn nổi bọt sự kiện click (`e.stopPropagation()`). | PASS (0.2ms) | 0 | **ĐẠT** |
| `TC-FIX-04` | **AC-02.1** | `saveKnownGroup` bảo toàn tên nhóm tùy chỉnh, không bị ghi đè khi on-chain sync gửi tên hợp đồng on-chain ("Nhóm Hụi Mới"). | PASS (1.2ms) | 0 | **ĐẠT** |
| `TC-FIX-05` | **AC-02.2** | `saveKnownGroup` bảo toàn tên tùy chỉnh của nhóm mặc định (BAVI Savings Club / Arc Alpha), không bị ghi đè thành `defaultMatch.name`. | PASS (0.8ms) | 0 | **ĐẠT** |
| `TC-FIX-06` | **AC-02.3** | `saveKnownGroup` nâng cấp tên placeholder ("Nhóm Hụi 0x...") thành tên on-chain thật khi nhận dữ liệu hợp đồng. | PASS (0.6ms) | 0 | **ĐẠT** |
| `TC-FIX-07` | **AC-03.1** | `App.tsx` memoize `currentClubForModal` qua `useMemo` phụ thuộc vào `[contractAddress, displayedGroupName]`. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-FIX-08` | **AC-03.2** | `App.tsx` truyền prop `currentClubForModal` vào `EditClubNameModal` và cập nhật `nameUpdateTrigger` khi lưu. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-FIX-09` | **AC-03.3** | `displayedGroupName` trong `App.tsx` ưu tiên tên tùy chỉnh từ danh bạ tức thì mà không bị trễ. | PASS (0.4ms) | 0 | **ĐẠT** |
| `TC-FIX-10` | **AC-04.1** | Toàn bộ 346 bài kiểm thử cũ tiếp tục PASS 100% (Zero Regression). | PASS (346/346) | 0 | **ĐẠT** |
| `TC-FIX-11` | **AC-04.2** | Toàn bộ 9 test cases mới trong `tests/edit-club-name-fixes.test.ts` PASS 100%. | PASS (9/9) | 0 | **ĐẠT** |
| `TC-FIX-12` | **AC-04.3** | Lệnh build dự án `npm run build` thành công, không có lỗi TypeScript hay cú pháp. | PASS (Exit 0) | 0 | **ĐẠT** |

---

## 3. Tổng Hợp Kết Quả Thực Thi Hệ Thống

```bash
$ npm test
ℹ tests 355
ℹ suites 0
ℹ pass 355
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2136.861283
```

- **Tổng số test cases**: 355 tests
- **Số lượng Passed**: 355 / 355 (100%)
- **Số lượng Failed**: 0
- **Regression**: 0% (Hoàn toàn không có hồi quy)
- **Production Build (`npm run build`)**: Thành công 100% (dist assets tạo chuẩn xác).

---

## 4. Kết Luận & Ký Duyệt

Bộ kiểm thử độc lập xác nhận giải pháp đã giải quyết triệt để lỗi người dùng phản hồi:
1. Người dùng gõ tên nhóm trong modal hoàn toàn mượt mà, không bị gián đoạn hay mất chữ do timer 1 giây.
2. Tên nhóm sau khi lưu được bảo tồn vĩnh viễn trong `localStorage`, không còn bị cơ chế đồng bộ on-chain ghi đè.
3. Giao diện đổi tên phản ứng tức thì trên cả thẻ chính và danh bạ.

**Tester Signoff**: APPROVED ✅ (Gate 3 Closed)
