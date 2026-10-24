# Đặc Tả Kỹ Thuật (Software Requirements Specification) — Task-031

## Đồng Bộ Chuyển Động Quỹ Đạo Cuộn Trang (Scroll-Driven Bezier Orbital Motion & Glide Physics) Cho Trang Saving Clubs Giống Home Page

- **Task ID**: `task-031`
- **Mục tiêu**: Đưa chuyển động cuộn trang tương tác vật lý (Scroll-driven Bezier Glide Motion) giống hệt trang Home (`LandingPage.tsx`) vào trang Saving Clubs (`activeTab === 'app'`) trong `src/App.tsx`.
- **Tác giả**: Business Analyst (`ba-agent`)
- **Phiên bản**: `v1.0`
- **Ngày lập**: `2026-10-15`
- **Trạng thái**: **APPROVED (Gate 1)**

---

## 1. Vấn Đề Nghiệp Vụ & Giá Trị Đem Lại (Problem & Value Proposition)

### 1.1. Hiện trạng
- Ở Task-030, trang Saving Clubs (`activeTab === 'app'`) đã được bổ sung nền đen tuyền `#050508`, lưới ma trận cyber matrix, chùm ánh sáng cực quang hổ phách và 2 cánh cung quỹ đạo nét đứt kèm 8 icon hệ sinh thái (`PiggyBank`, `Users`, `RefreshCw`, `Calendar`).
- Tuy nhiên, trong khi ở trang Home (`LandingPage.tsx`), các icon hệ sinh thái liên tục **chuyển động lướt mượt mà dọc theo đường cong Bezier** khi người dùng cuộn chuột lên/xuống (dựa trên `scrollY`, `scrollOffset` và `continuousScrollDelta` kết hợp `transition-all duration-75 ease-out`), thì ở trang Saving Clubs các icon này hiện đang ở trạng thái **tĩnh (static coordinates)** tại các mốc `t = 0.12, 0.38, 0.62, 0.88`.
- Người dùng phản hồi trực tiếp: *"tôi muốn chuyển động giống ở home page"*.

### 1.2. Giá trị đem lại
- **Đồng nhất trải nghiệm Web3 sống động**: Mang lại cảm giác tương tác không gian vũ trụ liên tục (Kinetic Orbital Dynamics) khi người dùng lướt xem các câu lạc bộ hụi, danh sách thành viên, và lịch sử tất toán.
- **Tối ưu hóa hiệu năng**: Sử dụng `requestAnimationFrame` và passive scroll listener để đảm bảo tốc độ khung hình 60fps mượt mà, không giật lag.
- **Bảo toàn 100% tính toàn vẹn (Zero Regression)**: Không làm ảnh hưởng tới các token kiểm thử hay bố cục nội dung của 317 bài test hiện có.

---

## 2. Phạm Vi & Tác Nhân (Scope & Actors)

- **Tác nhân (Actors)**:
  - Thành viên & Khách truy cập: Cuộn trang trên máy tính hoặc điện thoại và trải nghiệm hiệu ứng lướt mượt mà của các icon bọc 2 cánh.
- **Phạm vi trong task (In-Scope)**:
  - Cập nhật `src/App.tsx`:
    - Thêm state theo dõi vị trí cuộn chuột `scrollY`.
    - Đăng ký scroll event listener tối ưu với `requestAnimationFrame` và `{ passive: true }`.
    - Tính toán hệ số dịch chuyển động `scrollOffset` và `continuousScrollDelta`.
    - Tính toán 8 tọa độ động khóa chuẩn xác trên đường cong Bezier quỹ đạo:
      - Cánh trái: `ptAppLeftPiggy`, `ptAppLeftUsers`, `ptAppLeftRefresh`, `ptAppLeftCalendar`.
      - Cánh phải: `ptAppRightRefresh`, `ptAppRightCalendar`, `ptAppRightUsers`, `ptAppRightPiggy`.
    - Gán tọa độ động vào thuộc tính `x`, `y` của các `foreignObject` trong `App.tsx` cùng class hiệu ứng `transition-all duration-75 ease-out`.
  - Giữ nguyên các token kiểm thử của Task-027, Task-028, Task-029, Task-030.
- **Ngoài phạm vi (Out-of-Scope)**:
  - Không thay đổi logic Smart Contract hay các tính năng đóng góp/đấu giá.

---

## 3. Quy Tắc Nghiệp Vụ (Business Rules)

- **BR-01 (Công Thức Quỹ Đạo Đồng Bộ)**:
  - Hàm tính toán vị trí trên đường cong Bezier `getLeftOuterArcPoint(t)` và `getRightOuterArcPoint(t)` được tái sử dụng trực tiếp từ `src/components/landing/LandingPage.tsx`.
- **BR-02 (Quy Luật Chuyển Động Cuộn)**:
  - `scrollOffset = Math.min(0.08, Math.max(0, (scrollY / 600) * 0.08))`
  - `continuousScrollDelta = Math.min(0.16, Math.max(0, (scrollY / 2400) * 0.16))`
  - Cặp icon phía trên trượt xuôi theo chiều cuộn, cặp icon phía dưới trượt nhẹ ngược hướng hoặc co giãn hài hòa để tạo cảm giác quỹ đạo xoay tròn sống động.
- **BR-03 (Chống Chặn Thao Tác)**:
  - Mọi phần tử chuyển động trang trí đều phải có `pointer-events-none` để người dùng click vào nút hoặc card mà không bị cản trở.

---

## 4. Luồng Chuyển Động (Mermaid Diagram)

```mermaid
flowchart TD
    UserScroll[Người dùng cuộn trang trên Saving Clubs] --> ScrollEvent[Window Scroll Event]
    ScrollEvent --> RAF[requestAnimationFrame Batching]
    RAF --> UpdateScrollY[setScrollY(window.scrollY)]
    UpdateScrollY --> CalcOffsets[Tính toán scrollOffset & continuousScrollDelta]
    CalcOffsets --> CalcCoords[Tính 8 tọa độ động ptAppLeft & ptAppRight theo Bezier]
    CalcCoords --> RenderSVG[Cập nhật x, y của foreignObject với transition-all duration-75 ease-out]
    RenderSVG --> VisualGlide[Các icon lướt mượt mà dọc theo cung quỹ đạo]
```

---

## 5. Yêu Cầu Kỹ Thuật (REQ) & Tiêu Chí Nghiệm Thu (AC)

### REQ-01: Bộ Đếm Cuộn & Tính Toán Tọa Độ Động Trong `App.tsx`
- **AC-01.1**: `src/App.tsx` khai báo state `scrollY` và đăng ký scroll listener an toàn với `requestAnimationFrame` và `{ passive: true }`, giải phóng bộ nhớ khi unmount.
- **AC-01.2**: `src/App.tsx` tính toán `scrollOffset` và `continuousScrollDelta` đồng bộ với công thức của Home page.
- **AC-01.3**: `src/App.tsx` tính toán 8 tọa độ động `ptAppLeftPiggy, ptAppLeftUsers, ptAppLeftRefresh, ptAppLeftCalendar, ptAppRightRefresh, ptAppRightCalendar, ptAppRightUsers, ptAppRightPiggy` khóa trên đường cong Bezier.

### REQ-02: Gắn Chuyển Động Vào Các Icon Hệ Sinh Thái Của Saving Clubs
- **AC-02.1**: Các thẻ `foreignObject` của cánh trái và cánh phải trong `src/App.tsx` nhận tọa độ `x`, `y` tương ứng từ các biến động.
- **AC-02.2**: Mỗi thẻ `foreignObject` chứa class `transition-all duration-75 ease-out` để chuyển động êm ái, loại bỏ giật khung hình.
- **AC-02.3**: Duy trì `pointer-events-none` trên toàn bộ lớp trang trí.

### REQ-03: Kiểm Chứng Thực Tế Qua BrowserSkill (`bsk`)
- **AC-03.1**: Mở trình duyệt thật qua `bsk`, điều hướng đến `http://localhost:5173/?tab=app`.
- **AC-03.2**: Đo tọa độ icon tại vị trí đỉnh trang (`scrollY = 0`).
- **AC-03.3**: Cuộn trang xuống (`scrollY = 500px`), đo lại tọa độ icon và xác nhận tọa độ đã thay đổi theo đúng quỹ đạo chuyển động.
- **AC-03.4**: Chụp ảnh màn hình bằng chứng nghiệm thu.

### REQ-04: Bảo Toàn Hồi Quy (Zero Regression)
- **AC-04.1**: Toàn bộ 317 bài unit test hiện có tiếp tục PASS 100%.
- **AC-04.2**: Lệnh `npm run build` biên dịch thành công không phát sinh lỗi.

---

## 6. Ma Trận Truy Xuất Yêu Cầu (Traceability Matrix)

| REQ ID | Tiêu Chí Nghiệm Thu (AC) | Trạng Thái Thiết Kế (BA) | Trạng Thái Triển Khai (Dev) | Trạng Thái Kiểm Thử (QA) | Bằng Chứng (Evidence) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | AC-01.1: State scrollY & requestAnimationFrame scroll listener | Approved | Implemented | Approved (PASS) | `TC-MOTION-01` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-01** | AC-01.2: Tính toán scrollOffset & continuousScrollDelta | Approved | Implemented | Approved (PASS) | `TC-MOTION-02` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-01** | AC-01.3: Tính 8 tọa độ động khóa đường cong Bezier | Approved | Implemented | Approved (PASS) | `TC-MOTION-02` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-02** | AC-02.1: Gán tọa độ động vào foreignObject cánh trái & phải | Approved | Implemented | Approved (PASS) | `TC-MOTION-03` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-02** | AC-02.2: Hiệu ứng chuyển động mượt transition-all duration-75 | Approved | Implemented | Approved (PASS) | `TC-MOTION-03` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-02** | AC-02.3: Duy trì pointer-events-none không cản trở thao tác | Approved | Implemented | Approved (PASS) | `TC-MOTION-04` (`tests/saving-clubs-scroll-orbital-motion.test.ts`) |
| **REQ-03** | AC-03.1: Kết nối phiên BrowserSkill (bsk) trên Chrome thật | Approved | Implemented | Approved (PASS) | Session `kwtf` on browser `d80cd412` |
| **REQ-03** | AC-03.2: Đo tọa độ icon tại scrollY = 0 | Approved | Implemented | Approved (PASS) | bsk evaluate: `x: 55.5, y: 78.7` (Left Piggy), `x: 417.5, y: 79.7` (Right Refresh) |
| **REQ-03** | AC-03.3: Đo tọa độ icon khi cuộn trang và xác nhận thay đổi | Approved | Implemented | Approved (PASS) | bsk evaluate tại scrollY=600: `x: 133.3, y: 136.7` (dịch chuyển +77.8px, +58.0px) |
| **REQ-03** | AC-03.4: Chụp ảnh màn hình nghiệm thu thực tế | Approved | Implemented | Approved (PASS) | `screenshot-task031-saving-clubs-motion-top.png`, `screenshot-task031-saving-clubs-motion-scrolled.png` |
| **REQ-04** | AC-04.1: Toàn bộ 317 bài test cũ tiếp tục PASS 100% | Approved | Implemented | Approved (PASS) | `npm test` (323/323 passed, exit code 0) |
| **REQ-04** | AC-04.2: Build production thành công | Approved | Implemented | Approved (PASS) | `npm run build` (built in 18.31s, exit code 0) |

---

## 7. Ký Duyệt & Chuyển Bước Nghiệm Thu

- **Gate 1 (BA Spec Approval)**: `ba-agent` — `2026-10-15` (APPROVED)
- **Gate 2 (Developer Freeze)**: `dev-agent` — `2026-10-15` (FROZEN: `0deb8c3244d53963ae871334dfdc1c36d776219df614b6619ac643b82b73ed57`)
- **Gate 3 (Independent QA Approval)**: `qa-agent` — `2026-10-15` (APPROVED, 323/323 PASS, BrowserSkill Measured)
- **Gate 4 (BA RTM Coverage Reconciliation)**: `ba-agent` — `2026-10-15` (100% COVERAGE CONFIRMED)
- **Gate 5 (Leader Final Acceptance)**: Ready for Leader Sign-off
