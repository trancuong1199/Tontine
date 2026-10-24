# Báo Cáo Kiểm Thử Độc Lập (QA Test Report) — Task-031

- **Task ID**: `task-031`
- **Mục tiêu**: Kiểm thử tính năng đồng bộ chuyển động cuộn trang (Scroll-Driven Bezier Orbital Motion & Glide Physics) cho các icon hệ sinh thái trên trang Saving Clubs (`activeTab === 'app'`) giống hệt Home page.
- **Tester**: Tester độc lập (QA Agent)
- **Ngày kiểm thử**: 2026-10-15
- **Trạng thái nghiệm thu QA (Sign-off)**: **PASSED (100% ĐẠT)**

---

## 1. Kiểm tra tính toàn vẹn mã nguồn (SHA256 Manifest Verification)

- **Manifest file**: `docs/manifests/task-031/manifest.json`
- **Lệnh thực thi**: `node scripts/manifest-tool.mjs verify task-031`
- **Kết quả trước khi test**:
  ```text
  [Verify] Verifying manifest for Task: task-031 (Frozen at: 2026-10-15T03:02:18.813Z)
  [MATCH] src/App.tsx (0deb8c3244d53963ae871334dfdc1c36d776219df614b6619ac643b82b73ed57)
  All files verified successfully! Integrity confirmed.
  ```
- **Kết quả sau khi test**:
  ```text
  [Verify] Verifying manifest for Task: task-031 (Frozen at: 2026-10-15T03:02:18.813Z)
  [MATCH] src/App.tsx (0deb8c3244d53963ae871334dfdc1c36d776219df614b6619ac643b82b73ed57)
  All files verified successfully! Integrity confirmed.
  ```
- **Kết luận**: Mã nguồn implementation `src/App.tsx` không hề bị can thiệp hay sửa đổi trong quá trình kiểm thử độc lập.

---

## 2. Kết quả kiểm thử tự động (Automated Test Suite)

- **Test suite mới**: `tests/saving-clubs-scroll-orbital-motion.test.ts`
- **Lệnh thực thi**: `npm test`
- **Exit Code**: `0`
- **Số lượng bài kiểm thử**: **323 tests**
- **Passed**: **323 tests (100%)**
- **Failed**: **0**
- **Build test**: `npm run build` $\rightarrow$ **Vite built in 18.31s (Exit code 0)**

### Chi tiết các ca kiểm thử tính năng Task-031:

| Mã kiểm thử | Tiêu chí nghiệm thu (AC) | Mô tả kiểm thử | Kết quả |
| :--- | :--- | :--- | :--- |
| `TC-MOTION-01` | `AC-01.1` | `src/App.tsx` khai báo `scrollY` state, bắt sự kiện scroll tối ưu qua `requestAnimationFrame` và `{ passive: true }` | **PASS** |
| `TC-MOTION-02` | `AC-01.2 & AC-01.3` | `src/App.tsx` tính toán `scrollOffset`, `continuousScrollDelta` và 8 tọa độ động khóa chuẩn xác trên đường cong Bezier | **PASS** |
| `TC-MOTION-03` | `AC-02.1 & AC-02.2` | Các thẻ `foreignObject` của Saving Clubs nhận tọa độ động `ptAppLeft` và `ptAppRight` kèm class `transition-all duration-75 ease-out` | **PASS** |
| `TC-MOTION-04` | `AC-02.3` | Cấu trúc cánh trang trí duy trì `pointer-events-none` (không cản trở click UI) và `animate-pulse` trên các hạt sao | **PASS** |
| `TC-MOTION-05` | `AC-04.1` | Toán học Bezier: Tọa độ dịch chuyển mượt mà khi `scrollY` tăng từ `0` lên `600px` | **PASS** |
| `TC-MANIFEST-01` | `AC-04.2` | Kiểm tra tính toàn vẹn của tệp `docs/manifests/task-031/manifest.json` | **PASS** |

---

## 3. Đo đạc thực tế qua BrowserSkill (`bsk`) trên Chrome thật

Thực hiện đo đạc trực tiếp trên phiên bản ứng dụng đang chạy thật tại `http://localhost:5173/?tab=app`:
- **Browser**: Chrome `d80cd412`, session ID `kwtf`.
- **Đo lường tọa độ thực tế tại `scrollY = 0` vs `scrollY = 600px`**:

| Icon | Vị trí ban đầu (`scrollY = 0`) | Vị trí sau cuộn (`scrollY = 600px`) | Độ dịch chuyển ($\Delta x, \Delta y$) | Trạng thái chuyển động |
| :--- | :--- | :--- | :--- | :--- |
| **Left 1 (PiggyBank)** | `x: 55.5, y: 78.7` | `x: 133.3, y: 136.7` | `+77.8px, +58.0px` | Lướt xuống và lượn vào trong theo cung Bezier |
| **Left 2 (Users)** | `x: 213.6, y: 258.1` | `x: 233.3, y: 333.2` | `+19.7px, +75.1px` | Lướt xuống dọc theo vòng cung giữa |
| **Left 3 (RefreshCw)** | `x: 224.8, y: 464.9` | `x: 214.1, y: 494.4` | `-10.7px, +29.5px` | Lướt nhẹ theo vòng cung dưới |
| **Left 4 (Calendar)** | `x: 69.9, y: 643.3` | `x: 124.7, y: 608.2` | `+54.8px, -35.1px` | Co nhẹ lên trên và hướng vào tâm quỹ đạo |
| **Right 1 (RefreshCw)** | `x: 417.5, y: 79.7` | `x: 339.7, y: 137.7` | `-77.8px, +58.0px` | Đối xứng: Lướt xuống và vào trong |
| **Right 2 (Calendar)** | `x: 258.4, y: 258.1` | `x: 238.7, y: 333.2` | `-19.7px, +75.1px` | Đối xứng: Lướt xuống dọc vòng cung giữa |
| **Right 3 (Users)** | `x: 248.2, y: 463.9` | `x: 258.9, y: 493.4` | `+10.7px, +29.5px` | Đối xứng: Lướt nhẹ theo vòng cung dưới |
| **Right 4 (PiggyBank)** | `x: 402.1, y: 643.3` | `x: 347.3, y: 608.2` | `-54.8px, -35.1px` | Đối xứng: Co nhẹ lên trên và hướng vào tâm |

- **Bằng chứng ảnh chụp màn hình**:
  - `screenshot-task031-saving-clubs-motion-top.png`: Ảnh chụp Saving Clubs khi ở đỉnh trang (`scrollY = 0`).
  - `screenshot-task031-saving-clubs-motion-scrolled.png`: Ảnh chụp Saving Clubs khi cuộn xuống (`scrollY = 600px`), các icon đã lướt mượt mà tới vị trí động mới.

---

## 4. Kết luận & Khuyến nghị

- Toàn bộ các tiêu chí nghiệm thu của Task-031 đều đã đạt 100%.
- Không phát sinh hồi quy, 323/323 unit tests pass.
- **Tester xác nhận nghiệm thu (Sign-off: APPROVED)** và chuyển giao cho BA thực hiện đối chiếu ma trận truy vết (Gate 4).
