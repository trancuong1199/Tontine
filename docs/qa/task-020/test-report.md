# Báo Cáo Kiểm Thử Độc Lập (QA Test Report)

**Task ID**: `task-020`  
**Dispatch ID**: `dispatch-020-qa`  
**Tester**: `qa-agent (Independent Tester)`  
**Ngày kiểm thử**: `2026-10-12`  
**Spec tham chiếu**: `docs/ba/task-020/spec-v1.0.md`  
**Manifest tham chiếu**: `docs/manifests/task-020/manifest.json` (Frozen at `2026-10-12T05:55:29.295Z`)  
**Kết quả tổng thể**: **PASS 100% (GATE 3 SIGNOFF ĐẠT TIÊU CHUẨN)**

---

## 1. Kiểm Tra Tính Toàn Vẹn Mã Nguồn (SHA256 Manifest Verification)

Trước và sau khi tiến hành kiểm thử độc lập, tính toàn vẹn của mã nguồn bàn giao được xác thực bằng lệnh `node scripts/manifest-tool.mjs verify task-020`:

```bash
node scripts/manifest-tool.mjs verify task-020
```

**Kết quả kiểm tra SHA256 (Exit code: 0):**
- `src/components/savings/ActionPanel.tsx`: `bfbf06d484a67bb8e734ca7b7bb2f69ae16eb7ea0a9e7eb22115f5d8364e756a` -> **MATCH**
- `src/components/savings/PasskeyActionPanel.tsx`: `709f0ef4118ea9a95fbddc9c57ef22941fa9044b15091d31dfbb407b7dd1e3d3` -> **MATCH**
- `src/lib/savingsClubDirectory.ts`: `8f7837d94284744c8034dbce19e68d06767732a327ea0b0e51ee11b623910c26` -> **MATCH**
- `src/components/savings/ClubDirectoryModal.tsx`: `cc2e6debfb34ccbe5cf468249a5b3ee58db828bbfaea96fa3ec4199c0ec187a2` -> **MATCH**
- `src/lib/i18n.ts`: `676497248014b58e6584cb27f814917a26ba6fca66e28405d452d75f10646c1a` -> **MATCH**

> **Cam kết tính độc lập**: 100% tệp khớp chuẩn xác với mã băm đóng băng trong `manifest.json`. Tester hoàn toàn không chỉnh sửa bất kỳ tệp implementation nào của Developer.

---

## 2. Kết Quả Kiểm Thử Tiêu Chí Nghiệm Thu (Acceptance Criteria Execution)

Bộ kiểm thử độc lập `tests/digital-timer-and-directory-cleanup.test.ts` gồm 11 bài kiểm thử chuyên sâu bao phủ đầy đủ toàn bộ các tiêu chí nghiệm thu của Task-020 (REQ-01 đến REQ-03):

| Mã test | Tiêu chí tham chiếu | Mô tả kiểm thử độc lập | Kết quả |
| :--- | :--- | :--- | :--- |
| `TC-TIMER-01` | AC-01.1 | Khi `countdownSec >= 3600`: Định dạng chuẩn số `hh:mm:ss` (ví dụ `86245s` -> `"23:57:25"`, `86400s` -> `"24:00:00"`, `3600s` -> `"01:00:00"`). Loại bỏ hoàn toàn lỗi tràn phút (`"1437:25"`). | **PASS** |
| `TC-TIMER-02` | AC-01.2 | Khi `countdownSec < 3600`: Định dạng chuẩn số `mm:ss` (ví dụ phòng siêu tốc 2 phút `120s` -> `"02:00"`, `119s` -> `"01:59"`, `45s` -> `"00:45"`, `5s` -> `"00:05"`). | **PASS** |
| `TC-TIMER-03` | AC-01.3 | Khi vòng kết thúc (`countdownSec <= 0` hoặc `isTimeEnded = true`): Trả về song ngữ chuẩn xác `"Ended"` (en) / `"Hết giờ"` (vi), xử lý an toàn hiện tượng lệch xung clock âm (`-10s`). | **PASS** |
| `TC-TIMER-04` | AC-01.4 | Đồng bộ nhất quán tuyệt đối (Cross-Panel Parity) giữa `ActionPanel.tsx` (Wagmi) và `PasskeyActionPanel.tsx` (Passkey AA) trên mọi vector kiểm thử. | **PASS** |
| `TC-DIR-01` | AC-02.1 | Hàm `clearCustomKnownGroups()` gỡ bỏ hoàn toàn dữ liệu tùy chỉnh trong LocalStorage (`hui_known_groups`), đưa danh bạ về trạng thái gốc gồm đúng 2 nhóm `DEFAULT_SAVINGS_CLUBS`. | **PASS** |
| `TC-DIR-02` | AC-02.1 | Hàm `removeKnownGroup(address)` xóa chính xác 1 nhóm cụ thể theo địa chỉ (hỗ trợ case-insensitive) mà không ảnh hưởng các nhóm khác. | **PASS** |
| `TC-DIR-03` | AC-02.2, AC-02.3 | `ClubDirectoryModal.tsx` tích hợp nút dọn dẹp nhóm cũ kèm biểu tượng `Trash2`, quản lý state động `[groups, setGroups]`, cập nhật giao diện lập tức về `DEFAULT_SAVINGS_CLUBS` và phát `toast.success`. | **PASS** |
| `TC-DIR-04` | AC-02.4 | Xử lý an toàn khi danh bạ đã sạch (`customGroupsCount === 0`) và lớp bảo vệ SSR chống lỗi truy cập `window.localStorage` khi `window` chưa định nghĩa. | **PASS** |
| `TC-I18N-01` | i18n Parity | Bộ từ điển song ngữ `src/lib/i18n.ts` cung cấp đầy đủ 3 khóa mới (`clearOldClubsBtn`, `clearOldClubsSuccess`, `clearOldClubsEmpty`) cho cả tiếng Việt và tiếng Anh. | **PASS** |
| `TC-ARENA-01` | AC-03.1, AC-03.2, AC-03.3 | Smart Contract `RotatingSavings.sol` hỗ trợ tham số `roundDuration_` linh hoạt tại constructor; cấu hình chu kỳ 120s hoạt động mượt mà với bộ đếm giờ từ `"02:00"` về `"00:00"`. | **PASS** |
| `TC-REGRESSION-01` | AC-03.4 | Bảo toàn 100% cấu trúc dự án, khóa lưu trữ `SAVINGS_CLUBS_STORAGE_KEY` và 2 nhóm mặc định hệ thống. | **PASS** |

---

## 3. Kiểm Thử Hệ Thống & Kiểm Tra Hồi Quy (Full System & Regression Testing)

### 3.1. Chạy Toàn Bộ Test Suite (`npm test`)
- **Lệnh thực thi**: `npm test` (`node --experimental-strip-types --test tests/*.test.ts`)
- **Tổng số tests**: **233 tests** (222 tests kế thừa từ Task-001 đến Task-019 + 11 tests mới của Task-020)
- **Kết quả thực tế**:
  ```
  ℹ tests 233
  ℹ suites 0
  ℹ pass 233
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 2568.309108
  ```
- **Exit code**: `0` (Zero Regression).

### 3.2. Chạy Build Đóng Gói Production (`npm run build`)
- **Lệnh thực thi**: `npm run build` (`tsc --noEmit && vite build`)
- **Kết quả thực tế**:
  - `tsc --noEmit`: 100% type-checked hợp lệ, không có lỗi TypeScript.
  - `vite build`: Build production hoàn tất thành công trong **15.29s**.
- **Exit code**: `0`.

---

## 4. Quyết Định Nghiệm Thu Kỹ Thuật (QA Gate 3 Sign-Off)

- **Trạng thái Gate 3**: **PASS 100% — PHÊ DUYỆT SIGNOFF TOÀN DIỆN**
- **Đánh giá tổng thể**:
  1. **Chuẩn hóa bộ đếm giờ số xuất sắc**: Đã giải quyết triệt để lỗi người dùng phản ánh `"1437:25"`, chuyển sang định dạng đồng hồ số trực quan `hh:mm:ss` khi $\ge 1$h và `mm:ss` khi $< 1$h trên cả 2 bảng điều khiển Wagmi và Passkey AA.
  2. **Dọn dẹp danh bạ sạch sẽ & an toàn**: Tính năng "Dọn dẹp nhóm cũ" trong modal cho phép người dùng khôi phục danh bạ về 2 nhóm mặc định chính thức chỉ với 1 cú nhấp chuột, cập nhật giao diện tức thì và thông báo toast rõ ràng.
  3. **Hỗ trợ hoàn hảo phòng siêu tốc 2 phút (120s)**: Hợp đồng thông minh và frontend đồng bộ chuẩn xác với chu kỳ 120 giây, hiển thị đếm ngược từ `02:00` đến `00:00`.
  4. **Chất lượng hệ thống vững chắc**: 233/233 unit tests PASS (0 fail), build production hoàn tất không lỗi, mã nguồn bảo toàn 100% hash đóng băng theo manifest.

**Ký duyệt**: *qa-agent (Independent Tester)*
